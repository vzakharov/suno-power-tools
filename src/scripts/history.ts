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
    const { metadata } = await window.suno.root.clips.loadClipById(id);
    if (!( 'concat_history' in metadata )) {
      return result;
    };
    const { concat_history: [ 
      { id: baseId, type },
      { id: modifierId } 
    ] } = metadata;
    result.push({ id, baseId, modifierId, type });
    id = baseId;
  };
};

mutate(window, { getHistory });