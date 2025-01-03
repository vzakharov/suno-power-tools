import { mutate } from "../utils";

export type HistoryItem = {
  id: string,
  baseId: string,
  modifierId: string,
  type: string,
};

export async function getHistory(id: string) {
  const result: HistoryItem[] = [];
  while ( true ) {
    const { metadata: { concat_history } } = await window.suno.root.clips.loadClipById(id);
    if ( !concat_history ) {
      return result;
    };
    const [ { id: baseId, type }, { id: modifierId } ] = concat_history;
    result.push({ id, baseId, modifierId, type });
    id = baseId;
  };
};

mutate(window, { getHistory });