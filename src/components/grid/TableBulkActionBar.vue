<script setup lang="ts">
/**
 * Sticky floating bulk bar — bottom center over AG Grid lists.
 */
defineProps<{
  count: number
}>()

const emit = defineEmits<{
  accrue: []
  post: []
  copyCodes: []
  deselect: []
}>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="count > 0"
      class="pointer-events-none fixed inset-x-0 bottom-6 z-[180] flex justify-center px-4"
      role="toolbar"
      aria-label="Bulk actions"
    >
      <div
        class="pointer-events-auto flex max-w-[min(920px,100%)] flex-wrap items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-2 shadow-[0_12px_40px_rgba(15,23,42,0.18)] backdrop-blur-sm"
      >
        <span class="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-bold text-slate-800">
          {{ count }} item{{ count === 1 ? '' : 's' }} selected
        </span>
        <button
          type="button"
          class="h-8 rounded-full border border-slate-200 px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
          @click="emit('accrue')"
        >
          Accrue Selected
        </button>
        <button
          type="button"
          class="h-8 rounded-full border border-teal-200 bg-teal-50 px-3 text-[11px] font-semibold text-teal-900 hover:bg-teal-100"
          @click="emit('post')"
        >
          Post / Batch Update
        </button>
        <button
          type="button"
          class="h-8 rounded-full border border-slate-200 px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
          @click="emit('copyCodes')"
        >
          Copy Codes
        </button>
        <button
          type="button"
          class="h-8 rounded-full px-2.5 text-[11px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          @click="emit('deselect')"
        >
          Deselect All
        </button>
      </div>
    </div>
  </Teleport>
</template>
