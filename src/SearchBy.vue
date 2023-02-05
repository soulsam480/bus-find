<script setup lang="ts">
type SearchBy = 'route_name' | 'route_stops';

const MODE_LABELS: Record<string, string> = {
  route_name: 'Route Number',
  route_stops: 'Bus Stops',
};

const props = defineProps<{
  mode: SearchBy;
}>();

defineEmits<{
  (e: 'update:mode', mode: SearchBy): void;
}>();
</script>
<template>
  <div>
    <div class="grid grid-cols-2 items-center bg-gray-200 rounded">
      <template v-for="mode in ['route_name', 'route_stops']">
        <div
          class="p-1 text-center rounded cursor-pointer text-sm transition-all duration-300 ease-in-out"
          :class="{
            'bg-gray-500 text-white': mode === props.mode,
          }"
          @click="$emit('update:mode', mode)"
        >
          {{ MODE_LABELS[mode] }}
        </div>
      </template>
    </div>
  </div>
</template>
