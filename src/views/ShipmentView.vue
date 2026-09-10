<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@lucide/vue'
import AppShell from '@/components/AppShell.vue'
import AuImportSmartForm from '@/components/shipment/AuImportSmartForm.vue'
import SplitBookingPanel from '@/components/shipment/SplitBookingPanel.vue'
import JobGateBar from '@/components/job/JobGateBar.vue'
import JobHandoffSpine, {
  type HandoffNode,
  type HandoffNodeId,
  type HandoffNodeState,
} from '@/components/job/JobHandoffSpine.vue'
import CompactField from '@/components/ui/CompactField.vue'
import CompactSelect from '@/components/ui/CompactSelect.vue'
import CompactTextarea from '@/components/ui/CompactTextarea.vue'
import OsToast from '@/components/ui/OsToast.vue'
import JobListGrid from '@/components/jobs/JobListGrid.vue'
import ExecutionStickyHeader from '@/components/execution/ExecutionStickyHeader.vue'
import { mockLegacyRequest } from '@/lib/tableRowActions'
import { LOB_CATALOG } from '@/lib/lob'
import { airDirectionFromQuery, lobCodeFromAir } from '@/lib/airWorkspace'
import { operateTypeLabel } from '@/lib/splitBooking'
import { auImportFromShipment, emptyAuImportFields, nextIncompleteStep, stepCompletion } from '@/lib/auAirImportSmartFill'
import type { AuImportFields, AuImportStepId } from '@/types/auAirImport'
import { FINANCE_GATE_STEPS, OPS_GATE_STEPS } from '@/lib/jobGateLadder'
import type { SpineLobPrefix } from '@/types/spineLob'
import { operatorLabel } from '@/data/seatOperators'
import { useAuthStore } from '@/stores/auth'
import { useJobHandoffStore } from '@/stores/jobHandoff'
import {
  useFreightStore,
  type ShipmentKind,
  type ShipmentRecord,
  type ShipmentStatus,
} from '@/stores/freight'
import { JOB_STATUS } from '@/data/legacySearchOptions'
import { isBlockedJobStatus } from '@/lib/jobStatus'
import {
  AU_SPINE_ACCOUNTABLE,
  AU_SPINE_FOCUS_FIELD,
  detectAuCustomsHold,
  evaluateCreditGate,
  isFinalInvoiceLockedForPod,
} from '@/lib/auLifecycle'
import { useChargesStore } from '@/stores/charges'

const freight = useFreightStore()
const auth = useAuthStore()
const handoff = useJobHandoffStore()
const charges = useChargesStore()
const route = useRoute()
const router = useRouter()

const savedNote = ref('')
const inspector = ref<'customs' | 'money' | 'docs'>('customs')
const aeTab = ref<'basic' | 'awb' | 'parties' | 'notes' | 'structure'>('basic')
const formTab = ref<'fields' | 'structure'>('fields')
const saving = ref(false)
const submitting = ref(false)
const baselineJson = ref('')

const draft = ref<ShipmentRecord | null>(null)
const auFields = ref<AuImportFields>(emptyAuImportFields())
const activeNode = ref<HandoffNodeId>('booking')
const auFormRef = ref<{
  goStep: (id: AuImportStepId, fieldKey?: string, opts?: { scroll?: boolean }) => void
  jumpToField: (key: string) => void
} | null>(null)
const toastRef = ref<{ show: (msg: string, kind?: 'success' | 'info' | 'warn') => void } | null>(null)
const splitRef = ref<HTMLElement | null>(null)

const isNewMode = computed(() => String(route.query.mode ?? '') === 'new')
const isListMode = computed(() => !route.params.shipmentId && !isNewMode.value)
const isFormMode = computed(() => !isListMode.value)

const workspaceAir = computed(() => airDirectionFromQuery(route.query as Record<string, unknown>))
const workspaceLob = computed(() => {
  const air = workspaceAir.value
  return air ? lobCodeFromAir(air) : null
})

const workspaceTitle = computed(() => {
  if (workspaceLob.value) return LOB_CATALOG[workspaceLob.value].label
  return 'Jobs'
})

const kindOptions = [
  { value: 'direct', label: 'Direct' },
  { value: 'house', label: 'House' },
  { value: 'master', label: 'Master' },
]
const statusOptions = JOB_STATUS

const isAuImport = computed(() => draft.value?.lob === 'air_import')
const liveShipment = computed(() =>
  draft.value ? freight.shipments.find((s) => s.id === draft.value!.id) ?? draft.value : null,
)

const formDirty = computed(() => {
  if (!draft.value) return false
  const current = JSON.stringify({
    draft: draft.value,
    au: isAuImport.value ? auFields.value : null,
  })
  return current !== baselineJson.value
})

const formEntityTag = computed(() => {
  if (!liveShipment.value) return 'JOB'
  const kind =
    liveShipment.value.kind === 'house'
      ? 'HOUSE JOB'
      : liveShipment.value.kind === 'master'
        ? 'MASTER JOB'
        : 'DIRECT JOB'
  return `${kind} · ${liveShipment.value.jobNo}`
})

function captureBaseline() {
  if (!draft.value) {
    baselineJson.value = ''
    return
  }
  baselineJson.value = JSON.stringify({
    draft: draft.value,
    au: isAuImport.value ? auFields.value : null,
  })
}

const linkedConsolidation = computed(() => {
  if (!liveShipment.value?.consolidationId) return null
  return freight.consolidations.find((c) => c.id === liveShipment.value!.consolidationId) ?? null
})

/** House under a console: flight facts sync-locked from master MAWB. */
const inheritsFromMaster = computed(
  () => !!linkedConsolidation.value && liveShipment.value?.kind === 'house',
)
const inheritMawbHint = computed(() => {
  const mawb = linkedConsolidation.value?.mawb || liveShipment.value?.mawb || '—'
  return `Inherited from MAWB ${mawb}`
})

