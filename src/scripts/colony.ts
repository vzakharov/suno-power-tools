import { type GraphData } from 'force-graph';
import { RawClip } from "../baseTypes";
import { findCropBaseClipId } from "../cropping";
import { find } from "../lodashish";
import { Resolvable } from "../resolvable";
import { Storage } from "../storage";
import { render } from "../templates/colony/colony";
import { $throw, $with, atLeast, debug, EmptyArray, jsonClone, mutate, sortByDate, Undefined, uploadTextFile } from "../utils";
import { api } from '../api';
import { OptionalIfUndefinable } from '../types';

declare global {
  interface Window {
    vovas: {
      main: () => void,
    },
  }
}

type MissingClip = RawClip & {
  isMissing: true,
};


type BaseLink<Kind extends string> = [
  parentId: string,
  childId: string,
  kind: Kind,
];

const BASE_LINK_KINDS = ['extend', 'inpaint', 'apply', 'cover', 'remaster', 'crop'] as const;

export type BaseLinkKind = typeof BASE_LINK_KINDS[number];

export type Link = BaseLink<BaseLinkKind>

const SYNTHETIC_LINK_KINDS = ['next', 'descendant'] as const;

export type SyntheticLinkKind = typeof SYNTHETIC_LINK_KINDS[number];

export type SyntheticLink = BaseLink<SyntheticLinkKind>;

function isSyntheticLink(link: Link | SyntheticLink): link is SyntheticLink {
  return SYNTHETIC_LINK_KINDS.includes(link[2] as any);
}

export type LinkKind = BaseLinkKind | SyntheticLinkKind;

type Relation = {
  kind: BaseLinkKind,
  clip: LinkedClip,
};

type LinkedClip = RawClip & {
  children?: Relation[],
  parent?: Relation,
  root?: LinkedClip,
  totalDescendants?: number,
};

const DEFAULT_STATE = {
  rawClips: EmptyArray<RawClip>(),
  lastProcessedPage: -1,
  allPagesProcessed: false,
  links: EmptyArray<Link>(),
  allLinksBuilt: false,
};

type ColonyState = typeof DEFAULT_STATE;

export class Colony {

  constructor(
    public state: ColonyState = DEFAULT_STATE,
  ) {
    this.loadState();
  }

  reset() {
    this.state = DEFAULT_STATE;
    console.log('Colony reset. Run build() to start building it again.');
  };

  storage = new Storage<ColonyState>('colony', DEFAULT_STATE);
  stateLoaded = new Resolvable();

  async loadState(fromFile = false) {
    if ( fromFile ) {
      const json = await uploadTextFile();
      if ( !json ) {
        console.log('No file selected, aborting.');
        return;
      };
      this.state = JSON.parse(json);
    } else {
      this.state = await this.storage.load();
    };
    this.stateLoaded.resolve();
  }

  async saveState(toFile = false) {
    if ( toFile ) {
      const json = JSON.stringify(this.state);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'suno_colony.json';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      await this.storage.save(this.state);
    }
  };

  async build() {
    
    try {

      if ( !this.state.allPagesProcessed ) {
        await this.fetchClips();
      };

      if ( !this.state.allLinksBuilt ) {
        await this.buildLinks();
      };

    } finally {
      await this.saveState();
    }

  }

  private async fetchClips() {
    console.log('Fetching liked clips...');
    while (true) {
      await atLeast(1000); //! (to avoid rate limiting)
      const { clips } = await api.getClips(this.state.lastProcessedPage + 1);
      if (!clips.length) {
        this.state.allPagesProcessed = true;
        break;
      };
      this.state.rawClips.push(...clips);
      this.state.lastProcessedPage++;
      console.log(`Processed page ${this.state.lastProcessedPage}; total clips: ${this.state.rawClips.length}`);
    }
  };

  private rawClipsById: Record<string, RawClip | undefined> = {};

  private async loadClip(id: string) {
    await atLeast(1000); //! (to avoid rate limiting)
    console.log(`Clip ${id} not found in cache, loading...`);
    const clip = await api.getClip(id) ?? missingClip(id);
    this.state.rawClips.push(clip);
    return clip;
  };

  private getClipByIdSync(id: string) {
    //! For older (v2) generations, the referenced IDs are actually names of audio_url files, and they end with _\d+. So if the ID ends with _\d+, we need to find a clip with an audio_url including the ID.
    return this.rawClipsById[id] ??= 
      this.state.rawClips.find((clip) =>
        isV2AudioFilename(id)
          ? clip.audio_url.includes(id)
          : clip.id === id
      );
  };

  private async getClipById(id: string) {
    //! (For some reason, Suno sometimes prefixes the clip IDs in history arrays with 'm_', while the actual clip IDs don't have that prefix)
    if ( id.startsWith('m_') )
      id = id.slice(2);
    return this.getClipByIdSync(id) ?? await this.loadClip(id);
  };

