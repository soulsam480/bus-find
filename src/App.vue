<script setup lang="ts">
import { computed, ref } from 'vue';
import { useStorage } from '@vueuse/core';
import { downBus, upBus } from './utils/constants';
import { useFuse } from '@vueuse/integrations/useFuse';

interface StoreType {
  mode: 'up' | 'down';
  input: string;
}

const store = useStorage<StoreType>('store', {
  mode: 'up',
  input: '',
});

const input = computed(() => store.value.input);

const dataToSearch = computed(() => {
  if (store.value.mode === 'up') {
    return upBus;
  }

  return downBus;
});

const { results } = useFuse(input, dataToSearch);
</script>
<template>
  <div class="min-h-screen max-w-screen">
    <div class="flex flex-col w-full gap-2 mx-auto sm:max-w-lg">
      <div class="flex items-center gap-2">
        <h1>Search bus</h1>

        <a href="https://github.com/soulsam480/bus-find">source</a>
      </div>

      <h3>Mode</h3>
      <div class="flex flex-col gap-2">
        <div class="inline-flex gap-2">
          <input type="radio" id="up" value="up" v-model="store.mode" />
          <label for="up">up - to office</label>
        </div>

        <div class="inline-flex gap-2">
          <input type="radio" id="down" value="down" v-model="store.mode" />
          <label for="down">down - from office</label>
        </div>
      </div>

      <input
        class="w-full my-3"
        type="text"
        v-model="store.input"
        placeholder="Search by bus number"
        autofocus
        autocomplete="off"
      />

      <div class="flex flex-col gap-2">
        <h3>Results</h3>

        <div v-for="bus in results" :key="bus.item">
          {{ bus.item }}
        </div>
      </div>
    </div>
  </div>
</template>
