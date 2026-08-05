<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import AppShell from '@/components/airfreight/AppShell.vue'
import JobNavStrip from '@/components/airfreight/JobNavStrip.vue'
import Button from '@/components/ui/Button.vue'
import {
  buildUnifiedLedger,
  type LedgerFilter,
  type UnifiedLedgerRow,
} from '@/lib/unifiedLedger'
import { useChargesStore } from '@/stores/charges'
import { useJobStore } from '@/stores/job'

type UiStatus = 'Draft' | 'Accrued' | 'Approved' | 'Posted' | 'Variance'
type DrawerTab = 'ap' | 'ar' | 'audit'
type ChipFilter = 'all' | 'open' | 'variance' | 'posted'

const route = useRoute()
const router = useRouter()
const store = useChargesStore()
const jobStore = useJobStore()
const { t } = useI18n()

const shipmentId = computed(() => Number(route.params.shipmentId))

const filter = ref<ChipFilter>('all')
const selectedCode = ref<string | null>(null)
const drawerTab = ref<DrawerTab>('ap')
const settingsOpen = ref(false)
const addOpen = ref(false)
const cafDraft = ref(3.5)
const fxDraft = ref(1.53)
const thresholdDraft = ref(10)
const varianceNote = ref('')

const isOps = computed(() => store.role === 'operations')
const isFinanceSeat = computed(() => store.role === 'finance' || store.role === 'admin')
const financeReadOnlyAmounts = computed(() => store.role === 'finance')

watch(
  shipmentId,
  (id) => {
    selectedCode.value = null
    filter.value = 'all'
    if (Number.isFinite(id)) {
      void store.load(id)
      void jobStore.load(id)
    }
  },
  { immediate: true },
)

watch(
  () => store.payload,
  (p) => {
    if (!p) return
    cafDraft.value = p.cafPercent
    fxDraft.value = p.fxToAud
    thresholdDraft.value = p.varianceThresholdPct
  },
)

onMounted(() => {
  if (Number.isFinite(shipmentId.value)) {
    void store.load(shipmentId.value)
    void jobStore.load(shipmentId.value)
  }
})

onUnmounted(() => store.clear())

const ledgerRows = computed(() =>
  store.payload
    ? buildUnifiedLedger(store.payload.lines, store.payload.varianceThresholdPct)
    : [],
)

function rowStatus(row: UnifiedLedgerRow): UiStatus {
  if (row.varianceFlagged) return 'Variance'
  if (row.fullyPosted) return 'Posted'
  const states = [row.apState, row.arState]
  if (states.some((s) => s === 'approved' || s === 'invoiced_ar')) return 'Approved'
  if (states.some((s) => s === 'accrued' || s === 'actual_ap' || s === 'rated')) return 'Accrued'
  return 'Draft'
}

const chipCounts = computed(() => {
  const rows = ledgerRows.value
  return {
    all: rows.length,
    open: rows.filter((r) => {
      const s = rowStatus(r)
      return s === 'Draft' || s === 'Accrued'
    }).length,
    variance: rows.filter((r) => rowStatus(r) === 'Variance').length,
    posted: rows.filter((r) => rowStatus(r) === 'Posted').length,
  }
})

const visibleRows = computed(() => {
  const rows = ledgerRows.value
  if (filter.value === 'all') return rows
  if (filter.value === 'open') {
    return rows.filter((r) => {
      const s = rowStatus(r)
      return s === 'Draft' || s === 'Accrued'
    })
  }
  if (filter.value === 'variance') return rows.filter((r) => rowStatus(r) === 'Variance')
  if (filter.value === 'posted') return rows.filter((r) => rowStatus(r) === 'Posted')
  return rows
})

const selectedRow = computed(
  () => ledgerRows.value.find((r) => r.code === selectedCode.value) ?? null,
)

const hasVariance = computed(() => chipCounts.value.variance > 0)

const jobId = computed(() => store.payload?.jobNo ?? `AF-${shipmentId.value}`)
const hawb = computed(() => jobStore.job?.ops.hawb ?? null)
const mawb = computed(() => jobStore.job?.ops.mawb ?? null)
const customer = computed(
  () => jobStore.job?.summary.customer ?? store.payload?.lines.find((l) => l.side === 'AR')?.partyName ?? '—',
)
const lane = computed(() => jobStore.job?.summary.route ?? '—')
const etd = computed(() => jobStore.job?.ops.etdLabel?.replace(/^ETD\s+/i, '') ?? '—')

