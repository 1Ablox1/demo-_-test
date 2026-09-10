<script setup lang="ts">
/**
 * House Bill detail drawer under Console — CargoWise HAWB/HBL workspace.
 * Schedule fields are inherited/locked from Master; customs + AR stay house-scoped.
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Link2,
  X,
} from '@lucide/vue'
import CompactField from '@/components/ui/CompactField.vue'
import CompactSelect from '@/components/ui/CompactSelect.vue'
import CompactTextarea from '@/components/ui/CompactTextarea.vue'
import { useFreightStore, type ShipmentRecord, type ShipmentStatus } from '@/stores/freight'
import type { AuBiosecurityRisk, AuFreightTerm, AuImportFields } from '@/types/auAirImport'
import { emptyAuImportFields } from '@/lib/auAirImportSmartFill'
import { JOB_STATUS } from '@/data/legacySearchOptions'
import { isBlockedJobStatus } from '@/lib/jobStatus'

const props = defineProps<{
  houseId: string | null
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  autosaved: [msg: string]
  detach: [id: string]
}>()

const freight = useFreightStore()
const router = useRouter()
const draft = ref<ShipmentRecord | null>(null)
const openAcc = ref({
  identity: true,
  parties: true,
  cargo: true,
  inherited: true,
  customs: true,
  billing: true,
})
const selectedCharges = ref<Set<string>>(new Set())
let saveTimer: ReturnType<typeof setTimeout> | null = null

const chargeRows = [
  { id: 'ch-afc', code: 'AFC', side: 'AR · Sell', amount: 'AUD 1,240.00', currency: 'AUD' },
  { id: 'ch-thc', code: 'THC', side: 'AR · Sell', amount: 'AUD 180.00', currency: 'AUD' },
  { id: 'ch-gst', code: 'GST', side: 'Tax', amount: 'AUD 142.00', currency: 'AUD' },
]

const statusOptions = JOB_STATUS

const daffOptions = [
  { value: 'none', label: 'None' },
  { value: 'daff_review', label: 'DAFF review' },
  { value: 'permit_required', label: 'Permit required' },
]

const clearanceOptions = [
  { value: 'open', label: 'Open' },
  { value: 'held', label: 'Held' },
  { value: 'cleared', label: 'Cleared / Released' },
]

const moneyLockOptions = [
  { value: 'unlocked', label: 'Unlocked' },
  { value: 'locked', label: 'Money lock' },
]

const freightTermOptions = [
  { value: '', label: 'Select…' },
  { value: 'prepaid', label: 'Prepaid' },
  { value: 'collect', label: 'Collect' },
]

const paymentOptions = [
  { value: '', label: 'Select…' },
  { value: 'PP', label: 'Prepaid (PP)' },
  { value: 'CC', label: 'Collect (CC)' },
]

const consolidation = computed(() => {
  if (!draft.value?.consolidationId) return null
  return freight.consolidations.find((c) => c.id === draft.value!.consolidationId) ?? null
})

const masterMawb = computed(
  () => consolidation.value?.mawb || draft.value?.mawb || '',
)
const inheritHint = computed(() =>
  masterMawb.value
    ? `Inherited from Master · MAWB ${masterMawb.value}`
    : 'Inherited from Master Console',
)

const clearanceGate = computed(() => draft.value?.extras?.clearanceGate || 'open')
const moneyLock = computed(() => draft.value?.extras?.moneyLock || 'unlocked')

const headerPill = computed(() => {
  if (!draft.value) return { label: '—', cls: 'os-badge--slate' }
  if (moneyLock.value === 'locked') return { label: 'MONEY LOCK', cls: 'os-badge--red' }
  if (draft.value.auImport?.biosecurityRisk === 'daff_review') {
    return { label: 'HELD: DAFF', cls: 'os-badge--amber' }
  }
  if (clearanceGate.value === 'held' || isBlockedJobStatus(draft.value.status)) {
    return { label: draft.value.status.toUpperCase(), cls: 'os-badge--amber' }
  }
  if (clearanceGate.value === 'cleared' || draft.value.status === 'Verified') {
    return {
      label: draft.value.status === 'Verified' ? 'VERIFIED' : 'CUSTOMS RELEASED',
      cls: 'os-badge--green',
    }
  }
  return { label: draft.value.status.toUpperCase(), cls: 'os-badge--slate' }
})

watch(
  () => [props.open, props.houseId] as const,
  ([open, id]) => {
    if (open && id) {
      const row = freight.shipments.find((s) => s.id === id)
      draft.value = row
        ? {
            ...row,
            auImport: row.auImport
              ? { ...emptyAuImportFields(), ...row.auImport }
              : emptyAuImportFields(),
            extras: { ...(row.extras ?? {}) },
          }
        : null
      openAcc.value = {
        identity: true,
        parties: true,
        cargo: true,
        inherited: true,
        customs: true,
        billing: true,
      }
      selectedCharges.value = new Set()
    }
  },
  { immediate: true },
)

function toggleCharge(id: string) {
  const next = new Set(selectedCharges.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedCharges.value = next
}

function clearChargeSelection() {
  selectedCharges.value = new Set()
}

function scheduleAutosave() {
  if (!draft.value) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    if (!draft.value) return
    freight.updateShipment(draft.value.id, { ...draft.value })
    emit('autosaved', `Autosaved House ${draft.value.hawb || draft.value.jobNo}`)
  }, 450)
}

function patch<K extends keyof ShipmentRecord>(key: K, value: ShipmentRecord[K]) {
  if (!draft.value) return
  draft.value = { ...draft.value, [key]: value }
  scheduleAutosave()
}

function patchAu<K extends keyof AuImportFields>(key: K, value: AuImportFields[K]) {
  if (!draft.value) return
  const base = draft.value.auImport ?? emptyAuImportFields()
  draft.value = {
    ...draft.value,
    auImport: { ...base, [key]: value },
  }
  scheduleAutosave()
}

function patchExtra(key: string, value: string) {
  if (!draft.value) return
  draft.value = {
    ...draft.value,
    extras: { ...(draft.value.extras ?? {}), [key]: value },
  }
  scheduleAutosave()
}

function openFullHouseJob() {
  if (!draft.value) return
  void router.push({
    name: 'shipment',
    params: { shipmentId: draft.value.id },
    query: { from: 'console' },
  })
}

function openHouseOverview() {
  if (!draft.value) return
  void router.push({
    name: 'job-context',
    params: { shipmentId: draft.value.id },
    query: { from: 'console' },
  })
}

function onKey(e: KeyboardEvent) {
  if (!props.open) return
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  if (saveTimer) clearTimeout(saveTimer)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open && draft" class="os-drawer-backdrop" @click="emit('close')" />
    <aside
      v-if="open && draft"
      class="os-drawer os-drawer--house"
      role="dialog"
      aria-modal="true"
      aria-label="House Bill detail"
    >
      <header class="shrink-0 border-b border-border">
        <div class="flex h-12 items-center gap-3 px-4">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-900"
              >
                House Bill
              </span>
              <span class="font-mono text-[15px] font-bold text-slate-900">
                HAWB {{ draft.hawb || '— pending' }}
              </span>
            </div>
            <div class="mt-0.5 truncate text-[11px] text-muted-foreground">
              Job
              <span class="font-mono">{{ draft.jobNo }}</span>
              · {{ draft.customer }}
              <span v-if="draft.bookingRef" class="ml-1 font-mono text-teal-700">
                · {{ draft.bookingRef }}
              </span>
            </div>
          </div>
          <span class="os-badge" :class="headerPill.cls">
            <span class="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70" />
            {{ headerPill.label }}
          </span>
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
            aria-label="Close"
            @click="emit('close')"
          >
            <X :size="16" :stroke-width="1.75" />
          </button>
        </div>
        <div class="flex flex-wrap gap-1.5 border-t border-border bg-slate-50/80 px-4 py-2">
          <button
            type="button"
            class="flex h-7 items-center gap-1 rounded-md border border-violet-200 bg-white px-2 text-[11px] font-semibold text-violet-900 hover:bg-violet-50"
            @click="openFullHouseJob"
          >
            <ExternalLink :size="12" />
            Open full House Job
          </button>
          <button
            type="button"
            class="flex h-7 items-center gap-1 rounded-md border border-border bg-white px-2 text-[11px] font-medium hover:bg-muted"
            @click="openHouseOverview"
          >
            House Overview
          </button>
        </div>
      </header>

      <div class="min-h-0 flex-1 overflow-y-auto p-3">
        <!-- House identity / HAWB -->
        <div class="os-panel mb-2 overflow-hidden">
          <button
            type="button"
            class="flex w-full items-center justify-between px-3 py-2 text-left"
            @click="openAcc.identity = !openAcc.identity"
          >
            <span class="text-[10px] font-bold uppercase tracking-wider text-violet-800">
              House Bill identity
            </span>
            <ChevronDown v-if="openAcc.identity" :size="14" class="text-slate-400" />
            <ChevronRight v-else :size="14" class="text-slate-400" />
          </button>
          <div
            v-if="openAcc.identity"
            class="grid grid-cols-2 gap-2 border-t border-border px-3 pb-3 pt-2"
          >
            <CompactField
              :model-value="draft.hawb"
              label="HAWB / HBL"
              mono
              required
              class="col-span-2"
              @update:model-value="patch('hawb', String($event))"
            />
            <CompactField
              :model-value="draft.customer"
              label="Customer (bill-to)"
              required
              @update:model-value="patch('customer', String($event))"
            />
            <CompactSelect
              :model-value="draft.status"
              label="House status"
              :options="statusOptions"
              @update:model-value="patch('status', $event as ShipmentStatus)"
            />
            <CompactSelect
              :model-value="draft.auImport?.incoTerm ?? ''"
              label="Incoterm"
              :options="[
                { value: '', label: 'Select…' },
                { value: 'EXW', label: 'EXW' },
                { value: 'FOB', label: 'FOB' },
                { value: 'CIF', label: 'CIF' },
                { value: 'CFR', label: 'CFR' },
                { value: 'DAP', label: 'DAP' },
                { value: 'DDP', label: 'DDP' },
              ]"
              @update:model-value="patchAu('incoTerm', $event)"
            />
            <CompactSelect
              :model-value="draft.auImport?.paymentTermHbl ?? ''"
              label="HAWB freight terms"
              :options="paymentOptions"
              @update:model-value="patchAu('paymentTermHbl', $event)"
            />
            <CompactSelect
              :model-value="draft.auImport?.freightTerm ?? ''"
              label="Freight term"
              :options="freightTermOptions"
              @update:model-value="patchAu('freightTerm', $event as AuFreightTerm)"
            />
          </div>
        </div>

        <!-- Parties -->
        <div class="os-panel mb-2 overflow-hidden">
          <button
            type="button"
            class="flex w-full items-center justify-between px-3 py-2 text-left"
            @click="openAcc.parties = !openAcc.parties"
          >
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Shipper · Consignee · Notify
            </span>
            <ChevronDown v-if="openAcc.parties" :size="14" class="text-slate-400" />
            <ChevronRight v-else :size="14" class="text-slate-400" />
          </button>
          <div
            v-if="openAcc.parties"
            class="grid grid-cols-2 gap-2 border-t border-border px-3 pb-3 pt-2"
          >
            <CompactField
              :model-value="draft.auImport?.shipperId || draft.extras?.shipper || ''"
              label="Shipper"
              class="col-span-2"
              @update:model-value="
                patchAu('shipperId', String($event));
                patchExtra('shipper', String($event))
              "
            />
            <CompactField
              :model-value="draft.auImport?.consigneeId || draft.extras?.consignee || ''"
              label="Consignee"
              class="col-span-2"
              @update:model-value="
                patchAu('consigneeId', String($event));
                patchExtra('consignee', String($event))
              "
            />
            <CompactField
              :model-value="draft.auImport?.notifyParty || draft.extras?.notifyParty || ''"
              label="Notify party"
              class="col-span-2"
              @update:model-value="
                patchAu('notifyParty', String($event));
                patchExtra('notifyParty', String($event))
              "
            />
            <CompactTextarea
              :model-value="draft.auImport?.deliveryAddress ?? ''"
              label="Delivery address"
              class="col-span-2"
              :rows="2"
              @update:model-value="patchAu('deliveryAddress', $event)"
            />
          </div>
        </div>

        <!-- Cargo -->
        <div class="os-panel mb-2 overflow-hidden">
          <button
            type="button"
            class="flex w-full items-center justify-between px-3 py-2 text-left"
            @click="openAcc.cargo = !openAcc.cargo"
          >
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              House cargo
            </span>
            <ChevronDown v-if="openAcc.cargo" :size="14" class="text-slate-400" />
            <ChevronRight v-else :size="14" class="text-slate-400" />
          </button>
          <div
            v-if="openAcc.cargo"
            class="grid grid-cols-2 gap-2 border-t border-border px-3 pb-3 pt-2"
          >
            <CompactField
              :model-value="draft.auImport?.pieces ?? ''"
              label="Pieces"
              type="number"
              mono
              @update:model-value="
                patchAu('pieces', $event === '' ? '' : Number($event))
              "
            />
            <CompactField
              :model-value="draft.auImport?.grossWeightKg ?? ''"
              label="Gross wt (kg)"
              type="number"
              mono
              @update:model-value="
                patchAu('grossWeightKg', $event === '' ? '' : Number($event))
              "
            />
            <CompactField
              :model-value="draft.chargeableWt"
              label="Chargeable wt"
              mono
              @update:model-value="patch('chargeableWt', String($event))"
            />
            <CompactField
              :model-value="draft.extras?.volume || ''"
              label="Volume (CBM)"
              mono
              @update:model-value="patchExtra('volume', String($event))"
            />
            <CompactField
              :model-value="draft.auImport?.packing ?? ''"
              label="Packing"
              @update:model-value="patchAu('packing', String($event))"
            />
            <CompactField
              :model-value="draft.auImport?.cargoType ?? ''"
              label="Cargo type"
              @update:model-value="patchAu('cargoType', String($event))"
            />
            <CompactField
              :model-value="draft.auImport?.commodityHs ?? ''"
              label="HS code"
              mono
              @update:model-value="patchAu('commodityHs', String($event))"
            />
            <CompactField
              :model-value="draft.auImport?.countryOfOrigin ?? ''"
              label="Country of origin"
              mono
              @update:model-value="patchAu('countryOfOrigin', String($event))"
            />
            <CompactTextarea
              :model-value="draft.auImport?.cargoDescription ?? draft.notes"
              label="Cargo description"
              class="col-span-2"
              :rows="2"
              @update:model-value="patchAu('cargoDescription', $event)"
            />
            <CompactTextarea
              :model-value="draft.auImport?.marksAndNumbers ?? ''"
              label="Marks & numbers"
              class="col-span-2"
              :rows="2"
              @update:model-value="patchAu('marksAndNumbers', $event)"
            />
            <CompactTextarea
              :model-value="draft.auImport?.specialReqs ?? ''"
              label="Special requirements"
              class="col-span-2"
              :rows="2"
              @update:model-value="patchAu('specialReqs', $event)"
            />
          </div>
        </div>

        <!-- Inherited from Master (locked) -->
        <div class="mb-2 overflow-hidden rounded-lg border border-sky-200 bg-sky-50/40">
          <button
            type="button"
            class="flex w-full items-center justify-between px-3 py-2 text-left"
            @click="openAcc.inherited = !openAcc.inherited"
          >
            <span class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-sky-900">
              <Link2 :size="12" />
              Inherited from Master (locked)
            </span>
            <ChevronDown v-if="openAcc.inherited" :size="14" class="text-sky-700/50" />
            <ChevronRight v-else :size="14" class="text-sky-700/50" />
          </button>
          <div
            v-if="openAcc.inherited"
            class="grid grid-cols-2 gap-2 border-t border-sky-200/60 px-3 pb-3 pt-2"
          >
            <CompactField
              :model-value="masterMawb"
              label="MAWB / MBL"
              mono
              :inherit-hint="inheritHint"
            />
            <CompactField
              :model-value="consolidation?.airline || draft.airline"
              label="Airline"
              :inherit-hint="inheritHint"
            />
            <CompactField
              :model-value="consolidation?.route || draft.route"
              label="Route"
              mono
              class="col-span-2"
              :inherit-hint="inheritHint"
            />
            <CompactField
              :model-value="consolidation?.etd || draft.etd"
              label="ETD"
              mono
              :inherit-hint="inheritHint"
            />
            <CompactField
              :model-value="consolidation?.eta || draft.eta"
              label="ETA"
              mono
              :inherit-hint="inheritHint"
            />
            <CompactField
              :model-value="consolidation?.extras?.flight || draft.extras?.flight || ''"
              label="Flight"
              mono
              :inherit-hint="inheritHint"
            />
            <CompactField
              :model-value="consolidation?.extras?.atd || ''"
              label="ATD"
              mono
              :inherit-hint="inheritHint"
            />
            <p class="col-span-2 flex items-center gap-1.5 text-[11px] text-sky-900/80">
              <Link2 :size="12" />
              Edit schedule on the Master Bill panel — houses never override while attached.
            </p>
          </div>
        </div>

        <!-- Customs -->
        <div class="mb-2 overflow-hidden rounded-lg border border-amber-200/80 bg-amber-50/30">
          <button
            type="button"
            class="flex w-full items-center justify-between px-3 py-2 text-left"
            @click="openAcc.customs = !openAcc.customs"
          >
            <span class="text-[10px] font-bold uppercase tracking-wider text-amber-900">
              Customs · ABN · DAFF · Clearance
            </span>
            <ChevronDown v-if="openAcc.customs" :size="14" class="text-amber-700/50" />
            <ChevronRight v-else :size="14" class="text-amber-700/50" />
          </button>
          <div
            v-if="openAcc.customs"
            class="grid grid-cols-2 gap-2 border-t border-amber-200/60 px-3 pb-3 pt-2"
          >
            <CompactField
              :model-value="draft.auImport?.ownerAbn ?? ''"
              label="Owner ABN"
              mono
              hint="11 digits"
              @update:model-value="patchAu('ownerAbn', String($event))"
            />
            <CompactField
              :model-value="draft.auImport?.brokerRef ?? ''"
              label="Broker ref"
              mono
              @update:model-value="patchAu('brokerRef', String($event))"
            />
            <CompactField
              :model-value="draft.auImport?.customsBroker ?? ''"
              label="Customs broker"
              @update:model-value="patchAu('customsBroker', String($event))"
            />
            <CompactSelect
              :model-value="draft.auImport?.customsRequired ?? ''"
              label="Customs required"
              :options="[
                { value: '', label: 'Select…' },
                { value: 'Y', label: 'Yes' },
                { value: 'N', label: 'No' },
              ]"
              @update:model-value="
                patchAu('customsRequired', $event as AuImportFields['customsRequired'])
              "
            />
            <CompactSelect
              :model-value="draft.auImport?.biosecurityRisk ?? 'none'"
              label="DAFF / biosecurity"
              :options="daffOptions"
              @update:model-value="patchAu('biosecurityRisk', $event as AuBiosecurityRisk)"
            />
            <CompactSelect
              :model-value="clearanceGate"
              label="Clearance gate"
              :options="clearanceOptions"
              @update:model-value="patchExtra('clearanceGate', String($event))"
            />
            <CompactSelect
              :model-value="moneyLock"
              label="Money lock"
              :options="moneyLockOptions"
              @update:model-value="patchExtra('moneyLock', String($event))"
            />
            <CompactField
              :model-value="draft.auImport?.declarationId ?? ''"
              label="Declaration ID"
              mono
              @update:model-value="patchAu('declarationId', String($event) || null)"
            />
            <p class="col-span-2 text-[11px] text-amber-900/80">
              Customs filing is House scope only — never on the Console Master.
            </p>
          </div>
        </div>

        <!-- House AR -->
        <div class="os-panel overflow-hidden">
          <button
            type="button"
            class="flex w-full items-center justify-between px-3 py-2 text-left"
            @click="openAcc.billing = !openAcc.billing"
          >
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              House AR · customer charges
            </span>
            <ChevronDown v-if="openAcc.billing" :size="14" class="text-slate-400" />
            <ChevronRight v-else :size="14" class="text-slate-400" />
          </button>
          <div v-if="openAcc.billing" class="border-t border-border px-3 pb-3 pt-2 text-[12px]">
            <p class="mb-2 text-[11px] text-muted-foreground">
              Customer AR lives on the House — Console holds Carrier AP only.
            </p>
            <table class="os-grid-table">
              <thead>
                <tr>
                  <th class="w-8" />
                  <th>Code</th>
                  <th>Side</th>
                  <th>Ccy</th>
                  <th class="text-right!">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="ch in chargeRows"
                  :key="ch.id"
                  :class="selectedCharges.has(ch.id) ? 'is-checked' : ''"
                  @click="toggleCharge(ch.id)"
                >
                  <td @click.stop>
                    <input
                      type="checkbox"
                      class="rounded border-border"
                      :checked="selectedCharges.has(ch.id)"
                      @change="toggleCharge(ch.id)"
                    />
                  </td>
                  <td class="font-mono text-[11px]">{{ ch.code }}</td>
                  <td>{{ ch.side }}</td>
                  <td class="font-mono text-[11px]">{{ ch.currency }}</td>
                  <td class="text-right font-mono text-[11px]">{{ ch.amount }}</td>
                </tr>
              </tbody>
            </table>
            <div
              v-if="selectedCharges.size"
              class="mt-2 flex items-center gap-2 rounded-md border border-border bg-slate-50 px-2 py-1.5"
            >
              <span class="text-[11px] font-medium text-slate-600">
                {{ selectedCharges.size }} charge{{ selectedCharges.size > 1 ? 's' : '' }}
              </span>
              <button
                type="button"
                class="h-8 rounded-md border border-border bg-white px-2 text-[10px] font-medium hover:bg-muted"
                @click="emit('autosaved', `Copied ${selectedCharges.size} AR line(s)`)"
              >
                Copy lines
              </button>
              <button
                type="button"
                class="h-8 rounded-md px-2 text-[10px] text-muted-foreground hover:text-foreground"
                @click="clearChargeSelection"
              >
                Clear
              </button>
            </div>
            <button
              type="button"
              class="mt-2 text-[11px] font-semibold text-teal-800 hover:underline"
              @click="
                router.push({
                  name: 'shipment',
                  params: { shipmentId: draft.id },
                  query: { step: 'money_preview', from: 'console' },
                })
              "
            >
              Open House Charges &amp; Invoice →
            </button>
          </div>
        </div>
      </div>

      <footer class="flex shrink-0 items-center gap-2 border-t border-border px-4 py-3">
        <button
          type="button"
          class="h-8 rounded-md border border-amber-200 bg-amber-50 px-3 text-[12px] font-medium text-amber-900"
          @click="emit('detach', draft.id)"
        >
          Detach house
        </button>
        <span class="flex-1 text-[10px] text-muted-foreground">
          House Bill drawer · Esc closes · stay on Console
        </span>
        <button
          type="button"
          class="h-8 rounded-md border border-border px-3 text-[12px] font-medium hover:bg-muted"
          @click="emit('close')"
        >
          Close
        </button>
      </footer>
    </aside>
  </Teleport>
</template>
