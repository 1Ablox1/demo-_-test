<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { ArrowRight, Check, ChevronDown, ChevronRight, Link2, Plus, Trash2 } from '@lucide/vue'
import CompactField from '@/components/ui/CompactField.vue'
import CompactSelect from '@/components/ui/CompactSelect.vue'
import CompactTextarea from '@/components/ui/CompactTextarea.vue'
import InheritFlashBar from '@/components/shipment/InheritFlashBar.vue'
import JobChargesHandoffPanel from '@/components/shipment/JobChargesHandoffPanel.vue'
import {
  AU_AIRLINE_OPTIONS,
  AU_BIOSECURITY_OPTIONS,
  AU_FREIGHT_TERM_OPTIONS,
  AU_LANES,
  AU_ORIGIN_COUNTRIES,
  partiesForRole,
  partyById,
} from '@/data/auAirImportRegistry'
import {
  applyCustomerPick,
  applyLanePick,
  applyMasterInheritance,
  applyShipperPick,
  fieldToStep,
  nextIncompleteStep,
  stepCompletion,
  stepProgress,
} from '@/lib/auAirImportSmartFill'
import { firstIncompleteFieldInStep } from '@/lib/auFieldValidation'
import {
  jumpToFieldKey,
  jumpToSectionElement,
} from '@/lib/fieldJump'
import type {
  AuBiosecurityRisk,
  AuFreightTerm,
  AuImportFields,
  AuImportStepId,
  InheritFlash,
} from '@/types/auAirImport'
import { AU_IMPORT_STEPS, INCO_TERMS } from '@/types/auAirImport'
import type { ConsolidationRecord, ShipmentRecord } from '@/stores/freight'
import type { HandoffNodeState } from '@/components/job/JobHandoffSpine.vue'

const props = withDefaults(
  defineProps<{
    shipment: ShipmentRecord
    auFields: AuImportFields
    consolidation: ConsolidationRecord | null
    /** Seat-gated guided mode: only focusStep is editable / open */
    guided?: boolean
    focusStep?: AuImportStepId | null
    /** Steps the current seat may see (others hidden) */
    visibleSteps?: AuImportStepId[] | null
    /** When true, inputs are display-only */
    readOnly?: boolean
    /** Horizontal tabs — one segment body at a time (Jobs form UX) */
    tabMode?: boolean
    /**
     * Lifecycle Handoff spine states keyed by form step —
     * chips mirror Done / Active / Held / Pending (not field-fill alone).
     */
    stepStates?: Partial<Record<AuImportStepId, HandoffNodeState>> | null
  }>(),
  {
    guided: false,
    focusStep: null,
    visibleSteps: null,
    readOnly: false,
    tabMode: false,
    stepStates: null,
  },
)

const emit = defineEmits<{
  'update:shipment': [patch: Partial<ShipmentRecord>]
  'update:auFields': [fields: AuImportFields]
}>()

const inheritHint = computed(() => {
  if (!props.consolidation || props.shipment.kind !== 'house') return ''
  const mawb = props.consolidation.mawb || props.shipment.mawb || '—'
  return `Inherited from MAWB ${mawb}`
})

const inheritFlight = computed(() => props.shipment.extras?.flight || '')

const activeStep = ref<AuImportStepId>('commercial')
const flashes = ref<InheritFlash[]>([])
const formRoot = ref<HTMLElement | null>(null)
const sectionRefs = ref<Record<string, HTMLElement | null>>({})
const open = ref<Record<AuImportStepId, boolean>>({
  commercial: true,
  route: false,
  awb_cargo: false,
  parties_delivery: false,
  customs_handoff: false,
  money_preview: false,
})

const navSteps = computed(() => {
  if (props.visibleSteps?.length) {
    return AU_IMPORT_STEPS.filter((s) => props.visibleSteps!.includes(s.id))
  }
  return AU_IMPORT_STEPS
})

function showStep(id: AuImportStepId): boolean {
  if (props.visibleSteps?.length && !props.visibleSteps.includes(id)) return false
  if (props.tabMode) return activeStep.value === id
  return true
}

