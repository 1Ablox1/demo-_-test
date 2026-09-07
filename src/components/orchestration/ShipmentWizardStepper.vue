<script setup lang="ts">
import { Check } from '@lucide/vue'
import type { BookingWizardStepId, BookingWizardStepMeta } from '@/types/bookingWizard'

const props = defineProps<{
  steps: BookingWizardStepMeta[]
  stepId: BookingWizardStepId
}>()

const emit = defineEmits<{
  'update:stepId': [id: BookingWizardStepId]
}>()

function indexOf(id: BookingWizardStepId) {
  return props.steps.findIndex((s) => s.id === id)
}

function isDone(id: BookingWizardStepId) {
  return indexOf(id) < indexOf(props.stepId)
}
</script>

<template>
  <nav class="orch-stepper" aria-label="Booking wizard">
    <template v-for="(s, i) in steps" :key="s.id">
      <button
        type="button"
        class="orch-stepper__item"
        :class="{
          'orch-stepper__item--active': stepId === s.id,
          'orch-stepper__item--done': isDone(s.id),
        }"
        :aria-current="stepId === s.id ? 'step' : undefined"
        :title="s.hint"
        @click="emit('update:stepId', s.id)"
      >
        <span class="orch-stepper__num">
          <Check v-if="isDone(s.id)" :size="14" :stroke-width="2.5" />
          <template v-else>{{ i + 1 }}</template>
        </span>
        <span class="orch-stepper__label">{{ s.label }}</span>
      </button>
      <div v-if="i < steps.length - 1" class="orch-stepper__line" aria-hidden="true" />
    </template>
  </nav>
</template>
