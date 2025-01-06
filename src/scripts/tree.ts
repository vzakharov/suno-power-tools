import { RawClip } from "../baseTypes";
import { findCropBaseClipId } from "../cropping";
import { filter, find } from "../lodashish";
import { suno } from "../manager";
import { renderTemplate, Template } from "../templating";
import { $throw, $with, atLeast, isoStringToTimestamp, jsonClone, mutate, sortByDate, uploadTextFile } from "../utils";
import { type GraphData }  from 'force-graph';

declare global {
  interface Window {
    templates: {
      tree: Template<'data'>,
    },
  }
}

type MissingClip = RawClip & {
  isMissing: true,
};

type LinkKind = 'extend' | 'inpaint' | 'apply' | 'cover' | 'remaster' | 'crop' | 'next' | 'descendant';

type SerializedLink<Kind extends LinkKind = LinkKind> = [
  parentId: string,
  childId: string,
  kind: Kind,
];

type MonoLink = {
  kind: LinkKind,
  clip: LinkedClip,
};

type LinkedClip = RawClip & {
  children?: MonoLink[],
  parent?: MonoLink,
  root?: LinkedClip,
};

type TreeConfig = ConstructorParameters<typeof Tree>;

class Tree {

  constructor(
    private rawClips: RawClip[] = [],
    private lastProcessedPage = -1,
    private allPagesProcessed = false,
    private links: SerializedLink[] = [],
    private allLinksBuilt = false,
  ) {}

  get config(): TreeConfig {
    return [ this.rawClips, this.lastProcessedPage, this.allPagesProcessed, this.links, this.allLinksBuilt ];
  };
  set config(config: TreeConfig) {
    Object.assign(this, new Tree(...config));
  };

  reset() {
    this.config = [];
    console.log('Tree reset. Run build() to start building it again.');
  };

  async loadState() {
    const json = await uploadTextFile();
    if ( !json ) {
      console.log('No file selected, aborting.');
      return;
    };
    this.config = JSON.parse(json);
  }

  saveState() {
    const json = JSON.stringify(this.config);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'suno_tree.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  async build() {
    
    if ( !this.allPagesProcessed ) {
      await this.fetchClips();
    };

    if ( !this.allLinksBuilt ) {
      await this.buildLinks();
    };

  }

  private async fetchClips() {
    console.log('Fetching liked clips...');
    while (true) {
      await atLeast(1000); //! (to avoid rate limiting)
      const { data: { clips } } = await suno().root.apiClient.GET('/api/feed/v2', {
        params: {
          query: {
            is_liked: true,
            page: this.lastProcessedPage + 1,
          }
        }
      });
      if (!clips.length) {
        this.allPagesProcessed = true;
        break;
      };
      this.rawClips.push(...clips);
      this.lastProcessedPage++;
      console.log(`Processed page ${this.lastProcessedPage}; total clips: ${this.rawClips.length}`);
    }
  };

  private rawClipsById: Record<string, RawClip | undefined> = {};

  private async loadClip(id: string) {
    await atLeast(1000); //! (to avoid rate limiting)
    console.log(`Clip ${id} not found in cache, loading...`);
    const clip = await suno().root.clips.loadClipById(id) ?? missingClip(id);
    this.rawClips.push(clip);
    return clip;
  };

  private getClipByIdSync(id: string) {
    //! (For some reason, Suno sometimes prefixes the clip IDs in history arrays with 'm_', while the actual clip IDs don't have that prefix)
    if ( id.startsWith('m_') )
      id = id.slice(2);
    //! For older (v2) generations, the referenced IDs are actually names of audio_url files, and they end with _\d+. So if the ID ends with _\d+, we need to find a clip with an audio_url including the ID.
    return this.rawClipsById[id] ??= 
      this.rawClips.find((clip) =>
        isV2AudioFilename(id)
          ? clip.audio_url.includes(id)
          : clip.id === id
      );
  };

  private async getClipById(id: string) {
    return this.getClipByIdSync(id) ?? await this.loadClip(id);
  };

  private async buildLinks() {
    console.log('Building links...');
    // for ( const child of this.rawClips ) {
    for ( let i = 0; i < this.rawClips.length; i++ ) {
      const clip = this.rawClips[i];
      if ( i % 100 === 0 ) {
        console.log(`Processed ${i} clips out of ${this.rawClips.length}`);
      };
      const { metadata } = clip;
      const [ parentId, kind ]: [ id: string, kind: LinkKind ] | [ undefined, undefined ]=
        'history' in metadata 
          ? $with(metadata.history[0], parent =>
              typeof parent === 'string'
                ? [ parent, 'extend' ]
                : parent.infill
                  ? [ parent.id, 'inpaint' ]
                  : [ parent.id, 'extend' ]
            )
        : 'concat_history' in metadata
          ? [ metadata.concat_history[1].id, 'apply' ]
        : 'cover_clip_id' in metadata
          ? [ metadata.cover_clip_id, 'cover' ]
        : 'upsample_clip_id' in metadata
          ? [ metadata.upsample_clip_id, 'remaster' ]
        : 'type' in metadata && metadata.type === 'edit_crop'
          // ? [ await findCropBaseClipId(clip, this.rawClips), 'crop' ]
          ? await findCropBaseClipId(clip, this.rawClips).then(id => 
            id ? [ id, 'crop' ] : [ undefined, undefined ]
          )
        : [ undefined, undefined ];
      if (parentId) {
        this.links.push([
          (await this.getClipById(parentId)).id, //! (Because the actual clip ID might be different from the one in the history)
          clip.id,
          kind,
        ]);
      }
    };
    this.allLinksBuilt = true;
    console.log(`Built ${this.links.length} links.`);
  };

