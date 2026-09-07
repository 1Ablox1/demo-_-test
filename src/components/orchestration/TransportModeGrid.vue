<script setup lang="ts">
import { computed } from 'vue'
import {
  Check,
  Plane,
  Ship,
  Package,
  TrainFront,
  Truck,
} from '@lucide/vue'
import {
  TRANSPORT_MODES,
  type TransportModeId,
  type TransportModeOption,
} from '@/data/orchestrationModes'

const props = defineProps<{
  modelValue: TransportModeId
}>()

const emit = defineEmits<{
  'update:modelValue': [id: TransportModeId]
}>()

const icons: Record<TransportModeId, typeof Truck> = {
  ftl: Truck,
  ltl: Truck,
  air: Plane,
  ocean: Ship,
  parcel: Package,
  rail: TrainFront,
}

function select(m: TransportModeOption) {
  emit('update:modelValue', m.id)
}

const selected = computed(() => props.modelValue)
</script>

<template>
  <div>
    <h2 class="mb-1 text-[18px] font-bold tracking-tight text-slate-900">Select Transport Mode</h2>
    <p class="mb-5 text-[13px] text-slate-500">
      Choose the best mode for this booking — cost and transit estimates use live OS rate bands.
    </p>
    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <button
        v-for="m in TRANSPORT_MODES"
        :key="m.id"
        type="button"
        class="orch-mode-card text-left"
        :class="{ 'orch-mode-card--selected': selected === m.id }"
        @click="select(m)"
      >
        <div class="mb-3 flex items-start justify-between gap-2">
          <span
            class="flex h-10 w-10 items-center justify-center rounded-xl"
            :class="
              selected === m.id
                ? 'bg-[var(--orch-accent-tint)] text-[var(--orch-accent)]'
                : 'bg-slate-100 text-slate-600'
            "
          >
            <component :is="icons[m.id]" :size="20" :stroke-width="1.75" />
          </span>
          <span
            v-if="selected === m.id"
            class="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--orch-accent)] text-white"
          >
            <Check :size="14" :stroke-width="2.5" />
          </span>
        </div>
        <div class="mb-1.5 text-[14px] font-bold text-slate-900">{{ m.label }}</div>
        <p class="mb-3 text-[12px] leading-relaxed text-slate-500">{{ m.description }}</p>
        <div
          class="text-[10px] font-bold uppercase tracking-wider"
          :class="selected === m.id ? 'text-[var(--orch-accent)]' : 'text-slate-400'"
        >
          {{ m.meta }}
        </div>
      </button>
    </div>
  </div>
</template>
