<script setup lang="ts">
/**
 * Console Unified Ledger — parity with cargoware-os-shell-mock JobChargesView
 * money-scope="console-ap": interactive carrier AP ledger on the Console page.
 */
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Printer, TriangleAlert } from '@lucide/vue'
import { Button } from '@/components/ui/button'
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
import { assertNotConsoleArInvoice } from '@/lib/consoleDomain'
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

type DrawerTab = 'ap' | 'ar'

const props = defineProps<{
  shipmentId: number
  masterJobNo?: string
}>()

const emit = defineEmits<{
  breakdown: []
  houseAr: []
}>()

const charges = useChargesStore()
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
    if (Number.isFinite(id) && id > 0) void charges.load(id)
  },
  { immediate: true },
)

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

const moneyStateLabel = computed(() => {
  const ms = charges.payload?.moneyState
  if (!ms) return 'Draft'
  if (ms === 'charges_approved' || ms === 'invoiced' || ms === 'actuals_posted') return 'Approved'
  if (ms === 'provisioned') return 'Accrued'
  return String(ms).replace(/_/g, ' ')
})

function money(n: number | null | undefined, currency?: string) {
  return formatLedgerMoney(n, currency ?? home.value)
}

function onLedgerSelect(row: UnifiedLedgerRow) {
  selectedCode.value = row.code
  drawerTab.value = 'ap'
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

function saveVarianceNote() {
  if (!selectedRow.value?.ap || !varianceNote.value.trim()) return
  charges.clearVariance(selectedRow.value.ap.id, varianceNote.value)
}

function onAddApLine() {
  addOpen.value = false
  if (!charges.canAddLine && !charges.canAddProvisional) {
    charges.notify('Cannot add charge lines in this money state')
    return
  }
  charges.addChargeLine({ side: 'AP' })
}

function onPrint() {
  charges.notify('Print charges — demo preview (same as OS shell Print)')
  window.print()
}

function onHouseArClick() {
  try {
    assertNotConsoleArInvoice('console')
  } catch {
    // Domain forbids AR on console — house handoff is intentional
  }
  emit('houseAr')
}

function openFullCharges() {
  if (!Number.isFinite(props.shipmentId)) return
  void router.push({
    name: 'shipment',
    params: { shipmentId: String(props.shipmentId) },
    query: { step: 'money_preview' },
  })
}

function onArTabFocus() {
  charges.notify('Customer AR is edited on House Jobs — not on Console (carrier AP only)')
}
</script>

<template>
  <div class="console-charges-panel flex flex-col gap-0 pb-1">
    <div
      v-if="charges.payload?.blocked"
      class="mb-3 rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-900"
    >
      Accrue / Approve locked — active gate hold on this job.
      <span v-if="charges.payload.blockMessage" class="mt-0.5 block text-[11px]">
        {{ charges.payload.blockMessage }}
      </span>
    </div>

    <div
      class="mb-3 rounded-[10px] border border-sky-200 bg-sky-50 px-4 py-3 text-[12px] text-sky-950"
    >
      <strong>Console · Carrier AP only.</strong>
      Master airline/carrier charges (AP). Customer AR invoice and importer customs live on
      <em>House Jobs</em> — not on this Console.
      <span v-if="masterJobNo" class="mt-0.5 block font-mono text-[11px] text-sky-800/80">
        {{ masterJobNo }}
      </span>
    </div>

    <div v-if="charges.loading" class="py-8 text-center text-[12px] text-muted-foreground">
      Loading carrier AP…
    </div>

    <template v-else-if="charges.error">
      <div class="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-800">
        {{ charges.error }}
      </div>
    </template>

    <template v-else>
      <!-- GP strip (shell parity) -->
      <div
        class="flex flex-wrap items-center gap-3 rounded-t-[10px] border border-border border-b-0 bg-card px-4 py-3"
      >
        <div>
          <div class="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Unified Ledger
            <span class="ml-1 font-semibold normal-case tracking-normal text-sky-800">
              · Carrier AP
            </span>
          </div>
          <div class="text-[12px] text-muted-foreground">
            Cost lines (AP) for the master MAWB · click row to edit · Add charge is AP-only
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
            CAF {{ charges.payload?.cafPercent ?? 0 }}%
          </span>
          <span
            data-field-key="sellCurrency"
            class="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 font-mono text-[11px] font-semibold text-teal-900"
          >
            {{ home }} · GST rules
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
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            "
            @click="filter = f"
          >
            {{ f === 'all' ? 'All' : f === 'open' ? 'Open' : f === 'variance' ? 'Variance' : 'Posted' }}
            <span
              class="min-w-4 rounded-full px-1 text-center text-[10px] font-bold"
              :class="filter === f ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-500'"
            >
              {{ chipCounts[f] ?? 0 }}
            </span>
          </button>
        </div>

        <div class="flex-1" />

        <button
          type="button"
          class="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[12px] font-semibold text-foreground hover:bg-muted"
          @click="onPrint"
        >
          <Printer :size="14" />
          Print
        </button>

        <div class="relative">
          <button
            type="button"
            class="flex h-8 items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 text-[12px] font-semibold text-teal-800 hover:bg-teal-100 disabled:opacity-40"
            :disabled="!charges.canAddLine && !charges.canAddProvisional"
            @click="addOpen = !addOpen"
          >
            <Plus :size="14" />
            Add charge
          </button>
          <div
            v-if="addOpen"
            class="absolute right-0 top-[calc(100%+4px)] z-40 min-w-[180px] overflow-hidden rounded-lg border border-border bg-white shadow-md"
          >
            <button
              type="button"
              class="block w-full px-3.5 py-2.5 text-left text-[13px] hover:bg-teal-50"
              @click="onAddApLine"
            >
              Add AP line
            </button>
          </div>
        </div>

        <template v-if="isOps">
          <button
            v-if="charges.canAccrue"
            type="button"
            class="h-8 rounded-lg bg-primary px-3 text-[12px] font-semibold text-white disabled:opacity-40"
            :disabled="charges.acting"
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
            :class="!hasVariance ? 'bg-slate-900' : 'bg-slate-300'"
            :disabled="hasVariance || charges.acting"
            :title="
              hasVariance ? 'Resolve variance lines before approving' : ACTION_LABELS.approve
            "
            @click="charges.approve()"
          >
            <span class="flex items-center gap-1.5">
              <TriangleAlert v-if="hasVariance" :size="14" :stroke-width="1.75" aria-hidden="true" />
              {{ hasVariance ? 'Variance — cannot approve' : ACTION_LABELS.approve }}
            </span>
          </button>
        </template>

        <template v-else>
          <span class="text-[11px] text-muted-foreground">{{ charges.roleCanDo }}</span>
        </template>

        <button
          type="button"
          class="flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-[11px] font-medium hover:bg-muted"
          @click="emit('breakdown')"
        >
          Execute breakdown
        </button>
        <button
          type="button"
          class="flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-[11px] font-medium hover:bg-muted"
          @click="onHouseArClick"
        >
          House AR invoice…
        </button>
        <button
          type="button"
          class="flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-[11px] font-medium hover:bg-muted"
          @click="openFullCharges"
        >
          Open charges desk
        </button>
      </div>

      <div
        v-if="!ledgerRows.length"
        class="rounded-[10px] border border-dashed border-border bg-slate-50 px-3 py-8 text-center text-[12px] text-muted-foreground"
      >
        No AP lines on this console master — use Add charge or accrue on the charges desk.
      </div>

      <UnifiedLedgerTable
        v-else
        :rows="ledgerRows"
        :filter="filter"
        :selected-code="selectedCode"
        :show-chips="false"
        :currency-fallback="home"
        money-scope="console-ap"
        @select="onLedgerSelect"
        @update:filter="(f) => (filter = f)"
      />

      <div
        v-if="ledgerRows.length"
        class="mt-2 flex flex-wrap gap-4 border-t border-border/60 px-1 pt-2 text-[11px] text-muted-foreground"
      >
        <span>Sell {{ money(sellHome) }}</span>
        <span>Cost {{ money(costHome) }}</span>
        <span class="font-semibold text-foreground">GP {{ money(gpHome) }} · {{ gpPct.toFixed(1) }}%</span>
      </div>
    </template>

    <!-- AP edit drawer (AR blocked on console) -->
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
                <span
                  class="rounded bg-muted px-2 py-0.5 font-mono text-[13px] font-bold text-foreground"
                >
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
                  @click="onArTabFocus"
                >
                  AR · Sell
                </TabsTrigger>
              </TabsList>
            </SheetHeader>

            <div class="flex-1 overflow-y-auto px-[18px] py-4">
              <TabsContent value="ap" class="mt-0 flex flex-col gap-4">
                <div v-if="!selectedRow.ap" class="text-[13px] text-muted-foreground">
                  No AP cost line for this charge — use Add charge.
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
                        :disabled="!charges.canEditAccrued"
                        @change="commitApAccrued(($event.target as HTMLInputElement).value)"
                      />
                    </div>
                    <div class="space-y-1">
                      <Label class="text-[11px] text-muted-foreground">Actual</Label>
                      <Input
                        type="number"
                        class="h-[34px]"
                        :model-value="selectedRow.ap.actualAmount ?? ''"
                        :disabled="!charges.canEditActual"
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
                    <textarea
                      v-model="varianceNote"
                      rows="3"
                      class="w-full rounded-lg border border-input px-2.5 py-2 text-[13px]"
                      placeholder="Required before approval…"
                    />
                    <Button
                      size="sm"
                      class="mt-2"
                      :disabled="!varianceNote.trim() || !charges.canEditVarianceNote"
                      @click="saveVarianceNote"
                    >
                      Save note
                    </Button>
                  </div>
                </template>
              </TabsContent>

              <TabsContent value="ar" class="mt-0 space-y-3">
                <div
                  class="rounded-[10px] border border-sky-200 bg-sky-50 px-3 py-3 text-[12px] text-sky-950"
                >
                  <strong>AR blocked on Console.</strong>
                  Customer sell / invoice lives on House Jobs. Use
                  <button
                    type="button"
                    class="font-semibold text-teal-800 underline"
                    @click="onHouseArClick"
                  >
                    House AR invoice…
                  </button>
                  or open a house job.
                </div>
                <div v-if="selectedRow.ar" class="space-y-1 opacity-70">
                  <Label class="text-[11px] text-muted-foreground">Bill-to (hint)</Label>
                  <Input
                    class="h-[34px] bg-muted/40"
                    :model-value="selectedRow.ar.partyName ?? '—'"
                    readonly
                  />
                  <Label class="mt-2 text-[11px] text-muted-foreground">Sell amount (hint)</Label>
                  <Input
                    class="h-[34px] bg-muted/40"
                    :model-value="money(selectedRow.arAmount, selectedRow.currency)"
                    readonly
                  />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </template>
      </SheetContent>
    </Sheet>
  </div>
</template>