const flightNo = computed({
  get: () => draft.value?.extras?.flight ?? '',
  set: (v: string) => {
    if (!draft.value) return
    draft.value = {
      ...draft.value,
      extras: { ...(draft.value.extras ?? {}), flight: v },
    }
  },
})

const gateState = computed(() => {
  const ship = liveShipment.value
  if (!ship) return null
  return handoff.ensure(ship.id, ship.jobNo)
})

const guidedFocus = computed(() => {
  const ship = liveShipment.value
  if (!ship || !isAuImport.value) return null
  return handoff.guidedStep(ship.id, auth.seat)
})

const formVisibleSteps = computed((): AuImportStepId[] | null => {
  // Operate desk (shell parity): all AU steps visible including Charges & Invoice
  if (!isAuImport.value) return null
  return [...OPS_GATE_STEPS, ...FINANCE_GATE_STEPS]
})

/** Shell Lifecycle Handoff: spine is free to jump — not seat-locked. */
const formGuided = computed(() => false)

const formReadOnly = computed(() => {
  const ship = liveShipment.value
  if (!ship || !isAuImport.value) return false
  if (auth.seat === 'admin') return false
  const step = guidedFocus.value
  if (!step) return false
  return !handoff.canEditStep(ship.id, auth.seat, step)
})

const currentGateComplete = computed(() => {
  const ship = liveShipment.value
  const step = guidedFocus.value
  if (!ship || !step) return false
  return Boolean(stepCompletion(auFields.value, ship)[step])
})

const spineLobPrefix = computed((): SpineLobPrefix => {
  const prefix = liveShipment.value ? LOB_CATALOG[liveShipment.value.lob].prefix : 'AI'
  if (prefix === 'AI' || prefix === 'AE' || prefix === 'OI' || prefix === 'OE' || prefix === 'TR') {
    return prefix
  }
  // Sea/road prefixes in catalog are SE/SI/RE/RI 鈥?map to spine demo codes
  if (prefix.startsWith('S') && prefix.endsWith('I')) return 'OI'
  if (prefix.startsWith('S')) return 'OE'
  return 'TR'
})

const STEP_TO_HANDOFF: Record<AuImportStepId, HandoffNodeId> = {
  commercial: 'booking',
  route: 'flight',
  awb_cargo: 'arrival',
  parties_delivery: 'delivery',
  customs_handoff: 'customs',
  money_preview: 'billing',
}

const HANDOFF_TO_STEP: Partial<Record<HandoffNodeId, AuImportStepId>> = {
  booking: 'commercial',
  flight: 'route',
  customs: 'customs_handoff',
  arrival: 'awb_cargo',
  delivery: 'parties_delivery',
  billing: 'money_preview',
}

function syncSpineToFormProgress(opts?: { scroll?: boolean }) {
  if (!liveShipment.value || !isAuImport.value) return
  const guided = handoff.guidedStep(liveShipment.value.id, auth.seat)
  const completion = stepCompletion(auFields.value, liveShipment.value)
  const next = guided ?? nextIncompleteStep(completion)
  activeNode.value = STEP_TO_HANDOFF[next]
  if (next === 'customs_handoff') inspector.value = 'customs'
  if (next === 'money_preview') inspector.value = 'money'
  nextTick(() => {
    auFormRef.value?.goStep(next, undefined, { scroll: opts?.scroll ?? false })
  })
}

const rows = computed(() => {
  const lob = workspaceLob.value
  return freight.shipments.filter((s) => {
    if (lob && s.lob !== lob) return false
    return true
  })
})

const customsSummary = computed(() => {
  const au = auFields.value
  const ship = liveShipment.value
  if (!ship) return null
  return {
    status: ship.status === 'Pending' || ship.status === 'Shut Out' || ship.status === 'Reject' ? 'HELD' : 'CLEARANCE READY',
    held: isBlockedJobStatus(ship.status) || ship.extras?.clearanceGate === 'held',
    broker: au.brokerRef || '—',
    daff: au.biosecurityRisk || '—',
    origin: au.countryOfOrigin || '—',
    hs: au.commodityHs || '—',
  }
})

