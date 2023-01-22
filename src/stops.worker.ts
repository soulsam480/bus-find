import Fuse from 'fuse.js';
import { get, set } from 'idb-keyval';

export interface IStopsWorkerResponse {
  results: string[];
}

export class StopsWorker {
  fuse!: Fuse<string>;
  dataStops: string[] = [];
  dataStopRoutes: Record<string, string[]> = {};

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
      distance: 50,
      includeMatches: false,
      includeScore: false,
    });

    this.log('Fuse init done');
  }

  async init() {
    this.log('init');

    this.dataStops = (await get('__bus_find_stops__')) || [];
    this.dataStopRoutes = (await get('__bus_find_stop-routes__')) || {};

    await Promise.all([
      (async () => {
        if (!this.dataStops.length) {
          await this.fetchStops();
        } else this.fetchStops();
      })(),
      (async () => {
        if (!this.dataStopRoutes.length) {
          await this.fetchStopRoutes();
        } else this.fetchStopRoutes();
      })(),
    ]);

    this.initFuse();

    return this;
  }

  search(value: string) {
    return this.fuse.search(value);
  }
}
