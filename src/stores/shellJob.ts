import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { LOB_CATALOG, formatJobNo, type LobCode } from '@/lib/lob'
import { envFetch } from '@/lib/apiAdapter'

export interface JobGate {
  id: string
  label: string
  open: boolean
}

export interface JobRecord {
  id: string
  lob: LobCode
  jobNo: string
  hawb: string
  customer: string
  route: string
  airline: string
  etd: string
  eta: string
  chargeableWt: string
  sellTotal: number
  costTotal: number
  currency: string
  status: string
  currentNode: string
  assignedDesk: string
  activeGateHold: string | null
  nextHandoff: string
  nextAction: string
  actionDetail: string
  gates: JobGate[]
  docsDone: string[]
  docsMissing: string[]
  milestones: { id: string; label: string; state: 'done' | 'active' | 'pending'; gate?: string }[]
  cargo: string
  parties: string
  edi: string
  notes: string
}

/** Fields operators can edit. Job number and LOB stay locked to numbering policy. */
export type JobEditDraft = Pick<
  JobRecord,
  | 'hawb'
  | 'customer'
  | 'route'
  | 'airline'
  | 'etd'
  | 'eta'
  | 'chargeableWt'
  | 'status'
  | 'sellTotal'
  | 'costTotal'
  | 'currency'
  | 'cargo'
  | 'parties'
  | 'edi'
  | 'notes'
>

export const JOB_STATUSES = [
  'Pending',
  'Operating',
  'Pre Commit',
  'Committing',
  'Committed',
  'Verified',
  'Shut Out',
  'Reject',
] as const
export const JOB_CURRENCIES = ['AUD', 'USD', 'EUR', 'GBP', 'SGD'] as const

export function draftFromJob(job: JobRecord): JobEditDraft {
  return {
    hawb: job.hawb,
    customer: job.customer,
    route: job.route,
    airline: job.airline,
    etd: job.etd,
    eta: job.eta,
    chargeableWt: job.chargeableWt,
    status: job.status,
    sellTotal: job.sellTotal,
    costTotal: job.costTotal,
    currency: job.currency,
    cargo: job.cargo,
    parties: job.parties,
    edi: job.edi,
    notes: job.notes,
  }
}