/** Progressive disclosure: open next incomplete. Never leave all closed. */
function syncOpenToProgress() {
  if (props.tabMode && !props.guided) {
    if (!navSteps.value.some((s) => s.id === activeStep.value)) {
      activeStep.value = navSteps.value[0]?.id ?? 'commercial'
    }
    const nextOpen = { ...open.value }
    for (const s of AU_IMPORT_STEPS) {
      nextOpen[s.id] = s.id === activeStep.value
    }
    open.value = nextOpen
    return
  }
  if (props.guided && props.focusStep) {
    activeStep.value = props.focusStep
    const nextOpen = { ...open.value }
    for (const s of AU_IMPORT_STEPS) {
      nextOpen[s.id] = s.id === props.focusStep
    }
    open.value = nextOpen
    return
  }
  const next = nextIncompleteStep(completion.value)
  activeStep.value = next
  const nextOpen = { ...open.value }
  for (const s of AU_IMPORT_STEPS) {
    nextOpen[s.id] = s.id === next
  }
  if (!AU_IMPORT_STEPS.some((s) => nextOpen[s.id])) nextOpen.commercial = true
  open.value = nextOpen
}

watch(
  () => props.shipment.id,
  () => syncOpenToProgress(),
  { immediate: true },
)

watch(
  () => [props.guided, props.focusStep] as const,
  () => {
    if (props.guided && props.focusStep) syncOpenToProgress()
  },
)

const customerOptions = computed(() =>
  partiesForRole('customer').map((p) => ({ value: p.id, label: p.name })),
)
const shipperOptions = computed(() =>
  partiesForRole('shipper').map((p) => ({ value: p.id, label: p.name })),
)
const consigneeOptions = computed(() =>
  partiesForRole('consignee').map((p) => ({ value: p.id, label: p.name })),
)
const laneOptions = computed(() => AU_LANES.map((l) => ({ value: l.id, label: l.label })))
const incoOptions = computed(() => INCO_TERMS.map((t) => ({ value: t, label: t })))
const completion = computed(() => stepCompletion(props.auFields, props.shipment))
const progress = computed(() => {
  if (props.stepStates) {
    const ids = navSteps.value.map((s) => s.id)
    if (ids.length) {
      const done = ids.filter((id) => {
        const st = props.stepStates?.[id]
        return st === 'done' || (st == null && completion.value[id])
      }).length
      return Math.round((done / ids.length) * 100)
    }
  }
  return stepProgress(completion.value)
})
const suggestedNext = computed(() => nextIncompleteStep(completion.value))

const chargesShipmentId = computed(() => {
  const n = Number(props.shipment.id)
  return Number.isFinite(n) && n > 0 ? n : 0
})

/** Chip state mirrors Lifecycle Handoff; fall back to field completion. */
function chipState(stepId: AuImportStepId): HandoffNodeState {
  const fromSpine = props.stepStates?.[stepId]
  if (fromSpine) return fromSpine
  if (activeStep.value === stepId) return 'active'
  if (completion.value[stepId]) return 'done'
  return 'pending'
}

function chipClass(stepId: AuImportStepId): string {
  const state = chipState(stepId)
  const selected = activeStep.value === stepId
  if (state === 'held') {
    return selected
      ? 'border-amber-400 bg-amber-50 text-amber-950 ring-1 ring-amber-200'
      : 'border-amber-200 bg-amber-50/80 text-amber-900'
  }
  if (state === 'active' || selected) {
    return 'border-teal-300 bg-primary-tint text-teal-900 ring-1 ring-teal-200/80'
  }
  if (state === 'done') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-900'
  }
  return 'border-border bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
}

function chipDotClass(stepId: AuImportStepId): string {
  const state = chipState(stepId)
  if (state === 'done') return 'bg-emerald-600'
  if (state === 'active') return 'bg-teal-600'
  if (state === 'held') return 'bg-amber-600'
  return 'bg-slate-400'
}

function chipBadge(stepId: AuImportStepId): string {
  const state = chipState(stepId)
  if (state === 'done') return 'Done'
  if (state === 'active') return 'Active'
  if (state === 'held') return 'Held'
  return 'Pending'
}

function setSectionRef(id: string, el: unknown) {
  sectionRefs.value[id] = el as HTMLElement | null
}

function goStep(id: AuImportStepId, fieldKey?: string, opts?: { scroll?: boolean }) {
  // Guided: only jump within the active seat gate (admin bypass via !guided)
  if (props.guided && props.focusStep && id !== props.focusStep && !fieldKey) {
    id = props.focusStep
  }
  if (props.guided && props.visibleSteps?.length && !props.visibleSteps.includes(id)) {
    id = props.focusStep ?? props.visibleSteps[0]!
  }

  // Prefer an in-step field for spotlight; never let an unmapped focusKey remap the step
  // (bug: sellCurrency fell through fieldToStep → commercial / Booking).
  let key =
    fieldKey ?? firstIncompleteFieldInStep(id, props.auFields, props.shipment) ?? undefined
  if (key && fieldToStep(key) !== id) {
    key = firstIncompleteFieldInStep(id, props.auFields, props.shipment) ?? undefined
  }

  const target = props.guided && props.focusStep ? props.focusStep : id

  activeStep.value = target

  // Immutable open map so Vue always re-renders section bodies
  const nextOpen = { ...open.value }
  for (const s of AU_IMPORT_STEPS) {
    nextOpen[s.id] = s.id === target
  }
  if (!nextOpen[target]) nextOpen[target] = true
  open.value = nextOpen

  if (opts?.scroll === false) return

  nextTick(() => {
    try {
      const root = formRoot.value ?? undefined
      if (key && fieldToStep(key) === target) {
        const jumped = jumpToFieldKey(key, { root, behavior: 'smooth', focus: true })
        if (jumped) return
      }
      const section = sectionRefs.value[target] ?? sectionRefs.value[id]
      if (section) {
        jumpToSectionElement(section, { behavior: 'smooth' })
        return
      }
      formRoot.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    } catch {
      /* never block UI */
    }
  })
}

