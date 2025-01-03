import { RawClip } from "../baseTypes";
import { Branded } from "../types";
import { mutate } from "../utils";

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

export class Genealogy {

  private rawClips: RawClip[] = [];

  async build() {
    for ( let page = 0; ; page++ ) {
      const { data: { clips } } = await window.suno.root.apiClient.GET('/api/feed/v2', { params: { query: { 
        is_liked: true,
        page,
      }}});
      if ( !clips.length ) {
        break;
      };
      this.rawClips.push(...clips);
    }
  }

};

mutate(window, { Genealogy });