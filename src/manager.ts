import { Clip } from "./baseTypes";

export type SunoManager = {
  root: {
    clips: {
      loadClipById(id: string): Promise<Clip>,
    },
    apiClient: {
      GET(
        url: '/api/feed/v2',
        params: { 
          query: { 
            is_liked?: true,
            page: number,
          }}
      ): Promise<{ data: { 
        clips: Clip[],
        current_page: number,
        num_total_results: number,
      } }>,
    }
  }
};