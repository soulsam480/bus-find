<script setup lang="ts">
defineProps<{
  limit: number;
}>();

defineEmits<{
  (e: 'update:limit', limit: number): void;
}>();
</script>
<template>
  <div class="flex flex-col gap-1">
    <label for="search">Per page</label>
    <select
      :value="limit"
      class="rounded px-2 py-1 min-w-[70px]"
      @change="
        $emit(
          'update:limit',
          Number(($event.target as HTMLSelectElement).value as any),
        )
      "
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
</template>
