import { RawClip } from "../baseTypes";
import { findCropBaseClipId } from "../cropping";
import { filter, find } from "../lodashish";
import { $throw, atLeast, jsonClone, mutate, uploadTextFile } from "../utils";

export type MissingClip = RawClip & {
  isMissing: true,
};

export type LinkKind = 'extend' | 'inpaint' | 'apply' | 'cover' | 'remaster' | 'crop';

export type SerializedLink = [
  parentId: string,
  childId: string,
  kind: LinkKind,
];

export type MonoLink = {
  kind: LinkKind,
  clip: LinkedClip,
};

export type LinkedClip = RawClip & {
  children?: MonoLink[],
  parent?: MonoLink,
};

export type GenealogyConfig = ConstructorParameters<typeof Genealogy>;

export class Genealogy {

  constructor(
    private rawClips: RawClip[] = [],
    private lastProcessedPage = -1,
    private allPagesProcessed = false,
    private links: SerializedLink[] = [],
    private allLinksBuilt = false,
  ) {}

  get config(): GenealogyConfig {
    return [ this.rawClips, this.lastProcessedPage, this.allPagesProcessed, this.links, this.allLinksBuilt ];
  };
  set config(config: GenealogyConfig) {
    Object.assign(this, new Genealogy(...config));
  };

  reset() {
    this.config = [];
    console.log('Genealogy reset. Run build() to start building it again.');
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
    a.download = 'suno_genealogy.json';
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
      const { data: { clips } } = await window.suno.root.apiClient.GET('/api/feed/v2', {
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
    const clip = await window.suno.root.clips.loadClipById(id) ?? missingClip(id);
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
          ? [ 
            metadata.history[0].id,
            metadata.history[0].infill
              ? 'inpaint'
              : 'extend'
          ]
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
    return this._linkedClips ??=
      this.links.reduce(
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
        jsonClone(this.rawClips) as LinkedClip[]
      );
  };

  private _rootClips: LinkedClip[] | undefined;

  get rootClips() {
    return this._rootClips ??=
      filter(this.linkedClips, { parent: undefined });
  };

  private _html: string | undefined;

  get html() {
    return this._html ??=
      this.rootClips.map(renderRootClip).join('')
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

function renderRootClip(clip: LinkedClip) {
  return `<h2>${clipSpan(clip)}</h2>${renderChildren(clip)}`;
};

function renderChildren(clip: LinkedClip) {
  return clip.children ? `<ul>${
    clip.children.map(renderChild).join('')
  }</ul>` : '';
};

function renderChild({ clip, kind }: MonoLink) {
  return `<li> ${kind} -> ${clipSpan(clip)}${renderChildren(clip)}</li>`;
};

function clipSpan(clip: LinkedClip) {
  return `<span><a href="https://suno.com/song/${
    clip.id
  }" target="_blank">${
    clip.title
  }</a><audio controls src="${
    clip.audio_url
  }"></audio><img src="${
    clip.image_url
  }" alt="${
    clip.title
  }" style="max-width: 64px; max-height: 64px;"></span>`;
};

const gen = new Genealogy();

function isV2AudioFilename(id: string) {
  return id.match(/_\d+$/);
}

export function missingClip(id: string): MissingClip {
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

mutate(window, { spt: { gen }});