<script setup lang="ts">
import { Loader2 } from '@lucide/vue'

defineProps<{
  entityTag: string
  title: string
  dirty?: boolean
  saving?: boolean
  submitting?: boolean
  /** Optional secondary link (e.g. Open job desk) */
  secondaryLabel?: string
}>()

const emit = defineEmits<{
  cancel: []
  saveDraft: []
  saveSubmit: []
  secondary: []
}>()
</script>

<template>
  <header
    class="execution-sticky-header flex h-[52px] shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4"
  >
    <div class="min-w-0 flex-1">
      <div class="font-mono text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {{ entityTag }}
      </div>
      <div class="flex min-w-0 items-center gap-2">
        <h2 class="truncate text-[14px] font-bold text-slate-900">{{ title }}</h2>
        <span
          v-if="dirty"
          class="shrink-0 text-[11px] font-semibold text-amber-600"
          aria-live="polite"
        >
          • Unsaved Changes
        </span>
      </div>
    </div>

    <div class="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
      <button
        v-if="secondaryLabel"
        type="button"
        class="hidden h-8 items-center rounded-md border border-slate-200 px-2.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50 sm:inline-flex"
        @click="emit('secondary')"
      >
        {{ secondaryLabel }}
      </button>
      <button
        type="button"
        class="h-8 rounded-md border border-slate-200 px-3 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
        @click="emit('cancel')"
      >
        Cancel / Close
      </button>
      <button
        type="button"
        class="flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
        :disabled="saving || submitting"
        @click="emit('saveDraft')"
      >
        <Loader2 v-if="saving" :size="13" class="animate-spin" />
        Save Draft
      </button>
      <button
        type="button"
        class="flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[11px] font-bold text-white hover:bg-teal-700 disabled:opacity-60"
        :disabled="saving || submitting"
        @click="emit('saveSubmit')"
      >
        <Loader2 v-if="submitting" :size="13" class="animate-spin" />
        {{ submitting ? 'Saving…' : 'Save & Submit' }}
      </button>
    </div>
  </header>
</template>

<style scoped>
.execution-sticky-header {
  position: sticky;
  top: 0;
  z-index: 20;
}
</style>