  private _linkedClips: LinkedClip[] | undefined;

  get linkedClips() {
    return this._linkedClips ??= this.getLinkedClips();
  };

  private getLinkedClips() {
    const linkedClips = this.links.reduce(
      (linkedClips, [ parentId, childId, kind ]) => {
        const parent = find(linkedClips, { id: parentId })
          ?? $throw(`Could not find parent for link ${parentId} -> ${childId}.`);
        const child = find(linkedClips, { id: childId })
          ?? $throw(`Could not find child for link ${parentId} -> ${childId}.`);
        if ( child.parent ) {
          throw new Error(`Child ${childId} already has a parent: ${child.parent.clip.id}`);
        };
        child.parent = { kind, clip: parent };
        ( parent.children ??= [] ).push({ kind, clip: child });
        return linkedClips;
      }, 
      jsonClone(this.rawClips) as LinkedClip[],
    );
    for ( let rootClip of linkedClips.filter(({ parent }) => !parent) ) {
      setRoot(rootClip, rootClip);
    };
    return linkedClips;

    function setRoot(clip: LinkedClip, root: LinkedClip) {
      Object.assign(clip, { root });
      for ( const { clip: child } of clip.children ?? [] ) {
        setRoot(child, root);
      };
    };
  };

  private _rootClips: LinkedClip[] | undefined;

  get rootClips() {
    return this._rootClips ??= this.getRootClips();
  };

  private getRootClips() {
    const rootClips = this.linkedClips.filter(({ parent }) => !parent);
    return sortByDate(rootClips);
  };

  get sortedClips() {
    /*!
    - Start with the oldest root clip.
    - If the current clip has children, recurse for each child.
    - In the end, reverse everything.
    */
    const orderedClips: LinkedClip[] = [];
    const { rootClips } = this;
    for ( const rootClip of rootClips ) {
      processClip(rootClip);
    };
    return orderedClips.reverse();

    function processClip(clip: LinkedClip) {
      orderedClips.push(clip);
      const { children } = clip;
      if ( children ) {
        for ( const { clip } of sortByDate(children, ({ clip }) => clip.created_at) ) {
          processClip(clip);
        };
      };
    };

  };

  get rootLinks() {
    const rootLinks: SerializedLink<'next' | 'descendant'>[] = [];
    const { rootClips } = this;
    let currentParent = rootClips[0];
    for ( const rootClip of rootClips.slice(1) ) {
      rootLinks.push([ currentParent.id, rootClip.id, 'next' ]);
      if ( rootClip?.children?.length ) {
        currentParent = rootClip;
      };
    };
    //! Link every clip wthout children to its root, for better visualization.
    for ( const clip of this.linkedClips.filter(({ children }) => !children) ) {
      rootLinks.push([ ( clip.root ?? $throw(`Clip ${clip.id} has no root.`) ).id, clip.id, 'descendant' ]);
    };
    return rootLinks;
  };


  get graphData() {
    const result: GraphData = {
      nodes: this.sortedClips.map(({ id, title: name, root }) => ({ 
        id,
        name,
        rootId: root?.id,
      })),
      links: [
        ...this.rootLinks,
        ...this.links,
      ].map(([ source, target, kind ]) => ({ source, target, kind })),
    };
    return result;
  };

  get html() {
    return renderTemplate(window.templates.tree, { data: JSON.stringify(this.graphData) });
  };

  openHtml() {
    const win = window.open();
    if ( !win ) {
      console.error('Failed to open new window.');
      return;
    };
    win.document.write(this.html);
  };

};

const tree = new Tree();

function isV2AudioFilename(id: string) {
  return id.match(/_\d+$/);
}

function missingClip(id: string): MissingClip {
  console.warn(`Clip ${id} not found, creating a missing clip.`);
  return {
    isMissing: true,
    id,
    title: '*Clip not found*',
    created_at: null,
    audio_url: `https://cdn1.suno.ai/${id}.mp3`, //! (This is not guaranteed to work, but who can blame us for trying?)
    image_url: '',
    metadata: { duration: 0, tags: '' },
  };
}

mutate(window, { vovas: { tree }});