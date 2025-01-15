import { api } from "../api";
import { $throw, mutate } from "../utils";

type HistoryItem = {
  id: string,
  baseId: string,
  modifierId: string,
  type: string,
};

async function getHistory(id: string) {
  const result: HistoryItem[] = [];
  while ( true ) {
    const { metadata } = await api.getClip(id) ?? $throw(`Clip with id ${id} not found`);
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