const handoffNodes = computed((): HandoffNode[] => {
  const ship = liveShipment.value
  const hold = detectAuCustomsHold(ship, auFields.value)
  const held = hold.held
  const credit = evaluateCreditGate(auFields.value, ship)
  const podLocked = isFinalInvoiceLockedForPod(ship, auFields.value)
  const completion =
    ship && isAuImport.value ? stepCompletion(auFields.value, ship) : null
  const gate = gateState.value
  const guided = guidedFocus.value
  const next = guided ?? (completion ? nextIncompleteStep(completion) : 'customs_handoff')

  function stateFor(step: AuImportStepId, fallback: HandoffNode['state']): HandoffNode['state'] {
    if (gate?.completedSteps.includes(step)) return 'done'
    if (!completion) return fallback
    if (completion[step] && gate?.phase !== 'ops') return 'done'
    if (step === next) return held && step === 'customs_handoff' ? 'held' : 'active'
    if (gate?.phase === 'finance' && OPS_GATE_STEPS.includes(step)) return 'done'
    return 'pending'
  }

  const deliveryState: HandoffNode['state'] = held
    ? 'pending'
    : credit.blocked
      ? 'held'
      : stateFor('parties_delivery', 'pending')

  return [
    {
      id: 'booking',
      label: 'Booking',
      short: '1. Booking',
      state: stateFor('commercial', 'done'),
      owner: operatorLabel('bookingOps'),
      raci: 'R',
      sla: completion?.commercial ? 'SLA met' : 'Complete commercial facts',
      section: 'commercial',
      focusKey: AU_SPINE_FOCUS_FIELD.booking,
      accountable: AU_SPINE_ACCOUNTABLE.booking,
    },
    {
      id: 'flight',
      label: 'Flight Departure',
      short: '2. Flight Departure',
      state: stateFor('route', ship?.etd ? 'done' : 'pending'),
      owner: operatorLabel('flightDesk'),
      raci: 'R',
      sla: ship?.etd ? `ETD ${ship.etd}` : 'Not set',
      section: 'route',
      focusKey: AU_SPINE_FOCUS_FIELD.flight,
      accountable: AU_SPINE_ACCOUNTABLE.flight,
    },
    {
      id: 'customs',
      label: 'Customs Entry',
      short: '3. Customs Entry',
      state:
        gate?.phase === 'finance' || gate?.phase === 'done'
          ? 'done'
          : held
            ? 'held'
            : stateFor('customs_handoff', 'active'),
      owner: operatorLabel('customsOps'),
      raci: 'R',
      sla:
        gate?.phase === 'finance'
          ? 'Handed to Finance'
          : held
            ? hold.detail
            : completion?.customs_handoff
              ? 'N10 / clearance ready'
              : 'Broker · ABF N10 · DAFF',
      section: 'customs_handoff',
      stateBadge: held ? hold.badge : undefined,
      focusKey: AU_SPINE_FOCUS_FIELD.customs,
      accountable: AU_SPINE_ACCOUNTABLE.customs,
    },
    {
      id: 'arrival',
      label: 'Cargo Arrival',
      short: '4. Cargo Arrival',
      state: held ? 'pending' : stateFor('awb_cargo', 'pending'),
      owner: operatorLabel('arrivalDesk'),
      raci: 'R',
      sla: ship?.eta ? `ETA ${ship.eta}` : 'Awaiting',
      section: 'awb_cargo',
      focusKey: AU_SPINE_FOCUS_FIELD.arrival,
      accountable: AU_SPINE_ACCOUNTABLE.arrival,
    },
    {
      id: 'billing',
      label: 'Charges & Invoice',
      short: '5. Charges & Invoice',
      state: stateFor('money_preview', 'pending'),
      owner: operatorLabel('invoiceDesk'),
      raci: 'A',
      sla: podLocked
        ? 'Draft AR · POD unlocks final invoice · ATO GST'
        : completion?.money_preview
          ? 'Money ready · issue tax invoice'
          : 'Unified Ledger · Accrue AP/AR · ATO GST',
      section: 'money_preview',
      focusKey: AU_SPINE_FOCUS_FIELD.billing,
      accountable: AU_SPINE_ACCOUNTABLE.billing,
    },
    {
      id: 'delivery',
      label: 'Final Delivery',
      short: '6. Final Delivery',
      state: deliveryState,
      owner: operatorLabel('deliveryDesk'),
      raci: 'R',
      sla: held
        ? 'D/O blocked — customs hold'
        : credit.blocked
          ? credit.message
          : podLocked
            ? 'D/O · await POD for final invoice'
            : 'POD received · invoice unlocked',
      section: 'parties_delivery',
      stateBadge: credit.blocked && !held ? 'HELD: COD' : undefined,
      focusKey: AU_SPINE_FOCUS_FIELD.delivery,
      accountable: AU_SPINE_ACCOUNTABLE.delivery,
    },
  ]
})

/** Field-stage chips mirror Lifecycle Handoff node states. */
const formStepStates = computed((): Partial<Record<AuImportStepId, HandoffNodeState>> => {
  const map: Partial<Record<AuImportStepId, HandoffNodeState>> = {}
  for (const node of handoffNodes.value) {
    if (node.section) map[node.section as AuImportStepId] = node.state
  }
  return map
})

function loadId(id: string | null) {
  if (!id) {
    draft.value = null
    freight.selectShipment(null)
    return
  }
  const row = freight.shipments.find((s) => s.id === id)
  if (!row) {
    draft.value = null
    return
  }
  draft.value = {
    ...row,
    auImport: row.auImport ? { ...row.auImport } : undefined,
    cargoLines: row.cargoLines ? row.cargoLines.map((l) => ({ ...l })) : [],
  }
  auFields.value = row.auImport ? { ...row.auImport } : auImportFromShipment(row)
  freight.selectShipment(id)
  savedNote.value = ''
  formTab.value = 'fields'
  if (row.lob === 'air_import') {
    handoff.ensure(row.id, row.jobNo)
    const sid = Number(row.id)
    if (Number.isFinite(sid) && sid > 0) void charges.load(sid)
    const stepQ = String(route.query.step ?? '')
    const spineQ = String(route.query.spine ?? '')
    const hasMoneyDeepLink =
      AU_STEPS.includes(stepQ as AuImportStepId) || spineQ === 'billing'
    // Deep-link (e.g. Overview → Charges spine) wins over progress sync
    if (!hasMoneyDeepLink) {
      nextTick(() => nextTick(() => syncSpineToFormProgress()))
    }
  }
  applyResolveDeepLink(row)
}

const AU_STEPS: AuImportStepId[] = [
  'commercial',
  'route',
  'customs_handoff',
  'awb_cargo',
  'money_preview',
  'parties_delivery',
]

