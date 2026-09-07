<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { GitBranch, Link2, Sparkles, Ticket, Unlink } from '@lucide/vue'
import CompactField from '@/components/ui/CompactField.vue'
import CompactSelect from '@/components/ui/CompactSelect.vue'
import { operateTypeLabel } from '@/lib/splitBooking'
import { useFreightStore, type ShipmentRecord } from '@/stores/freight'

const props = defineProps<{
  shipment: ShipmentRecord
}>()

const freight = useFreightStore()
const router = useRouter()

const mode = ref<'console' | 'back_to_back'>('console')
const poolId = ref('')
const attachCustomer = ref('')
const attachFromId = ref('')
const flash = ref('')

const poolOptions = computed(() =>
  freight.availableMawbs.map((r) => ({
    value: r.id,
    label: `${r.mawb} · ${r.airline}`,
  })),
)

const modeOptions = [
  { value: 'console', label: 'Console — master + N houses' },
  { value: 'back_to_back', label: 'Back-to-back — 1 house' },
]

const linkedCon = computed(() =>
  props.shipment.consolidationId
    ? freight.consolidations.find((c) => c.id === props.shipment.consolidationId) ?? null
    : null,
)

const freeDirects = computed(() => {
  if (!linkedCon.value) return []
  return freight.freeDirectsForAttach(linkedCon.value.lob).map((s) => ({
    value: s.id,
    label: `${s.jobNo} · ${s.customer}`,
  }))
})

const isAir = computed(() => props.shipment.lob === 'air_import' || props.shipment.lob === 'air_export')

function showFlash(msg: string) {
  flash.value = msg
  setTimeout(() => {
    flash.value = ''
  }, 4000)
}

function onAllocate() {
  if (!poolId.value) {
    showFlash('Pick a MAWB from the pool first')
    return
  }
  showFlash(freight.allocateMawb(props.shipment.id, poolId.value).message)
  poolId.value = ''
}

function onSplit() {
  const r = freight.createConsoleFromDirect(
    props.shipment.id,
    mode.value,
    poolId.value || undefined,
  )
  showFlash(r.message)
  if (r.ok) {
    void router.push({ name: 'consolidation', params: { consolidationId: r.consolidationId } })
  }
}

function onAttachNew() {
  if (!linkedCon.value) return
  showFlash(freight.attachHouse(linkedCon.value.id, { customer: attachCustomer.value || undefined }).message)
  attachCustomer.value = ''
}

function onAttachExisting() {
  if (!linkedCon.value || !attachFromId.value) return
  showFlash(freight.attachHouse(linkedCon.value.id, { fromDirectId: attachFromId.value }).message)
  attachFromId.value = ''
}

function onDetach() {
  showFlash(freight.detachHouse(props.shipment.id).message)
}

function onGenHawb() {
  showFlash(freight.generateHawb(props.shipment.id).message)
}

function openConsole() {
  if (!linkedCon.value) return
  void router.push({ name: 'consolidation', params: { consolidationId: linkedCon.value.id } })
}
</script>

<template>
  <div v-if="isAir" class="os-panel p-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <div class="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          HBL / MBL split
        </div>
        <p class="mt-0.5 text-[11px] text-muted-foreground">
          Master holds MBL · houses own HBL ·
          <span class="font-medium text-foreground">{{ operateTypeLabel(shipment.operateType) }}</span>
        </p>
      </div>
      <div class="flex flex-wrap gap-1.5 font-mono text-[10px]">
        <span class="os-badge os-badge--slate">MBL {{ shipment.mawb || '—' }}</span>
        <span class="os-badge os-badge--slate">HBL {{ shipment.hawb || '—' }}</span>
      </div>
    </div>

    <p
      v-if="flash"
      class="mt-2 rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-[11px] text-teal-900"
    >
      {{ flash }}
    </p>

    <div v-if="shipment.operateType === 'direct'" class="mt-3 flex flex-wrap items-end gap-2">
      <CompactSelect
        v-model="poolId"
        label="MAWB pool"
        hint="Allocate…"
        class="min-w-[180px]"
        :options="poolOptions"
      />
      <CompactSelect
        v-model="mode"
        label="Split mode"
        class="min-w-[200px]"
        :options="modeOptions"
      />
      <button
        type="button"
        class="flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-[11px] font-medium hover:bg-muted"
        @click="onAllocate"
      >
        <Ticket :size="13" />
        Allocate
      </button>
      <button
        type="button"
        class="flex h-8 items-center gap-1 rounded-md bg-primary px-3 text-[11px] font-bold text-white"
        @click="onSplit"
      >
        <GitBranch :size="13" />
        Split HBL / MBL
      </button>
    </div>

    <div v-else-if="shipment.kind === 'master'" class="mt-3 space-y-2">
      <div class="flex flex-wrap gap-1.5">
        <button
          type="button"
          class="flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-[11px] font-medium hover:bg-muted"
          @click="openConsole"
        >
          <Link2 :size="13" />
          Open consolidation
        </button>
        <CompactSelect
          v-model="poolId"
          label="Re-allocate MAWB"
          hint="Pool…"
          class="w-[180px]"
          :options="poolOptions"
        />
        <button
          type="button"
          class="mt-4 flex h-8 items-center rounded-md border border-border px-2.5 text-[11px] font-medium"
          @click="onAllocate"
        >
          Apply MAWB
        </button>
      </div>
      <div class="grid grid-cols-1 gap-2 border-t border-border pt-2 sm:grid-cols-3">
        <CompactField v-model="attachCustomer" label="New house customer" hint="Attach house" />
        <CompactSelect
          v-model="attachFromId"
          label="Attach Direct"
          hint="Free Direct…"
          :options="freeDirects"
        />
        <div class="flex items-end gap-1.5">
          <button
            type="button"
            class="flex h-8 items-center rounded-md bg-primary px-3 text-[11px] font-bold text-white"
            @click="onAttachNew"
          >
            Add house
          </button>
          <button
            type="button"
            class="flex h-8 items-center rounded-md border border-border px-2.5 text-[11px] font-medium disabled:opacity-40"
            :disabled="!attachFromId"
            @click="onAttachExisting"
          >
            Attach
          </button>
        </div>
      </div>
    </div>

    <div v-else-if="shipment.kind === 'house'" class="mt-3 flex flex-wrap gap-1.5">
      <button
        type="button"
        class="flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-[11px] font-medium"
        @click="onGenHawb"
      >
        <Sparkles :size="13" />
        Generate HBL
      </button>
      <button
        type="button"
        class="flex h-8 items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2.5 text-[11px] font-medium text-amber-900"
        @click="onDetach"
      >
        <Unlink :size="13" />
        Detach
      </button>
      <button
        type="button"
        class="flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-[11px] font-medium"
        @click="openConsole"
      >
        Open consolidation
      </button>
    </div>
  </div>
</template>