const JOBS: Record<string, JobRecord> = {
  '8801': {
    id: '8801',
    lob: 'air_export',
    jobNo: formatJobNo('air_export', '8801'),
    hawb: 'SYD-2608-00043',
    customer: 'Acme Logistics',
    route: 'SYD ✈ LAX',
    airline: 'Qantas Freight',
    etd: '12 Aug 14:20',
    eta: '12 Aug 11:05',
    chargeableWt: '1,240 kg',
    sellTotal: 18420,
    costTotal: 15110,
    currency: 'AUD',
    status: 'Operating',
    currentNode: 'Docs Clearance',
    assignedDesk: 'Ops / Sarah M.',
    activeGateHold: 'AES Export Filing Pending',
    nextHandoff: 'Carrier Departure · Handoff: Airline / Agent (US Branch)',
    nextAction: 'Complete AES export filing checklist',
    actionDetail: 'Required before charges accrual and invoice unlock.',
    gates: [
      { id: 'g-aes', label: 'AES Export Filing', open: true },
      { id: 'g-docs', label: 'Commercial Invoice attached', open: false },
    ],
    docsDone: ['HAWB draft', 'Packing list'],
    docsMissing: ['AES / EEI', 'Shipper letter of instruction'],
    milestones: [
      { id: 'm1', label: 'Quote', state: 'done' },
      { id: 'm2', label: 'Booking', state: 'done' },
      { id: 'm3', label: 'Docs / Gates', state: 'active', gate: 'AES hold' },
      { id: 'm4', label: 'Charges', state: 'pending' },
      { id: 'm5', label: 'Invoice', state: 'pending' },
    ],
    cargo: 'Pallets 4 · Gross 1,180 kg · CBM 6.2 · Chargeable 1,240 kg',
    parties: 'Shipper Acme SYD · Consignee LAX Import LLC · Tax IDs on file · Notify same as consignee',
    edi: 'AU ICS: pending · US AES: missing (gate) · Airline EDI: booked',
    notes: 'Ops: AES filing in progress — customer PO attached. Finance notified for margin check on FSC line.',
  },
  '8804': {
    id: '8804',
    lob: 'air_export',
    jobNo: formatJobNo('air_export', '8804'),
    hawb: 'SYD-2608-00088',
    customer: 'Pacific Fresh',
    route: 'MEL ✈ SIN',
    airline: 'Singapore Airlines',
    etd: '14 Aug 09:00',
    eta: '14 Aug 15:40',
    chargeableWt: '680 kg',
    sellTotal: 9200,
    costTotal: 7100,
    currency: 'AUD',
    status: 'Operating',
    currentNode: 'Booking Confirmation',
    assignedDesk: 'Ops Desk — Mike C.',
    activeGateHold: null,
    nextHandoff: 'AWB capture ➔ Docs desk',
    nextAction: 'Capture AWB / milestones',
    actionDetail: 'Confirm airline AWB and departures before docs gate.',
    gates: [],
    docsDone: ['Booking confirmation'],
    docsMissing: ['MAWB allocate'],
    milestones: [
      { id: 'm1', label: 'Quote', state: 'done' },
      { id: 'm2', label: 'Booking', state: 'active' },
      { id: 'm3', label: 'Docs / Gates', state: 'pending' },
      { id: 'm4', label: 'Charges', state: 'pending' },
      { id: 'm5', label: 'Invoice', state: 'pending' },
    ],
    cargo: 'Cartons 18 · Gross 640 kg · CBM 3.1 · Chargeable 680 kg',
    parties: 'Shipper Pacific Fresh MEL · Consignee Cold Chain SIN · Notify same as consignee',
    edi: 'AU ICS: lodged · Airline EDI: pending AWB',
    notes: 'Waiting on MAWB allocation from SQ. Perishable — keep booking window.',
  },
  '8790': {
    id: '8790',
    lob: 'air_import',
    jobNo: formatJobNo('air_import', '8790'),
    hawb: 'SYD-2607-00991',
    customer: 'Sydney Pharma',
    route: 'HKG ✈ SYD',
    airline: 'Cathay Pacific',
    etd: '10 Aug 22:10',
    eta: '11 Aug 05:55',
    chargeableWt: '420 kg',
    sellTotal: 11200,
    costTotal: 9800,
    currency: 'AUD',
    status: 'Pending',
    currentNode: 'Import Clearance',
    assignedDesk: 'Ops Desk — Sarah M.',
    activeGateHold: 'AU import clearance chip — held',
    nextHandoff: 'Clearance cleared ➔ Finance charges',
    nextAction: 'Clear docs hold / import clearance chip',
    actionDetail: 'Money pages locked while import clearance status is held.',
    gates: [{ id: 'g-clr', label: 'Import clearance held', open: true }],
    docsDone: ['HAWB'],
    docsMissing: ['Clearance release'],
    milestones: [
      { id: 'm1', label: 'Quote', state: 'done' },
      { id: 'm2', label: 'Booking', state: 'done' },
      { id: 'm3', label: 'Docs / Gates', state: 'active', gate: 'Clearance held' },
      { id: 'm4', label: 'Charges', state: 'pending' },
      { id: 'm5', label: 'Invoice', state: 'pending' },
    ],
    cargo: 'Pharma pallets 2 · Gross 390 kg · CBM 1.8 · Chargeable 420 kg · Temp 2–8°C',
    parties: 'Shipper HKG Pharma Ltd · Consignee Sydney Pharma · Notify QA on arrival',
    edi: 'AU ICS: held · Airline EDI: arrived',
    notes: 'Import clearance chip held. Do not accrue charges until gate clears.',
  },
  '4096': {
    id: '4096',
    lob: 'air_import',
    jobNo: formatJobNo('air_import', '4096'),
    hawb: '160-44112233',
    customer: 'Sydney Retail Group Pty Ltd',
    route: 'PVG ✈ SYD',
    airline: 'Qantas',
    etd: '28 Jul 18:00',
    eta: '01 Aug 06:30',
    chargeableWt: '800 kg',
    sellTotal: 6400,
    costTotal: 5280,
    currency: 'AUD',
    status: 'Pending',
    currentNode: 'Import Clearance',
    assignedDesk: 'Ops Desk — Sarah M.',
    activeGateHold: 'AU import clearance chip — held',
    nextHandoff: 'Clearance cleared ➔ Finance charges',
    nextAction: 'Complete AU clearance checklist',
    actionDetail: 'Golden demo PVG→SYD. Money locked until clearance Cleared.',
    gates: [{ id: 'g-au-clr', label: 'Import clearance held', open: true }],
    docsDone: ['HAWB', 'Commercial invoice', 'Packing list', 'AWB'],
    docsMissing: ['Clearance release'],
    milestones: [
      { id: 'm1', label: 'Quote', state: 'done' },
      { id: 'm2', label: 'Booking', state: 'done' },
      { id: 'm3', label: 'Docs / Gates', state: 'active', gate: 'Clearance held' },
      { id: 'm4', label: 'Charges', state: 'pending' },
      { id: 'm5', label: 'Invoice', state: 'pending' },
    ],
    cargo: 'Consumer electronics 6 cartons · Gross 720 kg · Chargeable 800 kg',
    parties: 'Shipper Shanghai Components Co. · Consignee Sydney Retail Group · Delivery 12 George St Sydney',
    edi: 'AU ICS: held · Airline EDI: arrived',
    notes: 'Golden job 4096 — clearance held; use Shipments page for smart AU field spine.',
  },
  '8772': {
    id: '8772',
    lob: 'air_export',
    jobNo: formatJobNo('air_export', '8772'),
    hawb: 'SYD-2607-00820',
    customer: 'Blue Ocean Co',
    route: 'BNE ✈ LAX',
    airline: 'United Airlines',
    etd: '08 Aug 11:30',
    eta: '08 Aug 08:15',
    chargeableWt: '2,100 kg',
    sellTotal: 24600,
    costTotal: 19800,
    currency: 'USD',
    status: 'Committed',
    currentNode: 'Charges Accrual',
    assignedDesk: 'Finance Desk — Lisa P.',
    activeGateHold: null,
    nextHandoff: 'Approve charges ➔ Invoice',
    nextAction: 'Approve charges & ready to post',
    actionDetail: 'Finance A required before invoice issue.',
    gates: [],
    docsDone: ['HAWB', 'MAWB', 'AES'],
    docsMissing: [],
    milestones: [
      { id: 'm1', label: 'Quote', state: 'done' },
      { id: 'm2', label: 'Booking', state: 'done' },
      { id: 'm3', label: 'Docs / Gates', state: 'done' },
      { id: 'm4', label: 'Charges', state: 'active' },
      { id: 'm5', label: 'Invoice', state: 'pending' },
    ],
    cargo: 'Pallets 8 · Gross 1,980 kg · CBM 9.4 · Chargeable 2,100 kg',
    parties: 'Shipper Blue Ocean BNE · Consignee LAX Distribution · Notify broker',
    edi: 'AU ICS: cleared · US AES: filed · Airline EDI: departed',
    notes: 'Charges ready for Finance approve. FSC confirmed against contract.',
  },
}

