export interface IStore {
  input: string;
  limit: number;
  page: number;
  searchBy: 'route_name' | 'route_stops';
}
