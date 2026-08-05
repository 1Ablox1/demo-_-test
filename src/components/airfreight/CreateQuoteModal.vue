<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import QuickCreateCustomerDrawer from '@/components/airfreight/QuickCreateCustomerDrawer.vue'
import SmartAutocomplete from '@/components/ui/SmartAutocomplete.vue'
import type { MasterSelection, QuickCreateCustomerInput } from '@/mdm/types'
import {
  frequentAirportValues,
  frequentCustomerValues,
  masterAirports,
} from '@/mocks/fixtures/masters'
import { useLifecycleStore } from '@/stores/lifecycle'
import { useMastersStore } from '@/stores/masters'
import { useTasksStore } from '@/stores/tasks'

export type TradeDirection = 'air_export' | 'air_import' | 'cross_trade'
type DirectionSource = 'default' | 'inferred' | 'user'
type WeightUnit = 'kg' | 'lb'
type VolumeUnit = 'cbm' | 'cft'

interface ChargeLine {
  id: string
  chargeCode: string
  chargeLabel: string
  sell: number | null
  cost: number | null
  unit: 'shipment' | 'kg' | 'lb' | 'piece'
}

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  submitted: []
}>()

const { t } = useI18n()
const router = useRouter()
const life = useLifecycleStore()
const tasks = useTasksStore()
const masters = useMastersStore()

const HOME = ['US'] as const

const INCOTERMS = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP']
const CURRENCIES = ['USD', 'AUD', 'GBP', 'EUR', 'HKD', 'JPY', 'SGD', 'CNY']
const SVC_LEVELS = [
  { value: 'airport_airport', label: 'Airport – Airport' },
  { value: 'door_airport', label: 'Door – Airport' },
  { value: 'airport_door', label: 'Airport – Door' },
  { value: 'door_door', label: 'Door – Door' },
]
const AIRLINES = [
  { label: 'China Airlines (CI)', value: 'CI' },
  { label: 'Cathay Pacific (CX)', value: 'CX' },
  { label: 'United Airlines (UA)', value: 'UA' },
  { label: 'American Airlines (AA)', value: 'AA' },
  { label: 'Singapore Airlines (SQ)', value: 'SQ' },
  { label: 'Qantas (QF)', value: 'QF' },
  { label: 'Lufthansa (LH)', value: 'LH' },
]

const DIR_LABEL: Record<TradeDirection, string> = {
  air_export: 'Air Export',
  air_import: 'Air Import',
  cross_trade: 'Cross-Trade',
}

const COMPLIANCE: Record<TradeDirection, string[]> = {
  air_export: ['CBP AES filing required before ETD', 'SED required for items >USD 2,500'],
  air_import: ['CBP ISF 10+2 required 24h before loading', 'C-TPAT status may apply'],
  cross_trade: ['IATA multi-airline coordination needed', 'Dual-customs entry required'],
}

function makeLines(dir: TradeDirection): ChargeLine[] {
  const base: ChargeLine[] = [
    { id: 'frt', chargeCode: 'FREIGHT', chargeLabel: 'Air Freight', sell: null, cost: null, unit: 'kg' },
    { id: 'fsc', chargeCode: 'FSC', chargeLabel: 'Fuel Surcharge', sell: null, cost: null, unit: 'kg' },
    { id: 'ssc', chargeCode: 'SSC', chargeLabel: 'Security Surcharge', sell: null, cost: null, unit: 'kg' },
  ]
  if (dir === 'air_import') {
    base.push({
      id: 'dch',
      chargeCode: 'DCH',
      chargeLabel: 'Destination Charges',
      sell: null,
      cost: null,
      unit: 'shipment',
    })
  }
  if (dir === 'cross_trade') {
    base.push({
      id: 'oca',
      chargeCode: 'OCA',
      chargeLabel: 'Origin Charges',
      sell: null,
      cost: null,
      unit: 'shipment',
    })
  }
  return base
}

function countryCodeFromAirport(a: MasterSelection): string | null {
  if (!a) return null
  const full = masterAirports.find((x) => x.value === a.value)
  const m = (full?.meta ?? '').toLowerCase()
  if (!m) return null
  if (m.includes('united states') || m === 'us') return 'US'
  if (m.includes('china')) return 'CN'
  if (m.includes('australia')) return 'AU'
  if (m.includes('singapore')) return 'SG'
  if (m.includes('germany')) return 'DE'
  if (m.includes('united kingdom') || m === 'uk') return 'GB'
  return null
}