function jumpToField(fieldKey: string) {
  const stepId = fieldToStep(fieldKey)
  goStep(stepId, fieldKey)
}

function onFlashNavigate(payload: { stepId: AuImportStepId; fieldKey?: string }) {
  goStep(payload.stepId, payload.fieldKey)
}

function onStepNavClick(stepId: AuImportStepId) {
  if (props.guided && !props.tabMode && props.focusStep && stepId !== props.focusStep) return
  goStep(
    stepId,
    completion.value[stepId]
      ? undefined
      : (firstIncompleteFieldInStep(stepId, props.auFields, props.shipment) ?? undefined),
  )
}

function toggle(id: AuImportStepId) {
  if (props.guided || props.tabMode) return
  open.value = { ...open.value, [id]: !open.value[id] }
  if (open.value[id]) activeStep.value = id
}

function cargoLines() {
  return props.shipment.cargoLines ?? []
}

function addCargoLine() {
  if (props.readOnly) return
  const lines = [...cargoLines(), { id: `line-${Date.now()}`, pieces: '' as const, description: '', weightKg: '' as const }]
  emit('update:shipment', { cargoLines: lines })
}

function patchCargoLine(id: string, patch: Partial<{ pieces: number | ''; description: string; weightKg: number | '' }>) {
  if (props.readOnly) return
  const lines = cargoLines().map((l) => (l.id === id ? { ...l, ...patch } : l))
  emit('update:shipment', { cargoLines: lines })
}

function removeCargoLine(id: string) {
  if (props.readOnly) return
  emit(
    'update:shipment',
    { cargoLines: cargoLines().filter((l) => l.id !== id) },
  )
}

function pushFlashes(newFlashes: InheritFlash[]) {
  if (!newFlashes.length) return
  flashes.value = [...newFlashes, ...flashes.value].slice(0, 8)
}

function onCustomer(id: string) {
  if (props.readOnly) return
  const { fields, flashes: f } = applyCustomerPick(id, props.auFields)
  emit('update:auFields', fields)
  const cust = partyById(id)
  if (cust) emit('update:shipment', { customer: cust.name })
  pushFlashes(f)
  // Guided: stay on gate until seat hits Next (don't walk into next seat's work)
  if (!props.guided) goStep('route')
}

function onLane(id: string) {
  if (props.readOnly) return
  const { fields, flashes: f, routeDisplay, airlineName, etd, eta } = applyLanePick(id, props.auFields)
  emit('update:auFields', fields)
  emit('update:shipment', { route: routeDisplay, airline: airlineName, etd, eta })
  pushFlashes(f)
  if (!props.guided) goStep('awb_cargo')
}

function onShipper(id: string) {
  const { fields, flashes: f } = applyShipperPick(id, props.auFields)
  emit('update:auFields', fields)
  pushFlashes(f)
}

function inheritFromMaster() {
  if (!props.consolidation) return
  const { fields, shipmentPatch, flashes: f } = applyMasterInheritance(
    props.consolidation,
    props.auFields,
    props.shipment,
  )
  emit('update:auFields', fields)
  if (Object.keys(shipmentPatch).length) emit('update:shipment', shipmentPatch)
  pushFlashes(f)
  goStep('awb_cargo')
}

function patchAu(patch: Partial<AuImportFields>) {
  if (props.readOnly) return
  emit('update:auFields', { ...props.auFields, ...patch })
}

function patchShipment(patch: Partial<ShipmentRecord>) {
  if (props.readOnly) return
  emit('update:shipment', patch)
}

function patchFlight(value: string) {
  if (props.readOnly) return
  emit('update:shipment', {
    extras: { ...(props.shipment.extras ?? {}), flight: value },
  })
}

