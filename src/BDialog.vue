<script setup lang="ts">
import { onClickOutside } from '@vueuse/core';
import { ref } from 'vue';

withDefaults(
  defineProps<{
    open: boolean;
  }>(),
  {
    open: false,
  },
);

const emits = defineEmits<{
  (e: 'close'): void;
}>();

const target = ref(null);

onClickOutside(target, () => emits('close'));
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[999] flex items-center justify-center bg-slate-300 bg-opacity-80"
      v-if="open"
    >
      <dialog
        open
        v-bind="$attrs"
        class="sm:min-w-[500px] sm:max-w-[800px] mx-auto max-w-[95%] max-h-800px min-h-500px sm:min-h-auto overflow-auto"
        id="box"
        ref="target"
      >
        <slot />
      </dialog>
    </div>
  </Teleport>
</template>
