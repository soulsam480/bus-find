<script setup lang="ts">
import { useClipboard, useStorage, useUrlSearchParams } from '@vueuse/core';
import type { Remote } from 'comlink';
import { computed, onMounted, ref, watch } from 'vue';
import BDialog from './BDialog.vue';
import SearchBy from './SearchBy.vue';
import type { IProjectMeta } from './encryption';
import PerPage from './PerPage.vue';
import type {
  IRoute,
  ISearchWorkerResponse,
  SearchWorker,
} from './search.worker';
import type { StopsWorker } from './stops.worker';
import { IStore } from './type';

const STATE_KEYS = [
  'input',
  'limit',
  'page',
  'searchBy',
  'sourceStop',
  'destinationStop',
];

const searchWorkerWithComlink = new ComlinkWorker<
  typeof import('./search.worker')
>(new URL('./search.worker.ts', import.meta.url));

const stopsWorkerWithComlink = new ComlinkWorker<
  typeof import('./stops.worker')
>(new URL('./stops.worker.ts', import.meta.url));

let searchWorker: Remote<SearchWorker>;
let stopsWorker: Remote<StopsWorker>;

const sourceInfo = ref<IProjectMeta | null>(null);
const store = useStorage<IStore>('store', {
  input: '',
  limit: 30,
  page: 1,
  searchBy: 'route_name',
  sourceStop: '',
  destinationStop: '',
});
const searchWorkerResponse = ref<ISearchWorkerResponse | null>(null);
const stopsWorkerResponse = ref<string[]>([]);
const stopSearchFieldInFocus = ref<'source' | 'destination' | null>(null);
const workerInit = ref(false);

const params = useUrlSearchParams<IStore>('history');

const {
  copy,
  isSupported,
  copied: copiedFull,
} = useClipboard({ legacy: true });

function copyToClip() {
  copy(window.location.href);
}

async function initSearchWorker() {
  searchWorker = await new searchWorkerWithComlink.SearchWorker();

  await searchWorker.init();
}

async function initStopsWorker() {
  stopsWorker = await new stopsWorkerWithComlink.StopsWorker();

  await stopsWorker.init();
}

onMounted(async () => {
  await Promise.all([initSearchWorker(), initStopsWorker()]);

  workerInit.value = true;

  let defaultParams: IStore = {
    input: '',
    limit: 30,
    page: 1,
    searchBy: 'route_name',
    sourceStop: '',
    destinationStop: '',
  };

  if (Object.keys(store.value).length < 4) {
    store.value = defaultParams;
  }

  if (Object.keys(params).length === 0) {
    STATE_KEYS.forEach((key) => {
      //@ts-expect-error bad types
      params[key as keyof IStore] = store.value[key];
    });
  } else if (JSON.stringify(store.value) !== JSON.stringify(params)) {
    defaultParams = {
      ...params,
      limit: Number(params.limit),
      page: Number(params.page),
    };

    store.value = defaultParams;
  }

  if (store.value.searchBy === 'route_stops') {
    stopSearchFieldInFocus.value = 'source';
  } else {
    searchWorkerResponse.value = await searchWorker.handleSearch({
      ...defaultParams,
    });
  }

  import('./encryption').then(async (mod) => {
    sourceInfo.value = await mod.getSource();
  });
});

watch(
  store,
  (val) => {
    STATE_KEYS.forEach((key) => {
      //@ts-expect-error bad types
      params[key as keyof IStore] = val[key];
    });
  },
  { deep: true },
);

const routeNameSearchQuery = computed(() => store.value.input);

watch(routeNameSearchQuery, async () => {
  store.value = {
    ...store.value,
    page: 1,
  };

  searchWorkerResponse.value = await searchWorker.handleSearch({
    ...store.value,
  });
});

watch([() => store.value.limit, () => store.value.page], async () => {
  searchWorkerResponse.value = await searchWorker.handleSearch({
    ...store.value,
  });
});

watch(() => store.value.searchBy, handleSearchByChange);

watch(
  [
    () => store.value.sourceStop,
    () => store.value.destinationStop,
    stopSearchFieldInFocus,
    workerInit,
  ],
  async ([source, dest, fieldInFocus, workerInit]) => {
    if (!workerInit || fieldInFocus === null) return;

    stopsWorkerResponse.value = await stopsWorker.search(
      fieldInFocus === 'source' ? source : dest,
    );
  },
);

