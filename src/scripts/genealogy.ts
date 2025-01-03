import { RawClip } from "../baseTypes";
import { Branded } from "../types";
import { atLeast, mutate } from "../utils";

export type LinkKind = Branded<'RelationKind', string>;

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

  download() {
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
      while ( true ) {
        await atLeast(1000); //! (to avoid rate limiting)
        const { data: { clips } } = await window.suno.root.apiClient.GET('/api/feed/v2', { params: { query: { 
          is_liked: true,
          page: this.lastProcessedPage + 1,
        }}});
        if ( !clips.length ) {
          this.allPagesProcessed = true;
          break;
        };
        this.rawClips.push(...clips);
        this.lastProcessedPage++;
        console.log(`Processed page ${this.lastProcessedPage}; total clips: ${this.rawClips.length}`);
      }
    };
  }

};

const genealogy = new Genealogy();

mutate(window, { genealogy });