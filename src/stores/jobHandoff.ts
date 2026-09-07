import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { AuImportStepId } from '@/types/auAirImport'
import type { Seat } from '@/stores/auth'
import {
  FINANCE_GATE_STEPS,
  GATE_META,
  OPS_GATE_STEPS,
  isFinanceStep,
  isOpsStep,
  nextOpsStep,
  type JobWorkPhase,
} from '@/lib/jobGateLadder'
import { useNeedsYouStore } from '@/stores/needsYou'
import { operatorLabel } from '@/data/seatOperators'

export interface JobGateState {
  shipmentId: string
  jobNo: string
  phase: JobWorkPhase
  /** Current guided step for the active phase */
  currentStep: AuImportStepId
  completedSteps: AuImportStepId[]
  handoffNote: string
  handedOffAt: string | null
  handedOffBySeat: Seat | null
  waitingForSeat: Seat | null
}

function emptyState(shipmentId: string, jobNo: string): JobGateState {
  return {
    shipmentId,
    jobNo,
    phase: 'ops',
    currentStep: 'commercial',
    completedSteps: [],
    handoffNote: '',
    handedOffAt: null,
    handedOffBySeat: null,
    waitingForSeat: null,
  }
}

export const useJobHandoffStore = defineStore('jobHandoff', () => {
  const byId = ref<Record<string, JobGateState>>({})

  function ensure(shipmentId: string, jobNo: string): JobGateState {
    if (!byId.value[shipmentId]) {
      byId.value = { ...byId.value, [shipmentId]: emptyState(shipmentId, jobNo) }
    } else if (jobNo && byId.value[shipmentId]!.jobNo !== jobNo) {
      byId.value[shipmentId] = { ...byId.value[shipmentId]!, jobNo }
    }
    return byId.value[shipmentId]!
  }

  function get(shipmentId: string): JobGateState | null {
    return byId.value[shipmentId] ?? null
  }

  function startFromCreate(shipmentId: string, jobNo: string) {
    byId.value = { ...byId.value, [shipmentId]: emptyState(shipmentId, jobNo) }
  }

  const metaFor = (step: AuImportStepId) => GATE_META[step]

  function canEditStep(shipmentId: string, seat: Seat, step: AuImportStepId): boolean {
    const s = byId.value[shipmentId]
    if (!s) return seat === 'admin' || seat === 'operations'
    if (seat === 'admin') return true
    if (s.phase === 'done') return false
    if (s.phase === 'ops') {
      return (seat === 'operations' || seat === 'sales') && step === s.currentStep && isOpsStep(step)
    }
    if (s.phase === 'finance') {
      return seat === 'finance' && isFinanceStep(step)
    }
    return false
  }

  function allowedStepsForSeat(shipmentId: string, seat: Seat): AuImportStepId[] {
    const s = byId.value[shipmentId]
    if (!s) {
      if (seat === 'finance') return []
      return ['commercial']
    }
    if (seat === 'admin') {
      return [...OPS_GATE_STEPS, ...FINANCE_GATE_STEPS]
    }
    if (s.phase === 'ops') {
      if (seat === 'operations' || seat === 'sales') return [s.currentStep]
      return []
    }
    if (s.phase === 'finance') {
      if (seat === 'finance') return [...FINANCE_GATE_STEPS]
      // Ops may view completed ops steps read-only via UI — edit list empty
      return []
    }
    return []
  }

  function guidedStep(shipmentId: string, seat: Seat): AuImportStepId | null {
    const s = byId.value[shipmentId]
    if (!s) return seat === 'finance' ? null : 'commercial'
    if (s.phase === 'ops' && (seat === 'operations' || seat === 'sales' || seat === 'admin')) {
      return s.currentStep
    }
    if (s.phase === 'finance' && (seat === 'finance' || seat === 'admin')) {
      return s.currentStep
    }
    return null
  }

  /** Advance within Ops ladder. Returns false if current gate incomplete or at end. */
  function advanceOps(shipmentId: string, currentComplete: boolean): { ok: boolean; message: string } {
    const s = byId.value[shipmentId]
    if (!s || s.phase !== 'ops') return { ok: false, message: 'Not in Ops phase' }
    if (!currentComplete) return { ok: false, message: 'Complete required fields before Next' }
    const completed = s.completedSteps.includes(s.currentStep)
      ? s.completedSteps
      : [...s.completedSteps, s.currentStep]
    const next = nextOpsStep(s.currentStep)
    if (!next) {
      byId.value[shipmentId] = { ...s, completedSteps: completed }
      return { ok: true, message: 'Ops gates complete — hand off to Finance' }
    }
    byId.value[shipmentId] = {
      ...s,
      completedSteps: completed,
      currentStep: next,
    }
    return { ok: true, message: `Next: ${GATE_META[next].title}` }
  }

  function isOpsLadderComplete(shipmentId: string): boolean {
    const s = byId.value[shipmentId]
    if (!s) return false
    return OPS_GATE_STEPS.every((step) => s.completedSteps.includes(step))
  }

  /**
   * Hand off Ops → Finance. Creates Needs You task for Finance (A).
   * Does not open Finance fields for Ops.
   */
  function handOffToFinance(
    shipmentId: string,
    input: {
      jobNo: string
      customer: string
      route: string
      lobPrefix: 'AI' | 'AE' | 'OI' | 'OE' | 'TR'
      note: string
      bySeat: Seat
      currentComplete: boolean
    },
  ): { ok: boolean; message: string } {
    const s = ensure(shipmentId, input.jobNo)
    if (s.phase !== 'ops') return { ok: false, message: 'Already handed off' }
    if (!input.currentComplete && s.currentStep === 'customs_handoff') {
      return { ok: false, message: 'Complete Customs entry fields before handoff' }
    }
    const completed = new Set(s.completedSteps)
    completed.add(s.currentStep)
    // Mark all ops steps done on handoff if customs was last open
    for (const step of OPS_GATE_STEPS) completed.add(step)

    const note = input.note.trim()
    byId.value[shipmentId] = {
      ...s,
      phase: 'finance',
      currentStep: 'money_preview',
      completedSteps: [...completed],
      handoffNote: note,
      handedOffAt: new Date().toISOString(),
      handedOffBySeat: input.bySeat,
      waitingForSeat: 'finance',
    }

    const needsYou = useNeedsYouStore()
    needsYou.pushHandoffTask({
      shipmentId,
      jobNo: input.jobNo,
      customer: input.customer,
      route: input.route,
      lobPrefix: input.lobPrefix,
      note: note || 'Ops complete — please review duty/GST and stamp.',
      fromSeat: input.bySeat,
      toSeat: 'finance',
    })

    return {
      ok: true,
      message: `Handed to Finance · ${operatorLabel('financeLead')} (A)`,
    }
  }

  function completeFinance(shipmentId: string): { ok: boolean; message: string } {
    const s = byId.value[shipmentId]
    if (!s || s.phase !== 'finance') return { ok: false, message: 'Not awaiting Finance' }
    byId.value[shipmentId] = {
      ...s,
      phase: 'done',
      completedSteps: [...new Set([...s.completedSteps, 'money_preview' as AuImportStepId])],
      waitingForSeat: null,
    }
    return { ok: true, message: 'Finance gate complete' }
  }

  function phaseLabel(shipmentId: string): string {
    const s = byId.value[shipmentId]
    if (!s) return 'Ops · Booking facts'
    if (s.phase === 'done') return 'Complete'
    if (s.phase === 'finance') return 'Waiting · Finance'
    return `Ops · ${GATE_META[s.currentStep].title}`
  }

  const activeCount = computed(() => Object.keys(byId.value).length)

  return {
    byId,
    activeCount,
    ensure,
    get,
    startFromCreate,
    metaFor,
    canEditStep,
    allowedStepsForSeat,
    guidedStep,
    advanceOps,
    isOpsLadderComplete,
    handOffToFinance,
    completeFinance,
    phaseLabel,
    OPS_GATE_STEPS,
    FINANCE_GATE_STEPS,
  }
})
