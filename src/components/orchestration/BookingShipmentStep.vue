<script setup lang="ts">
import { computed } from 'vue'
import CompactField from '@/components/ui/CompactField.vue'
import BookingInheritBar from '@/components/orchestration/BookingInheritBar.vue'
import { flashesForStep } from '@/lib/bookingInherit'
import type { BookingDraft, BookingWizardStepId } from '@/types/bookingWizard'
import { spineLobMeta } from '@/types/spineLob'

const props = defineProps<{
  draft: BookingDraft
}>()

const emit = defineEmits<{
  'update:draft': [draft: BookingDraft]
  jump: [stepId: BookingWizardStepId]
}>()

const flashes = computed(() => flashesForStep(props.draft, 'shipment'))
const lob = computed(() => spineLobMeta(props.draft.lobPrefix))

function patch(partial: Partial<BookingDraft>) {
  emit('update:draft', { ...props.draft, ...partial })
}

function setStr(key: keyof BookingDraft, value: string | number) {
  patch({ [key]: String(value) } as Partial<BookingDraft>)
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 class="text-[18px] font-bold text-slate-900">Shipment details</h2>
      <p class="mt-1 text-[13px] text-slate-500">
        Core file facts for
        <span class="font-mono font-semibold text-slate-700">{{ lob.prefix }}</span>
        · {{ lob.label }}. Fields inherit from quote when started that way.
      </p>
    </div>

    <BookingInheritBar :flashes="flashes" @jump="emit('jump', $event)" />

    <div class="grid gap-3 sm:grid-cols-2">
      <CompactField
        :model-value="draft.customer"
        label="Customer"
        @update:model-value="setStr('customer', $event)"
      />
      <CompactField
        :model-value="draft.airline"
        label="Carrier / airline"
        @update:model-value="setStr('airline', $event)"
      />
      <CompactField
        :model-value="draft.shipper"
        label="Shipper"
        @update:model-value="setStr('shipper', $event)"
      />
      <CompactField
        :model-value="draft.consignee"
        label="Consignee"
        @update:model-value="setStr('consignee', $event)"
      />
      <CompactField
        :model-value="draft.origin"
        label="Origin"
        hint="Airport / port"
        @update:model-value="setStr('origin', $event)"
      />
      <CompactField
        :model-value="draft.destination"
        label="Destination"
        hint="Airport / port"
        @update:model-value="setStr('destination', $event)"
      />
      <CompactField
        :model-value="draft.etd"
        label="ETD"
        @update:model-value="setStr('etd', $event)"
      />
      <CompactField
        :model-value="draft.eta"
        label="ETA"
        @update:model-value="setStr('eta', $event)"
      />
      <CompactField
        :model-value="draft.pieces"
        label="Pieces"
        mono
        @update:model-value="setStr('pieces', $event)"
      />
      <CompactField
        :model-value="draft.weightKg"
        label="Gross weight (kg)"
        mono
        @update:model-value="setStr('weightKg', $event)"
      />
      <CompactField
        :model-value="draft.volumeCbm"
        label="Volume (CBM)"
        mono
        @update:model-value="setStr('volumeCbm', $event)"
      />
      <CompactField
        :model-value="draft.commodity"
        label="Commodity"
        @update:model-value="setStr('commodity', $event)"
      />
      <CompactField
        :model-value="draft.hawb"
        label="HBL / HAWB"
        mono
        hint="House or direct"
        @update:model-value="setStr('hawb', $event)"
      />
      <CompactField
        :model-value="draft.mawb"
        label="MBL / MAWB"
        mono
        hint="Master or direct — houses inherit later"
        @update:model-value="setStr('mawb', $event)"
      />
    </div>
  </div>
</template>
