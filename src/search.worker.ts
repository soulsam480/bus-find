import Fuse from 'fuse.js';
import { IStore } from './type';

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
  op: 'SEARCH' | 'GET_ROUTE' | 'SET_OPTION';
  id?: string;
}

class FuseWorker {
  fuse!: Fuse<IRoute>;
  data: IRoute[] = [];

  lastSearch: string = '';
  lastResults: Fuse.FuseResult<IRoute>[] = [];
  lastResponse!: IWorkerResponse;

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
    return this.lastResults.find((route) => route.item.id === id)?.item;
  }

  async getDb() {
    try {
      const resp = await fetch(
        'https://golden-beijinho-3bd2e6.netlify.app/db.json',
      );

      this.data = await resp.json();
    } catch (error) {
      console.log('Worker error', error);
    }
  }

  paginate(data: Fuse.FuseResult<IRoute>[], page: number, limit: number) {
    const start = (page - 1) * limit;
    const end = start + limit;
    return data.slice(start, end);
  }

  handleSearch(data: IWorkerParams, force = false) {
    if (!data.input)
      postMessage({
        pages: 0,
        current: 1,
        results: [],
      });

    if (force || data.input !== this.lastSearch) {
      console.log('searching');

      this.lastSearch = data.input;

      this.lastResults = this.search(data.input);
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

    postMessage(result);
  }

  handleMessage(e: MessageEvent) {
    const data = JSON.parse(e.data) as IWorkerParams;

    if (data.op === 'SEARCH') {
      this.handleSearch(data);
    } else if (data.op === 'GET_ROUTE' && data.id !== undefined) {
      postMessage({
        ...this.lastResponse,
        route: this.getRoute(data.id),
      });
    } else if (data.op === 'SET_OPTION') {
      this.initFuse(data.searchBy as any);
      this.handleSearch(data, true);
    }
  }

  initFuse(searchBy: IWorkerParams['searchBy'] = 'both') {
    const keys =
      searchBy === 'both' ? ['route_name', 'route_stops'] : [searchBy];

    const index = Fuse.createIndex(keys, this.data);

    this.fuse = new Fuse<IRoute>(
      this.data,
      {
        keys,
        shouldSort: true,
        distance: 50,
        includeMatches: false,
        includeScore: false,
      },
      index,
    );
  }

  async init() {
    await this.getDb();

    this.initFuse();

    return this;
  }
}

new FuseWorker().init().then((worker) => {
  postMessage('ready');

  addEventListener('message', worker.handleMessage.bind(worker));
});
