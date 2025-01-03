import { RawClip } from "./baseTypes";

export type SunoManager = {
  root: {
    clips: {
      loadClipById(id: string): Promise<RawClip>,
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