function inferDir(o: MasterSelection, d: MasterSelection): TradeDirection | null {
  const oh = HOME.includes((countryCodeFromAirport(o) ?? '') as (typeof HOME)[number])
  const dh = HOME.includes((countryCodeFromAirport(d) ?? '') as (typeof HOME)[number])
  if (!o || !d) return null
  const oc = countryCodeFromAirport(o)
  const dc = countryCodeFromAirport(d)
  if (!oc || !dc) return null
  if (oh && !dh) return 'air_export'
  if (!oh && dh) return 'air_import'
  if (!oh && !dh) return 'cross_trade'
  return null
}

function deriveCW(gw: number | null, vol: number | null, vu: VolumeUnit): number | null {
  if (!gw) return null
  if (!vol) return gw
  const vw =
    vu === 'cbm' ? Math.round(vol * 167 * 10) / 10 : Math.round(vol * 4.724 * 10) / 10
  return Math.max(gw, vw)
}

const canEdit = computed(() => tasks.role === 'sales' || tasks.role === 'operations')
const isFinance = computed(() => tasks.role === 'finance')

const direction = ref<TradeDirection>('air_export')
const directionSource = ref<DirectionSource>('default')
const inferredDir = ref<TradeDirection | null>(null)

const customer = ref<MasterSelection>(null)
const shipper = ref<MasterSelection>(null)
const consignee = ref<MasterSelection>(null)
const notifyParty = ref<MasterSelection>(null)
const originAirport = ref<MasterSelection>(null)
const destAirport = ref<MasterSelection>(null)
const airline = ref('')
const etdFrom = ref('')
const etdTo = ref('')
const serviceLevel = ref('airport_airport')

const pieces = ref<number | null>(null)
const grossWeight = ref<number | null>(null)
const weightUnit = ref<WeightUnit>('kg')
const chargeableWeight = ref<number | null>(null)
const cwSource = ref<'derived' | 'override'>('derived')
const volume = ref<number | null>(null)
const volumeUnit = ref<VolumeUnit>('cbm')
const commodity = ref('')
const hsCode = ref('')
const isDangerousGoods = ref(false)
const dgClass = ref('')

const incoterm = ref('FOB')
const currency = ref('USD')
const validUntil = ref('')
const notes = ref('')
const lines = ref<ChargeLine[]>(makeLines('air_export'))

const ratesOpen = ref(false)
const escConfirm = ref(false)
const saved = ref(false)
const saving = ref(false)
const toast = ref<string | null>(null)

const createOpen = ref(false)
const createSeed = ref('')

const actorName = computed(() => {
  const map: Record<string, string> = {
    sales: 'Mia (Sales)',
    operations: 'Ops desk',
    finance: 'Finance',
    admin: 'Admin',
  }
  return map[tasks.role] ?? tasks.role
})

const needsShipper = computed(
  () => direction.value === 'air_export' || direction.value === 'cross_trade',
)
const needsConsignee = computed(
  () => direction.value === 'air_import' || direction.value === 'cross_trade',
)

const customerLabel = computed(() => {
  if (direction.value === 'air_export') return 'Customer — Shipper-side bill-to'
  if (direction.value === 'air_import') return 'Customer — Consignee-side bill-to'
  return 'Customer — Controlling office'
})

const progress = computed(() => [
  Boolean(customer.value),
  Boolean(originAirport.value && destAirport.value),
  Boolean(pieces.value && grossWeight.value),
  Boolean(incoterm.value && currency.value && commodity.value.trim()),
  lines.value.some((l) => l.sell !== null),
])
const progressScore = computed(() => progress.value.filter(Boolean).length)
const progressLabels = ['Parties', 'Route', 'Cargo', 'Commercial', 'Rates']

const sellTotal = computed(() => lines.value.reduce((s, l) => s + (l.sell ?? 0), 0))

const isDirty = computed(
  () =>
    Boolean(customer.value || originAirport.value || destAirport.value || commodity.value.trim()),
)

const quoteComplete = computed(
  () =>
    Boolean(customer.value) &&
    Boolean(originAirport.value && destAirport.value) &&
    Boolean(pieces.value && grossWeight.value) &&
    Boolean(incoterm.value && currency.value && commodity.value.trim()),
)

function resetForm() {
  direction.value = 'air_export'
  directionSource.value = 'default'
  inferredDir.value = null
  customer.value = null
  shipper.value = null
  consignee.value = null
  notifyParty.value = null
  originAirport.value = null
  destAirport.value = null
  airline.value = ''
  etdFrom.value = ''
  etdTo.value = ''
  serviceLevel.value = 'airport_airport'
  pieces.value = null
  grossWeight.value = null
  weightUnit.value = 'kg'
  chargeableWeight.value = null
  cwSource.value = 'derived'
  volume.value = null
  volumeUnit.value = 'cbm'
  commodity.value = ''
  hsCode.value = ''
  isDangerousGoods.value = false
  dgClass.value = ''
  incoterm.value = 'FOB'
  currency.value = 'USD'
  validUntil.value = ''
  notes.value = ''
  lines.value = makeLines('air_export')
  ratesOpen.value = false
  escConfirm.value = false
  saved.value = false
  toast.value = null
}