const home = computed(() => store.payload?.homeCurrency ?? 'AUD')
const sellHome = computed(() => store.payload?.gp.sellTotal ?? 0)
const costHome = computed(() => store.payload?.gp.accruedCostTotal ?? 0)
const gpHome = computed(() => store.payload?.gp.provisionalGp ?? 0)
const gpPct = computed(() => {
  if (!sellHome.value) return 0
  return (gpHome.value / sellHome.value) * 100
})
const gpBelowGate = computed(() => {
  const gate = store.payload?.varianceThresholdPct ?? 15
  return gpPct.value < gate
})

function money(n: number | null | undefined, currency = 'USD') {
  if (n == null) return '—'
  const sign = n < 0 ? '-' : ''
  return `${sign}${currency} ${Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function statusClass(s: UiStatus) {
  const map: Record<UiStatus, string> = {
    Draft: 'border-[#E4E7EC] bg-[#F3F4F6] text-[#6B7280]',
    Accrued: 'border-[#BFDBFE] bg-[#EFF6FF] text-[#2563EB]',
    Approved: 'border-[#A7F3D0] bg-[#D1FAE5] text-[#059669]',
    Posted: 'border-[#1F2937] bg-[#1F2937] text-white',
    Variance: 'border-[#FDE68A] bg-[#FEF3C7] text-[#B45309]',
  }
  return map[s]
}

function openRow(code: string) {
  selectedCode.value = code
  drawerTab.value = 'ap'
  varianceNote.value = selectedRow.value?.ap?.varianceNote ?? ''
}

function closeDrawer() {
  selectedCode.value = null
}

function applySettings() {
  store.setCafPercent(Number(cafDraft.value))
  if (store.canEditFx) store.setJobFx(Number(fxDraft.value))
  if (store.canEditThreshold) store.setVarianceThreshold(Number(thresholdDraft.value))
  settingsOpen.value = false
}

function saveVarianceNote() {
  if (!selectedRow.value?.ap || !varianceNote.value.trim()) return
  store.clearVariance(selectedRow.value.ap.id, varianceNote.value)
}

function commitApAccrued(raw: string) {
  if (!selectedRow.value?.ap || !store.canEditAccrued) return
  const n = Number(raw)
  if (!Number.isFinite(n)) return
  store.updateLineAmount(selectedRow.value.ap.id, 'accrued', n)
}

function commitApActual(raw: string) {
  if (!selectedRow.value?.ap || !store.canEditActual) return
  const n = Number(raw)
  if (!Number.isFinite(n)) return
  store.updateLineAmount(selectedRow.value.ap.id, 'actual', n)
}

function commitArSell(raw: string) {
  if (!selectedRow.value?.ar || !store.canEditAccrued) return
  const n = Number(raw)
  if (!Number.isFinite(n)) return
  store.updateLineAmount(selectedRow.value.ar.id, 'accrued', n)
}

function onAddLine() {
  addOpen.value = false
  store.addChargeLine()
}

function onImportQuote() {
  addOpen.value = false
  store.notify(t('charges.actions.importQuoteToast'))
}

function filterAsLedger(f: ChipFilter): LedgerFilter {
  return f
}

watch(selectedRow, (row) => {
  varianceNote.value = row?.ap?.varianceNote ?? ''
})
</script>

<template>
  <AppShell>
    <div class="mx-auto flex max-w-[1200px] flex-col px-6 pb-10">
      <JobNavStrip
        :shipment-id="shipmentId"
        current="charges"
        class="mb-3"
        :charges-locked="false"
        :invoice-locked="store.payload?.blocked === true"
      />

      <div v-if="store.loading" class="text-sm text-muted-foreground">
        {{ t('charges.loading') }}
      </div>

      <div
        v-else-if="store.error"
        class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        {{ store.error }}
      </div>

      <template v-else-if="store.payload">
        <div
          v-if="store.toast"
          class="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-[13px] text-emerald-800"
        >
          {{ store.toast }}
        </div>

        <div
          v-if="store.payload.blocked"
          class="mb-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-800"
        >
          <div class="font-semibold">{{ t('charges.blockedTitle') }}</div>
          <div class="mt-0.5 text-xs">{{ store.payload.blockMessage }}</div>
        </div>

        <!-- Sticky job identity header -->
        <div
          class="sticky top-0 z-40 mb-0 rounded-t-[10px] border border-b-0 border-[#E4E7EC] bg-white px-4 py-3 sm:px-5"
        >
          <div class="flex flex-wrap items-center gap-3">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-base font-bold tracking-tight text-[#1F2937]">{{ jobId }}</span>
              <span
                v-if="hawb"
                class="rounded border border-[#BFDBFE] bg-[#EFF6FF] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#2563EB]"
              >
                HAWB {{ hawb }}
              </span>
              <span
                v-if="mawb"
                class="rounded border border-[#E4E7EC] bg-[#F3F4F6] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#374151]"
              >
                MAWB {{ mawb }}
              </span>
            </div>

            <div class="hidden h-5 w-px bg-[#E4E7EC] sm:block" />

            <div class="min-w-0">
              <div class="truncate text-[13px] font-medium text-[#1F2937]">{{ customer }}</div>
              <div class="text-[11px] text-[#6B7280]">{{ lane }} · ETD {{ etd }}</div>
            </div>

            <div class="flex-1" />

            <div class="flex flex-wrap items-center">
              <div class="px-3 py-1 text-right sm:px-4">
                <div class="mb-0.5 text-[10px] font-bold tracking-wide text-[#6B7280]">
                  SELL ({{ home }})
                </div>
                <div class="text-sm font-semibold text-[#1F2937]">
                  {{ money(sellHome, home) }}
                </div>
              </div>
              <div class="border-l border-[#E4E7EC] px-3 py-1 text-right sm:px-4">
                <div class="mb-0.5 text-[10px] font-bold tracking-wide text-[#6B7280]">
                  COST ({{ home }})
                </div>
                <div class="text-sm font-semibold text-[#1F2937]">
                  {{ money(costHome, home) }}
                </div>
              </div>
              <div class="border-l border-[#E4E7EC] px-3 py-1 text-right sm:px-4">
                <div class="mb-0.5 text-[10px] font-bold tracking-wide text-[#6B7280]">PROV. GP</div>
                <div class="flex items-baseline justify-end gap-1.5">
                  <span
                    class="text-sm font-semibold"
                    :class="gpBelowGate ? 'text-amber-600' : 'text-[#1F2937]'"
                  >
                    {{ money(gpHome, home) }}
                  </span>
                  <span
                    class="text-[11px] font-semibold"
                    :class="gpBelowGate ? 'text-amber-600' : 'text-emerald-600'"
                  >
                    {{ gpPct.toFixed(1) }}%
                  </span>
                </div>
              </div>

              <div
                v-if="hasVariance"
                class="ml-2 flex items-center gap-1.5 rounded-[7px] border border-[#FDE68A] bg-[#FEF3C7] px-2.5 py-1"
              >
                <span class="text-[11px] font-semibold text-[#B45309]">Variance</span>
              </div>

              <div class="relative ml-2">
                <button
                  type="button"
                  class="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#6B7280]"
                  :class="settingsOpen ? 'bg-[#F0FDFB] text-primary' : 'bg-white'"
                  title="Rate settings"
                  @click="settingsOpen = !settingsOpen"
                >
                  <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <circle cx="10" cy="10" r="3" stroke="currentColor" stroke-width="1.5" />
                    <path
                      d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                    />
                  </svg>
                </button>

                <div
                  v-if="settingsOpen"
                  class="absolute right-0 top-[calc(100%+6px)] z-50 w-[280px] rounded-[10px] border border-[#E4E7EC] bg-white p-4 shadow-[0_8px_24px_rgba(0,0,0,0.09)]"
                >
                  <div
                    class="mb-3 text-[11px] font-bold tracking-wide text-[#6B7280]"
                  >
                    RATE SETTINGS
                  </div>
                  <label class="mb-2.5 block text-[11px] font-medium text-[#6B7280]">
                    Currency Adjustment Factor (%)
                    <input
                      v-model.number="cafDraft"
                      type="number"
                      step="0.1"
                      class="mt-1 h-[34px] w-full rounded-[7px] border border-[#E4E7EC] px-2.5 text-[13px] outline-none focus:border-primary disabled:bg-[#F9FAFB]"
                      :disabled="!store.canEditCaf"
                    />
                  </label>
                  <label class="mb-2.5 block text-[11px] font-medium text-[#6B7280]">
                    Variance Gate (%)
                    <input
                      v-model.number="thresholdDraft"
                      type="number"
                      class="mt-1 h-[34px] w-full rounded-[7px] border border-[#E4E7EC] px-2.5 text-[13px] outline-none focus:border-primary disabled:bg-[#F9FAFB]"
                      :disabled="!store.canEditThreshold"
                    />
                  </label>
                  <div class="mb-3 grid grid-cols-2 gap-1.5">
                    <label class="block text-[11px] font-medium text-[#6B7280]">
                      FX (1 → {{ home }})
                      <input
                        v-model.number="fxDraft"
                        type="number"
                        step="0.01"
                        class="mt-1 h-[34px] w-full rounded-[7px] border border-[#E4E7EC] px-2.5 text-[13px] outline-none focus:border-primary disabled:bg-[#F9FAFB]"
                        :disabled="!store.canEditFx"
                      />
                    </label>
                    <div class="text-[11px] text-[#6B7280]">
                      <div class="mb-1 font-medium">Posted</div>
                      <div
                        class="flex h-[34px] items-center rounded-[7px] border border-[#E4E7EC] bg-[#F9FAFB] px-2.5 text-[13px] font-medium text-[#1F2937]"
                      >
                        {{ store.payload.gp.postedCount }}/{{ store.payload.lines.length }}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    class="w-full rounded-[7px] bg-primary py-1.5 text-xs font-semibold text-white"
                    @click="applySettings"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Action toolbar -->
        <div
          class="mb-4 flex flex-wrap items-center gap-2 rounded-b-[10px] border border-[#E4E7EC] bg-white px-4 py-2.5 sm:px-5"
        >
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="f in (['all', 'open', 'variance', 'posted'] as ChipFilter[])"
              :key="f"
              type="button"
              class="flex items-center gap-1.5 rounded-[7px] border px-3 py-1.5 text-xs font-medium transition"
              :class="
                filter === f
                  ? 'border-primary bg-[#E6F9F6] text-[#0F766E]'
                  : 'border-[#E4E7EC] bg-white text-[#374151]'
              "
              @click="filter = f"
            >
              {{ t(`charges.filters.${filterAsLedger(f)}`) }}
              <span
                class="min-w-4 rounded-full px-1 text-center text-[10px] font-bold"
                :class="filter === f ? 'bg-primary text-white' : 'bg-[#F3F4F6] text-[#6B7280]'"
              >
                {{ chipCounts[f] }}
              </span>
            </button>
          </div>

          <div class="flex-1" />

          <template v-if="isOps">
            <Button
              size="sm"
              :disabled="!store.canAccrue || store.acting"
              @click="store.accrue()"
            >
              Accrue Charges
            </Button>
            <div class="relative">
              <button
                type="button"
                class="flex items-center gap-1.5 rounded-lg border border-[#E4E7EC] bg-white px-3 py-1.5 text-[13px] font-medium text-[#374151] disabled:opacity-50"
                :disabled="!store.canAddLine"
                @click="addOpen = !addOpen"
              >
                + Add
                <svg width="9" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">
                  <path
                    d="M1 1l4 4 4-4"
                    stroke="#6B7280"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
              <div
                v-if="addOpen"
                class="absolute right-0 top-[calc(100%+4px)] z-40 min-w-[180px] overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-[0_4px_14px_rgba(0,0,0,0.07)]"
              >
                <button
                  type="button"
                  class="block w-full border-b border-[#F9FAFB] px-3.5 py-2.5 text-left text-[13px] text-[#1F2937] hover:bg-[#F0FDFB]"
                  @click="onAddLine"
                >
                  Add Line
                </button>
                <button
                  type="button"
                  class="block w-full px-3.5 py-2.5 text-left text-[13px] text-[#1F2937] hover:bg-[#F0FDFB]"
                  @click="onImportQuote"
                >
                  Import Quote Rates
                </button>
              </div>
            </div>
          </template>

          <template v-else-if="isFinanceSeat">
            <Button
              size="sm"
              :disabled="!store.canApprove || store.acting || hasVariance"
              :title="
                hasVariance
                  ? 'Resolve all variance lines before approving'
                  : t('charges.actions.approveHint')
              "
              @click="store.approve()"
            >
              {{
                hasVariance
                  ? '⚠ Variance — Cannot Post'
                  : 'Approve for Posting'
              }}
            </Button>
            <Button
              size="sm"
              variant="outline"
              :disabled="!store.canOpenInvoice"
              @click="
                router.push({
                  name: 'job-invoice',
                  params: { shipmentId: String(shipmentId) },
                })
              "
            >
              {{ t('charges.actions.openInvoice') }}
            </Button>
          </template>

          <template v-else>
            <span class="text-[11px] text-muted-foreground">{{ store.roleCanDo }}</span>
          </template>
        </div>

        <!-- AP/AR ledger table -->
        <div class="overflow-hidden rounded-[10px] border border-[#E4E7EC] bg-white">
          <div
            class="grid gap-0 border-b border-[#E4E7EC] bg-[#F9FAFB] px-3.5 py-1.5 text-[10px] font-bold tracking-wide text-[#6B7280]"
            style="grid-template-columns: 90px 1fr 160px 1fr 80px 24px"
          >
            <span>STATUS</span>
            <span>AP · COST</span>
            <span class="text-center">CHARGE</span>
            <span class="text-right">AR · SELL</span>
            <span class="text-right">MARGIN</span>
            <span />
          </div>

          <div
            v-for="(row, i) in visibleRows"
            :key="row.code"
            class="grid cursor-pointer items-center gap-0 px-3.5 py-2 transition-colors"
            style="grid-template-columns: 90px 1fr 160px 1fr 80px 24px"
            :class="[
              i < visibleRows.length - 1 ? 'border-b border-[#F9FAFB]' : '',
              selectedCode === row.code ? 'bg-[#F0FDFB]' : 'bg-white hover:bg-[#FAFAFA]',
            ]"
            @click="openRow(row.code)"
          >
            <div>
              <span
                class="inline-block rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-wide"
                :class="statusClass(rowStatus(row))"
              >
                {{ rowStatus(row).toUpperCase() }}
              </span>
            </div>

            <div>
              <div class="text-[13px] font-semibold text-[#1F2937]">
                <template v-if="row.ap">
                  {{ money(row.ap.actualAmount ?? row.apAmount, row.currency) }}
                  <span
                    v-if="row.ap.cafApplied"
                    class="ml-1 rounded bg-primary-tint px-1 text-[10px] font-bold text-primary"
                    >+CAF</span
                  >
                </template>
                <span v-else class="text-amber-700">{{ t('charges.match.noCost') }}</span>
              </div>
              <div
                v-if="row.ap"
                class="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#6B7280]"
              >
                <span class="truncate">{{ row.ap.partyName ?? '—' }}</span>
                <span
                  v-if="
                    row.ap.actualAmount != null &&
                    row.ap.accruedAmount != null &&
                    row.ap.actualAmount !== row.ap.accruedAmount
                  "
                  class="text-[10px] text-amber-600"
                >
                  ∆ {{ row.currency }}
                  {{ Math.abs(row.ap.actualAmount - row.ap.accruedAmount).toFixed(0) }}
                </span>
              </div>
            </div>

            <div class="text-center">
              <div class="flex items-center justify-center gap-1.5">
                <span
                  class="rounded bg-[#F3F4F6] px-1.5 py-0.5 font-mono text-xs font-bold text-[#1F2937]"
                >
                  {{ row.code }}
                </span>
                <span
                  class="rounded border px-1.5 py-px text-[10px] font-semibold tracking-wide"
                  :class="
                    row.oversea
                      ? 'border-blue-200 bg-blue-50 text-blue-600'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  "
                >
                  {{ row.oversea ? 'INT' : 'DOM' }}
                </span>
              </div>
              <div class="mt-0.5 text-[11px] text-[#6B7280]">{{ row.label }}</div>
            </div>

            <div class="text-right">
              <div class="text-[13px] font-semibold text-[#1F2937]">
                <template v-if="row.ar">{{ money(row.arAmount, row.currency) }}</template>
                <span v-else class="text-amber-700">{{ t('charges.match.noSell') }}</span>
              </div>
              <div v-if="row.ar" class="mt-0.5 text-[11px] text-[#6B7280]">
                {{ row.ar.partyName ?? '—' }}
              </div>
            </div>

            <div class="text-right">
              <span
                v-if="row.marginPct != null && row.matchState === 'matched'"
                class="rounded-[5px] border px-1.5 py-0.5 text-xs font-semibold"
                :class="
                  row.marginPct < (store.payload?.varianceThresholdPct ?? 15)
                    ? 'border-[#FDE68A] bg-[#FFFBEB] text-amber-600'
                    : 'border-[#A7F3D0] bg-[#D1FAE5] text-emerald-600'
                "
              >
                {{ row.marginPct.toFixed(1) }}%
              </span>
              <span v-else class="text-[11px] text-[#6B7280]">—</span>
            </div>

            <div class="flex justify-center text-[#6B7280]">···</div>
          </div>

          <div
            v-if="!visibleRows.length"
            class="px-4 py-10 text-center text-[13px] text-muted-foreground"
          >
            No charge lines for this filter.
          </div>
        </div>
      </template>
    </div>

    <!-- Slide-over -->
    <Teleport to="body">
      <div
        class="fixed inset-0 z-[100] transition-colors"
        :class="selectedRow ? 'pointer-events-auto bg-slate-900/20' : 'pointer-events-none bg-transparent'"
        @click="closeDrawer"
      />
      <aside
        class="fixed bottom-0 right-0 top-0 z-[101] flex w-[min(100vw,420px)] flex-col border-l border-[#E4E7EC] bg-white shadow-[-8px_0_32px_rgba(0,0,0,0.08)] transition-transform duration-200"
        :class="selectedRow ? 'translate-x-0' : 'translate-x-full'"
        @click.stop
      >
        <template v-if="selectedRow">
          <div class="shrink-0 border-b border-[#E4E7EC] px-[18px] pt-3.5">
            <div class="mb-2.5 flex items-center gap-2">
              <span
                class="rounded bg-[#F3F4F6] px-2 py-0.5 font-mono text-[13px] font-bold text-[#1F2937]"
              >
                {{ selectedRow.code }}
              </span>
              <span class="min-w-0 flex-1 truncate text-sm font-semibold text-[#1F2937]">
                {{ selectedRow.label }}
              </span>
              <span
                class="rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-wide"
                :class="statusClass(rowStatus(selectedRow))"
              >
                {{ rowStatus(selectedRow).toUpperCase() }}
              </span>
              <button
                type="button"
                class="flex h-[26px] w-[26px] items-center justify-center rounded-md border border-[#E4E7EC] text-base text-[#6B7280]"
                @click="closeDrawer"
              >
                ×
              </button>
            </div>
            <div class="flex">
              <button
                v-for="tab in ([
                  { id: 'ap', label: 'AP · Cost' },
                  { id: 'ar', label: 'AR · Sell' },
                  { id: 'audit', label: 'Audit' },
                ] as const)"
                :key="tab.id"
                type="button"
                class="border-b-2 px-3.5 py-1.5 text-xs font-medium transition"
                :class="
                  drawerTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-[#6B7280]'
                "
                @click="drawerTab = tab.id"
              >
                {{ tab.label }}
                <span
                  v-if="tab.id === 'audit'"
                  class="ml-1 text-[10px] text-[#6B7280]"
                >
                  {{
                    (selectedRow.ap?.audit?.length ?? 0) + (selectedRow.ar?.audit?.length ?? 0)
                  }}
                </span>
              </button>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto px-[18px] py-4">
            <!-- AP tab -->
            <div v-if="drawerTab === 'ap'" class="flex flex-col gap-4">
              <div>
                <div
                  class="mb-2.5 border-b border-[#F3F4F6] pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]"
                >
                  Vendor / Supplier
                </div>
                <div class="flex flex-col gap-2">
                  <label class="text-[11px] font-medium text-[#6B7280]">
                    Supplier
                    <input
                      class="mt-1 h-[34px] w-full rounded-[7px] border border-[#E4E7EC] bg-[#F9FAFB] px-2.5 text-[13px]"
                      :value="selectedRow.ap?.partyName ?? '—'"
                      readonly
                    />
                  </label>
                  <label class="text-[11px] font-medium text-[#6B7280]">
                    Currency
                    <input
                      class="mt-1 h-[34px] w-full rounded-[7px] border border-[#E4E7EC] bg-[#F9FAFB] px-2.5 text-[13px]"
                      :value="selectedRow.ap?.currency ?? selectedRow.currency"
                      readonly
                    />
                  </label>
                </div>
              </div>

              <div>
                <div
                  class="mb-2.5 border-b border-[#F3F4F6] pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]"
                >
                  Accrued vs Actual
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <label class="text-[11px] font-medium text-[#6B7280]">
                    Accrued Amount
                    <input
                      type="number"
                      class="mt-1 h-[34px] w-full rounded-[7px] border border-[#E4E7EC] px-2.5 text-[13px] outline-none focus:border-primary disabled:bg-[#F9FAFB]"
                      :value="selectedRow.ap?.baseAmount ?? selectedRow.ap?.amount ?? ''"
                      :disabled="!store.canEditAccrued || !selectedRow.ap"
                      @change="commitApAccrued(($event.target as HTMLInputElement).value)"
                    />
                  </label>
                  <label class="text-[11px] font-medium text-[#6B7280]">
                    Actual Amount
                    <input
                      type="number"
                      class="mt-1 h-[34px] w-full rounded-[7px] border border-[#E4E7EC] px-2.5 text-[13px] outline-none focus:border-primary disabled:bg-[#F9FAFB]"
                      :value="selectedRow.ap?.actualAmount ?? ''"
                      :disabled="!store.canEditActual || !selectedRow.ap"
                      @change="commitApActual(($event.target as HTMLInputElement).value)"
                    />
                  </label>
                </div>

                <div
                  v-if="selectedRow.costVariance"
                  class="mt-2.5 flex items-center gap-2 rounded-[7px] border border-[#FDE68A] bg-[#FEF3C7] px-3 py-2 text-xs font-medium text-[#B45309]"
                >
                  Variance
                  {{ money(Math.abs(selectedRow.costVariance), selectedRow.currency) }}
                  {{ (selectedRow.costVariance ?? 0) > 0 ? 'over' : 'under' }} accrual
                </div>

                <div
                  v-if="isFinanceSeat && selectedRow.varianceFlagged"
                  class="mt-2"
                >
                  <label class="text-[11px] font-medium text-[#6B7280]">
                    Variance Note <span class="text-red-600">*</span>
                    <textarea
                      v-model="varianceNote"
                      rows="3"
                      class="mt-1 w-full rounded-[7px] border border-[#E4E7EC] px-2.5 py-2 text-[13px] outline-none focus:border-primary"
                      placeholder="Required before approval — explain the variance cause…"
                    />
                  </label>
                  <Button
                    size="sm"
                    class="mt-2"
                    :disabled="!varianceNote.trim() || !store.canEditVarianceNote"
                    @click="saveVarianceNote"
                  >
                    {{ t('charges.variance.addNote') }}
                  </Button>
                </div>
              </div>

              <div v-if="selectedRow.ap?.cafApplied">
                <div
                  class="mb-2.5 border-b border-[#F3F4F6] pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]"
                >
                  CAF Breakdown
                </div>
                <div class="rounded-[7px] bg-[#F9FAFB] px-3 py-2.5 text-xs text-[#374151]">
                  <div class="flex justify-between py-0.5">
                    <span>Base</span>
                    <span>{{ money(selectedRow.ap.baseAmount, selectedRow.currency) }}</span>
                  </div>
                  <div class="flex justify-between py-0.5">
                    <span>CAF ({{ store.payload?.cafPercent }}%)</span>
                    <span>+CAF applied</span>
                  </div>
                  <div
                    class="mt-1 flex justify-between border-t border-[#E4E7EC] pt-1 font-semibold text-[#1F2937]"
                  >
                    <span>Total AP</span>
                    <span>{{ money(selectedRow.apAmount, selectedRow.currency) }}</span>
                  </div>
                </div>
              </div>

              <Button
                v-if="selectedRow.ap && store.canPostLine(selectedRow.ap)"
                size="sm"
                @click="store.postLine(selectedRow.ap.id)"
              >
                {{ t('charges.post.action') }}
              </Button>
            </div>

            <!-- AR tab -->
            <div v-else-if="drawerTab === 'ar'" class="flex flex-col gap-4">
              <div>
                <div
                  class="mb-2.5 border-b border-[#F3F4F6] pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]"
                >
                  Customer / Bill-To
                </div>
                <div class="flex flex-col gap-2">
                  <label class="text-[11px] font-medium text-[#6B7280]">
                    Bill-To Party
                    <input
                      class="mt-1 h-[34px] w-full rounded-[7px] border border-[#E4E7EC] bg-[#F9FAFB] px-2.5 text-[13px]"
                      :value="selectedRow.ar?.partyName ?? '—'"
                      readonly
                    />
                  </label>
                  <label class="text-[11px] font-medium text-[#6B7280]">
                    Rate Basis
                    <input
                      class="mt-1 h-[34px] w-full rounded-[7px] border border-[#E4E7EC] bg-[#F9FAFB] px-2.5 text-[13px]"
                      :value="selectedRow.ar?.ratingBasis ?? '—'"
                      readonly
                    />
                  </label>
                </div>
              </div>
              <div>
                <div
                  class="mb-2.5 border-b border-[#F3F4F6] pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]"
                >
                  Sell Amount
                </div>
                <label class="text-[11px] font-medium text-[#6B7280]">
                  Sell Amount
                  <input
                    type="number"
                    class="mt-1 h-[34px] w-full rounded-[7px] border border-[#E4E7EC] px-2.5 text-[13px] outline-none focus:border-primary disabled:bg-[#F9FAFB]"
                    :value="selectedRow.ar?.amount ?? ''"
                    :disabled="!store.canEditAccrued || !selectedRow.ar || financeReadOnlyAmounts"
                    @change="commitArSell(($event.target as HTMLInputElement).value)"
                  />
                </label>
              </div>
              <div>
                <div
                  class="mb-2.5 border-b border-[#F3F4F6] pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]"
                >
                  Margin Summary
                </div>
                <div class="rounded-[7px] bg-[#F9FAFB] px-3 py-2.5 text-xs">
                  <div class="flex justify-between py-0.5 text-[#374151]">
                    <span>AR Sell</span>
                    <span>{{ money(selectedRow.arAmount, selectedRow.currency) }}</span>
                  </div>
                  <div class="flex justify-between py-0.5 text-[#374151]">
                    <span>AP Cost</span>
                    <span>{{ money(selectedRow.apAmount, selectedRow.currency) }}</span>
                  </div>
                  <div
                    class="mt-1 flex justify-between border-t border-[#E4E7EC] pt-1 font-semibold"
                    :class="
                      (selectedRow.marginPct ?? 100) < (store.payload?.varianceThresholdPct ?? 15)
                        ? 'text-amber-600'
                        : 'text-[#1F2937]'
                    "
                  >
                    <span
                      >GP ({{
                        selectedRow.marginPct != null
                          ? selectedRow.marginPct.toFixed(1)
                          : '—'
                      }}%)</span
                    >
                    <span>
                      {{
                        money(
                          (selectedRow.arAmount ?? 0) - (selectedRow.apAmount ?? 0),
                          selectedRow.currency,
                        )
                      }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Audit -->
            <div v-else>
              <div
                class="mb-2.5 border-b border-[#F3F4F6] pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]"
              >
                Change History
              </div>
              <div
                v-for="(entry, i) in [
                  ...(selectedRow.ap?.audit ?? []),
                  ...(selectedRow.ar?.audit ?? []),
                ].sort((a, b) => b.at.localeCompare(a.at))"
                :key="entry.id"
                class="grid gap-x-3"
                style="grid-template-columns: 3px 1fr"
              >
                <div class="flex flex-col items-center">
                  <div class="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <div
                    v-if="
                      i <
                      (selectedRow.ap?.audit?.length ?? 0) +
                        (selectedRow.ar?.audit?.length ?? 0) -
                        1
                    "
                    class="min-h-6 w-px flex-1 bg-[#E4E7EC]"
                  />
                </div>
                <div class="pb-3.5">
                  <div class="mb-0.5 flex items-baseline gap-1.5">
                    <span class="text-xs font-semibold text-[#1F2937]">{{ entry.by }}</span>
                    <span class="text-[10px] text-[#6B7280]">{{ entry.at }}</span>
                  </div>
                  <div class="text-xs text-[#374151]">{{ entry.kind }}</div>
                  <div
                    v-if="entry.note"
                    class="mt-1 rounded-[5px] border border-[#E4E7EC] bg-[#F9FAFB] px-2 py-1 text-[11px] text-[#6B7280]"
                  >
                    {{ entry.note }}
                  </div>
                </div>
              </div>
              <div
                v-if="
                  !(selectedRow.ap?.audit?.length || selectedRow.ar?.audit?.length)
                "
                class="text-[12px] text-muted-foreground"
              >
                No audit events yet.
              </div>
            </div>
          </div>
        </template>
      </aside>
    </Teleport>
  </AppShell>
</template>