function handleStopFieldSelection(stop: string) {
  if (stopSearchFieldInFocus.value === 'source') {
    store.value.sourceStop = stop;
  } else {
    store.value.destinationStop = stop;
  }

  stopSearchFieldInFocus.value = null;
  stopsWorkerResponse.value = [];
}

function handleFieldFocus(field: 'source' | 'destination') {
  stopSearchFieldInFocus.value = field;
}

async function handleSearchByChange(mode: IStore['searchBy']) {
  if (mode === 'route_name') {
    stopSearchFieldInFocus.value = null;
    searchWorkerResponse.value = await searchWorker.handleSearch({
      ...store.value,
    });
  } else {
    document.querySelector<HTMLElement>('#source-stop')?.focus();
    stopSearchFieldInFocus.value = 'source';
  }
}

const activeRoute = ref<IRoute | null>(null);

async function handleSeeStops(id: string) {
  activeRoute.value = await searchWorker.getRoute(id);
}

const activeRouteStopSearchQuery = ref('');

const activeRouteStops = computed(
  () =>
    activeRoute.value?.route_stops.slice().filter((stop) => {
      const regex = new RegExp(
        `${activeRouteStopSearchQuery.value.replace(/\\|\//g, '')}`,
        'i',
      );

      return regex.test(stop);
    }) ?? [],
);
</script>
<template>
  <div class="min-h-screen max-w-screen">
    <div class="flex flex-col w-full gap-4 mx-auto sm:max-w-lg">
      <div
        class="flex flex-col gap-4 bg-gray-100 px-3 pt-2 pb-4 rounded-b-lg sticky top-0"
      >
        <div class="flex items-start gap-2">
          <div class="flex flex-col gap-2">
            <div class="text-2xl font-semibold inline-flex items-center">
              <img
                src="/icon-192-192.png"
                class="w-12 h-12 antialiased"
                alt="logo"
              />
              Search bus
            </div>
            <div class="text-xs">
              The search uses fuzzy search technique. It will find results
              approximately matching the search query.
            </div>
          </div>

          <template v-if="sourceInfo !== null">
            <a class="underline" :href="sourceInfo.source">source</a>
          </template>
        </div>

        <b-dialog
          :open="activeRoute !== null"
          @close="
            () => {
              activeRoute = null;
              activeRouteStopSearchQuery = '';
            }
          "
          class="bg-white rounded-lg p-3 flex flex-col gap-2"
        >
          <div class="text-right -top-3 z-50 sticky bg-white pb-2">
            <button
              @click="
                () => {
                  activeRoute = null;
                  activeRouteStopSearchQuery = '';
                }
              "
              class="p-2"
            >
              Close X
            </button>
            <input
              :placeholder="`Search stops in ${
                activeRoute?.route_name ?? ''
              } route`"
              v-model="activeRouteStopSearchQuery"
              class="w-full rounded p-2"
              type="text"
              autofocus
              autocomplete="off"
            />
          </div>

          <div class="flex flex-col-reverse gap-2">
            <template v-if="activeRouteStops.length > 0">
              <div
                class="p-2 text-sm flex items-center gap-2"
                v-for="stop in activeRouteStops"
                :key="stop"
              >
                <span
                  class="relative w-3 h-3 rounded-full bg-gray-500 before:(content-none z-1 block absolute inset-1 w-1 h-1 rounded-full bg-white)"
                ></span>
                <span>{{ stop }}</span>
              </div>
            </template>

            <template v-else>
              <div class="p-2 text-sm flex items-center gap-2">
                No stops found
              </div>
            </template>
          </div>
        </b-dialog>

        <search-by v-model:mode="store.searchBy" />

        <template v-if="store.searchBy === 'route_name'">
          <div class="flex flex-col gap-1">
            <label for="search">Source</label>
            <input
              id="search"
              class="w-full rounded px-2 py-1"
              type="text"
              v-model="store.input"
              placeholder="Source"
              autofocus
              autocomplete="off"
            />
          </div>

          <div class="flex gap-2">
            <per-page v-model:limit="store.limit" />

            <div class="flex flex-col gap-1 flex-grow">
              <label class="truncate"
                >Page (total {{ searchWorkerResponse?.pages ?? 0 }})</label
              >

              <div class="flex items-center gap-4 max-w-full">
                <button
                  :disabled="store.page === 1"
                  @click="store.page -= 1"
                  class="text-sm rounded px-2 py-1 bg-gray-500 text-white flex items-center disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <span>Prev</span>
                </button>
                <span class="flex-grow text-center">{{ store.page }}</span>
                <button
                  :disabled="
                    searchWorkerResponse?.pages === 0 ||
                    store.page === (searchWorkerResponse?.pages ?? 1)
                  "
                  @click="store.page += 1"
                  class="text-sm rounded px-2 py-1 bg-gray-500 text-white flex items-center disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <span>Next</span>
                </button>
              </div>
            </div>

            <div v-if="isSupported" class="self-end">
              <button
                @click="copyToClip()"
                class="rounded px-2 py-1 bg-gray-500 text-sm text-white self-center"
              >
                <span v-if="copiedFull"> Copied ! </span>
                <span v-else> Copy search link </span>
              </button>
            </div>
          </div>

          <div class="text-sm">
            Showing {{ store.limit }} of
            {{ searchWorkerResponse?.total ?? 'none' }} total
            {{ store.searchBy === 'route_name' ? 'Bus routes' : 'Bus stops' }}
          </div>
        </template>

        <template v-else>
          <div class="flex flex-col gap-1">
            <label for="source-stop">Source Stop</label>

            <div class="flex gap-2 items-center">
              <input
                id="source-stop"
                class="w-full rounded px-2 py-1"
                type="text"
                v-model="store.sourceStop"
                placeholder="K R Puram Railway Station"
                autocomplete="off"
                @focus="handleFieldFocus('source')"
              />
              <button
                class="rounded-full bg-gray-500 h-[29px] w-[29px] text-white flex-shrink-0"
                @click="store.sourceStop = ''"
              >
                x
              </button>
            </div>
          </div>
          <div class="flex flex-col gap-1">
            <label for="destination-stop">Destination Stop</label>

            <div class="flex gap-2 items-center">
              <input
                id="destination-stop"
                class="w-full rounded px-2 py-1"
                type="text"
                v-model="store.destinationStop"
                placeholder="Garudacharpalya"
                autocomplete="off"
                @focus="handleFieldFocus('destination')"
              />
              <button
                class="rounded-full bg-gray-500 h-[29px] w-[29px] text-white flex-shrink-0"
                @click="store.destinationStop = ''"
              >
                x
              </button>
            </div>
          </div>
        </template>
      </div>

      <div class="flex flex-col gap-2 p-2">
        <template v-if="store.searchBy === 'route_name'">
          <div
            class="flex justify-between items-center gap-2 bg-gray-100 rounded-lg px-2 py-3"
            v-for="bus in searchWorkerResponse?.results ?? []"
            :key="String(bus.id)"
          >
            <div class="text-xl">
              {{ bus.route_name }}
            </div>

            <div class="flex justify-end gap-3 items-center">
              <a
                v-if="bus.map_link"
                :href="bus.map_link"
                target="_blank"
                class="underline font-semibold text-sm"
                >google map</a
              >

              <button
                class="rounded p-1 bg-gray-500 text-sm text-white self-center"
                @click="handleSeeStops(bus.id)"
              >
                see stops
              </button>
            </div>
          </div>

          <div v-if="!Boolean(searchWorkerResponse?.results.length)">
            <ul class="list-disc text-sm">
              <li>
                <span class="font-semibold">Search by stops</span> doesn't work
                right now
              </li>
              <li>
                The implementation is under works and will be probably done next
                week once I've some time.
              </li>
              <li v-if="sourceInfo === null">
                If you want to contribute and respect my privacy, LMK will send
                you the source link, it's FOSS
              </li>
            </ul>
          </div>
        </template>

        <template v-else>
          <div
            v-for="stop in stopsWorkerResponse"
            :key="stop"
            class="bg-gray-100 rounded-lg px-2 py-3 cursor-pointer text-xl"
            @click="handleStopFieldSelection(stop)"
          >
            {{ stop }}
          </div>
        </template>
      </div>

      <div class="text-xs text-center py-2">
        Released under the
        <a class="underline" href="https://opensource.org/licenses/MIT"
          >MIT License.</a
        >
        <br />

        <span v-if="sourceInfo !== null">
          Copyright © {{ new Date().getFullYear() }} {{ sourceInfo.author }}
        </span>
      </div>
    </div>
  </div>
</template>
