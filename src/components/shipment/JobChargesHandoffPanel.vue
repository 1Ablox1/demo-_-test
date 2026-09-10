<script setup lang="ts">
/**
 * Spine 5 — Charges & Invoice (OS shell JobBillingView parity).
 * Unified Ledger (JobChargesView) + Invoice preview (JobInvoiceView).
 */
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Printer, TriangleAlert } from '@lucide/vue'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import UnifiedLedgerTable from '@/components/finance/UnifiedLedgerTable.vue'
import { ACTION_LABELS } from '@/lib/actionLabels'
import {
  buildUnifiedLedger,
  formatLedgerMoney,
  ledgerChipCounts,
  ledgerRowStatus,
  ledgerStatusClass,
  type LedgerFilter,
  type UnifiedLedgerRow,
} from '@/lib/unifiedLedger'
import { useChargesStore } from '@/stores/charges'
import { useInvoiceStore } from '@/stores/invoice'
import { useFreightStore } from '@/stores/freight'
import { displayJobNo } from '@/lib/jobIdentity'

type DrawerTab = 'ap' | 'ar'

const props = defineProps<{
  shipmentId: number
}>()

const charges = useChargesStore()
const invoice = useInvoiceStore()
const freight = useFreightStore()
const router = useRouter()

const filter = ref<LedgerFilter>('all')
const selectedCode = ref<string | null>(null)
const drawerTab = ref<DrawerTab>('ap')
const varianceNote = ref('')
const addOpen = ref(false)

watch(
  () => props.shipmentId,
  (id) => {
    selectedCode.value = null
    filter.value = 'all'
    if (Number.isFinite(id) && id > 0) {
      void charges.load(id)
      void invoice.load(id)
    }
  },
  { immediate: true },
)

const ship = computed(() => freight.shipments.find((s) => Number(s.id) === props.shipmentId) ?? null)

const ledgerRows = computed(() => {
  const p = charges.payload
  if (!p?.lines?.length) return []
  return buildUnifiedLedger(p.lines, p.varianceThresholdPct)
})

const chipCounts = computed(() => ledgerChipCounts(ledgerRows.value))
const hasVariance = computed(() => chipCounts.value.variance > 0)

const selectedRow = computed(
  () => ledgerRows.value.find((r) => r.code === selectedCode.value) ?? null,
)

watch(selectedRow, (row) => {
  varianceNote.value = row?.ap?.varianceNote ?? ''
})

const isOps = computed(() => charges.role === 'operations')
const isFinanceSeat = computed(() => charges.role === 'finance' || charges.role === 'admin')

const home = computed(() => charges.payload?.homeCurrency ?? 'AUD')
const sellHome = computed(() => charges.payload?.gp.sellTotal ?? 0)
const costHome = computed(() => charges.payload?.gp.accruedCostTotal ?? 0)
const gpHome = computed(() => charges.payload?.gp.provisionalGp ?? 0)
const gpPct = computed(() => {
  if (!sellHome.value) return 0
  return (gpHome.value / sellHome.value) * 100
})
const cafPct = computed(() => charges.payload?.cafPercent ?? 0)
const blocked = computed(() => Boolean(charges.payload?.blocked))

const moneyStateLabel = computed(() => {
  const ms = charges.payload?.moneyState
  if (!ms) return 'draft'
  if (ms === 'charges_approved') return 'approved'
  if (ms === 'invoiced' || ms === 'part_invoiced') return 'invoiced'
  if (ms === 'actuals_posted') return 'posted'
  if (ms === 'provisioned') return 'accrued'
  return String(ms).replace(/_/g, ' ')
})

const inv = computed(() => invoice.payload)

const jobLabel = computed(() => {
  if (inv.value?.jobNo) return inv.value.jobNo
  if (ship.value?.jobNo) return ship.value.jobNo
  return displayJobNo({
    lob: ship.value?.lob,
    shipmentId: props.shipmentId,
  })
})

const customerLabel = computed(() => ship.value?.customer ?? inv.value?.customer ?? '—')

const gstAmount = computed(() => {
  if (inv.value?.taxAud != null) return inv.value.taxAud
  return Math.round(sellHome.value * 0.1)
})

const invoiceTotal = computed(() => {
  if (inv.value?.totalAud != null) return inv.value.totalAud
  return sellHome.value + gstAmount.value
})

