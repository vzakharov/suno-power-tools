import { RawClip } from "../baseTypes";
import { findCropBaseClipId } from "../cropping";
import { Branded } from "../types";
import { atLeast, mutate, uploadTextFile } from "../utils";

export type LinkKind = string; //Branded<'RelationKind', string>;

export type Link = {
  parent: RawClip,
  child: RawClip,
  kind: LinkKind,
};

export type MonoLink = {
  kind: LinkKind,
  clip: RawClip,
};

// export type LinkedClip = Clip & {
//   parent?: MonoLink,
//   children?: MonoLink[],
// };

export type RootClip = RawClip & {
  children?: Link[],
};

export type BranchClip = RootClip & {
  parent: Link,
};

export type GenealogyConfig = ConstructorParameters<typeof Genealogy>;

export class Genealogy {

  constructor(
    private rawClips: RawClip[] = [],
    private lastProcessedPage = -1,
    private allPagesProcessed = false,
  ) {}

  reset(config: GenealogyConfig = []) {
    Object.assign(this, new Genealogy(...config));
    console.log('Genealogy reset. Run build() to start building it again.');
  };

  async loadState() {
    const json = await uploadTextFile();
    if ( !json ) {
      console.log('No file selected, aborting.');
      return;
    };
    const [ rawClips, lastProcessedPage, allPagesProcessed ] = JSON.parse(json);
    this.reset([ rawClips, lastProcessedPage, allPagesProcessed ]);
  }

  saveState() {
    const json = JSON.stringify([this.rawClips, this.lastProcessedPage, this.allPagesProcessed]);
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

    await this.buildLinks();

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
    const clip = await window.suno.root.clips.loadClipById(id);
    this.rawClips.push(clip);
    return clip;
  };

  private async rawClipById(id: string) {
    return this.rawClipsById[id] ??= this.rawClips.find(clip => clip.id === id) ?? await this.loadClip(id);
  };

  private links: Link[] = [];

  private async buildLinks() {
    console.log('Building links...');
    for (const child of this.rawClips) {
      const { metadata } = child;
      const [ parentId, kind ] =
        'history' in metadata 
          ? [ metadata.history[0].id, metadata.history[0].type ]
        : 'concat_history' in metadata
          ? [ metadata.concat_history[1].id, 'join' ]
        : 'cover_clip_id' in metadata
          ? [ metadata.cover_clip_id, 'cover' ]
        : 'upsample_clip_id' in metadata
          ? [ metadata.upsample_clip_id, 'remaster' ]
        : 'type' in metadata && metadata.type === 'edit_crop'
          ? [ await findCropBaseClipId(child, this.rawClips), 'crop' ]
        : [ undefined, undefined ];
      if (parentId) {
        this.links.push({
          parent: await this.rawClipById(parentId),
          child,
          kind,
        });
      }
    };
    console.log(`Built ${this.links.length} links.`);
  };

};

const gen = new Genealogy();

mutate(window, { spt: { gen }});