const operateTypeOptions = [
  { value: 'direct', label: 'Direct' },
  { value: 'console', label: 'Console' },
  { value: 'back_to_back', label: 'Back-to-back' },
]

const cargoSourceOptions = [
  { value: 'SC', label: 'SC · Sales' },
  { value: 'NC', label: 'NC · Nominated' },
]

const paymentTermOptions = [
  { value: 'PP', label: 'Prepaid (PP)' },
  { value: 'CC', label: 'Collect (CC)' },
]

const customsYnOptions = [
  { value: 'Y', label: 'Yes — customs required' },
  { value: 'N', label: 'No' },
]

function onIncoTerm(term: string) {
  const freightTerm: AuFreightTerm =
    term === 'CIF' || term === 'CFR' ? 'prepaid' : term === 'FOB' || term === 'EXW' ? 'collect' : ''
  patchAu({ incoTerm: term, freightTerm })
}

watch(
  () => props.consolidation?.id,
  () => {
    if (props.shipment.kind === 'house' && props.consolidation && !props.shipment.mawb.trim()) {
      inheritFromMaster()
    }
  },
  { immediate: true },
)

defineExpose({ goStep, jumpToField })
</script>

<template>
  <div ref="formRoot" class="space-y-2.5">
    <div class="os-panel flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
      <div class="min-w-0">
        <div class="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Field stages · mirrors Lifecycle handoff
        </div>
        <p class="mt-0.5 text-[11px] text-muted-foreground">
          <template v-if="guided">Your seat · one gate at a time · Hand off when Ops is done</template>
          <template v-else>Same cycle as the spine above · click a stage to jump · AU Local Frame</template>
        </p>
      </div>
      <div class="flex items-center gap-2">
        <div class="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
          <div class="h-full rounded-full bg-primary transition-all" :style="{ width: `${progress}%` }" />
        </div>
        <span class="font-mono text-[10px] font-semibold text-slate-500">{{ progress }}%</span>
        <button
          v-if="!guided && progress < 100"
          type="button"
          class="flex items-center gap-0.5 rounded-md border border-teal-200 bg-teal-50 px-2 py-1 text-[11px] font-semibold text-teal-900 hover:bg-teal-100"
          @click="goStep(suggestedNext)"
        >
          Next
          <ArrowRight :size="12" />
        </button>
      </div>
    </div>

    <nav class="flex flex-wrap gap-1.5" aria-label="Lifecycle field stages">
      <button
        v-for="(step, i) in navSteps"
        :key="step.id"
        type="button"
        class="group flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left transition-colors"
        :class="chipClass(step.id)"
        :disabled="guided && !tabMode && focusStep !== step.id"
        :title="`${step.hint} · ${chipBadge(step.id)}`"
        @click="onStepNavClick(step.id)"
      >
        <span
          class="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
          :class="chipDotClass(step.id)"
        />
        <span class="text-[10px] font-semibold tabular-nums text-slate-400">{{ i + 1 }}</span>
        <span class="text-[10px] font-semibold tracking-tight">{{ step.label }}</span>
        <span
          class="os-badge os-badge--micro shrink-0"
          :class="{
            'os-badge--green': chipState(step.id) === 'done',
            'os-badge--teal': chipState(step.id) === 'active',
            'os-badge--amber': chipState(step.id) === 'held',
            'os-badge--slate': chipState(step.id) === 'pending',
          }"
        >
          <Check v-if="chipState(step.id) === 'done'" :size="9" :stroke-width="3" />
          {{ chipBadge(step.id) }}
        </span>
      </button>
    </nav>

    <InheritFlashBar :flashes="flashes" @navigate="onFlashNavigate" />

    <!-- Commercial -->
    <div
      v-if="showStep('commercial')"
      :ref="(el) => setSectionRef('commercial', el)"
      class="os-panel overflow-hidden"
    >
      <button
        v-if="!tabMode"
        type="button"
        class="flex w-full items-center justify-between px-3 py-2 text-left"
        @click="toggle('commercial')"
      >
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          1 · Booking — importer & terms
        </span>
        <ChevronDown v-if="open.commercial" :size="14" class="text-slate-400" />
        <ChevronRight v-else :size="14" class="text-slate-400" />
      </button>
      <div
        v-if="tabMode"
        class="border-b border-border px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500"
      >
        Booking — importer & terms
      </div>
      <div v-if="tabMode || open.commercial" class="grid grid-cols-2 gap-2 border-t border-border px-3 pb-3 pt-2 lg:grid-cols-3">
        <CompactSelect
          :model-value="shipment.operateType"
          field-key="operateType"
          label="Operate type"
          hint="Direct · Console · B2B"
          :options="operateTypeOptions"
          @update:model-value="patchShipment({ operateType: $event as ShipmentRecord['operateType'] })"
        />
        <CompactSelect
          :model-value="auFields.cargoSource"
          field-key="cargoSource"
          label="Freight canvassing"
          hint="SC / NC"
          :options="cargoSourceOptions"
          @update:model-value="patchAu({ cargoSource: $event as AuImportFields['cargoSource'] })"
        />
        <CompactSelect
          :model-value="auFields.customerId"
          field-key="customerId"
          label="Importer / owner"
          hint="Who owns the goods"
          required
          :options="customerOptions"
          @update:model-value="onCustomer($event)"
        />
        <CompactField
          :model-value="auFields.ownerContact"
          field-key="ownerContact"
          label="Owner contact"
          hint="Phone · email"
          @update:model-value="patchAu({ ownerContact: String($event) })"
        />
        <CompactField
          :model-value="auFields.ownerRef"
          field-key="ownerRef"
          label="Owner reference"
          hint="PO / customer ref"
          mono
          @update:model-value="patchAu({ ownerRef: String($event) })"
        />
        <CompactSelect
          :model-value="auFields.incoTerm"
          field-key="incoTerm"
          label="Incoterm"
          hint="EXW · FOB · CIF…"
          required
          :options="incoOptions"
          @update:model-value="onIncoTerm($event)"
        />
        <CompactSelect
          :model-value="auFields.paymentTermHbl"
          field-key="paymentTermHbl"
          label="HAWB freight terms"
          :options="paymentTermOptions"
          @update:model-value="patchAu({ paymentTermHbl: $event })"
        />
        <CompactSelect
          :model-value="auFields.paymentTermMbl"
          field-key="paymentTermMbl"
          label="MAWB freight terms"
          :options="paymentTermOptions"
          @update:model-value="patchAu({ paymentTermMbl: $event })"
        />
        <CompactField
          :model-value="auFields.ownerAbn"
          field-key="ownerAbn"
          label="ABN"
          hint="11 digits (AU)"
          mono
          @update:model-value="patchAu({ ownerAbn: String($event) })"
        />
        <CompactField
          :model-value="auFields.op"
          field-key="op"
          label="Operator"
          hint="Ops user"
          @update:model-value="patchAu({ op: String($event) })"
        />
        <CompactField
          :model-value="auFields.sales"
          field-key="sales"
          label="Sales"
          @update:model-value="patchAu({ sales: String($event) })"
        />
        <p v-if="auFields.customerId" class="col-span-2 self-end text-[10px] text-muted-foreground lg:col-span-1">
          {{ partyById(auFields.customerId)?.abnHint }}
        </p>
      </div>
    </div>

    <!-- Route -->
    <div
      v-if="showStep('route')"
      :ref="(el) => setSectionRef('route', el)"
      class="os-panel overflow-hidden"
    >
      <button
        v-if="!tabMode"
        type="button"
        class="flex w-full items-center justify-between px-3 py-2 text-left"
        @click="toggle('route')"
      >
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          2 · Flight — ports & schedule
        </span>
        <div class="flex items-center gap-2">
          <button
            v-if="consolidation && shipment.kind === 'house'"
            type="button"
            class="flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium"
            @click.stop="inheritFromMaster"
          >
            <Link2 :size="11" />
            Pull master
          </button>
          <ChevronDown v-if="open.route" :size="14" class="text-slate-400" />
          <ChevronRight v-else :size="14" class="text-slate-400" />
        </div>
      </button>
      <div
        v-if="tabMode"
        class="flex items-center justify-between border-b border-border px-3 py-2"
      >
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Flight — ports & schedule
        </span>
        <button
          v-if="consolidation && shipment.kind === 'house'"
          type="button"
          class="flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium"
          @click="inheritFromMaster"
        >
          <Link2 :size="11" />
          Pull master
        </button>
      </div>
      <div v-if="tabMode || open.route" class="grid grid-cols-2 gap-2 border-t border-border px-3 pb-3 pt-2 lg:grid-cols-3">
        <CompactSelect
          :model-value="auFields.laneId"
          field-key="laneId"
          label="Trade lane"
          hint="Inherit ports"
          :options="laneOptions"
          @update:model-value="onLane($event)"
        />
        <CompactField
          :model-value="auFields.loadingPort"
          field-key="loadingPort"
          label="Port of loading"
          mono
          required
          @update:model-value="patchAu({ loadingPort: String($event) })"
        />
        <CompactField
          :model-value="auFields.dischargingPort"
          field-key="dischargingPort"
          label="Port of discharge"
          mono
          required
          @update:model-value="patchAu({ dischargingPort: String($event) })"
        />
        <CompactField
          :model-value="auFields.destinationPort"
          field-key="destinationPort"
          label="Destination port"
          mono
          @update:model-value="patchAu({ destinationPort: String($event) })"
        />
        <CompactSelect
          :model-value="auFields.airlineCode"
          field-key="airlineCode"
          label="Airline code"
          mono
          :options="AU_AIRLINE_OPTIONS"
          @update:model-value="patchAu({ airlineCode: $event })"
        />
        <CompactField
          :model-value="shipment.etd"
          field-key="etd"
          label="ETD"
          mono
          :inherit-hint="inheritHint"
          @update:model-value="patchShipment({ etd: String($event) })"
        />
        <CompactField
          :model-value="shipment.eta"
          field-key="eta"
          label="ETA / first arrival"
          mono
          :inherit-hint="inheritHint"
          @update:model-value="patchShipment({ eta: String($event) })"
        />
        <CompactField
          :model-value="shipment.route"
          field-key="route"
          label="Route"
          mono
          :inherit-hint="inheritHint"
          @update:model-value="patchShipment({ route: String($event) })"
        />
        <CompactField
          :model-value="shipment.airline"
          field-key="airline"
          label="Airline name"
          :inherit-hint="inheritHint"
          @update:model-value="patchShipment({ airline: String($event) })"
        />
        <CompactField
          :model-value="inheritFlight"
          field-key="flight"
          label="Flight No"
          mono
          hint="voyageFlight"
          :inherit-hint="inheritHint"
          @update:model-value="patchFlight(String($event))"
        />
        <CompactField
          :model-value="auFields.vessel"
          field-key="vessel"
          label="Aircraft / vessel"
          @update:model-value="patchAu({ vessel: String($event) })"
        />
      </div>
    </div>

    <!-- Customs -->
    <div
      v-if="showStep('customs_handoff')"
      :ref="(el) => setSectionRef('customs_handoff', el)"
      class="overflow-hidden rounded-lg border border-amber-200/80 bg-amber-50/40"
    >
      <button
        v-if="!tabMode"
        type="button"
        class="flex w-full items-center justify-between px-3 py-2 text-left"
        @click="toggle('customs_handoff')"
      >
        <span class="text-[10px] font-bold uppercase tracking-wider text-amber-900">
          3 · Customs entry
        </span>
        <ChevronDown v-if="open.customs_handoff" :size="14" class="text-amber-700/60" />
        <ChevronRight v-else :size="14" class="text-amber-700/60" />
      </button>
      <div
        v-if="tabMode"
        class="border-b border-amber-200/60 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-amber-900"
      >
        Customs entry
      </div>
      <div
        v-if="tabMode || open.customs_handoff"
        class="grid grid-cols-2 gap-2 border-t border-amber-200/60 px-3 pb-3 pt-2 lg:grid-cols-3"
      >
        <CompactField
          :model-value="auFields.brokerRef"
          field-key="brokerRef"
          label="Customs broker reference"
          mono
          required
          @update:model-value="patchAu({ brokerRef: String($event) })"
        />
        <CompactField
          :model-value="auFields.customsBroker"
          field-key="customsBroker"
          label="Customs broker"
          hint="Party name"
          @update:model-value="patchAu({ customsBroker: String($event) })"
        />
        <CompactSelect
          :model-value="auFields.customsRequired"
          field-key="customsRequired"
          label="Customs required"
          :options="customsYnOptions"
          @update:model-value="patchAu({ customsRequired: $event as AuImportFields['customsRequired'] })"
        />
        <CompactSelect
          :model-value="auFields.freightTerm"
          field-key="freightTerm"
          label="Freight terms"
          :options="AU_FREIGHT_TERM_OPTIONS"
          @update:model-value="patchAu({ freightTerm: $event as AuFreightTerm })"
        />
        <CompactSelect
          :model-value="auFields.biosecurityRisk"
          field-key="biosecurityRisk"
          label="DAFF / biosecurity"
          :options="AU_BIOSECURITY_OPTIONS"
          @update:model-value="patchAu({ biosecurityRisk: $event as AuBiosecurityRisk })"
        />
        <CompactField
          :model-value="auFields.permitHint"
          field-key="permitHint"
          label="Permit / treatment"
          class="col-span-2 lg:col-span-3"
          @update:model-value="patchAu({ permitHint: String($event) })"
        />
      </div>
    </div>

    <!-- AWB -->
    <div
      v-if="showStep('awb_cargo')"
      :ref="(el) => setSectionRef('awb_cargo', el)"
      class="os-panel overflow-hidden"
    >
      <button
        v-if="!tabMode"
        type="button"
        class="flex w-full items-center justify-between px-3 py-2 text-left"
        @click="toggle('awb_cargo')"
      >
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          4 · Cargo arrival — AWB & cargo
        </span>
        <ChevronDown v-if="open.awb_cargo" :size="14" class="text-slate-400" />
        <ChevronRight v-else :size="14" class="text-slate-400" />
      </button>
      <div
        v-if="tabMode"
        class="border-b border-border px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500"
      >
        Cargo arrival — AWB & cargo
      </div>
      <div v-if="tabMode || open.awb_cargo" class="space-y-2 border-t border-border px-3 pb-3 pt-2">
        <div class="grid grid-cols-2 gap-2 lg:grid-cols-3">
          <CompactField
            :model-value="shipment.mawb"
            field-key="mawb"
            label="MAWB"
            mono
            :disabled="shipment.kind === 'house'"
            @update:model-value="patchShipment({ mawb: String($event) })"
          />
          <CompactField
            :model-value="shipment.hawb"
            field-key="hawb"
            label="HAWB"
            mono
            required
            @update:model-value="patchShipment({ hawb: String($event) })"
          />
          <CompactField
            :model-value="auFields.pieces"
            field-key="pieces"
            label="Pieces"
            type="number"
            mono
            @update:model-value="patchAu({ pieces: $event === '' ? '' : Number($event) })"
          />
          <CompactField
            :model-value="auFields.grossWeightKg"
            field-key="grossWeightKg"
            label="Gross weight (kg)"
            type="number"
            mono
            @update:model-value="patchAu({ grossWeightKg: $event === '' ? '' : Number($event) })"
          />
          <CompactField
            :model-value="shipment.chargeableWt"
            field-key="chargeableWt"
            label="Chargeable weight"
            mono
            @update:model-value="patchShipment({ chargeableWt: String($event) })"
          />
          <CompactSelect
            :model-value="auFields.countryOfOrigin"
            field-key="countryOfOrigin"
            label="Country of origin"
            mono
            :options="AU_ORIGIN_COUNTRIES"
            @update:model-value="patchAu({ countryOfOrigin: $event })"
          />
          <CompactField
            :model-value="auFields.commodityHs"
            field-key="commodityHs"
            label="HS code (hint)"
            mono
            @update:model-value="patchAu({ commodityHs: String($event) })"
          />
          <CompactField
            :model-value="auFields.packing"
            field-key="packing"
            label="Packing"
            @update:model-value="patchAu({ packing: String($event) })"
          />
          <CompactField
            :model-value="auFields.cargoType"
            field-key="cargoType"
            label="Cargo type"
            @update:model-value="patchAu({ cargoType: String($event) })"
          />
        </div>
        <CompactTextarea
          :model-value="auFields.marksAndNumbers"
          field-key="marksAndNumbers"
          label="Marks and numbers"
          :rows="2"
          @update:model-value="patchAu({ marksAndNumbers: $event })"
        />
        <CompactTextarea
          :model-value="auFields.cargoDescription"
          field-key="cargoDescription"
          label="Goods description"
          :rows="2"
          @update:model-value="patchAu({ cargoDescription: $event })"
        />

        <div class="rounded-lg border border-border">
          <div class="flex items-center justify-between border-b border-border px-3 py-2">
            <div>
              <div class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Cargo lines</div>
              <p class="text-[10px] text-muted-foreground">Packing list rows — nested table inside the tab</p>
            </div>
            <button
              type="button"
              class="flex h-7 items-center gap-1 rounded-md border border-border px-2 text-[11px] font-semibold hover:bg-muted disabled:opacity-50"
              :disabled="readOnly"
              @click="addCargoLine"
            >
              <Plus :size="12" />
              Add row
            </button>
          </div>
          <table class="w-full text-left text-[12px]">
            <thead class="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th class="px-3 py-2 font-semibold">Pcs</th>
                <th class="px-3 py-2 font-semibold">Description</th>
                <th class="px-3 py-2 font-semibold">Wt (kg)</th>
                <th class="w-10 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              <tr v-for="line in cargoLines()" :key="line.id" class="border-t border-border">
                <td class="px-2 py-1.5">
                  <input
                    class="h-8 w-16 rounded border border-border px-2 font-mono text-[12px]"
                    :value="line.pieces"
                    :disabled="readOnly"
                    @input="
                      patchCargoLine(line.id, {
                        pieces: ($event.target as HTMLInputElement).value === '' ? '' : Number(($event.target as HTMLInputElement).value),
                      })
                    "
                  />
                </td>
                <td class="px-2 py-1.5">
                  <input
                    class="h-8 w-full rounded border border-border px-2 text-[12px]"
                    :value="line.description"
                    :disabled="readOnly"
                    @input="patchCargoLine(line.id, { description: ($event.target as HTMLInputElement).value })"
                  />
                </td>
                <td class="px-2 py-1.5">
                  <input
                    class="h-8 w-20 rounded border border-border px-2 font-mono text-[12px]"
                    :value="line.weightKg"
                    :disabled="readOnly"
                    @input="
                      patchCargoLine(line.id, {
                        weightKg: ($event.target as HTMLInputElement).value === '' ? '' : Number(($event.target as HTMLInputElement).value),
                      })
                    "
                  />
                </td>
                <td class="px-2 py-1.5">
                  <button
                    type="button"
                    class="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-muted hover:text-red-600 disabled:opacity-40"
                    :disabled="readOnly || cargoLines().length <= 1"
                    @click="removeCargoLine(line.id)"
                  >
                    <Trash2 :size="13" />
                  </button>
                </td>
              </tr>
              <tr v-if="!cargoLines().length">
                <td colspan="4" class="px-3 py-4 text-center text-[11px] text-muted-foreground">
                  No cargo lines — click Add row
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Money — spine 5 · Charges & Invoice (Unified Ledger) -->
    <div
      v-if="showStep('money_preview')"
      :ref="(el) => setSectionRef('money_preview', el)"
      class="os-panel overflow-hidden"
    >
      <button
        v-if="!tabMode"
        type="button"
        class="flex w-full items-center justify-between px-3 py-2 text-left"
        @click="toggle('money_preview')"
      >
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          5 · Charges & Invoice
        </span>
        <ChevronDown v-if="open.money_preview" :size="14" class="text-slate-400" />
        <ChevronRight v-else :size="14" class="text-slate-400" />
      </button>
      <div
        v-if="tabMode"
        class="border-b border-border px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500"
      >
        Charges & Invoice
      </div>
      <div v-if="tabMode || open.money_preview" class="space-y-3 border-t border-border px-3 pb-3 pt-2">
        <JobChargesHandoffPanel v-if="chargesShipmentId > 0" :shipment-id="chargesShipmentId" />
        <p v-else class="py-6 text-center text-[12px] text-muted-foreground">
          Save the job to load Unified Ledger charges.
        </p>
      </div>
    </div>

    <!-- Parties — spine 6 · Final Delivery -->
    <div
      v-if="showStep('parties_delivery')"
      :ref="(el) => setSectionRef('parties_delivery', el)"
      class="os-panel overflow-hidden"
    >
      <button
        v-if="!tabMode"
        type="button"
        class="flex w-full items-center justify-between px-3 py-2 text-left"
        @click="toggle('parties_delivery')"
      >
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          6 · Final delivery — parties & address
        </span>
        <ChevronDown v-if="open.parties_delivery" :size="14" class="text-slate-400" />
        <ChevronRight v-else :size="14" class="text-slate-400" />
      </button>
      <div
        v-if="tabMode"
        class="border-b border-border px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500"
      >
        Final delivery — parties & address
      </div>
      <div
        v-if="tabMode || open.parties_delivery"
        class="grid grid-cols-2 gap-2 border-t border-border px-3 pb-3 pt-2"
      >
        <CompactSelect
          :model-value="auFields.shipperId"
          field-key="shipperId"
          label="Shipper / supplier"
          :options="shipperOptions"
          @update:model-value="onShipper($event)"
        />
        <CompactSelect
          :model-value="auFields.consigneeId"
          field-key="consigneeId"
          label="Consignee"
          :options="consigneeOptions"
          @update:model-value="patchAu({ consigneeId: $event })"
        />
        <CompactField
          :model-value="auFields.notifyParty"
          field-key="notifyParty"
          label="Notify party"
          class="col-span-2"
          @update:model-value="patchAu({ notifyParty: String($event) })"
        />
        <CompactTextarea
          :model-value="auFields.deliveryAddress"
          field-key="deliveryAddress"
          label="Delivery address"
          class="col-span-2"
          :rows="2"
          @update:model-value="patchAu({ deliveryAddress: $event })"
        />
        <CompactTextarea
          :model-value="shipment.notes"
          field-key="notes"
          label="Remarks"
          class="col-span-2"
          :rows="2"
          @update:model-value="patchShipment({ notes: $event })"
        />
        <CompactTextarea
          :model-value="auFields.specialReqs"
          field-key="specialReqs"
          label="Special requirements"
          class="col-span-2"
          :rows="2"
          @update:model-value="patchAu({ specialReqs: $event })"
        />
      </div>
    </div>
  </div>
</template>