/** Exception Resolve / Overview deep-links: ?step=money_preview · ?spine=billing · ?tab=awb */
function applyResolveDeepLink(row: ShipmentRecord) {
  const stepRaw = String(route.query.step ?? '')
  const tabRaw = String(route.query.tab ?? '')
  const spineRaw = String(route.query.spine ?? '')

  if (tabRaw === 'awb' || tabRaw === 'basic' || tabRaw === 'parties' || tabRaw === 'notes' || tabRaw === 'structure') {
    aeTab.value = tabRaw
  }

  let step: AuImportStepId | null = null
  if (AU_STEPS.includes(stepRaw as AuImportStepId)) {
    step = stepRaw as AuImportStepId
  } else if (spineRaw === 'billing') {
    step = 'money_preview'
  }

  if (row.lob === 'air_import' && step) {
    if (step === 'customs_handoff') inspector.value = 'customs'
    if (step === 'money_preview') inspector.value = 'money'
    if (step === 'parties_delivery') inspector.value = 'docs'
    activeNode.value = STEP_TO_HANDOFF[step]
    nextTick(() => {
      nextTick(() => {
        auFormRef.value?.goStep(step!, undefined, { scroll: true })
      })
    })
    return
  }

  if (row.lob === 'air_export') {
    if (stepRaw === 'customs_handoff' || stepRaw === 'awb_cargo') {
      aeTab.value = 'awb'
      inspector.value = 'customs'
    } else if (stepRaw === 'route') {
      aeTab.value = 'basic'
    } else if (stepRaw === 'parties_delivery') {
      aeTab.value = 'parties'
    }
  }
}

function startNewDraft() {
  const lob = workspaceLob.value ?? 'air_import'
  const local = freight.buildLocalDraft(lob)
  draft.value = local
  auFields.value = local.auImport ? { ...local.auImport } : emptyAuImportFields()
  freight.selectShipment(null)
  savedNote.value = ''
  formTab.value = 'fields'
  aeTab.value = 'basic'
}

function openRow(id: string) {
  const lob = workspaceAir.value
  // Module 1: Jobs list → Overview (job desk)
  void router.push({
    name: 'job-context',
    params: { shipmentId: id },
    query: {
      ...(lob ? { lob } : {}),
      ...(route.query.from ? { from: String(route.query.from) } : {}),
    },
  })
}

/** Edit Job — OS shell shipment form parity (`/shipments/:id`). */
function editRow(id: string) {
  const lob = workspaceAir.value
  // Path form is more reliable than named params when already on /shipments
  void router.push({
    path: `/shipments/${encodeURIComponent(id)}`,
    query: {
      ...(lob ? { lob } : {}),
      from: 'jobs',
    },
  })
}

function goCreate() {
  // New commercial work starts in Book (Quote→Job trail); Jobs stays for operating files.
  const lob = workspaceAir.value ?? 'AI'
  void router.push({ name: 'orchestrate', query: { lob } })
}

function backToList() {
  if (formDirty.value && !window.confirm('Unsaved changes — discard and return to list?')) return
  const lob = workspaceAir.value
  void router.push({
    name: 'shipment',
    query: lob ? { lob } : {},
  })
}

function openJob() {
  if (!draft.value?.id) return
  void router.push({ name: 'job-context', params: { shipmentId: draft.value.id } })
}

async function save() {
  if (!draft.value || saving.value || submitting.value) return
  saving.value = true
  const patch: ShipmentRecord = {
    ...draft.value,
    auImport: isAuImport.value ? { ...auFields.value } : draft.value.auImport,
  }
  if (isAuImport.value) {
    patch.notes = [
      auFields.value.cargoDescription,
      auFields.value.pieces ? `${auFields.value.pieces} pcs` : '',
      draft.value.chargeableWt,
    ]
      .filter(Boolean)
      .join(' · ')
  }
  const legacy = await mockLegacyRequest(patch, 360)
  if (!legacy.ok) {
    saving.value = false
    toastRef.value?.show(legacy.message, 'warn')
    return
  }
  const result = freight.saveShipment(patch)
  saving.value = false
  if (!result.ok) {
    toastRef.value?.show(result.message, 'warn')
    return
  }
  draft.value = {
    ...result.shipment,
    auImport: result.shipment.auImport ? { ...result.shipment.auImport } : undefined,
    cargoLines: result.shipment.cargoLines ? result.shipment.cargoLines.map((l) => ({ ...l })) : [],
  }
  if (draft.value.auImport) auFields.value = { ...draft.value.auImport }
  captureBaseline()
  savedNote.value = 'Saved'
  toastRef.value?.show(`Saved draft ${draft.value.jobNo}`)
  const lob = workspaceAir.value ?? (draft.value.lob === 'air_export' ? 'AE' : 'AI')
  if (isNewMode.value || !route.params.shipmentId) {
    void router.replace({
      name: 'shipment',
      params: { shipmentId: draft.value.id },
      query: { lob },
    })
  }
  setTimeout(() => {
    savedNote.value = ''
  }, 2000)
}

async function submit() {
  if (!draft.value || saving.value || submitting.value) return
  submitting.value = true
  const patch: ShipmentRecord = {
    ...draft.value,
    auImport: isAuImport.value ? { ...auFields.value } : draft.value.auImport,
  }
  const legacy = await mockLegacyRequest(patch, 520)
  if (!legacy.ok) {
    submitting.value = false
    toastRef.value?.show(legacy.message, 'warn')
    return
  }
  const saved = freight.saveShipment(patch)
  if (!saved.ok) {
    submitting.value = false
    toastRef.value?.show(saved.message, 'warn')
    return
  }
  draft.value = {
    ...saved.shipment,
    auImport: saved.shipment.auImport ? { ...saved.shipment.auImport } : undefined,
    cargoLines: saved.shipment.cargoLines ? saved.shipment.cargoLines.map((l) => ({ ...l })) : [],
  }
  const lob = workspaceAir.value ?? (draft.value.lob === 'air_export' ? 'AE' : 'AI')
  if (isNewMode.value || !route.params.shipmentId) {
    void router.replace({
      name: 'shipment',
      params: { shipmentId: draft.value.id },
      query: { lob },
    })
  }
  const result = freight.submitShipment(draft.value.id)
  submitting.value = false
  if (!result.ok) {
    toastRef.value?.show(result.message, 'warn')
    return
  }
  draft.value = {
    ...result.shipment,
    auImport: result.shipment.auImport ? { ...result.shipment.auImport } : undefined,
    cargoLines: result.shipment.cargoLines ? result.shipment.cargoLines.map((l) => ({ ...l })) : [],
  }
  captureBaseline()
  toastRef.value?.show(result.message)
  if (draft.value.lob === 'air_import') {
    handoff.ensure(draft.value.id, draft.value.jobNo)
  }
}