const invoiceState = computed(() => {
  if (blocked.value || (inv.value?.blockers?.some((b) => !b.cleared) ?? false)) {
    return 'Locked — approve charges first'
  }
  const st = inv.value?.state
  if (st === 'issued' || st === 'part_paid' || st === 'paid') return 'Invoiced'
  if (st === 'ready') return 'Ready to issue'
  if (charges.payload?.moneyState === 'charges_approved') return 'Draft ready · awaiting POD'
  return 'Locked — approve charges first'
})

const canIssueInvoice = computed(() => invoice.canIssue && !blocked.value)

function money(n: number | null | undefined, currency?: string) {
  return formatLedgerMoney(n, currency ?? home.value)
}

function onLedgerSelect(row: UnifiedLedgerRow) {
  selectedCode.value = row.code
  drawerTab.value = row.ap ? 'ap' : 'ar'
}

function closeDrawer() {
  selectedCode.value = null
}

function commitApAccrued(raw: string) {
  if (!selectedRow.value?.ap || !charges.canEditAccrued) return
  const n = Number(raw)
  if (!Number.isFinite(n)) return
  charges.updateLineAmount(selectedRow.value.ap.id, 'accrued', n)
}

function commitApActual(raw: string) {
  if (!selectedRow.value?.ap || !charges.canEditActual) return
  const n = Number(raw)
  if (!Number.isFinite(n)) return
  charges.updateLineAmount(selectedRow.value.ap.id, 'actual', n)
}

function commitArSell(raw: string) {
  if (!selectedRow.value?.ar || !charges.canEditAccrued) return
  const n = Number(raw)
  if (!Number.isFinite(n)) return
  charges.updateLineAmount(selectedRow.value.ar.id, 'accrued', n)
}

function saveVarianceNote() {
  if (!selectedRow.value?.ap || !varianceNote.value.trim()) return
  charges.clearVariance(selectedRow.value.ap.id, varianceNote.value)
}

function onAddLine(side: 'AP' | 'AR') {
  addOpen.value = false
  charges.addChargeLine({ side, provisional: true })
}

function onPrintCharges() {
  charges.notify('Print charges (mock) — open browser print from AF-05 for full layout')
  window.print()
}

function onPrintInvoice() {
  charges.notify('Print invoice (mock)')
  window.print()
}

function openBillingModule() {
  void router.push({ name: 'billing-ledger', query: { job: String(props.shipmentId) } })
}

function issueInvoice() {
  void invoice.issue()
}
</script>