watch(
  () => props.open,
  (v) => {
    if (v) resetForm()
  },
)

watch([originAirport, destAirport], () => {
  const inferred = inferDir(originAirport.value, destAirport.value)
  inferredDir.value = inferred
  if (inferred && directionSource.value !== 'user') {
    direction.value = inferred
    directionSource.value = 'inferred'
    lines.value = makeLines(inferred)
  }
})

watch([grossWeight, volume, volumeUnit, cwSource], () => {
  if (cwSource.value === 'derived') {
    chargeableWeight.value = deriveCW(grossWeight.value, volume.value, volumeUnit.value)
  }
})

function setDir(dir: TradeDirection) {
  if (!canEdit.value) return
  direction.value = dir
  directionSource.value = 'user'
  lines.value = makeLines(dir)
}

function useSuggestion() {
  if (!inferredDir.value || !canEdit.value) return
  direction.value = inferredDir.value
  directionSource.value = 'inferred'
  lines.value = makeLines(inferredDir.value)
}

function requestClose() {
  if (isDirty.value) {
    escConfirm.value = true
    return
  }
  emit('close')
}

function confirmDiscard() {
  escConfirm.value = false
  emit('close')
}

function openCreate(query: string) {
  createSeed.value = query
  createOpen.value = true
}

function onCustomerCreated(input: QuickCreateCustomerInput) {
  const draft = masters.createCustomerDraft(input)
  customer.value = {
    label: draft.label,
    value: draft.value,
    kind: 'customer',
    status: draft.status,
    requestedBy: draft.requestedBy,
    approverSeat: draft.approverSeat,
  }
  createOpen.value = false
  toast.value = t('mdm.createdPending')
}

function patchLine(id: string, patch: Partial<ChargeLine>) {
  lines.value = lines.value.map((l) => (l.id === id ? { ...l, ...patch } : l))
}

function addLine() {
  lines.value = [
    ...lines.value,
    {
      id: `l${Date.now()}`,
      chargeCode: '',
      chargeLabel: '',
      sell: null,
      cost: null,
      unit: 'shipment',
    },
  ]
}

function removeLine(id: string) {
  lines.value = lines.value.filter((l) => l.id !== id)
}

async function saveDraft() {
  if (!canEdit.value) return
  saving.value = true
  toast.value = null
  try {
    await life.load(8801)
    if (quoteComplete.value) {
      await life.completeTask('task-8801-create-quote')
      await life.clearGate('gate-quote-complete')
      toast.value =
        customer.value?.status === 'pending_approval'
          ? t('quote.savedReadyPendingCustomer')
          : t('quote.savedReady')
      await tasks.load()
      saved.value = true
    } else {
      toast.value = t('quote.savedDraft')
      saved.value = true
    }
  } finally {
    saving.value = false
  }
}

async function sendQuote() {
  if (!canEdit.value || progressScore.value < 3) return
  await saveDraft()
  if (quoteComplete.value) {
    emit('submitted')
    void router.push({ name: 'job-spine', params: { shipmentId: '8801' } })
    emit('close')
  }
}

