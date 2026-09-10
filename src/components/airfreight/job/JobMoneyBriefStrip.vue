<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { formatLedgerMoney } from '@/lib/unifiedLedger'
import { useChargesStore } from '@/stores/charges'

const props = defineProps<{
  shipmentId: number
}>()

const charges = useChargesStore()
const router = useRouter()

watch(
  () => props.shipmentId,
  (id) => {
    if (Number.isFinite(id) && id > 0) void charges.load(id)
  },
  { immediate: true },
)

/** Only trust store payload when it matches this overview job. */
const live = computed(() => {
  const p = charges.payload
  if (!p || p.shipmentId !== props.shipmentId) return null
  return p
})

const home = computed(() => live.value?.homeCurrency ?? 'AUD')
const sell = computed(() => live.value?.gp.sellTotal ?? null)
const cost = computed(() => live.value?.gp.accruedCostTotal ?? null)
const gp = computed(() => live.value?.gp.provisionalGp ?? null)
const variance = computed(() => live.value?.gp.varianceTotal ?? null)
const gpPct = computed(() => {
  if (sell.value == null || sell.value === 0) return null
  if (gp.value == null) return null
  return (gp.value / sell.value) * 100
})
const varianceOpen = computed(() => {
  if (!live.value) return 0
  return charges.unresolvedVarianceCount
})
const moneyState = computed(() => {
  const ms = live.value?.moneyState
  if (!ms) return '—'
  if (ms === 'charges_approved') return 'Approved'
  if (ms === 'invoiced' || ms === 'part_invoiced') return 'Invoiced'
  if (ms === 'actuals_posted') return 'Posted'
  if (ms === 'provisioned') return 'Accrued'
  if (ms === 'blocked') return 'Blocked'
  return String(ms).replace(/_/g, ' ')
})

const atRisk = computed(() => {
  if (!live.value) return null
  if (live.value.blocked) {
    return live.value.blockMessage?.trim() || 'Money locked by gate'
  }
  if (varianceOpen.value > 0) {
    return `${varianceOpen.value} variance line${varianceOpen.value > 1 ? 's' : ''} open`
  }
  if (variance.value != null && Math.abs(variance.value) > 0.009) {
    return `Var ${formatLedgerMoney(variance.value, home.value)}`
  }
  if (gpPct.value != null && gpPct.value < 12) {
    return `Margin ${gpPct.value.toFixed(1)}% below 12% gate`
  }
  return null
})

function money(n: number | null) {
  if (n == null) return '—'
  return formatLedgerMoney(n, home.value)
}

function openOperateCharges() {
  void router.push({
    name: 'shipment',
    params: { shipmentId: String(props.shipmentId) },
    query: { step: 'money_preview' },
  })
}
</script>

<template>
  <section
    class="overflow-hidden rounded-[10px] border border-border bg-card shadow-sm"
    aria-label="Money brief"
  >
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3.5 py-2">
      <div>
        <div class="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Money brief
        </div>
        <p class="text-[11px] text-muted-foreground">
          Live ledger snapshot — accrue / approve / invoice on Edit Job · Charges &amp; Invoice
        </p>
      </div>
      <button
        type="button"
        class="rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-900 hover:bg-teal-100"
        @click="openOperateCharges"
      >
        Open Charges &amp; Invoice
      </button>
    </div>

    <div v-if="charges.loading && !live" class="px-3.5 py-4 text-[12px] text-muted-foreground">
      Loading money snapshot…
    </div>

    <div
      v-else-if="charges.error && !live"
      class="border-t border-red-100 bg-red-50 px-3.5 py-3 text-[12px] text-red-800"
    >
      {{ charges.error }}
    </div>

    <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
      <div class="border-b border-border px-3.5 py-2.5 sm:border-r lg:border-b-0">
        <div class="mb-1 text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
          Sell (AR)
        </div>
        <div class="font-mono text-[13px] font-semibold text-foreground">{{ money(sell) }}</div>
      </div>
      <div class="border-b border-border px-3.5 py-2.5 sm:border-r lg:border-b-0">
        <div class="mb-1 text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
          Cost (AP)
        </div>
        <div class="font-mono text-[13px] font-semibold text-foreground">{{ money(cost) }}</div>
      </div>
      <div class="border-b border-border px-3.5 py-2.5 sm:border-r lg:border-b-0">
        <div class="mb-1 text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
          Gross profit
        </div>
        <div class="font-mono text-[13px] font-semibold text-teal-800">{{ money(gp) }}</div>
      </div>
      <div class="border-b border-border px-3.5 py-2.5 sm:border-r lg:border-b-0">
        <div class="mb-1 text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
          Margin
        </div>
        <div class="font-mono text-[13px] font-semibold text-foreground">
          {{ gpPct == null ? '—' : `${gpPct.toFixed(1)}%` }}
        </div>
      </div>
      <div class="border-b border-border px-3.5 py-2.5 sm:border-r lg:border-b-0">
        <div class="mb-1 text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
          At risk
        </div>
        <div
          class="truncate text-[12px] font-semibold"
          :class="atRisk ? 'text-amber-800' : 'text-foreground'"
          :title="atRisk ?? undefined"
        >
          {{ atRisk ?? '—' }}
        </div>
      </div>
      <div class="px-3.5 py-2.5">
        <div class="mb-1 text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
          Money state
        </div>
        <div class="text-[13px] font-semibold capitalize text-foreground">{{ moneyState }}</div>
      </div>
    </div>
  </section>
</template>
