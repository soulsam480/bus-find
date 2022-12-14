<script setup lang="ts">
import {
  useClipboard,
  useStorage,
  useUrlSearchParams,
  useWebWorker,
} from '@vueuse/core';
import { computed, onMounted, ref, watch, watchEffect } from 'vue';
import BDialog from './BDialog.vue';
import { IRoute, IWorkerResponse } from './search.worker';
import SearchWorker from './search.worker?worker';
import { IStore } from './type';

const STATE_KEYS = ['input', 'limit', 'page', 'searchBy'];

const store = useStorage<IStore>('store', {
  input: '',
  limit: 30,
  page: 1,
  searchBy: 'both',
});

const params = useUrlSearchParams<IStore>('history');

const {
  copy,
  isSupported,
  copied: copiedFull,
} = useClipboard({ legacy: true });

function copyToClip() {
  copy(window.location.href);
}

onMounted(() => {
  let _store = { ...store.value };

  if (Object.keys(_store).length < 4) {
    store.value = {
      input: '',
      limit: 30,
      page: 1,
      searchBy: 'both',
    };
  }

  if (Object.keys(params).length === 0) {
    STATE_KEYS.forEach((key) => {
      //@ts-expect-error bad types
      params[key as keyof IStore] = store.value[key];
    });
  } else if (JSON.stringify(store.value) !== JSON.stringify(params)) {
    store.value = {
      ...params,
      limit: Number(params.limit),
      page: Number(params.page),
    };
  }
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

const input = computed(() => store.value.input);

const { data: response, post } = useWebWorker<IWorkerResponse | null>(
  () => new SearchWorker(),
);

watchEffect(() => {
  if (typeof response.value === 'string') {
    post(
      JSON.stringify({
        ...store.value,
        op: 'SET_OPTION',
      }),
    );

    const payload = {
      ...store.value,
      op: 'SEARCH',
    };

    post(JSON.stringify(payload));
  }
});

watch(input, () => {
  store.value = {
    ...store.value,
    page: 1,
  };

  const payload = {
    ...store.value,
    op: 'SEARCH',
  };

  post(JSON.stringify(payload));
});

watch([() => store.value.limit, () => store.value.page], () => {
  const payload = {
    ...store.value,
    op: 'SEARCH',
  };

  post(JSON.stringify(payload));
});

watch(
  () => store.value.searchBy,
  () => {
    const payload = {
      ...store.value,
      op: 'SET_OPTION',
    };

    post(JSON.stringify(payload));
  },
);

watch(
  () => response.value?.route,
  (value) => {
    if (value !== undefined) {
      activeRoute.value = value;
    }
  },
);

const activeRoute = ref<IRoute | null>(null);

function handleSeeStops(id: string) {
  post(
    JSON.stringify({
      ...store.value,
      id,
      op: 'GET_ROUTE',
    }),
  );
}

const activeRouteStopSearchTerm = ref('');

const activeRouteStops = computed(
  () =>
    activeRoute.value?.route_stops.slice().filter((stop) => {
      const regex = new RegExp(
        `${activeRouteStopSearchTerm.value.replace(/\\|\//g, '')}`,
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

          <a class="underline" href="https://github.com/soulsam480/bus-find"
            >source</a
          >
        </div>

        <BDialog
          :open="activeRoute !== null"
          @close="
            () => {
              activeRoute = null;
              activeRouteStopSearchTerm = '';
            }
          "
          class="bg-white rounded-lg p-3 flex flex-col gap-2"
        >
          <div class="text-right -top-3 z-50 sticky bg-white pb-2">
            <button
              @click="
                () => {
                  activeRoute = null;
                  activeRouteStopSearchTerm = '';
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
              v-model="activeRouteStopSearchTerm"
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
        </BDialog>

        <div class="flex flex-col gap-1">
          <label for="search">Search by route number or bus stops</label>
          <input
            id="search"
            class="w-full rounded p-2"
            type="text"
            v-model="store.input"
            placeholder="Search by bus number or stop name"
            autofocus
            autocomplete="off"
          />
        </div>

        <div class="flex gap-2 items-end">
          <div class="flex flex-col gap-1">
            <label for="search">Filter By</label>
            <select v-model="store.searchBy" class="rounded p-2 min-w-[135px]">
              <option value="both">Both</option>
              <option value="route_name">Bus number</option>
              <option value="route_stops">Bus stops</option>
            </select>
          </div>

          <div class="flex flex-col gap-1">
            <label for="search">Per page</label>
            <select
              v-model.number="store.limit"
              class="rounded p-2 min-w-[70px]"
              @change="store.page = 1"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="30">30</option>
              <option value="40">40</option>
              <option value="60">60</option>
              <option value="80">80</option>
              <option value="100">100</option>
            </select>
          </div>

          <div class="flex flex-col gap-1 flex-grow">
            <label class="truncate"
              >Page (total {{ response?.pages ?? 0 }})</label
            >

            <div class="flex items-center gap-4 max-w-full">
              <button
                :disabled="store.page === 1"
                @click="store.page -= 1"
                class="rounded p-2 bg-gray-500 text-white h-[34.8px] flex items-center disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <span>Prev</span>
              </button>
              <span class="flex-grow text-center">{{ store.page }}</span>
              <button
                :disabled="
                  response?.pages === 0 || store.page === (response?.pages ?? 1)
                "
                @click="store.page += 1"
                class="rounded p-2 bg-gray-500 text-white h-[34.8px] flex items-center disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <span>Next</span>
              </button>
            </div>
          </div>
        </div>

        <div class="text-sm">
          Showing {{ store.limit }} of {{ response?.total ?? 'none' }} total
          {{
            store.searchBy === 'both'
              ? 'results'
              : store.searchBy === 'route_name'
              ? 'Bus routes'
              : 'Bus stops'
          }}
        </div>

        <div v-if="isSupported">
          <button
            @click="copyToClip()"
            class="rounded px-2 py-1 bg-gray-500 text-sm text-white self-center"
          >
            <span v-if="copiedFull"> Copied ! </span>
            <span v-else> Copy search link </span>
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-2 p-2">
        <template v-if="typeof response !== 'string'">
          <div
            class="flex justify-between items-center gap-2 bg-gray-100 rounded-lg px-2 py-3"
            v-for="bus in response?.results ?? []"
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
        </template>
      </div>

      <div class="text-xs text-center py-2">
        Released under the
        <a class="underline" href="https://opensource.org/licenses/MIT"
          >MIT License.</a
        >
        <br />

        Copyright ?? {{ new Date().getFullYear() }} Sambit Sahoo
      </div>
    </div>
  </div>
</template>
