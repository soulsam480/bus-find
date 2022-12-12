<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';

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

function onClick(e: MouseEvent) {
  const box = document.getElementById('box');

  if (!box?.contains(e.currentTarget as Node)) {
    emits('close');
  }
}

onMounted(() => {
  document.addEventListener('click', onClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', onClick);
});
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
        class="sm:min-w-[500px] sm:max-w-[800px] mx-auto max-w-[95%] max-h-800px overflow-auto"
        id="box"
      >
        <slot />
      </dialog>
    </div>
  </Teleport>
</template>