  private async buildLinks() {
    console.log('Building links...');
    // for ( const child of this.state.rawClips ) {
    for ( let i = 0; i < this.state.rawClips.length; i++ ) {
      const clip = this.state.rawClips[i];
      if ( i % 100 === 0 ) {
        console.log(`Processed ${i} clips out of ${this.state.rawClips.length}`);
      };
      const { metadata } = clip;
      const [ parentId, kind ]: [ id: string, kind: BaseLinkKind ] | [ undefined, undefined ]=
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
          // ? [ await findCropBaseClipId(clip, this.state.rawClips), 'crop' ]
          ? await findCropBaseClipId(clip, this.state.rawClips).then(id => 
            id ? [ id, 'crop' ] : [ undefined, undefined ]
          )
        : [ undefined, undefined ];
      if (parentId) {
        this.state.links.push([
          (await this.getClipById(parentId)).id, //! (Because the actual clip ID might be different from the one in the history)
          clip.id,
          kind,
        ]);
      }
    };
    this.state.allLinksBuilt = true;
    console.log(`Built ${this.state.links.length} links.`);
    console.log('Colony built. Run `await vovas.colony.render()` to view it!');
  };

  private _linkedClips: LinkedClip[] | undefined;

  get linkedClips() {
    return this._linkedClips ??= this.getLinkedClips();
  };

  private getLinkedClips() {
    const linkedClips = this.state.links.reduce(
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
      jsonClone(this.state.rawClips) as LinkedClip[],
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

  get syntheticLinks() {
    const syntheticLinks: SyntheticLink[] = [];
    const { rootClips } = this;
    let currentParent = rootClips[0];
    //! Link every clip with children to its root, for better visualization.
    for ( const clip of this.linkedClips.filter(({ children }) => children?.length) ) {
      syntheticLinks.push([ ( clip.root ?? $throw(`Clip ${clip.id} has no root.`) ).id, clip.id, 'descendant' ]);
    };
    return syntheticLinks;
  };

  getTotalDescendants(clipId: string) {
    const clip = find(this.linkedClips, { id: clipId }) ?? $throw(`Clip ${clipId} not found.`);
    return clip.totalDescendants ??= (
      1 + ( clip.children?.reduce((sum, { clip: { id: childId } }) => sum + this.getTotalDescendants(childId), 0) ?? 0 )
    );
  };

  private _graphData = Undefined<ColonyGraphData>();

  getGraphData() {

    const nodes = this.sortedClips.map(({ id, title: name, metadata: { tags }, created_at, children, audio_url, image_url, root }) => ({
      id,
      name: name || tags || created_at || id,
      created_at,
      audio_url,
      image_url,
      tags,
      rootId: root?.id,
      // val: Math.log10(this.getTotalDescendants(id) + 1),
      val: id === root?.id && children?.length
        ? 2
        : children?.length
          ? 1
          : 0.5,
    }));
    
    const formatLink = ([ source, target, kind ]: Link | SyntheticLink) => ({
      source,
      target,
      kind,
      color: kind === 'next' ? '#006' : undefined, //! (To make time-based links less prominent on a dark background)
      isMain: !SYNTHETIC_LINK_KINDS.includes(kind as any) && this.getTotalDescendants(target) > 1,
    });

    const result = {
      nodes,
      links: [
        ...this.syntheticLinks,
        ...this.state.links,
      ].map(formatLink),
    } satisfies GraphData;
    return result;
  };

  get graphData() {
    return this._graphData ??= this.getGraphData();
  };

  getHtml(mode?: '3d' | '3D') {
    console.log("Rendering your colony, give it a few seconds...");

    return `<script>(vovas = {${
      window.vovas.main.toString()
    }}).main();vovas.colony.render(...${
      JSON.stringify([ mode, this.graphData ])
    })</script>`;
  };

  async render(
    mode?: '3d' | '3D',
    data?: ColonyGraphData,
  ) {
    console.log("Rendering your colony, give it a few seconds...");
    this._graphData ??= data;
    await render(this, this.graphData, { mode });
  };

  renderToFile(...params: Parameters<typeof this.getHtml>) {
    const html = this.getHtml(...params);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'suno_colony.html';
    a.click();
    URL.revokeObjectURL(url);
  };

};

export type ColonyGraphData = ReturnType<typeof Colony.prototype.getGraphData>;
export type ColonyNode = OptionalIfUndefinable<ColonyGraphData['nodes'][number]>;
export type ColonyLink = OptionalIfUndefinable<ColonyGraphData['links'][number]>;

const colony = new Colony();

colony.stateLoaded.promise.then(async () => {
  console.log('Welcome to Vova’s Suno Colony! This is a nifty tool to visualize your liked clips and the relationships between them, such as extensions, inpaints, covers, etc., in a graph format. It takes a bit of time and hacks to build, but hopefully it’ll be worth it!');
  const { state: { allPagesProcessed, allLinksBuilt } } = colony;
  if ( !allPagesProcessed || !allLinksBuilt ) {
    console.log('Run `await vovas.colony.build()` to start or continue building your colony!');
  } else {
    console.log('Your colony is built, rendering!');
    await colony.render();
  }
});

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

mutate(window.vovas, { Colony, colony, debug });