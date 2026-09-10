<script setup lang="ts">
/**
 * Console Master Bill workspace — CargoWise-style MAWB/MBL + carrier booking surface.
 * Schedule fields here are SoT and cascade to attached houses on save.
 */
import { computed } from 'vue'
import { Link2, Pencil, Ticket } from '@lucide/vue'
import CompactField from '@/components/ui/CompactField.vue'
import CompactSelect from '@/components/ui/CompactSelect.vue'
import { LOB_CATALOG } from '@/lib/lob'
import { operateTypeLabel } from '@/lib/splitBooking'
import type { ConsolidationRecord, ShipmentRecord, ShipmentStatus } from '@/stores/freight'

const props = defineProps<{
  draft: ConsolidationRecord
  houses: ShipmentRecord[]
  poolId: string
  poolOptions: { value: string; label: string }[]
  statusOptions: { value: string; label: string }[]
}>()

const emit = defineEmits<{
  'update:draft': [draft: ConsolidationRecord]
  'update:poolId': [id: string]
  dirty: []
  allocate: []
  editMaster: []
}>()

const extras = computed(() => props.draft.extras ?? {})

const houseRollup = computed(() => {
  let pieces = 0
  let weight = 0
  let volume = 0
  for (const h of props.houses) {
    const p = h.auImport?.pieces
    if (p !== '' && p != null) pieces += Number(p) || 0
    const w = h.auImport?.grossWeightKg
    if (w !== '' && w != null) weight += Number(w) || 0
    const vol = Number(String(h.extras?.volume ?? '').replace(/[^\d.]/g, ''))
    if (Number.isFinite(vol)) volume += vol
  }
  return { pieces, weight, volume, count: props.houses.length }
})

const totalsPieces = computed(
  () => extras.value.pieces || (houseRollup.value.pieces ? String(houseRollup.value.pieces) : ''),
)
const totalsGross = computed(
  () =>
    extras.value.grossWeight ||
    (houseRollup.value.weight ? `${houseRollup.value.weight} kg` : ''),
)
const totalsChg = computed(() => extras.value.chargeableWt || '')
const totalsVol = computed(
  () =>
    extras.value.volume ||
    (houseRollup.value.volume ? String(houseRollup.value.volume) : ''),
)

function patchDraft(partial: Partial<ConsolidationRecord>) {
  emit('update:draft', { ...props.draft, ...partial })
  emit('dirty')
}

function patchExtra(key: string, value: string) {
  emit('update:draft', {
    ...props.draft,
    extras: { ...(props.draft.extras ?? {}), [key]: value },
  })
  emit('dirty')
}
</script>

