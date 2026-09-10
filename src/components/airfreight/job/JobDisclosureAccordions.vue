<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileText, Package, Users, Wallet } from '@lucide/vue'
import type { JobContext, MarketPack } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { formatHostFactValue } from '@/lib/hostFacts'
import { formatLedgerMoney } from '@/lib/unifiedLedger'
import { useChargesStore } from '@/stores/charges'

const props = defineProps<{
  job: JobContext
}>()

const { t } = useI18n()
const charges = useChargesStore()

watch(
  () => props.job.shipmentId,
  (id) => {
    if (Number.isFinite(id) && id > 0) void charges.load(id)
  },
  { immediate: true },
)

const hf = computed(() => props.job.hostFacts)

const live = computed(() => {
  const p = charges.payload
  if (!p || p.shipmentId !== props.job.shipmentId) return null
  return p
})

const home = computed(() => live.value?.homeCurrency ?? props.job.homeCurrency ?? 'AUD')

const sellDisplay = computed(() => {
  if (live.value) return formatLedgerMoney(live.value.gp.sellTotal, home.value)
  return props.job.ops.sellAmount || '—'
})

const costDisplay = computed(() => {
  // Live AP accrued cost — never use hostFacts.overseasFreight (customs TIV freight)
  if (live.value) return formatLedgerMoney(live.value.gp.accruedCostTotal, home.value)
  return props.job.ops.costAmount || '—'
})

const marginDisplay = computed(() => {
  if (live.value) {
    const sell = live.value.gp.sellTotal
    if (!sell) return '—'
    return `${((live.value.gp.provisionalGp / sell) * 100).toFixed(1)}%`
  }
  return props.job.ops.marginPct || '—'
})

const gpDisplay = computed(() => {
  if (live.value) return formatLedgerMoney(live.value.gp.provisionalGp, home.value)
  return props.job.ops.provisionalGp || null
})

const atRiskDisplay = computed(() => {
  if (live.value) {
    if (live.value.blocked) {
      return live.value.blockMessage?.trim() || 'Money locked by gate'
    }
    const n = charges.unresolvedVarianceCount
    if (n > 0) return `${n} variance line${n > 1 ? 's' : ''} open`
    const v = live.value.gp.varianceTotal
    if (v != null && Math.abs(v) > 0.009) return `Var ${formatLedgerMoney(v, home.value)}`
    const sell = live.value.gp.sellTotal
    if (sell > 0) {
      const pct = (live.value.gp.provisionalGp / sell) * 100
      if (pct < 12) return `Margin ${pct.toFixed(1)}% below 12% gate`
    }
    return '—'
  }
  return props.job.ops.moneyAtRisk || '—'
})

const moneyBadge = computed(() => sellDisplay.value)

const partyRows = computed(() => {
  const f = hf.value
  if (f?.ownerName || f?.supplierName) {
    const rows: Array<{ role: string; name: string; ref: string }> = []
    if (f.ownerName) {
      rows.push({
        role: t('jobContext.hostFacts.owner'),
        name: f.ownerName,
        ref: formatHostFactValue(f.ownerRef),
      })
    }
    if (f.ownerContact) {
      rows.push({
        role: t('jobContext.hostFacts.ownerContact'),
        name: f.ownerContact,
        ref: formatHostFactValue(f.ownerId),
      })
    }
    if (f.supplierName) {
      rows.push({
        role: t('jobContext.hostFacts.supplier'),
        name: f.supplierName,
        ref: t('jobContext.hostFacts.shipperHint'),
      })
    }
    if (f.deliveryAddress) {
      rows.push({
        role: t('jobContext.hostFacts.delivery'),
        name: f.deliveryAddress,
        ref: '—',
      })
    }
    if (rows.length) return rows
  }
  return [
    { role: 'Shipper', name: props.job.summary.customer, ref: `Customer · ${props.job.pack}` },
    {
      role: 'Consignee',
      name: `${props.job.summary.route.split('→').pop()?.trim() ?? '—'} destination`,
      ref: 'Deliver-to party',
    },
    {
      role: 'Handled by (R)',
      name: props.job.raci.responsible,
      ref: `A ${props.job.raci.accountable}`,
    },
  ]
})

const cbmEstimate = computed(() =>
  Math.max(0.1, props.job.ops.grossWeightKg / 250).toFixed(1),
)

const cargoCount = computed(
  () =>
    `${props.job.ops.pieces} Pcs · ${props.job.ops.grossWeightKg.toLocaleString()} kg · ${cbmEstimate.value} CBM`,
)

