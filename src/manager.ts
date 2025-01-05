import { RawClip } from "./baseTypes";
import { $throw } from "./utils";

export type SunoManager = {
  root: {
    clips: {
      loadClipById(id: string): Promise<RawClip | undefined>,
    },
    apiClient: {
      GET(
        url: '/api/feed/v2',
        config: {
          params: { 
            query: { 
              is_liked?: true,
              page: number,
            }}
        }
      ): Promise<{ data: { 
        clips: RawClip[],
        current_page: number,
        num_total_results: number,
      } }>,
    }
  }
};

export function suno() {
  return window.suno ?? $throw('`suno` object not found in `window`. Have you followed the setup instructions?');
}