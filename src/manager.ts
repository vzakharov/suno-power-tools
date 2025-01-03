import { Clip } from "./baseTypes";

function dummyMethod(...args: any[]) {
  throw new Error("This is a dummy method. Have you done the steps outlined in the repository’s README? Please make sure you do so before running this code.");
}

const dummySuno = {
  root: {
    clips: {
      loadClipById: dummyMethod as (id: string) => Promise<Clip>,
    },
    apiClient: {
      GET: dummyMethod as (
        url: '/api/feed/v2',
        params: { 
          query: { 
            is_liked?: true,
            page: number,
          }}
      ) => Promise<{ data: { 
        clips: Clip[],
        current_page: number,
        num_total_results: number,
      } }>,
    }
  }
};

export type SunoManager = typeof dummySuno;

// export function getSuno() {
//   // if ('suno' in window) {
//   //   return window.suno as SunoManager;
//   // };
//   // throw new Error("Suno manager not found in window object. Make sure you have followed the steps outlined in the repository’s README.");
//   if ( this instanceof Window )
//     throw new Error("This function should be called at a specific breakpoint in the code. Please refer to the repository’s README for more information.");
// }

// export const suno = this instanceof Window ? (() => {
//   throw new Error("This function should be called at a specific breakpoint in the code. Please refer to the repository’s README for more information.");
// })() : this as SunoManager;