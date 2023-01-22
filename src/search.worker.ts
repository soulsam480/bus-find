import Fuse from 'fuse.js';
import { IStore } from './type';
import { get, set } from 'idb-keyval';

export interface IRoute {
  id: string;
  route_name: string;
  route_stops: string[];
  map_link: string | null;
}

export interface IWorkerResponse {
  pages: number;
  current: number;
  results: Omit<IRoute, 'route_stops'>[];
  total: number;
  route?: IRoute;
}

interface IWorkerParams extends IStore {
  id?: string;
}

export class SearchWorker {
  fuse!: Fuse<IRoute>;
  data: IRoute[] = [];

  lastSearch: string = '';
  lastResults: Fuse.FuseResult<IRoute>[] = [];
  lastResponse!: IWorkerResponse;

  log(...args: any[]) {
    console.log('[search worker]: ', ...args);
  }

  search(value: string) {
    return this.fuse.search(value);
  }

  removeStops(data: Fuse.FuseResult<IRoute>[]) {
    return data.map(({ item }) => {
      return {
        id: item.id,
        route_name: item.route_name,
        map_link: item.map_link,
      };
    });
  }

  getRoute(id?: string) {
    this.log('route lookup ', id);

    return this.lastResults.find((route) => route.item.id === id)?.item ?? null;
  }

  async fetchDb() {
    this.log('fetching db');

    try {
      const resp = await fetch(
        'https://golden-beijinho-3bd2e6.netlify.app/db.json',
      );

      this.data = await resp.json();

      set('__bus_find__', this.data);

      this.log('fetching db done');
    } catch (error) {
      this.log('fetching db error ', error);
    }
  }

  paginate(data: Fuse.FuseResult<IRoute>[], page: number, limit: number) {
    const start = (page - 1) * limit;
    const end = start + limit;
    return data.slice(start, end);
  }

  handleSearch(data: IWorkerParams, force = false): IWorkerResponse {
    const start = Date.now();

    if (!data.input) {
      return {
        pages: 0,
        current: 1,
        results: [],
        total: 0,
      };
    }

    if (force || data.input !== this.lastSearch) {
      this.log('searching query ', data.input);

      this.lastSearch = data.input;

      this.lastResults = this.search(data.input);
    } else {
      this.log('using last search cache for ', data.input);
    }

    // @ts-expect-error added later
    const result: IWorkerResponse = {};

    result.current = data.page;
    result.pages = Math.ceil(this.lastResults.length / data.limit);
    result.results = this.removeStops(
      this.paginate(this.lastResults, data.page, data.limit),
    );
    result.total = this.lastResults.length;

    this.lastResponse = result;

    this.log('search done in ', Date.now() - start, ' ms');

    return result;
  }

  initFuse() {
    this.log('Fuse init');

    const index = Fuse.createIndex(['route_name'], this.data);

    this.fuse = new Fuse<IRoute>(
      this.data,
      {
        keys: ['route_name'],
        shouldSort: true,
        distance: 50,
        includeMatches: false,
        includeScore: false,
      },
      index,
    );

    this.log('Fuse init done');
  }

  async init() {
    this.log('init');

    this.data = (await get('__bus_find__')) || [];

    if (!this.data.length) {
      await this.fetchDb();
    } else this.fetchDb();

    this.initFuse();

    return this;
  }
}
