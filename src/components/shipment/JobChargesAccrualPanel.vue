<script setup lang="ts">
/**
 * Lightweight Charges & Accruals — available on operational stages 1–5.
 * Provisional / estimated entry without leaving the current spine stage.
 * Formal Accrue / Approve / Issue stay on AF-05 + Financial Module (Hugh SoD).
 */
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronDown, ChevronRight, Plus } from '@lucide/vue'
import { useChargesStore } from '@/stores/charges'

const props = defineProps<{
  shipmentId: number
  /** Collapse by default on busy stages */
  defaultOpen?: boolean
}>()

const charges = useChargesStore()
const router = useRouter()
const open = ref(props.defaultOpen ?? false)

watch(
  () => props.shipmentId,
  (id) => {
    if (Number.isFinite(id) && id > 0) void charges.load(id)
  },
  { immediate: true },
)

const gp = computed(() => charges.payload?.gp)
const home = computed(() => charges.payload?.homeCurrency ?? 'AUD')
const lines = computed(() => charges.payload?.lines ?? [])
const blocked = computed(() => !!charges.payload?.blocked)

function fmt(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return '—'
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function lineStatus(state: string) {
  if (state === 'draft' || state === 'rated' || state === 'safeguard') return 'Provisional'
  if (state === 'accrued') return 'Accrued'
  if (state === 'approved' || state === 'invoiced_ar') return 'Invoiced'
  if (state === 'posted') return 'Paid / Posted'
  return state
}

function openChargesDesk() {
  if (!Number.isFinite(props.shipmentId)) return
  void router.push({
    name: 'shipment',
    params: { shipmentId: String(props.shipmentId) },
    query: { step: 'money_preview' },
  })
}

function onAmount(lineId: string, raw: string) {
  const v = Number(raw)
  if (!Number.isFinite(v)) return
  charges.updateLineAmount(lineId, 'accrued', v)
}
</script>

<template>
  <div class="os-panel overflow-hidden border-dashed border-teal-200/80">
    <button
      type="button"
      class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-teal-50/40"
      @click="open = !open"
    >
      <div class="min-w-0">
        <div class="text-[10px] font-bold uppercase tracking-wider text-teal-800">
          Charges & Accruals
        </div>
        <p class="mt-0.5 truncate text-[11px] text-muted-foreground">
          Provisional AP / AR · live margin · stay on this stage
          <span v-if="blocked" class="text-amber-700"> · formal Accrue locked</span>
        </p>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <span v-if="gp" class="font-mono text-[10px] font-semibold text-teal-900">
          GP {{ fmt(gp.provisionalGp) }} {{ home }}
        </span>
        <ChevronDown v-if="open" :size="14" class="text-slate-400" />
        <ChevronRight v-else :size="14" class="text-slate-400" />
      </div>
    </button>

    <div v-if="open" class="space-y-2.5 border-t border-border px-3 pb-3 pt-2">
      <div
        v-if="blocked && charges.payload?.blockMessage"
        class="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-950"
      >
        {{ charges.payload.blockMessage }} — you can still capture estimates.
      </div>

      <div class="grid grid-cols-3 gap-2 rounded-md border border-border bg-slate-50/80 px-2.5 py-2">
        <div>
          <div class="os-micro-label">Buy (AP)</div>
          <div class="font-mono text-[12px] font-semibold">{{ fmt(gp?.accruedCostTotal) }}</div>
        </div>
        <div>
          <div class="os-micro-label">Sell (AR)</div>
          <div class="font-mono text-[12px] font-semibold">{{ fmt(gp?.sellTotal) }}</div>
        </div>
        <div>
          <div class="os-micro-label">Prov. GP</div>
          <div class="font-mono text-[12px] font-semibold text-teal-900">
            {{ fmt(gp?.provisionalGp) }}
          </div>
        </div>
      </div>

      <div class="flex flex-wrap gap-1.5">
        <button
          type="button"
          class="flex h-7 items-center gap-1 rounded-md border border-border bg-white px-2 text-[11px] font-semibold hover:bg-muted disabled:opacity-40"
          :disabled="!charges.canAddProvisional"
          @click="charges.addChargeLine({ side: 'AP', provisional: true })"
        >
          <Plus :size="12" /> AP
        </button>
        <button
          type="button"
          class="flex h-7 items-center gap-1 rounded-md border border-border bg-white px-2 text-[11px] font-semibold hover:bg-muted disabled:opacity-40"
          :disabled="!charges.canAddProvisional"
          @click="charges.addChargeLine({ side: 'AR', provisional: true })"
        >
          <Plus :size="12" /> AR
        </button>
        <button
          type="button"
          class="flex h-7 items-center rounded-md border border-teal-200 bg-teal-50 px-2 text-[11px] font-semibold text-teal-900 hover:bg-teal-100 disabled:opacity-40"
          :disabled="!charges.canAddProvisional"
          @click="charges.addCommonSurcharge('CAF')"
        >
          + CAF
        </button>
        <button
          type="button"
          class="flex h-7 items-center rounded-md border border-border bg-white px-2 text-[11px] font-medium hover:bg-muted disabled:opacity-40"
          :disabled="!charges.canAddProvisional"
          @click="charges.addCommonSurcharge('FSC')"
        >
          + FSC
        </button>
        <button
          type="button"
          class="ml-auto flex h-7 items-center rounded-md border border-border px-2 text-[11px] font-medium hover:bg-muted"
          @click="openChargesDesk"
        >
          Open Charges &amp; Invoice
        </button>
      </div>

      <div v-if="charges.loading" class="py-4 text-center text-[11px] text-muted-foreground">
        Loading charges…
      </div>
      <table v-else-if="lines.length" class="w-full text-left text-[11px]">
        <thead class="text-[10px] uppercase tracking-wider text-slate-500">
          <tr>
            <th class="pb-1 font-semibold">Side</th>
            <th class="pb-1 font-semibold">Code</th>
            <th class="pb-1 font-semibold">Status</th>
            <th class="pb-1 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="line in lines.slice(0, 8)" :key="line.id" class="border-t border-border/80">
            <td class="py-1.5 font-mono text-[10px]">{{ line.side }}</td>
            <td class="py-1.5 font-mono font-semibold">{{ line.code }}</td>
            <td class="py-1.5">
              <span class="os-badge os-badge--micro os-badge--slate">{{ lineStatus(line.state) }}</span>
            </td>
            <td class="py-1.5 text-right">
              <input
                class="h-7 w-[88px] rounded border border-border bg-white px-1.5 text-right font-mono text-[11px] disabled:bg-slate-50"
                :value="line.baseAmount ?? line.amount"
                :disabled="!charges.canEditAccrued"
                @change="onAmount(line.id, ($event.target as HTMLInputElement).value)"
              />
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="py-3 text-center text-[11px] text-muted-foreground">
        No charge lines yet — add provisional AP / AR.
      </p>
      <p v-if="lines.length > 8" class="text-[10px] text-muted-foreground">
        Showing 8 of {{ lines.length }} — full ledger on spine step Charges &amp; Invoice.
      </p>
    </div>
  </div>
</template>
