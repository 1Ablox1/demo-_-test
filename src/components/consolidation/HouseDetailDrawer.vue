<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { ChevronDown, ChevronRight, Link2, X } from '@lucide/vue'
import CompactField from '@/components/ui/CompactField.vue'
import CompactSelect from '@/components/ui/CompactSelect.vue'
import CompactTextarea from '@/components/ui/CompactTextarea.vue'
import { useFreightStore, type ShipmentRecord, type ShipmentStatus } from '@/stores/freight'
import type { AuBiosecurityRisk, AuImportFields } from '@/types/auAirImport'
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
const draft = ref<ShipmentRecord | null>(null)
const openAcc = ref({ commercial: true, customs: true, billing: true })
const selectedCharges = ref<Set<string>>(new Set())
let saveTimer: ReturnType<typeof setTimeout> | null = null

const chargeRows = [
  { id: 'ch-afc', code: 'AFC', side: 'Sell', amount: 'AUD 1,240.00', currency: 'AUD' },
  { id: 'ch-thc', code: 'THC', side: 'Cost', amount: 'AUD 180.00', currency: 'AUD' },
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

const masterMawb = computed(() => {
  if (!draft.value?.consolidationId) return draft.value?.mawb || ''
  const con = freight.consolidations.find((c) => c.id === draft.value!.consolidationId)
  return con?.mawb || draft.value.mawb || ''
})

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
    return { label: draft.value.status === 'Verified' ? 'VERIFIED' : 'CUSTOMS RELEASED', cls: 'os-badge--green' }
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
            auImport: row.auImport ? { ...row.auImport } : emptyAuImportFields(),
            extras: { ...(row.extras ?? {}) },
          }
        : null
      openAcc.value = { commercial: true, customs: true, billing: true }
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
    emit('autosaved', `Autosaved ${draft.value.jobNo}`)
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
      class="os-drawer"
      role="dialog"
      aria-modal="true"
      aria-label="House detail"
    >
      <header class="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
        <div class="min-w-0 flex-1">
          <div class="font-mono text-[13px] font-bold">{{ draft.jobNo }}</div>
          <div class="truncate text-[11px] text-muted-foreground">
            {{ draft.customer }} · HAWB
            <span class="font-mono">{{ draft.hawb || '—' }}</span>
            <span v-if="draft.bookingRef" class="ml-1.5 font-mono text-teal-700">
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
      </header>

      <div class="min-h-0 flex-1 overflow-y-auto p-3">
        <!-- Commercial -->
        <div class="os-panel mb-2 overflow-hidden">
          <button
            type="button"
            class="flex w-full items-center justify-between px-3 py-2 text-left"
            @click="openAcc.commercial = !openAcc.commercial"
          >
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              ▾ Commercial details
            </span>
            <ChevronDown v-if="openAcc.commercial" :size="14" class="text-slate-400" />
            <ChevronRight v-else :size="14" class="text-slate-400" />
          </button>
          <div
            v-if="openAcc.commercial"
            class="grid grid-cols-2 gap-2 border-t border-border px-3 pb-3 pt-2"
          >
            <CompactField
              :model-value="draft.customer"
              label="Customer"
              required
              @update:model-value="patch('customer', String($event))"
            />
            <CompactSelect
              :model-value="draft.status"
              label="Status"
              :options="statusOptions"
              @update:model-value="patch('status', $event as ShipmentStatus)"
            />
            <CompactField
              :model-value="draft.hawb"
              label="HAWB / HBL"
              mono
              @update:model-value="patch('hawb', String($event))"
            />
            <CompactField
              :model-value="masterMawb"
              label="MAWB / MBL"
              mono
              :inherit-hint="masterMawb ? `Inherited from MAWB ${masterMawb}` : 'Inherited from master'"
            />
            <CompactField
              :model-value="draft.chargeableWt"
              label="Chargeable wt"
              mono
              @update:model-value="patch('chargeableWt', String($event))"
            />
            <CompactField
              :model-value="draft.route"
              label="Route"
              mono
              :inherit-hint="`Inherited from MAWB ${masterMawb || '—'}`"
            />
            <p class="col-span-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Link2 :size="12" />
              MBL · route · airline · ETD/ETA sync-locked from master console
            </p>
            <CompactTextarea
              :model-value="draft.notes"
              label="Notes"
              class="col-span-2"
              :rows="2"
              @update:model-value="patch('notes', $event)"
            />
          </div>
        </div>

        <!-- Customs / AU host facts -->
        <div class="mb-2 overflow-hidden rounded-lg border border-amber-200/80 bg-amber-50/30">
          <button
            type="button"
            class="flex w-full items-center justify-between px-3 py-2 text-left"
            @click="openAcc.customs = !openAcc.customs"
          >
            <span class="text-[10px] font-bold uppercase tracking-wider text-amber-900">
              ▾ Customs · ABN · DAFF · Clearance
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
              Edits stay on this house Job — legacy jobState does not return the file to Book.
            </p>
          </div>
        </div>

        <!-- Billing -->
        <div class="os-panel overflow-hidden">
          <button
            type="button"
            class="flex w-full items-center justify-between px-3 py-2 text-left"
            @click="openAcc.billing = !openAcc.billing"
          >
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              ▾ Billing ledger
            </span>
            <ChevronDown v-if="openAcc.billing" :size="14" class="text-slate-400" />
            <ChevronRight v-else :size="14" class="text-slate-400" />
          </button>
          <div v-if="openAcc.billing" class="border-t border-border px-3 pb-3 pt-2 text-[12px]">
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
                @click="emit('autosaved', `Copied ${selectedCharges.size} charge line(s)`)"
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
            <p class="mt-2 text-[11px] text-muted-foreground">
              Full ledger on Job Desk → Charges. Weight
              <span class="font-mono">{{ draft.chargeableWt || '—' }}</span>
            </p>
          </div>
        </div>
      </div>

      <footer class="flex shrink-0 items-center gap-2 border-t border-border px-4 py-3">
        <button
          type="button"
          class="h-8 rounded-md border border-amber-200 bg-amber-50 px-3 text-[12px] font-medium text-amber-900"
          @click="emit('detach', draft.id)"
        >
          Detach row
        </button>
        <span class="flex-1 text-[10px] text-muted-foreground">800px drawer · Esc closes · stay on console</span>
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
