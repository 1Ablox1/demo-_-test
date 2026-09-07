<script setup lang="ts">
import { Sparkles } from '@lucide/vue'
import type { BookingInheritFlash, BookingWizardStepId } from '@/types/bookingWizard'

defineProps<{
  flashes: BookingInheritFlash[]
}>()

const emit = defineEmits<{
  jump: [stepId: BookingWizardStepId]
}>()
</script>

<template>
  <div
    v-if="flashes.length"
    class="rounded-[10px] border border-teal-200/80 bg-teal-50/70 px-3 py-2.5"
  >
    <div class="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-teal-800">
      <Sparkles :size="12" :stroke-width="2" aria-hidden="true" />
      Smart inherit
    </div>
    <ul class="flex flex-wrap gap-2">
      <li v-for="(f, i) in flashes" :key="`${f.field}-${i}`">
        <button
          type="button"
          class="rounded-md border border-teal-200 bg-white px-2 py-1 text-left text-[11px] hover:border-teal-400"
          @click="emit('jump', f.stepId)"
        >
          <span class="font-medium text-slate-800">{{ f.label }}</span>
          <span class="text-slate-500"> from {{ f.from }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>
