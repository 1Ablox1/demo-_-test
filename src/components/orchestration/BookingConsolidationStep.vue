<script setup lang="ts">
import { computed } from 'vue'
import BookingInheritBar from '@/components/orchestration/BookingInheritBar.vue'
import CompactField from '@/components/ui/CompactField.vue'
import {
  applyMasterMawbInherit,
  flashesForStep,
  resizeHouseCustomers,
} from '@/lib/bookingInherit'
import type { BookingDraft, BookingWizardStepId } from '@/types/bookingWizard'

const props = defineProps<{
  draft: BookingDraft
}>()

const emit = defineEmits<{
  'update:draft': [draft: BookingDraft]
  jump: [stepId: BookingWizardStepId]
}>()

const flashes = computed(() => flashesForStep(props.draft, 'consolidation'))

const structureLabel = computed(() =>
  props.draft.structure === 'back_to_back' ? 'Back-to-back' : 'Consolidation (console)',
)

function setMawb(v: string | number) {
  emit('update:draft', applyMasterMawbInherit(props.draft, String(v)))
}

function setHouseCount(raw: string | number) {
  const n = Number(raw) || 1
  emit('update:draft', resizeHouseCustomers(props.draft, n))
}

function setHouseCustomer(index: number, value: string | number) {
  const houseCustomers = [...props.draft.houseCustomers]
  houseCustomers[index] = String(value)
  emit('update:draft', { ...props.draft, houseCustomers })
}

function setAirline(v: string | number) {
  emit('update:draft', { ...props.draft, airline: String(v) })
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 class="text-[18px] font-bold text-slate-900">Consolidation</h2>
      <p class="mt-1 text-[13px] text-slate-500">
        {{ structureLabel }} — master holds MBL; houses copy route / airline / ETD·ETA and MBL
        (CargoWare inherit).
      </p>
    </div>

    <BookingInheritBar :flashes="flashes" @jump="emit('jump', $event)" />

    <div class="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      <div class="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        Master
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        <CompactField
          :model-value="draft.masterMawb || draft.mawb"
          label="Master MBL / MAWB"
          mono
          hint="Pushed to every house"
          @update:model-value="setMawb"
        />
        <CompactField
          :model-value="draft.airline"
          label="Airline (inherited)"
          @update:model-value="setAirline"
        />
        <CompactField
          :model-value="`${draft.origin} → ${draft.destination}`"
          label="Route (from shipment)"
          disabled
        />
        <CompactField
          :model-value="draft.structure === 'back_to_back' ? '1' : String(draft.houseCount)"
          label="House count"
          mono
          :disabled="draft.structure === 'back_to_back'"
          @update:model-value="setHouseCount"
        />
      </div>
    </div>

    <div class="rounded-xl border border-slate-200 p-4">
      <div class="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        Houses · customers
      </div>
      <div class="space-y-2">
        <div
          v-for="(cust, i) in draft.houseCustomers"
          :key="i"
          class="flex items-center gap-2"
        >
          <span class="w-16 font-mono text-[11px] text-slate-400">H{{ i + 1 }}</span>
          <CompactField
            class="flex-1"
            :model-value="cust"
            :label="i === 0 ? 'House customer (inherits job customer if blank)' : 'House customer'"
            @update:model-value="setHouseCustomer(i, $event)"
          />
        </div>
      </div>
      <p class="mt-3 text-[11px] text-slate-500">
        After create, open Consolidation workspace to allocate MAWB pool, attach / detach houses,
        and edit HAWB per house.
      </p>
    </div>
  </div>
</template>
