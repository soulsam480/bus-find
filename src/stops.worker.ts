import Fuse from 'fuse.js';
import { get, set } from 'idb-keyval';

export interface IStopsWorkerResponse {
  results: string[];
}

interface ILastResult {
  query: string;
  results: string[];
}

export class StopsWorker {
  fuse!: Fuse<string>;
  dataStops: string[] = [];
  dataStopRoutes: Record<string, string[]> = {};

  lastResult: ILastResult | undefined;

  log(...args: any[]) {
    console.log('[stops worker]: ', ...args);
  }

  async fetchStops() {
    this.log('fetching stops');

    try {
      const resp = await fetch(
        'https://golden-beijinho-3bd2e6.netlify.app/stops.json',
      );

      this.dataStops = await resp.json();

      set('__bus_find_stops__', this.dataStops);

      this.log('fetching stops done');
    } catch (error) {
      this.log('fetching stops error ', error);
    }
  }

  async fetchStopRoutes() {
    this.log('fetching stop-routes');

    try {
      const resp = await fetch(
        'https://golden-beijinho-3bd2e6.netlify.app/stop-routes.json',
      );

      this.dataStopRoutes = await resp.json();

      set('__bus_find_stop-routes__', this.dataStopRoutes);

      this.log('fetching stop-routes done');
    } catch (error) {
      this.log('fetching stop-routes error ', error);
    }
  }

  initFuse() {
    this.log('Fuse init');

    this.fuse = new Fuse<string>(this.dataStops, {
      shouldSort: true,
      includeMatches: false,
      includeScore: false,
    });

    this.log('Fuse init done');
  }

  async initStopsDb() {
    if (!this.dataStops.length) {
      await this.fetchStops();
    } else this.fetchStops();
  }

  async initStopRoutesDb() {
    if (!this.dataStopRoutes.length) {
      await this.fetchStopRoutes();
    } else this.fetchStopRoutes();
  }

  async init() {
    this.log('init');

    this.dataStops = (await get('__bus_find_stops__')) || [];
    this.dataStopRoutes = (await get('__bus_find_stop-routes__')) || {};

    await Promise.all([this.initStopsDb(), this.initStopRoutesDb()]);

    this.initFuse();

    return this;
  }

  search(value: string) {
    const start = Date.now();

    this.log('searching query ', value);

    const results =
      this.lastResult?.query === value
        ? this.lastResult.results
        : this.fuse.search(value, { limit: 10 }).map((i) => i?.item);

    this.log('search done in ', Date.now() - start, ' ms');

    return results;
  }
}
