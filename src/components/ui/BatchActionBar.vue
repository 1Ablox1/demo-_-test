<script setup lang="ts">
import { Check, Copy, Unlink, X } from '@lucide/vue'

defineProps<{
  count: number
  visible: boolean
}>()

const emit = defineEmits<{
  clear: []
  'copy-hawb': []
  detach: []
  'open-drawer': []
}>()
</script>

<template>
  <Transition name="batch-bar">
    <div
      v-if="visible && count > 0"
      class="batch-action-bar pointer-events-auto fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-border bg-slate-900 px-3 py-2 text-white shadow-xl"
      role="toolbar"
      aria-label="Batch actions"
    >
      <span class="os-badge border-slate-600 bg-slate-800 text-slate-100">
        <Check :size="11" />
        {{ count }} selected
      </span>
      <button
        type="button"
        class="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium hover:bg-slate-700"
        @click="emit('open-drawer')"
      >
        Open drawer
      </button>
      <button
        type="button"
        class="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium hover:bg-slate-700"
        @click="emit('copy-hawb')"
      >
        <Copy :size="12" />
        Copy HAWB
      </button>
      <button
        type="button"
        class="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium text-amber-200 hover:bg-slate-700"
        @click="emit('detach')"
      >
        <Unlink :size="12" />
        Detach
      </button>
      <button
        type="button"
        class="ml-1 flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-700"
        aria-label="Clear selection"
        @click="emit('clear')"
      >
        <X :size="14" />
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.batch-bar-enter-active,
.batch-bar-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.batch-bar-enter-from,
.batch-bar-leave-to {
  opacity: 0;
  transform: translate(-50%, 12px);
}
</style>
