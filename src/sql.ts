import { createDbWorker, WorkerHttpvfs } from 'sql.js-httpvfs';

let store: Store;

export class Store {
  private _worker: WorkerHttpvfs | null = null;

  error = '';
  ready: Promise<WorkerHttpvfs>;

  constructor() {
    Object.assign(window, { httpvfs: this });
    this.ready = this.init();
  }

  async init(): Promise<WorkerHttpvfs> {
    const workerUrl = new URL(
      'sql.js-httpvfs/dist/sqlite.worker.js',
      import.meta.url,
    );

    console.log('worker url', workerUrl);
    const wasmUrl = new URL(
      'sql.js-httpvfs/dist/sql-wasm.wasm',
      import.meta.url,
    );

    const dbDir = 'https://golden-beijinho-3bd2e6.netlify.app/db-chunks';

    this._worker = await createDbWorker(
      [
        {
          from: 'jsonconfig',
          configUrl: dbDir + '/config.json',
        },
      ],
      workerUrl.toString(),
      wasmUrl.toString(),
    );

    await this._worker.db.query('select * from routes;');

    return this._worker;
  }

  get worker() {
    return this._worker;
  }
}

export function getStore() {
  if (!store) {
    store = new Store();
  }

  return store;
}