<template>
  <div class="overflow-hidden rounded-[10px] border border-sky-200 bg-white shadow-sm">
    <!-- Master Bill identity banner -->
    <div
      class="flex flex-wrap items-start justify-between gap-3 border-b border-sky-100 bg-gradient-to-r from-sky-50 to-white px-4 py-3"
    >
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <span
            class="rounded-md border border-sky-300 bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-900"
          >
            Master Bill · Console
          </span>
          <span class="os-badge os-badge--teal">{{ LOB_CATALOG[draft.lob].prefix }}</span>
          <span class="os-badge os-badge--slate">{{ operateTypeLabel(draft.operateType) }}</span>
          <span class="os-badge os-badge--slate">{{ draft.status }}</span>
        </div>
        <div class="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span class="font-mono text-[18px] font-bold tracking-tight text-slate-900">
            {{ draft.masterJobNo }}
          </span>
          <span class="font-mono text-[15px] font-semibold text-sky-900">
            MAWB {{ draft.mawb || '— not allocated' }}
          </span>
        </div>
        <p class="mt-1.5 flex items-center gap-1.5 text-[11px] text-sky-800">
          <Link2 :size="12" :stroke-width="2" />
          Single source of truth for schedule · cascade to {{ houseRollup.count }} house{{
            houseRollup.count === 1 ? '' : 's'
          }}
          on save
        </p>
      </div>
      <div class="flex flex-wrap items-end gap-1.5">
        <CompactSelect
          :model-value="poolId"
          label="MAWB pool"
          hint="Allocate…"
          class="w-[170px]"
          :options="poolOptions"
          @update:model-value="emit('update:poolId', $event)"
        />
        <button
          type="button"
          class="flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-[11px] font-medium hover:bg-muted"
          @click="emit('allocate')"
        >
          <Ticket :size="13" />
          Allocate MAWB
        </button>
        <button
          type="button"
          class="flex h-8 items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2.5 text-[11px] font-semibold text-sky-900 hover:bg-sky-100"
          @click="emit('editMaster')"
        >
          <Pencil :size="13" />
          Edit Master Job
        </button>
      </div>
    </div>

    <div class="space-y-4 p-4">
      <!-- Carrier booking / schedule -->
      <section>
        <h3 class="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Carrier booking &amp; schedule
        </h3>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <CompactField
            :model-value="draft.mawb"
            label="MAWB / MBL"
            mono
            required
            class="sm:col-span-2"
            @update:model-value="patchDraft({ mawb: String($event) })"
          />
          <CompactField
            :model-value="draft.airline"
            label="Airline / carrier"
            @update:model-value="patchDraft({ airline: String($event) })"
          />
          <CompactField
            :model-value="extras.airlineCode || ''"
            label="Airline code"
            mono
            @update:model-value="patchExtra('airlineCode', String($event))"
          />
          <CompactField
            :model-value="extras.flight || ''"
            label="Flight / voyage"
            mono
            hint="e.g. QF129"
            @update:model-value="patchExtra('flight', String($event))"
          />
          <CompactField
            :model-value="extras.vessel || ''"
            label="Aircraft / vessel"
            @update:model-value="patchExtra('vessel', String($event))"
          />
          <CompactField
            :model-value="draft.route"
            label="Route"
            mono
            required
            class="sm:col-span-2"
            @update:model-value="patchDraft({ route: String($event) })"
          />
          <CompactField
            :model-value="extras.pol || ''"
            label="POL"
            mono
            @update:model-value="patchExtra('pol', String($event))"
          />
          <CompactField
            :model-value="extras.pod || ''"
            label="POD"
            mono
            @update:model-value="patchExtra('pod', String($event))"
          />
          <CompactField
            :model-value="draft.etd"
            label="ETD"
            field-key="etd"
            mono
            @update:model-value="patchDraft({ etd: String($event) })"
          />
          <CompactField
            :model-value="draft.eta"
            label="ETA"
            field-key="eta"
            mono
            @update:model-value="patchDraft({ eta: String($event) })"
          />
          <CompactField
            :model-value="extras.atd || ''"
            label="ATD"
            mono
            hint="Actual"
            @update:model-value="patchExtra('atd', String($event))"
          />
          <CompactField
            :model-value="extras.ata || ''"
            label="ATA"
            mono
            hint="Actual"
            @update:model-value="patchExtra('ata', String($event))"
          />
          <CompactSelect
            :model-value="draft.status"
            label="Master status"
            :options="statusOptions"
            @update:model-value="patchDraft({ status: $event as ShipmentStatus })"
          />
          <CompactField
            :model-value="extras.fileCutoff || ''"
            label="File cut-off"
            mono
            @update:model-value="patchExtra('fileCutoff', String($event))"
          />
        </div>
      </section>

      <!-- Consolidation totals / ULD -->
      <section>
        <h3 class="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Consolidation totals · ULD / containers
        </h3>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <CompactField
            :model-value="totalsPieces"
            label="Total pieces"
            mono
            @update:model-value="patchExtra('pieces', String($event))"
          />
          <CompactField
            :model-value="totalsGross"
            label="Gross weight"
            mono
            @update:model-value="patchExtra('grossWeight', String($event))"
          />
          <CompactField
            :model-value="totalsChg"
            label="Chargeable weight"
            mono
            @update:model-value="patchExtra('chargeableWt', String($event))"
          />
          <CompactField
            :model-value="totalsVol"
            label="Volume (CBM)"
            mono
            @update:model-value="patchExtra('volume', String($event))"
          />
          <CompactField
            :model-value="extras.uld || extras.containers || ''"
            label="ULD / containers"
            class="sm:col-span-2"
            hint="Optional for air"
            @update:model-value="patchExtra('uld', String($event))"
          />
          <CompactField
            :model-value="extras.bookingAgent || ''"
            label="Booking agent"
            @update:model-value="patchExtra('bookingAgent', String($event))"
          />
          <CompactField
            :model-value="extras.polAgent || ''"
            label="POL agent"
            @update:model-value="patchExtra('polAgent', String($event))"
          />
          <CompactField
            :model-value="extras.destAgent || ''"
            label="Dest agent"
            @update:model-value="patchExtra('destAgent', String($event))"
          />
        </div>
        <p
          v-if="!extras.pieces && houseRollup.pieces"
          class="mt-2 text-[10px] text-muted-foreground"
        >
          Totals prefilled from {{ houseRollup.count }} house roll-up — edit to override master
          declared totals.
        </p>
      </section>
    </div>
  </div>
</template>
