<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';
import { useStorage } from '@vueuse/core';
import { IRouteTable } from './db/queryBuilder';
import { useDb } from './db';

const store = useStorage('store', {
  input: '',
});

const input = computed(() => store.value.input);

const results = ref<IRouteTable[]>([]);
const query = ref('');

const { sql } = useDb();

async function search(value: string) {
  if (value.length === 0) return;

  query.value = `select * from routes where route_name like '%${value}%' limit 30`;

  console.log('Query', query.value);

  const data = await sql?.(query.value);

  console.log('RESPONSE', data);

  results.value = (data as IRouteTable[]) ?? [];
}

watchEffect(() => {
  search(input.value);
});
</script>
<template>
  <div class="min-h-screen max-w-screen p-2">
    <div class="flex flex-col w-full gap-2 mx-auto sm:max-w-lg">
      <div class="flex items-start gap-2">
        <div class="flex flex-col gap-2">
          <div class="text-2xl font-semibold">Search bus</div>
          <div class="text-sm">
            This uses a remote static SQLite Database. It loads chunks lazily
            and runs queries against it. It uses SQLite wasm. The queries are
            super fast, smooth and performant for huge datasets
          </div>

          <div class="text-sm">Look at the console to debug logs</div>
        </div>

        <a class="underline" href="https://github.com/soulsam480/bus-find"
          >source</a
        >
      </div>

      <input
        class="w-full my-3"
        type="text"
        v-model="store.input"
        placeholder="Search by bus number"
        autofocus
        autocomplete="off"
      />
      <small> <b>Executing query :: </b> {{ query }}</small>

      <div class="flex flex-col gap-2">
        <h3>Results</h3>

        <div v-for="bus in results" :key="String(bus.id)">
          {{ bus.route_name }}
        </div>
      </div>
    </div>
  </div>
</template>