const SPINE_FIELD_HINT: Partial<Record<HandoffNodeId, string>> = {
  booking: AU_SPINE_FOCUS_FIELD.booking,
  customs: AU_SPINE_FOCUS_FIELD.customs,
  delivery: AU_SPINE_FOCUS_FIELD.delivery,
  arrival: AU_SPINE_FOCUS_FIELD.arrival,
  flight: AU_SPINE_FOCUS_FIELD.flight,
  billing: AU_SPINE_FOCUS_FIELD.billing,
}

function onSpineSelect(node: HandoffNode) {
  activeNode.value = node.id
  const step = (node.section as AuImportStepId | undefined) ?? HANDOFF_TO_STEP[node.id]
  // Never remap billing via focusKey (sellCurrency used to jump to Booking)
  const focusKey =
    node.id === 'billing' ? undefined : (node.focusKey ?? SPINE_FIELD_HINT[node.id])

  if (isAuImport.value) {
    if (!step) return
    // Charges & Invoice stay on this Job operate page (spine step 5) — no desk redirect
    const run = () => auFormRef.value?.goStep(step, focusKey, { scroll: true })
    if (auFormRef.value) run()
    else nextTick(run)
    if (node.id === 'customs') inspector.value = 'customs'
    if (node.id === 'delivery') inspector.value = 'docs'
    if (node.id === 'billing') inspector.value = 'money'
    return
  }

  nextTick(() => {
    if (node.id === 'booking') {
      splitRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      document
        .getElementById('job-operate-fields')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  })
}

function onGateAdvanced(step: AuImportStepId) {
  activeNode.value = STEP_TO_HANDOFF[step]
  nextTick(() => auFormRef.value?.goStep(step, undefined, { scroll: true }))
}

function onGateHandedOff() {
  toastRef.value?.show('Sent to Finance 鈥?Needs You approval created', 'success')
  syncSpineToFormProgress({ scroll: false })
}

function onFinanceDone() {
  toastRef.value?.show('Finance stamp complete', 'success')
  syncSpineToFormProgress({ scroll: false })
}

function onShipmentPatch(patch: Partial<ShipmentRecord>) {
  if (!draft.value) return
  draft.value = { ...draft.value, ...patch }
  if (draft.value.id) freight.updateShipment(draft.value.id, patch)
}

function onAuFieldsPatch(fields: AuImportFields) {
  auFields.value = fields
}

function refreshFromStore() {
  if (!draft.value?.id) return
  const row = freight.shipments.find((s) => s.id === draft.value!.id)
  if (row) {
    draft.value = {
      ...row,
      auImport: row.auImport ? { ...row.auImport } : undefined,
      cargoLines: row.cargoLines ? row.cargoLines.map((l) => ({ ...l })) : [],
    }
    if (row.auImport) auFields.value = { ...row.auImport }
  }
}

watch(() => freight.lastSplitMessage, () => refreshFromStore())

watch(
  () => auth.seat,
  () => {
    if (isAuImport.value && draft.value?.id) syncSpineToFormProgress({ scroll: false })
  },
)

function syncRouteToMode() {
  if (isNewMode.value) {
    startNewDraft()
    return
  }
  const id = route.params.shipmentId ? String(route.params.shipmentId) : null
  if (id) {
    loadId(id)
    return
  }
  draft.value = null
  freight.selectShipment(null)
}

onMounted(() => {
  syncRouteToMode()
  window.addEventListener('keydown', onFormKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onFormKey)
})

function onFormKey(e: KeyboardEvent) {
  if (!isFormMode.value) return
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    void save()
  }
}

watch(
  () => [route.params.shipmentId, route.query.mode, route.query.lob] as const,
  () => syncRouteToMode(),
)

watch(
  () => draft.value?.id,
  () => {
    nextTick(() => captureBaseline())
  },
)
</script>

