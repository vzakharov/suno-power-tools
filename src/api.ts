import { RawClip } from "./baseTypes";

declare global {
  interface Window {
    Clerk: {
      session: {
        getToken(): Promise<string>
      }
    }
  }
};

const BASE_URL = "https://studio-api.prod.suno.com/api/"

type PathFactory<TArgs extends any[]> = (...args: TArgs) => string;
type AsyncFn<TArgs extends any[], TResult> = (...args: TArgs) => Promise<TResult>;

function fetcher<TArgs extends any[], TResult>(pathFactory: PathFactory<TArgs>): AsyncFn<TArgs, TResult>;
function fetcher<TArgs extends any[], TResult>(pathFactory: PathFactory<TArgs>, ignore404: true): AsyncFn<TArgs, TResult | undefined>;

function fetcher<TArgs extends any[], TResult>(pathFactory: PathFactory<TArgs>, ignore404?: true) {
  return async (...args: TArgs) => {
    const path = pathFactory(...args);
    const response = await fetch(BASE_URL + path, {
      headers: {
        authorization: `Bearer ${await window.Clerk.session.getToken()}`
      }
    });
    if ( response.status === 404 && ignore404 ) {
      console.warn(`Could not find resource at ${path}, returning undefined`);
      return;
    };
    return await response.json() as TResult;
  };
};

export const api = {

  getClips: fetcher<
    [page: number],
    { 
      clips: RawClip[],
      current_page: number,
      num_total_results: number,
    }
  >(page => 'feed/v2?is_liked=true&page=' + page),

  getClip: fetcher<[id: string], RawClip>(
    id => 'clip/' + id,
    true
  ),

};