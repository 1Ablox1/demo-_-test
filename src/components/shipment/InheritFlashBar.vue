<script setup lang="ts">
import { Sparkles } from '@lucide/vue'
import type { AuImportStepId, InheritFlash } from '@/types/auAirImport'

defineProps<{
  flashes: InheritFlash[]
}>()

const emit = defineEmits<{
  navigate: [payload: { stepId: AuImportStepId; fieldKey?: string }]
}>()
</script>

<template>
  <div
    v-if="flashes.length"
    class="inherit-flash-bar rounded-[10px] border border-primary/25 bg-primary-tint/60 px-3 py-2.5"
  >
    <div class="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-primary">
      <Sparkles :size="12" :stroke-width="2" aria-hidden="true" />
      Smart inherit
    </div>
    <ul class="flex flex-wrap gap-2">
      <li v-for="(f, i) in flashes" :key="`${f.field}-${i}`">
        <button
          type="button"
          class="inherit-flash-chip rounded-md border border-primary/20 bg-white px-2 py-1 text-left text-[11px] hover:border-primary/50"
          @click="emit('navigate', { stepId: f.stepId, fieldKey: f.field })"
        >
          <span class="font-medium text-foreground">{{ f.label }}</span>
          <span class="text-muted-foreground"> from {{ f.from }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>