<template>
  <AppShell>
    <div class="flex min-h-0 flex-1 flex-col bg-background">
      <!-- LIST MODE -->
      <JobListGrid
        v-if="isListMode"
        :rows="rows"
        :lob-key="workspaceAir ?? 'ALL'"
        :title="workspaceTitle"
        @open="openRow"
        @edit="editRow"
        @create="goCreate"
        @toast="(msg, kind) => toastRef?.show(msg, kind)"
      />

      <!-- FORM MODE -->
      <template v-else-if="isFormMode && draft && liveShipment">
        <JobHandoffSpine
          v-if="isAuImport && draft.id"
          class="shrink-0"
          :nodes="handoffNodes"
          :active-id="activeNode"
          @select="onSpineSelect"
        />
        <div class="flex items-stretch border-b border-border bg-white">
          <button
            type="button"
            class="flex h-[52px] shrink-0 items-center gap-1 border-r border-border px-3 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
            @click="backToList"
          >
            <ArrowLeft :size="13" />
            List
          </button>
          <ExecutionStickyHeader
            class="min-w-0 flex-1 border-b-0"
            :entity-tag="formEntityTag"
            :title="`${LOB_CATALOG[liveShipment.lob].label} · ${operateTypeLabel(liveShipment.operateType)}`"
            :dirty="formDirty || isNewMode"
            :saving="saving"
            :submitting="submitting"
            secondary-label="Open job desk"
            @cancel="backToList"
            @save-draft="save"
            @save-submit="submit"
            @secondary="openJob"
          />
        </div>
        <div
          v-if="liveShipment.bookingRef || inheritsFromMaster || savedNote"
          class="flex flex-wrap items-center gap-2 border-b border-border bg-slate-50 px-4 py-1.5 text-[11px] text-slate-500"
        >
          <span
            v-if="liveShipment.bookingRef"
            class="font-mono font-semibold text-teal-800"
            title="Commercial Booking Ref — distinct from Job No"
          >
            {{ liveShipment.bookingRef }}
          </span>
          <span
            class="os-badge"
            :class="
              isBlockedJobStatus(liveShipment.status)
                ? 'os-badge--amber'
                : liveShipment.status === 'Verified'
                  ? 'os-badge--green'
                  : liveShipment.status === 'Shut Out' || liveShipment.status === 'Reject'
                    ? 'os-badge--red'
                    : 'os-badge--slate'
            "
          >
            {{ liveShipment.status }}
          </span>
          <span v-if="inheritsFromMaster">{{ inheritMawbHint }}</span>
          <span v-if="savedNote" class="font-medium text-teal-700">{{ savedNote }}</span>
          <span class="text-slate-400">Cmd/Ctrl+S · Save Draft</span>
        </div>

        <div class="flex gap-1 border-b border-border bg-white px-4 py-1.5">
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-[11px] font-semibold"
            :class="formTab === 'fields' ? 'bg-slate-100 text-teal-900 ring-1 ring-slate-200' : 'text-slate-500 hover:bg-slate-50'"
            @click="formTab = 'fields'"
          >
            Fields
          </button>
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-[11px] font-semibold"
            :class="formTab === 'structure' ? 'bg-slate-100 text-teal-900 ring-1 ring-slate-200' : 'text-slate-500 hover:bg-slate-50'"
            @click="formTab = 'structure'"
          >
            Structure
          </button>
        </div>

        <div class="flex min-h-0 flex-1 overflow-hidden">
          <main class="min-h-0 min-w-0 flex-1 overflow-y-auto p-3">
            <div v-if="formTab === 'structure'" ref="splitRef">
              <SplitBookingPanel v-if="draft.id" :shipment="liveShipment" />
              <p v-else class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
                Save the job first, then you can split Direct → Console / back-to-back.
              </p>
            </div>

            <template v-else>
              <JobGateBar
                v-if="isAuImport && draft.id"
                :shipment-id="liveShipment.id"
                :job-no="liveShipment.jobNo"
                :customer="liveShipment.customer"
                :route="liveShipment.route"
                :lob-prefix="spineLobPrefix"
                :seat="auth.seat"
                :current-complete="currentGateComplete"
                @advanced="onGateAdvanced"
                @handed-off="onGateHandedOff"
                @finance-done="onFinanceDone"
              />

              <AuImportSmartForm
                v-if="isAuImport"
                ref="auFormRef"
                tab-mode
                :shipment="liveShipment"
                :au-fields="auFields"
                :consolidation="linkedConsolidation"
                :guided="formGuided"
                :focus-step="draft.id ? guidedFocus : null"
                :visible-steps="draft.id ? formVisibleSteps : null"
                :read-only="draft.id ? formReadOnly : false"
                :step-states="formStepStates"
                @update:shipment="onShipmentPatch"
                @update:au-fields="onAuFieldsPatch"
              />

              <div v-else class="space-y-2">
                <nav class="flex flex-wrap gap-1">
                  <button
                    v-for="t in [
                      { id: 'basic', label: 'Basic' },
                      { id: 'awb', label: 'AWB & cargo' },
                      { id: 'parties', label: 'Parties' },
                      { id: 'notes', label: 'Notes' },
                    ]"
                    :key="t.id"
                    type="button"
                    class="rounded-md border px-2.5 py-1 text-[10px] font-semibold"
                    :class="
                      aeTab === t.id
                        ? 'border-teal-300 bg-primary-tint text-teal-800'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    "
                    @click="aeTab = t.id as typeof aeTab"
                  >
                    {{ t.label }}
                  </button>
                </nav>

                <div v-if="aeTab === 'basic'" class="os-panel grid grid-cols-2 gap-2 p-3 lg:grid-cols-3">
                  <CompactSelect
                    :model-value="draft.kind"
                    label="Type"
                    :options="kindOptions"
                    @update:model-value="draft.kind = $event as ShipmentKind"
                  />
                  <CompactSelect
                    :model-value="draft.status"
                    label="Status"
                    :options="statusOptions"
                    @update:model-value="draft.status = $event as ShipmentStatus"
                  />
                  <CompactField v-model="draft.customer" label="Customer" required />
                  <CompactField
                    v-model="draft.route"
                    label="Route"
                    mono
                    required
                    :inherit-hint="inheritsFromMaster ? inheritMawbHint : ''"
                  />
                  <CompactField
                    v-model="draft.airline"
                    label="Airline"
                    :inherit-hint="inheritsFromMaster ? inheritMawbHint : ''"
                  />
                  <CompactField
                    v-model="flightNo"
                    label="Flight No"
                    mono
                    :inherit-hint="inheritsFromMaster ? inheritMawbHint : ''"
                  />
                  <CompactField
                    v-model="draft.etd"
                    label="ETD"
                    mono
                    :inherit-hint="inheritsFromMaster ? inheritMawbHint : ''"
                  />
                  <CompactField
                    v-model="draft.eta"
                    label="ETA"
                    mono
                    :inherit-hint="inheritsFromMaster ? inheritMawbHint : ''"
                  />
                </div>

                <div v-else-if="aeTab === 'awb'" class="space-y-2">
                  <div class="os-panel grid grid-cols-2 gap-2 p-3 lg:grid-cols-3">
                    <CompactField v-model="draft.hawb" label="HBL / HAWB" mono />
                    <CompactField
                      v-model="draft.mawb"
                      label="MBL / MAWB"
                      mono
                      :inherit-hint="inheritsFromMaster ? inheritMawbHint : ''"
                    />
                    <CompactField v-model="draft.chargeableWt" label="Chargeable wt" mono />
                  </div>
                  <div class="os-panel overflow-hidden">
                    <div class="flex items-center justify-between border-b border-border px-3 py-2">
                      <div class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Cargo lines</div>
                      <button
                        type="button"
                        class="rounded-md border border-border px-2 py-1 text-[11px] font-semibold hover:bg-muted"
                        @click="
                          draft.cargoLines = [
                            ...(draft.cargoLines || []),
                            { id: `line-${Date.now()}`, pieces: '', description: '', weightKg: '' },
                          ]
                        "
                      >
                        Add row
                      </button>
                    </div>
                    <table class="w-full text-[12px]">
                      <thead class="bg-slate-50 text-[10px] uppercase text-slate-500">
                        <tr>
                          <th class="px-3 py-2 text-left">Pcs</th>
                          <th class="px-3 py-2 text-left">Description</th>
                          <th class="px-3 py-2 text-left">Wt</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="line in draft.cargoLines || []"
                          :key="line.id"
                          class="border-t border-border"
                        >
                          <td class="px-2 py-1">
                            <input
                              v-model.number="line.pieces"
                              class="h-8 w-16 rounded border border-border px-2 font-mono"
                            />
                          </td>
                          <td class="px-2 py-1">
                            <input v-model="line.description" class="h-8 w-full rounded border border-border px-2" />
                          </td>
                          <td class="px-2 py-1">
                            <input
                              v-model.number="line.weightKg"
                              class="h-8 w-20 rounded border border-border px-2 font-mono"
                            />
                          </td>
                        </tr>
                        <tr v-if="!(draft.cargoLines && draft.cargoLines.length)">
                          <td colspan="3" class="px-3 py-4 text-center text-[11px] text-muted-foreground">
                            No cargo lines
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div v-else-if="aeTab === 'parties'" class="os-panel grid grid-cols-2 gap-2 p-3">
                  <CompactField v-model="draft.customer" label="Customer / shipper" required />
                  <CompactField v-model="draft.airline" label="Airline / agent" />
                </div>

                <div v-else class="os-panel p-3">
                  <CompactTextarea v-model="draft.notes" label="Notes" :rows="4" />
                </div>
              </div>
            </template>
          </main>

          <aside
            v-if="isAuImport"
            class="hidden w-[280px] shrink-0 flex-col border-l border-border bg-card lg:flex"
          >
            <div class="flex gap-1 border-b border-border p-2">
              <button
                v-for="t in [
                  { id: 'customs', label: 'Customs' },
                  { id: 'money', label: 'Financials' },
                  { id: 'docs', label: 'Documents' },
                ]"
                :key="t.id"
                type="button"
                class="flex-1 rounded-md px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider"
                :class="
                  inspector === t.id ? 'bg-primary-tint text-teal-800' : 'text-muted-foreground hover:bg-muted'
                "
                @click="inspector = t.id as typeof inspector"
              >
                {{ t.label }}
              </button>
            </div>
            <div class="min-h-0 flex-1 overflow-y-auto p-3 text-[12px]">
              <template v-if="inspector === 'customs' && customsSummary">
                <div class="os-micro-label">Status</div>
                <span
                  class="os-badge mb-3"
                  :class="customsSummary.held ? 'os-badge--amber' : 'os-badge--green'"
                >
                  {{ customsSummary.status }}
                </span>
                <dl class="space-y-2 text-[11px]">
                  <div>
                    <dt class="os-micro-label">Broker ref</dt>
                    <dd class="font-mono">{{ customsSummary.broker }}</dd>
                  </div>
                  <div>
                    <dt class="os-micro-label">DAFF</dt>
                    <dd>{{ customsSummary.daff }}</dd>
                  </div>
                </dl>
              </template>
              <template v-else-if="inspector === 'money'">
                <div class="os-micro-label">Provisional GP</div>
                <div class="mb-2 font-mono text-[13px] font-semibold text-teal-900">
                  {{
                    charges.payload &&
                    liveShipment &&
                    charges.payload.shipmentId === Number(liveShipment.id)
                      ? `${charges.payload.gp.provisionalGp.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${charges.payload.homeCurrency}`
                      : '—'
                  }}
                </div>
                <dl class="mb-3 space-y-2 font-mono text-[11px]">
                  <div class="flex justify-between">
                    <dt class="text-muted-foreground">Buy</dt>
                    <dd>
                      {{
                        charges.payload &&
                        liveShipment &&
                        charges.payload.shipmentId === Number(liveShipment.id)
                          ? charges.payload.gp.accruedCostTotal.toLocaleString()
                          : '—'
                      }}
                    </dd>
                  </div>
                  <div class="flex justify-between">
                    <dt class="text-muted-foreground">Sell</dt>
                    <dd>
                      {{
                        charges.payload &&
                        liveShipment &&
                        charges.payload.shipmentId === Number(liveShipment.id)
                          ? charges.payload.gp.sellTotal.toLocaleString()
                          : '—'
                      }}
                    </dd>
                  </div>
                  <div class="flex justify-between">
                    <dt class="text-muted-foreground">Money state</dt>
                    <dd>
                      {{
                        charges.payload &&
                        liveShipment &&
                        charges.payload.shipmentId === Number(liveShipment.id)
                          ? (charges.payload.moneyState ?? '—')
                          : '—'
                      }}
                    </dd>
                  </div>
                  <div class="flex justify-between">
                    <dt class="text-muted-foreground">Duty est.</dt>
                    <dd>{{ auFields.dutyAmountEst || '—' }}</dd>
                  </div>
                  <div class="flex justify-between">
                    <dt class="text-muted-foreground">GST est.</dt>
                    <dd>{{ auFields.gstAmountEst || '—' }}</dd>
                  </div>
                </dl>
                <p class="text-[10px] text-muted-foreground">
                  Edit the full ledger on spine step 5 · Charges &amp; Invoice (this page).
                </p>
              </template>
              <template v-else>
                <ul class="space-y-1.5 text-[11px] text-muted-foreground">
                  <li class="flex justify-between border-b border-border py-1.5">
                    <span>HAWB</span>
                    <span class="font-mono text-foreground">{{ liveShipment.hawb || '—' }}</span>
                  </li>
                  <li class="flex justify-between py-1.5">
                    <span>MAWB</span>
                    <span class="font-mono text-foreground">{{ liveShipment.mawb || '—' }}</span>
                  </li>
                </ul>
              </template>
            </div>
          </aside>
        </div>
      </template>

      <div
        v-else
        class="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-[13px] text-muted-foreground"
      >
        <p>No job loaded.</p>
        <button
          type="button"
          class="rounded-md border border-border px-3 py-1.5 text-[12px] font-semibold text-foreground hover:bg-muted"
          @click="backToList"
        >
          Back to list
        </button>
      </div>
    </div>
    <OsToast ref="toastRef" />
  </AppShell>