/** Pack-filtered filings — don't flash AU ICS + US AES together */
const filings = computed(() => {
  const packs: MarketPack[] = props.job.activePacks?.length
    ? [...props.job.activePacks]
    : props.job.pack === 'GLOBAL'
      ? ['GLOBAL']
      : ['GLOBAL', props.job.pack]
  const docsWarn = props.job.compliance.documents === 'warn'
  const rows: Array<{ code: string; desc: string; status: string; ref: string }> = []

  if (packs.includes('AU')) {
    const c = props.job.clearance
    const declId =
      hf.value?.declarationId ??
      c?.externalRef ??
      null
    rows.push({
      code: 'Clearance',
      desc: t('jobContext.localFrame.clearanceChipHint'),
      status:
        c?.status === 'cleared'
          ? 'lodged'
          : c?.status === 'held'
            ? 'missing'
            : 'pending',
      ref:
        declId && String(declId).trim()
          ? String(declId)
          : c?.blockers?.[0]?.label ?? c?.note ?? (c?.status ?? '—'),
    })
  }
  if (packs.includes('US')) {
    rows.push({
      code: 'US AES',
      desc: 'Automated Export System',
      status: docsWarn ? 'missing' : 'done',
      ref: docsWarn ? 'ITN required' : props.job.ops.hawb ?? 'Filed',
    })
  }
  rows.push(
    {
      code: 'HAWB',
      desc: 'House Air Waybill',
      status: props.job.ops.hawb ? 'done' : 'pending',
      ref: props.job.ops.hawb ?? 'Awaiting issue',
    },
    {
      code: 'MAWB',
      desc: 'Master Air Waybill',
      status: props.job.ops.mawb ? 'done' : 'pending',
      ref: props.job.ops.mawb ?? 'Awaiting carrier',
    },
  )
  return rows
})

const filingBadge = computed(() => {
  if (props.job.pack === 'AU') return 'Clearance · AWB'
  if (props.job.pack === 'US') return 'AES · AWB'
  return 'AWB'
})

function statusVariant(status: string): 'normal' | 'high' | 'pack' {
  if (status === 'done' || status === 'lodged') return 'normal'
  if (status === 'missing') return 'high'
  return 'pack'
}

function statusLabel(status: string) {
  if (status === 'lodged') return 'Cleared'
  if (status === 'done') return 'Done'
  if (status === 'missing') return 'Held'
  return 'Pending'
}
</script>