export const useShellJobStore = defineStore('shellJob', () => {
  const currentId = ref<string | null>(null)
  const actionCompleted = ref(false)
  const editing = ref(false)
  const draft = ref<JobEditDraft | null>(null)
  const saveError = ref<string | null>(null)
  const lastSavedAt = ref<string | null>(null)

  const job = computed(() => (currentId.value ? JOBS[currentId.value] ?? null : null))
  const lobLabel = computed(() => (job.value ? LOB_CATALOG[job.value.lob].label : null))
  const moneyBlocked = computed(
    () => !!job.value?.activeGateHold || (job.value?.gates.some((g) => g.open) ?? false),
  )
  const gp = computed(() => {
    const j = job.value
    if (!j) return { sell: 0, cost: 0, gp: 0, margin: 0, currency: 'AUD' }
    const g = j.sellTotal - j.costTotal
    return {
      sell: j.sellTotal,
      cost: j.costTotal,
      gp: g,
      margin: j.sellTotal ? (g / j.sellTotal) * 100 : 0,
      currency: j.currency,
    }
  })
  const dirty = computed(() => {
    if (!editing.value || !draft.value || !job.value) return false
    return JSON.stringify(draft.value) !== JSON.stringify(draftFromJob(job.value))
  })

  function load(id: string) {
    currentId.value = id
    actionCompleted.value = false
    editing.value = false
    draft.value = null
    saveError.value = null
    const record = JOBS[id]
    void envFetch(`/jobs/${id}`, { data: record })
  }

  function beginEdit() {
    if (!job.value) return false
    draft.value = draftFromJob(job.value)
    saveError.value = null
    editing.value = true
    return true
  }

  function cancelEdit() {
    editing.value = false
    draft.value = null
    saveError.value = null
  }

  function validateDraft(next: JobEditDraft): string | null {
    if (!next.customer.trim()) return 'Customer is required'
    if (!next.hawb.trim()) return 'HAWB is required'
    if (!next.route.trim()) return 'Route is required'
    if (!Number.isFinite(next.sellTotal) || next.sellTotal < 0) return 'Sell total must be 0 or more'
    if (!Number.isFinite(next.costTotal) || next.costTotal < 0) return 'Cost total must be 0 or more'
    return null
  }

  function updateJob(patch: Partial<JobEditDraft>) {
    const j = job.value
    if (!j) return null
    Object.assign(j, patch)
    void envFetch(`/jobs/${j.id}`, { method: 'PUT', body: { ...j }, data: j })
    lastSavedAt.value = new Date().toISOString()
    return j
  }

  function saveEdit() {
    if (!job.value || !draft.value) return false
    const err = validateDraft(draft.value)
    if (err) {
      saveError.value = err
      return false
    }
    updateJob({ ...draft.value })
    editing.value = false
    draft.value = null
    saveError.value = null
    return true
  }

  function completeAction() {
    actionCompleted.value = true
  }

  function clearGate(gateId: string) {
    const j = job.value
    if (!j) return
    const g = j.gates.find((x) => x.id === gateId)
    if (g) g.open = false
    if (!j.gates.some((x) => x.open)) j.activeGateHold = null
  }

  return {
    currentId,
    job,
    lobLabel,
    moneyBlocked,
    gp,
    actionCompleted,
    editing,
    draft,
    dirty,
    saveError,
    lastSavedAt,
    load,
    beginEdit,
    cancelEdit,
    saveEdit,
    updateJob,
    completeAction,
    clearGate,
    JOBS,
  }
})