</template>


<style scoped>
/*
  Panel motion: ~360ms ease-out 鈥?comfortable for side drawers
  (fast enough to feel responsive, slow enough not to snap).
*/
.ship-panel {
  --ship-panel-ms: 360ms;
  --ship-panel-ease: cubic-bezier(0.22, 1, 0.36, 1);
  position: relative;
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  overflow: hidden;
  transition: width var(--ship-panel-ms) var(--ship-panel-ease);
}

.ship-panel--list {
  width: 3rem;
  border-right: 1px solid #1a1a1a;
  background: #262626;
}

.ship-panel--list.ship-panel--open {
  width: 240px;
  border-right-color: var(--color-border, #e2e8f0);
  background: var(--color-card, #fff);
}

.ship-panel--side {
  width: 3rem;
  border-left: 1px solid #1a1a1a;
  background: #262626;
}

.ship-panel--side.ship-panel--open {
  width: 280px;
  border-left-color: var(--color-border, #e2e8f0);
  background: var(--color-card, #fff);
}

.ship-panel__rail {
  position: absolute;
  inset: 0 auto 0 0;
  z-index: 2;
  display: flex;
  width: 3rem;
  flex-direction: column;
  align-items: center;
  padding: 0.85rem 0;
  opacity: 1;
  pointer-events: auto;
  transition: opacity 160ms ease;
}

.ship-panel--side .ship-panel__rail {
  inset: 0 0 0 auto;
}

.ship-panel--open .ship-panel__rail {
  opacity: 0;
  pointer-events: none;
}

.ship-panel__body {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  opacity: 0;
  pointer-events: none;
  transition: opacity 200ms ease 80ms;
}

.ship-panel__body--list {
  width: 240px;
}

.ship-panel__body--side {
  width: 280px;
}

.ship-panel--open .ship-panel__body {
  opacity: 1;
  pointer-events: auto;
}

.ship-glow-rail {
  background: #262626;
}

/* Glowing icon 鈥?::before scale + layered neon */
/* Close control when a side window is open 鈥?clear, teal-edged */
.ship-close-btn {
  display: flex;
  height: 1.75rem;
  width: 1.75rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, #14b8a6 45%, #e2e8f0);
  border-radius: 0.375rem;
  background: color-mix(in srgb, #14b8a6 8%, white);
  color: #0f766e;
  cursor: pointer;
  transition: 0.2s ease;
  box-shadow: 0 0 0 0 color-mix(in srgb, #14b8a6 0%, transparent);
}

.ship-close-btn:hover,
.ship-close-btn:focus-visible {
  color: #0d9488;
  border-color: #14b8a6;
  background: color-mix(in srgb, #14b8a6 16%, white);
  box-shadow: 0 0 10px color-mix(in srgb, #14b8a6 40%, transparent);
  outline: none;
}

.ship-glow-btn {
  --glow: #14b8a6;
  position: relative;
  z-index: 1;
  display: flex;
  height: 2.5rem;
  width: 2.5rem;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: #333;
  color: #666;
  cursor: pointer;
  transition: 0.5s;
}

.ship-glow-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: 50%;
  background: var(--glow);
  transform: scale(0.9);
  transition: 0.5s;
  opacity: 0.35;
}

.ship-glow-btn:hover,
.ship-glow-btn:focus-visible {
  color: var(--glow);
  background: #333;
  outline: none;
  box-shadow: 0 0 5px var(--glow);
}

.ship-glow-btn:hover :deep(svg),
.ship-glow-btn:focus-visible :deep(svg) {
  filter: drop-shadow(0 0 5px var(--glow));
}

.ship-glow-btn:hover::before,
.ship-glow-btn:focus-visible::before {
  transform: scale(1.15);
  opacity: 1;
  box-shadow: 0 0 15px var(--glow);
}

.ship-glow-btn:focus-visible {
  outline: 2px solid var(--glow);
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  .ship-panel,
  .ship-panel__rail,
  .ship-panel__body,
  .ship-glow-btn,
  .ship-glow-btn::before,
  .ship-close-btn {
    transition: none;
  }

  .ship-glow-btn:hover::before,
  .ship-glow-btn:focus-visible::before {
    transform: scale(1);
    box-shadow: 0 0 0 2px var(--glow);
  }

  .ship-glow-btn:hover,
  .ship-glow-btn:focus-visible {
    box-shadow: none;
  }

  .ship-glow-btn:hover :deep(svg),
  .ship-glow-btn:focus-visible :deep(svg) {
    filter: none;
  }
}
</style>