<template>
  <!-- Collapsed by default — chunk details on demand -->
  <Accordion type="multiple" class="flex flex-col gap-3" :unmount-on-hide="false">
    <AccordionItem
      value="cargo"
      class="overflow-hidden rounded-[10px] border border-border bg-card shadow-sm last:border-b"
    >
      <AccordionTrigger class="px-4 py-[11px] hover:no-underline">
        <span class="flex flex-1 items-center gap-2.5 text-left">
          <Package :size="14" :stroke-width="1.75" class="shrink-0 text-muted-foreground" aria-hidden="true" />
          <span class="flex-1 text-[12px] font-semibold text-foreground">
            {{ t('jobContext.chunks.cargo') }}
          </span>
          <Badge variant="secondary" class="rounded-md text-[10px] font-semibold">{{ cargoCount }}</Badge>
        </span>
      </AccordionTrigger>
      <AccordionContent class="border-t border-border px-4 pb-3.5 pt-3">
        <div class="grid grid-cols-2 gap-x-6 gap-y-1.5">
          <div class="text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground">Pieces</div>
          <div class="text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground">Airline</div>
          <div class="pb-1.5 font-mono text-[12px] font-medium">{{ job.ops.pieces }}</div>
          <div class="pb-1.5 font-mono text-[12px] font-medium">{{ job.ops.airline }}</div>
          <div class="text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground">Gross Wt</div>
          <div class="text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground">Chg Wt</div>
          <div class="pb-1.5 font-mono text-[12px] font-medium">
            {{ job.ops.grossWeightKg.toLocaleString() }} kg
          </div>
          <div class="pb-1.5 font-mono text-[12px] font-medium">
            {{ job.ops.chargeableWeightKg.toLocaleString() }} kg
          </div>
          <div class="text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground">HAWB</div>
          <div class="text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground">MAWB</div>
          <div class="font-mono text-[12px] font-medium">{{ job.ops.hawb ?? '—' }}</div>
          <div class="font-mono text-[12px] font-medium">{{ job.ops.mawb ?? '—' }}</div>
        </div>
      </AccordionContent>
    </AccordionItem>

    <AccordionItem
      value="money"
      class="overflow-hidden rounded-[10px] border border-border bg-card shadow-sm last:border-b"
    >
      <AccordionTrigger class="px-4 py-[11px] hover:no-underline">
        <span class="flex flex-1 items-center gap-2.5 text-left">
          <Wallet :size="14" :stroke-width="1.75" class="shrink-0 text-muted-foreground" aria-hidden="true" />
          <span class="flex-1 text-[12px] font-semibold text-foreground">
            {{ t('jobContext.chunks.money') }}
          </span>
          <Badge variant="secondary" class="rounded-md text-[10px] font-semibold">
            {{ moneyBadge }}
          </Badge>
        </span>
      </AccordionTrigger>
      <AccordionContent class="border-t border-border px-4 pb-3.5 pt-3">
        <div class="grid grid-cols-2 gap-x-6 gap-y-1.5">
          <div class="text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground">Sell</div>
          <div class="text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground">Cost</div>
          <div class="pb-1.5 font-mono text-[12px] font-semibold text-emerald-700">
            {{ sellDisplay }}
          </div>
          <div class="pb-1.5 font-mono text-[12px] font-medium">{{ costDisplay }}</div>
          <div class="text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground">Margin</div>
          <div class="text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground">At risk</div>
          <div class="pb-1.5 font-mono text-[12px] font-medium">{{ marginDisplay }}</div>
          <div
            class="pb-1.5 font-mono text-[12px] font-medium"
            :class="atRiskDisplay !== '—' ? 'text-amber-800' : ''"
          >
            {{ atRiskDisplay }}
          </div>
          <div
            v-if="gpDisplay"
            class="text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground"
          >
            Provisional GP
          </div>
          <div
            v-if="gpDisplay"
            class="text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground"
          />
          <div v-if="gpDisplay" class="font-mono text-[12px] font-medium">{{ gpDisplay }}</div>
          <div
            v-if="hf?.insurance"
            class="text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground"
          >
            {{ t('jobContext.hostFacts.insurance') }}
          </div>
          <div
            v-if="hf?.insurance"
            class="text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground"
          />
          <div v-if="hf?.insurance" class="pb-1.5 font-mono text-[12px] font-medium">
            {{ hf.insurance }}
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>

    <AccordionItem
      value="parties"
      class="overflow-hidden rounded-[10px] border border-border bg-card shadow-sm last:border-b"
    >
      <AccordionTrigger class="px-4 py-[11px] hover:no-underline">
        <span class="flex flex-1 items-center gap-2.5 text-left">
          <Users :size="14" :stroke-width="1.75" class="shrink-0 text-muted-foreground" aria-hidden="true" />
          <span class="flex-1 text-[12px] font-semibold text-foreground">
            {{ t('jobContext.chunks.parties') }}
          </span>
          <Badge variant="secondary" class="rounded-md text-[10px] font-semibold">
            {{ job.raci.responsible }}
          </Badge>
        </span>
      </AccordionTrigger>
      <AccordionContent class="flex flex-col gap-2 border-t border-border px-4 pb-3.5 pt-3">
        <div
          v-for="p in partyRows"
          :key="p.role"
          class="flex items-center justify-between rounded-[7px] border border-border bg-muted/60 px-2.5 py-1.5"
        >
          <div>
            <div class="text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
              {{ p.role }}
            </div>
            <div class="mt-0.5 text-[12px] font-semibold text-foreground">{{ p.name }}</div>
          </div>
          <span class="font-mono text-[10px] text-muted-foreground">{{ p.ref }}</span>
        </div>
      </AccordionContent>
    </AccordionItem>

    <AccordionItem
      value="filings"
      class="overflow-hidden rounded-[10px] border border-border bg-card shadow-sm last:border-b"
    >
      <AccordionTrigger class="px-4 py-[11px] hover:no-underline">
        <span class="flex flex-1 items-center gap-2.5 text-left">
          <FileText :size="14" :stroke-width="1.75" class="shrink-0 text-muted-foreground" aria-hidden="true" />
          <span class="flex-1 text-[12px] font-semibold text-foreground">
            {{ t('jobContext.chunks.filings') }}
          </span>
          <Badge variant="secondary" class="rounded-md text-[10px] font-semibold">{{ filingBadge }}</Badge>
        </span>
      </AccordionTrigger>
      <AccordionContent class="flex flex-col gap-1.5 border-t border-border px-4 pb-3.5 pt-3">
        <div
          v-for="f in filings"
          :key="f.code"
          class="flex items-center justify-between rounded-[7px] border border-border bg-muted/60 px-2.5 py-1.5"
        >
          <div class="flex min-w-0 items-center gap-2">
            <span class="min-w-[72px] font-mono text-[11px] font-bold text-foreground">{{ f.code }}</span>
            <span class="truncate text-[11px] text-muted-foreground">{{ f.desc }}</span>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <span class="hidden max-w-[120px] truncate font-mono text-[10px] text-muted-foreground sm:inline">
              {{ f.ref }}
            </span>
            <Badge :variant="statusVariant(f.status)" class="rounded-md text-[10px] font-semibold">
              {{ statusLabel(f.status) }}
            </Badge>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  </Accordion>
</template>