<template>
  <div class="space-y-4">
    <!-- Shell JobBillingView header -->
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h2 class="text-[15px] font-bold text-slate-900">Charges &amp; Invoice</h2>
        <p class="text-[12px] text-slate-500">
          Accrue, approve, and issue on this Job spine step — stay here to fill money.
          <button
            type="button"
            class="ml-1 font-semibold text-teal-700 hover:underline"
            @click="openBillingModule"
          >
            Portfolio Billing
          </button>
          <span class="text-slate-400"> (cross-job view)</span>
        </p>
      </div>
    </div>

    <div
      v-if="blocked"
      class="rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-900"
    >
      Accrue / Approve locked — active gate hold on this job.
    </div>

    <div v-if="charges.loading" class="py-8 text-center text-[12px] text-muted-foreground">
      Loading Unified Ledger…
    </div>

    <div
      v-else-if="charges.error"
      class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-800"
    >
      {{ charges.error }}
    </div>

    <template v-else>
      <!-- GP strip (shell JobChargesView) -->
      <div
        class="flex flex-wrap items-center gap-3 rounded-t-[10px] border border-border border-b-0 bg-card px-4 py-3"
      >
        <div>
          <div class="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Unified Ledger
          </div>
          <div class="text-[12px] text-muted-foreground">
            Cost → charge item → revenue (paired by code) · double-click row to inspect ·
            <button
              type="button"
              class="font-semibold text-teal-700 hover:underline"
              @click="openBillingModule"
            >
              Portfolio Billing
            </button>
          </div>
        </div>
        <div class="ml-auto flex flex-wrap items-center gap-2">
          <span
            class="rounded-full border border-primary/20 bg-teal-50 px-3 py-1 font-mono text-[12px] font-semibold text-teal-800"
          >
            GP {{ money(gpHome) }} · {{ gpPct.toFixed(1) }}%
          </span>
          <span
            class="rounded-full border border-border bg-muted/40 px-3 py-1 text-[11px] text-muted-foreground"
          >
            {{ moneyStateLabel }}
          </span>
          <span
            class="rounded-full border border-border bg-muted/40 px-3 py-1 text-[11px] text-muted-foreground"
          >
            CAF {{ cafPct }}%
          </span>
        </div>
      </div>

      <!-- Action toolbar -->
      <div
        class="mb-3 flex flex-wrap items-center gap-2 rounded-b-[10px] border border-border bg-card px-4 py-2.5"
      >
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="f in (['all', 'open', 'variance', 'posted'] as LedgerFilter[])"
            :key="f"
            type="button"
            class="flex items-center gap-1.5 rounded-[7px] border px-3 py-1.5 text-xs font-medium transition"
            :class="
              filter === f
                ? 'border-teal-600 bg-teal-50 text-teal-800'
                : 'border-border bg-card text-foreground hover:bg-muted'
            "
            @click="filter = f"
          >
            {{ f === 'all' ? 'All' : f === 'open' ? 'Open' : f === 'variance' ? 'Variance' : 'Posted' }}
            <span
              class="min-w-4 rounded-full px-1 text-center text-[10px] font-bold"
              :class="filter === f ? 'bg-teal-700 text-white' : 'bg-muted text-muted-foreground'"
            >
              {{ chipCounts[f] ?? 0 }}
            </span>
          </button>
        </div>

        <div class="flex-1" />

        <button
          type="button"
          class="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[12px] font-semibold text-foreground hover:bg-muted"
          @click="onPrintCharges"
        >
          <Printer :size="14" />
          Print
        </button>

        <div class="relative">
          <button
            type="button"
            class="flex h-8 items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 text-[12px] font-semibold text-teal-800 hover:bg-teal-100 disabled:opacity-40"
            :disabled="!charges.canAddLine || blocked"
            @click="addOpen = !addOpen"
          >
            <Plus :size="14" />
            Add charge
          </button>
          <div
            v-if="addOpen"
            class="absolute right-0 top-[calc(100%+4px)] z-40 min-w-[160px] overflow-hidden rounded-lg border border-border bg-white shadow-md"
          >
            <button
              type="button"
              class="block w-full px-3.5 py-2.5 text-left text-[13px] hover:bg-teal-50"
              @click="onAddLine('AP')"
            >
              Add AP line
            </button>
            <button
              type="button"
              class="block w-full border-t border-border px-3.5 py-2.5 text-left text-[13px] hover:bg-teal-50"
              @click="onAddLine('AR')"
            >
              Add AR line
            </button>
          </div>
        </div>

        <template v-if="isOps">
          <button
            v-if="charges.canAccrue"
            type="button"
            class="h-8 rounded-lg bg-primary px-3 text-[12px] font-semibold text-white disabled:opacity-40"
            :disabled="charges.acting || blocked"
            @click="charges.accrue()"
          >
            {{ ACTION_LABELS.accrue }}
          </button>
        </template>
        <template v-else-if="isFinanceSeat">
          <button
            v-if="charges.canApprove"
            type="button"
            class="h-8 rounded-lg px-3 text-[12px] font-semibold text-white disabled:opacity-40"
            :class="!hasVariance && !blocked ? 'bg-slate-900' : 'bg-slate-300'"
            :disabled="hasVariance || charges.acting || blocked"
            @click="charges.approve()"
          >
            <span class="flex items-center gap-1.5">
              <TriangleAlert v-if="hasVariance" :size="14" aria-hidden="true" />
              {{ hasVariance ? 'Variance — cannot approve' : ACTION_LABELS.approve }}
            </span>
          </button>
        </template>
      </div>

      <UnifiedLedgerTable
        :rows="ledgerRows"
        :filter="filter"
        :selected-code="selectedCode"
        :show-chips="false"
        :currency-fallback="home"
        money-scope="full"
        @select="onLedgerSelect"
        @update:filter="(f) => (filter = f)"
      />

      <!-- Totals footer (shell) -->
      <div
        class="mt-3 flex flex-wrap gap-4 rounded-[10px] border border-border bg-card px-4 py-3 text-[12px]"
      >
        <div>
          <span class="text-muted-foreground">Sell total</span>
          <span class="ml-2 font-mono font-semibold">{{ money(sellHome) }}</span>
        </div>
        <div>
          <span class="text-muted-foreground">Cost + CAF</span>
          <span class="ml-2 font-mono font-semibold">{{ money(costHome) }}</span>
        </div>
        <div>
          <span class="text-muted-foreground">GP</span>
          <span class="ml-2 font-mono font-semibold text-teal-800">
            {{ money(gpHome) }} ({{ gpPct.toFixed(1) }}%)
          </span>
        </div>
      </div>
    </template>

    <!-- Invoice preview (shell JobInvoiceView) -->
    <section id="job-invoice-panel" class="scroll-mt-4 border-t border-slate-200 pt-4">
      <div
        v-if="blocked || (inv?.blockers?.some((b) => !b.cleared) ?? false)"
        class="mb-3 rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-900"
      >
        Invoice locked while gate holds are open.
      </div>

      <div class="rounded-[10px] border border-border bg-card p-5">
        <div class="mb-4 flex items-start justify-between gap-2">
          <div>
            <h2 class="text-[15px] font-semibold">Invoice preview</h2>
            <p class="mt-1 text-[12px] text-muted-foreground">
              {{ jobLabel }} · {{ customerLabel }} · {{ home }}
            </p>
          </div>
          <span
            class="shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
            :class="
              canIssueInvoice || inv?.state === 'issued'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-border bg-muted text-muted-foreground'
            "
          >
            {{ invoiceState }}
          </span>
        </div>

        <div class="mb-4 grid gap-3 sm:grid-cols-3">
          <div class="rounded-lg border border-border bg-muted/40 p-3">
            <div class="text-[10px] font-bold uppercase text-muted-foreground">Sell (AR)</div>
            <div class="font-mono text-[14px] font-semibold">
              {{ home }} {{ Math.round(sellHome).toLocaleString() }}
            </div>
          </div>
          <div class="rounded-lg border border-border bg-muted/40 p-3">
            <div class="text-[10px] font-bold uppercase text-muted-foreground">GST (10%)</div>
            <div class="font-mono text-[14px] font-semibold">
              {{ home }} {{ Math.round(gstAmount).toLocaleString() }}
            </div>
          </div>
          <div class="rounded-lg border border-border bg-muted/40 p-3">
            <div class="text-[10px] font-bold uppercase text-muted-foreground">Invoice total</div>
            <div class="font-mono text-[14px] font-semibold">
              {{ home }} {{ Math.round(invoiceTotal).toLocaleString() }}
            </div>
          </div>
        </div>

        <p class="mb-4 text-[11px] text-muted-foreground">
          Flow: Draft → Accrue → Approve → Issue. Tick POD on Delivery before final tax invoice.
        </p>

        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="h-9 rounded-lg px-4 text-[12px] font-bold text-white disabled:opacity-40"
            :class="canIssueInvoice ? 'bg-primary' : 'bg-slate-300'"
            :disabled="!canIssueInvoice || invoice.acting"
            @click="issueInvoice"
          >
            Issue invoice
          </button>
          <button
            type="button"
            class="h-9 rounded-lg border border-border bg-card px-4 text-[12px] font-semibold text-foreground hover:bg-muted"
            @click="onPrintInvoice"
          >
            Print invoice
          </button>
        </div>
      </div>
    </section>

    <!-- Row inspect drawer -->
    <Sheet :open="!!selectedRow" @update:open="(v) => !v && closeDrawer()">
      <SheetContent
        side="right"
        class="flex w-full flex-col gap-0 p-0 sm:max-w-[420px]"
        :show-close-button="true"
      >
        <template v-if="selectedRow">
          <Tabs v-model="drawerTab" class="flex min-h-0 flex-1 flex-col">
            <SheetHeader class="space-y-0 border-b border-border px-[18px] pt-3.5 text-left">
              <div class="mb-2.5 flex items-center gap-2 pr-8">
                <span class="rounded bg-muted px-2 py-0.5 font-mono text-[13px] font-bold">
                  {{ selectedRow.code }}
                </span>
                <SheetTitle class="min-w-0 flex-1 truncate text-sm font-semibold">
                  {{ selectedRow.label }}
                </SheetTitle>
                <span
                  class="rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-wide"
                  :class="ledgerStatusClass(ledgerRowStatus(selectedRow))"
                >
                  {{ ledgerRowStatus(selectedRow).toUpperCase() }}
                </span>
              </div>
              <TabsList
                variant="line"
                class="h-auto w-full justify-start gap-0 rounded-none bg-transparent p-0"
              >
                <TabsTrigger
                  value="ap"
                  class="rounded-none border-b-2 border-transparent px-3.5 py-1.5 text-xs data-[state=active]:border-primary data-[state=active]:shadow-none"
                >
                  AP · Cost
                </TabsTrigger>
                <TabsTrigger
                  value="ar"
                  class="rounded-none border-b-2 border-transparent px-3.5 py-1.5 text-xs data-[state=active]:border-primary data-[state=active]:shadow-none"
                >
                  AR · Sell
                </TabsTrigger>
              </TabsList>
            </SheetHeader>

            <div class="flex-1 overflow-y-auto px-[18px] py-4">
              <TabsContent value="ap" class="mt-0 flex flex-col gap-4">
                <div v-if="!selectedRow.ap" class="text-[13px] text-muted-foreground">
                  No AP cost line for this charge.
                </div>
                <template v-else>
                  <div class="space-y-1">
                    <Label class="text-[11px] text-muted-foreground">Supplier</Label>
                    <Input
                      class="h-[34px] bg-muted/40"
                      :model-value="selectedRow.ap.partyName ?? '—'"
                      readonly
                    />
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <div class="space-y-1">
                      <Label class="text-[11px] text-muted-foreground">Accrued</Label>
                      <Input
                        type="number"
                        class="h-[34px]"
                        :model-value="selectedRow.ap.baseAmount ?? selectedRow.ap.amount ?? ''"
                        :disabled="!charges.canEditAccrued || blocked"
                        @change="commitApAccrued(($event.target as HTMLInputElement).value)"
                      />
                    </div>
                    <div class="space-y-1">
                      <Label class="text-[11px] text-muted-foreground">Actual</Label>
                      <Input
                        type="number"
                        class="h-[34px]"
                        :model-value="selectedRow.ap.actualAmount ?? ''"
                        :disabled="!charges.canEditActual || blocked"
                        @change="commitApActual(($event.target as HTMLInputElement).value)"
                      />
                    </div>
                  </div>
                  <div
                    v-if="selectedRow.costVariance"
                    class="rounded-[7px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800"
                  >
                    Variance {{ money(Math.abs(selectedRow.costVariance), selectedRow.currency) }}
                  </div>
                  <div v-if="isFinanceSeat && selectedRow.varianceFlagged" class="space-y-1">
                    <Label class="text-[11px] text-muted-foreground">Variance note</Label>
                    <Input v-model="varianceNote" class="h-[34px]" />
                    <button
                      type="button"
                      class="mt-1 text-[11px] font-semibold text-teal-800 underline disabled:opacity-40"
                      :disabled="!varianceNote.trim() || !charges.canEditVarianceNote"
                      @click="saveVarianceNote"
                    >
                      Save note
                    </button>
                  </div>
                </template>
              </TabsContent>

              <TabsContent value="ar" class="mt-0 flex flex-col gap-4">
                <div v-if="!selectedRow.ar" class="text-[13px] text-muted-foreground">
                  No AR sell line for this charge.
                </div>
                <template v-else>
                  <div class="space-y-1">
                    <Label class="text-[11px] text-muted-foreground">Customer</Label>
                    <Input
                      class="h-[34px] bg-muted/40"
                      :model-value="selectedRow.ar.partyName ?? '—'"
                      readonly
                    />
                  </div>
                  <div class="space-y-1">
                    <Label class="text-[11px] text-muted-foreground">Sell amount</Label>
                    <Input
                      type="number"
                      class="h-[34px] font-mono"
                      :model-value="selectedRow.ar.baseAmount ?? selectedRow.ar.amount ?? ''"
                      :disabled="!charges.canEditAccrued || blocked"
                      @change="commitArSell(($event.target as HTMLInputElement).value)"
                    />
                  </div>
                </template>
              </TabsContent>
            </div>
          </Tabs>
        </template>
      </SheetContent>
    </Sheet>
  </div>
</template>