function onNum(raw: string): number | null {
  if (!raw.trim()) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[300]">
      <div
        class="absolute inset-0 bg-slate-900/40 backdrop-blur-[3px]"
        @click="requestClose"
      />

      <div
        class="absolute left-1/2 top-1/2 flex max-h-[90vh] w-[min(92vw,1080px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[14px] border border-[#E4E7EC] bg-white shadow-[0_24px_64px_rgba(0,0,0,0.16)]"
        role="dialog"
        aria-modal="true"
        :aria-label="t('quote.modalTitle')"
      >
        <!-- Header -->
        <div class="shrink-0 border-b border-[#E4E7EC] bg-white px-5 pt-3.5">
          <div class="mb-2.5 flex items-start gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="m-0 text-base font-semibold tracking-tight text-[#1F2937]">
                  {{ t('quote.modalTitle') }}
                </h2>
                <span
                  class="rounded bg-[#F3F4F6] px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-[#9CA3AF]"
                >
                  DRAFT
                </span>
              </div>
              <div class="mt-1 text-[11px] text-[#9CA3AF]">
                {{ progressScore }} of 5 sections complete
              </div>
            </div>

            <span
              v-if="isFinance"
              class="rounded-[5px] border border-[#FED7AA] bg-[#FFEDD5] px-2.5 py-0.5 text-[11px] font-medium text-[#B45309]"
            >
              Finance — read-only
            </span>

            <button
              type="button"
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border border-[#E4E7EC] bg-white text-lg leading-none text-[#6B7280]"
              @click="requestClose"
            >
              ×
            </button>
          </div>

          <div class="h-[3px] overflow-hidden rounded-sm bg-[#F3F4F6]">
            <div
              class="h-[3px] rounded-sm bg-primary transition-all duration-300"
              :style="{ width: `${(progressScore / 5) * 100}%` }"
            />
          </div>

          <div class="flex flex-wrap items-center gap-2.5 py-2.5">
            <div class="flex gap-0.5 rounded-[9px] bg-[#F3F4F6] p-[3px]">
              <button
                v-for="dir in (['air_export', 'air_import', 'cross_trade'] as TradeDirection[])"
                :key="dir"
                type="button"
                class="rounded-[7px] px-3.5 py-1.5 text-xs font-medium transition"
                :class="
                  direction === dir
                    ? 'bg-white text-[#1F2937] shadow-[0_1px_4px_rgba(0,0,0,0.08)]'
                    : 'bg-transparent text-[#6B7280]'
                "
                :disabled="!canEdit"
                @click="setDir(dir)"
              >
                {{ DIR_LABEL[dir] }}
              </button>
            </div>

            <span
              v-if="inferredDir && directionSource === 'inferred'"
              class="inline-flex items-center gap-1.5 rounded-[5px] border border-[#A7F3D0] bg-[#E6F9F6] px-2 py-0.5 text-[11px] text-[#0F766E]"
            >
              <span class="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              Inferred: {{ DIR_LABEL[inferredDir] }}
            </span>

            <button
              v-if="inferredDir && directionSource === 'user' && inferredDir !== direction"
              type="button"
              class="rounded-[5px] border border-[#A7F3D0] bg-transparent px-2 py-0.5 text-[11px] font-medium text-primary"
              @click="useSuggestion"
            >
              Use suggested: {{ DIR_LABEL[inferredDir] }}
            </button>
          </div>
        </div>

        <!-- Body -->
        <div class="flex flex-1 flex-col gap-3.5 overflow-y-auto px-5 py-[18px]">
          <div
            v-if="toast"
            class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800"
          >
            {{ toast }}
          </div>

          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="h in COMPLIANCE[direction]"
              :key="h"
              class="rounded-[5px] border border-[#E4E7EC] bg-[#F9FAFB] px-2 py-0.5 text-[11px] text-[#6B7280]"
            >
              {{ h }}
            </span>
          </div>

          <!-- Parties + Route -->
          <div class="grid gap-3.5 md:grid-cols-2">
            <section class="rounded-[10px] border border-[#E4E7EC] bg-white px-4 py-3.5">
              <div
                class="mb-3 border-b border-[#F3F4F6] pb-2 text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]"
              >
                Parties
              </div>
              <div class="flex flex-col gap-2.5">
                <label class="block text-[11px] font-medium text-[#6B7280]">
                  {{ customerLabel }} <span class="text-red-600">*</span>
                  <SmartAutocomplete
                    v-model="customer"
                    class="mt-1"
                    storage-key="customer"
                    allow-create
                    :options="masters.customers"
                    :frequent-values="frequentCustomerValues"
                    :placeholder="t('mdm.searchCustomer')"
                    :create-label="t('mdm.createCustomer')"
                    :disabled="!canEdit"
                    @create-request="openCreate"
                  />
                  <div
                    v-if="customer?.status === 'pending_approval'"
                    class="mt-1 text-[11px] text-amber-600"
                  >
                    ⚠ Customer pending approval
                  </div>
                </label>

                <label v-if="needsShipper" class="block text-[11px] font-medium text-[#6B7280]">
                  Shipper <span class="text-red-600">*</span>
                  <SmartAutocomplete
                    v-model="shipper"
                    class="mt-1"
                    storage-key="customer"
                    :options="masters.customers"
                    :frequent-values="frequentCustomerValues"
                    placeholder="Search shipper…"
                    :disabled="!canEdit"
                  />
                </label>

                <label v-if="needsConsignee" class="block text-[11px] font-medium text-[#6B7280]">
                  Consignee <span class="text-red-600">*</span>
                  <SmartAutocomplete
                    v-model="consignee"
                    class="mt-1"
                    storage-key="customer"
                    :options="masters.customers"
                    :frequent-values="frequentCustomerValues"
                    placeholder="Search consignee…"
                    :disabled="!canEdit"
                  />
                </label>

                <label class="block text-[11px] font-medium text-[#6B7280]">
                  Notify Party
                  <SmartAutocomplete
                    v-model="notifyParty"
                    class="mt-1"
                    storage-key="customer"
                    :options="masters.customers"
                    placeholder="Optional…"
                    :disabled="!canEdit"
                  />
                </label>
              </div>
            </section>

            <section class="rounded-[10px] border border-[#E4E7EC] bg-white px-4 py-3.5">
              <div
                class="mb-3 border-b border-[#F3F4F6] pb-2 text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]"
              >
                Route
              </div>
              <div class="flex flex-col gap-2.5">
                <div class="grid grid-cols-2 gap-2">
                  <label class="block text-[11px] font-medium text-[#6B7280]">
                    Origin Airport <span class="text-red-600">*</span>
                    <SmartAutocomplete
                      v-model="originAirport"
                      class="mt-1"
                      storage-key="airport"
                      :options="masterAirports"
                      :frequent-values="frequentAirportValues"
                      :placeholder="t('mdm.searchAirport')"
                      :disabled="!canEdit"
                    />
                  </label>
                  <label class="block text-[11px] font-medium text-[#6B7280]">
                    Destination Airport <span class="text-red-600">*</span>
                    <SmartAutocomplete
                      v-model="destAirport"
                      class="mt-1"
                      storage-key="airport"
                      :options="masterAirports"
                      :frequent-values="frequentAirportValues"
                      :placeholder="t('mdm.searchAirport')"
                      :disabled="!canEdit"
                    />
                  </label>
                </div>

                <label class="block text-[11px] font-medium text-[#6B7280]">
                  Preferred Airline
                  <select
                    v-model="airline"
                    class="mt-1 h-9 w-full rounded-[7px] border border-[#E4E7EC] bg-white px-2.5 text-[13px] text-[#1F2937] outline-none focus:border-primary"
                    :disabled="!canEdit"
                  >
                    <option value="">Any airline</option>
                    <option v-for="a in AIRLINES" :key="a.value" :value="a.value">
                      {{ a.label }}
                    </option>
                  </select>
                </label>

                <div class="grid grid-cols-2 gap-2">
                  <label class="block text-[11px] font-medium text-[#6B7280]">
                    ETD From
                    <input
                      v-model="etdFrom"
                      type="date"
                      class="mt-1 h-9 w-full rounded-[7px] border border-[#E4E7EC] px-2.5 text-[13px] outline-none focus:border-primary"
                      :disabled="!canEdit"
                    />
                  </label>
                  <label class="block text-[11px] font-medium text-[#6B7280]">
                    ETD To
                    <input
                      v-model="etdTo"
                      type="date"
                      class="mt-1 h-9 w-full rounded-[7px] border border-[#E4E7EC] px-2.5 text-[13px] outline-none focus:border-primary"
                      :disabled="!canEdit"
                    />
                  </label>
                </div>

                <label class="block text-[11px] font-medium text-[#6B7280]">
                  Service Level
                  <select
                    v-model="serviceLevel"
                    class="mt-1 h-9 w-full rounded-[7px] border border-[#E4E7EC] bg-white px-2.5 text-[13px] outline-none focus:border-primary"
                    :disabled="!canEdit"
                  >
                    <option v-for="s in SVC_LEVELS" :key="s.value" :value="s.value">
                      {{ s.label }}
                    </option>
                  </select>
                </label>
              </div>
            </section>
          </div>

          <!-- Cargo -->
          <section class="rounded-[10px] border border-[#E4E7EC] bg-white px-4 py-3.5">
            <div
              class="mb-3 border-b border-[#F3F4F6] pb-2 text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]"
            >
              Cargo
            </div>
            <div class="mb-2.5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              <label class="block text-[11px] font-medium text-[#6B7280]">
                Pieces <span class="text-red-600">*</span>
                <input
                  type="number"
                  class="mt-1 h-9 w-full rounded-[7px] border border-[#E4E7EC] px-2.5 text-[13px] outline-none focus:border-primary"
                  :value="pieces ?? ''"
                  placeholder="0"
                  :disabled="!canEdit"
                  @input="pieces = onNum(($event.target as HTMLInputElement).value)"
                />
              </label>
              <label class="block text-[11px] font-medium text-[#6B7280]">
                Gross Weight <span class="text-red-600">*</span>
                <div class="mt-1 flex gap-1">
                  <input
                    type="number"
                    class="h-9 min-w-0 flex-1 rounded-[7px] border border-[#E4E7EC] px-2.5 text-[13px] outline-none focus:border-primary"
                    :value="grossWeight ?? ''"
                    placeholder="0.0"
                    :disabled="!canEdit"
                    @input="
                      grossWeight = onNum(($event.target as HTMLInputElement).value);
                      cwSource = 'derived'
                    "
                  />
                  <select
                    v-model="weightUnit"
                    class="h-9 w-[60px] rounded-[7px] border border-[#E4E7EC] bg-white px-1 text-xs outline-none"
                    :disabled="!canEdit"
                  >
                    <option value="kg">kg</option>
                    <option value="lb">lb</option>
                  </select>
                </div>
              </label>
              <div>
                <div class="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-[#6B7280]">
                  Chargeable Wt
                  <span v-if="cwSource === 'derived'" class="text-[10px] font-semibold text-primary"
                    >auto</span
                  >
                  <button
                    v-else-if="canEdit"
                    type="button"
                    class="border-0 bg-transparent p-0 text-[10px] text-[#9CA3AF]"
                    @click="
                      cwSource = 'derived';
                      chargeableWeight = deriveCW(grossWeight, volume, volumeUnit)
                    "
                  >
                    reset
                  </button>
                </div>
                <input
                  type="number"
                  class="h-9 w-full rounded-[7px] border border-[#E4E7EC] px-2.5 text-[13px] outline-none focus:border-primary disabled:bg-[#F9FAFB]"
                  :value="chargeableWeight ?? ''"
                  :disabled="!canEdit || cwSource === 'derived'"
                  @input="
                    chargeableWeight = onNum(($event.target as HTMLInputElement).value);
                    cwSource = 'override'
                  "
                />
              </div>
              <label class="block text-[11px] font-medium text-[#6B7280]">
                Volume
                <div class="mt-1 flex gap-1">
                  <input
                    type="number"
                    class="h-9 min-w-0 flex-1 rounded-[7px] border border-[#E4E7EC] px-2.5 text-[13px] outline-none focus:border-primary"
                    :value="volume ?? ''"
                    placeholder="0.00"
                    :disabled="!canEdit"
                    @input="volume = onNum(($event.target as HTMLInputElement).value)"
                  />
                  <select
                    v-model="volumeUnit"
                    class="h-9 w-[60px] rounded-[7px] border border-[#E4E7EC] bg-white px-1 text-xs outline-none"
                    :disabled="!canEdit"
                  >
                    <option value="cbm">cbm</option>
                    <option value="cft">cft</option>
                  </select>
                </div>
              </label>
            </div>

            <div class="grid items-end gap-2.5 sm:grid-cols-[2fr_1fr_1fr_auto]">
              <label class="block text-[11px] font-medium text-[#6B7280]">
                Commodity <span class="text-red-600">*</span>
                <input
                  v-model="commodity"
                  class="mt-1 h-9 w-full rounded-[7px] border border-[#E4E7EC] px-2.5 text-[13px] outline-none focus:border-primary"
                  placeholder="e.g. Textiles, Electronics…"
                  :disabled="!canEdit"
                />
              </label>
              <label class="block text-[11px] font-medium text-[#6B7280]">
                HS Code
                <input
                  v-model="hsCode"
                  class="mt-1 h-9 w-full rounded-[7px] border border-[#E4E7EC] px-2.5 text-[13px] outline-none focus:border-primary"
                  placeholder="e.g. 6109.10"
                  :disabled="!canEdit"
                />
              </label>
              <label class="block text-[11px] font-medium text-[#6B7280]">
                DG Class
                <input
                  v-model="dgClass"
                  class="mt-1 h-9 w-full rounded-[7px] border border-[#E4E7EC] px-2.5 text-[13px] outline-none focus:border-primary disabled:bg-[#F9FAFB]"
                  :placeholder="isDangerousGoods ? 'Class 3…' : '—'"
                  :disabled="!canEdit || !isDangerousGoods"
                />
              </label>
              <label
                class="flex h-9 items-center gap-1.5 whitespace-nowrap text-xs text-[#374151]"
                :class="canEdit ? 'cursor-pointer' : 'cursor-default'"
              >
                <input
                  v-model="isDangerousGoods"
                  type="checkbox"
                  class="h-3.5 w-3.5 accent-primary"
                  :disabled="!canEdit"
                  @change="dgClass = ''"
                />
                Dangerous Goods
              </label>
            </div>
          </section>

          <!-- Commercial -->
          <section class="rounded-[10px] border border-[#E4E7EC] bg-white px-4 py-3.5">
            <div
              class="mb-3 border-b border-[#F3F4F6] pb-2 text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]"
            >
              Commercial
            </div>
            <div class="mb-2.5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              <label class="block text-[11px] font-medium text-[#6B7280]">
                Incoterm
                <select
                  v-model="incoterm"
                  class="mt-1 h-9 w-full rounded-[7px] border border-[#E4E7EC] bg-white px-2.5 text-[13px] outline-none focus:border-primary"
                  :disabled="!canEdit"
                >
                  <option v-for="i in INCOTERMS" :key="i" :value="i">{{ i }}</option>
                </select>
              </label>
              <label class="block text-[11px] font-medium text-[#6B7280]">
                Currency
                <select
                  v-model="currency"
                  class="mt-1 h-9 w-full rounded-[7px] border border-[#E4E7EC] bg-white px-2.5 text-[13px] outline-none focus:border-primary"
                  :disabled="!canEdit"
                >
                  <option v-for="c in CURRENCIES" :key="c" :value="c">{{ c }}</option>
                </select>
              </label>
              <label class="block text-[11px] font-medium text-[#6B7280]">
                Valid Until
                <input
                  v-model="validUntil"
                  type="date"
                  class="mt-1 h-9 w-full rounded-[7px] border border-[#E4E7EC] px-2.5 text-[13px] outline-none focus:border-primary"
                  :disabled="!canEdit"
                />
              </label>
              <label class="block text-[11px] font-medium text-[#6B7280]">
                Service Level
                <select
                  v-model="serviceLevel"
                  class="mt-1 h-9 w-full rounded-[7px] border border-[#E4E7EC] bg-white px-2.5 text-[13px] outline-none focus:border-primary"
                  :disabled="!canEdit"
                >
                  <option v-for="s in SVC_LEVELS" :key="s.value" :value="s.value">
                    {{ s.label }}
                  </option>
                </select>
              </label>
            </div>
            <label class="block text-[11px] font-medium text-[#6B7280]">
              Internal Notes
              <textarea
                v-model="notes"
                rows="2"
                class="mt-1 w-full resize-y rounded-[7px] border border-[#E4E7EC] px-2.5 py-2 text-[13px] leading-relaxed outline-none focus:border-primary disabled:bg-[#F9FAFB]"
                placeholder="Quote conditions, carrier preferences, special instructions…"
                :disabled="!canEdit"
              />
            </label>
          </section>

          <!-- Rate sketch -->
          <div class="overflow-hidden rounded-[10px] border border-[#E4E7EC] bg-white">
            <button
              type="button"
              class="flex w-full items-center justify-between px-4 py-[11px]"
              :class="ratesOpen ? 'border-b border-[#E4E7EC] bg-[#F9FAFB]' : 'bg-white'"
              @click="ratesOpen = !ratesOpen"
            >
              <div class="flex flex-wrap items-center gap-2.5">
                <span class="text-[10px] font-bold tracking-wider text-[#9CA3AF]">RATE SKETCH</span>
                <span v-if="sellTotal > 0" class="text-xs font-semibold text-emerald-600">
                  {{ currency }}
                  {{ sellTotal.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
                </span>
                <span class="text-[11px] text-[#9CA3AF]">
                  {{ lines.length }} line{{ lines.length !== 1 ? 's' : '' }}
                  <template v-if="lines.some((l) => l.sell !== null)">
                    · {{ lines.filter((l) => l.sell !== null).length }} priced
                  </template>
                </span>
              </div>
              <span class="text-sm text-[#9CA3AF]">{{ ratesOpen ? '−' : '⊕' }}</span>
            </button>

            <div v-if="ratesOpen" class="pb-3">
              <div
                class="grid gap-2 border-b border-[#F3F4F6] px-4 py-1.5 text-[10px] font-bold tracking-wide text-[#9CA3AF]"
                style="grid-template-columns: 80px 1fr 110px 110px 110px 28px"
              >
                <span>CODE</span>
                <span>DESCRIPTION</span>
                <span>SELL ({{ currency }})</span>
                <span>COST ({{ currency }})</span>
                <span>UNIT</span>
                <span />
              </div>
              <div
                v-for="line in lines"
                :key="line.id"
                class="grid items-center gap-2 border-b border-[#F9FAFB] px-4 py-1.5"
                style="grid-template-columns: 80px 1fr 110px 110px 110px 28px"
              >
                <input
                  :value="line.chargeCode"
                  class="h-[30px] w-full rounded-[7px] border border-[#E4E7EC] px-2 text-[13px] outline-none focus:border-primary"
                  :disabled="!canEdit"
                  @input="
                    patchLine(line.id, {
                      chargeCode: ($event.target as HTMLInputElement).value,
                    })
                  "
                />
                <input
                  :value="line.chargeLabel"
                  class="h-[30px] w-full rounded-[7px] border border-[#E4E7EC] px-2 text-[13px] outline-none focus:border-primary"
                  :disabled="!canEdit"
                  @input="
                    patchLine(line.id, {
                      chargeLabel: ($event.target as HTMLInputElement).value,
                    })
                  "
                />
                <input
                  type="number"
                  :value="line.sell ?? ''"
                  placeholder="0.00"
                  class="h-[30px] w-full rounded-[7px] border border-[#E4E7EC] px-2 text-[13px] outline-none focus:border-primary"
                  :disabled="!canEdit"
                  @input="
                    patchLine(line.id, {
                      sell: onNum(($event.target as HTMLInputElement).value),
                    })
                  "
                />
                <input
                  type="number"
                  :value="line.cost ?? ''"
                  placeholder="0.00"
                  class="h-[30px] w-full rounded-[7px] border border-[#E4E7EC] px-2 text-[13px] outline-none focus:border-primary"
                  :disabled="!canEdit"
                  @input="
                    patchLine(line.id, {
                      cost: onNum(($event.target as HTMLInputElement).value),
                    })
                  "
                />
                <select
                  :value="line.unit"
                  class="h-[30px] w-full rounded-[7px] border border-[#E4E7EC] bg-white px-1 text-[12px] outline-none"
                  :disabled="!canEdit"
                  @change="
                    patchLine(line.id, {
                      unit: ($event.target as HTMLSelectElement).value as ChargeLine['unit'],
                    })
                  "
                >
                  <option value="shipment">Shipment</option>
                  <option value="kg">Per kg</option>
                  <option value="lb">Per lb</option>
                  <option value="piece">Per piece</option>
                </select>
                <button
                  v-if="canEdit"
                  type="button"
                  class="border-0 bg-transparent p-0 text-base text-[#D1D5DB]"
                  @click="removeLine(line.id)"
                >
                  ×
                </button>
                <span v-else />
              </div>
              <button
                v-if="canEdit"
                type="button"
                class="mx-4 mt-2 rounded-[7px] border border-dashed border-[#A7F3D0] bg-[#F0FDFB] px-3.5 py-1.5 text-xs text-primary"
                @click="addLine"
              >
                + Add line
              </button>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div
          class="flex shrink-0 flex-wrap items-center gap-2.5 border-t border-[#E4E7EC] bg-white px-5 py-[11px]"
        >
          <div class="flex min-w-0 flex-1 flex-wrap gap-2.5">
            <span
              v-for="(label, i) in progressLabels"
              :key="label"
              class="flex items-center gap-1 text-[10px] font-medium"
              :class="progress[i] ? 'text-emerald-600' : 'text-[#D1D5DB]'"
            >
              <span
                class="inline-block h-1.5 w-1.5 rounded-full"
                :class="progress[i] ? 'bg-emerald-600' : 'bg-[#E4E7EC]'"
              />
              {{ label }}
            </span>
          </div>

          <button
            type="button"
            class="rounded-lg border border-[#E4E7EC] bg-white px-4 py-1.5 text-[13px] font-medium text-[#374151]"
            @click="requestClose"
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded-lg border border-[#E4E7EC] bg-white px-4 py-1.5 text-[13px] font-medium text-[#374151] disabled:opacity-50"
            :disabled="saving || !canEdit"
            @click="saveDraft"
          >
            {{ saved ? '✓ Saved' : 'Save Draft' }}
          </button>
          <button
            type="button"
            class="rounded-lg px-5 py-1.5 text-[13px] font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60"
            :class="!canEdit || progressScore < 3 ? 'bg-[#A7F3D0]' : 'bg-primary'"
            :disabled="!canEdit || progressScore < 3 || saving"
            @click="sendQuote"
          >
            Send Quote →
          </button>
        </div>

        <!-- Discard confirm -->
        <template v-if="escConfirm">
          <div class="absolute inset-0 z-10 rounded-[14px] bg-white/70" />
          <div
            class="absolute left-1/2 top-1/2 z-[11] min-w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[#E4E7EC] bg-white px-8 py-7 text-center shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
          >
            <div class="mb-1.5 text-[15px] font-semibold text-[#1F2937]">Discard this draft?</div>
            <div class="mb-5 text-[13px] leading-relaxed text-[#6B7280]">
              You have unsaved changes. Closing will discard your draft.
            </div>
            <div class="flex justify-center gap-2">
              <button
                type="button"
                class="rounded-lg border border-[#E4E7EC] bg-white px-5 py-2 text-[13px] font-medium text-[#374151]"
                @click="escConfirm = false"
              >
                Keep editing
              </button>
              <button
                type="button"
                class="rounded-lg bg-red-600 px-5 py-2 text-[13px] font-medium text-white"
                @click="confirmDiscard"
              >
                Discard
              </button>
            </div>
          </div>
        </template>
      </div>

      <QuickCreateCustomerDrawer
        :open="createOpen"
        :initial-name="createSeed"
        :requested-by="actorName"
        @close="createOpen = false"
        @created="onCustomerCreated"
      />
    </div>
  </Teleport>
</template>
