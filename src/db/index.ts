import { getStore } from '../sql';

export function useDb() {
  const store = getStore();

  return { sql: store.worker?.db.query };
}
