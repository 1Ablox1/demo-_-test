import { defineStore } from 'pinia'
import { toast as sonnerToast } from 'vue-sonner'
import { computed, ref } from 'vue'
import { approveCharges, accrueCharges, fetchCharges } from '@/api/client'
import type { ChargeLine, ChargesPayload, JobMoneyState } from '@/api/types'
import {
  applyCafToLines,
  lineNeedsVarianceNote,
  recomputeGp,
  toAud,
} from '@/lib/chargesMoney'
import { useAdminConfigStore } from '@/stores/adminConfig'
import { useTasksStore } from '@/stores/tasks'
import { chargesActionFromLifecycle } from '@/lib/allowedActionsBridge'
import { useJobStore } from '@/stores/job'
import { useLifecycleStore } from '@/stores/lifecycle'

function stamp() {
  const d = new Date()
  return d.toISOString().slice(0, 16).replace('T', ' ')
}

const POST_READY: JobMoneyState[] = [
  'charges_approved',
  'part_invoiced',
  'invoiced',
  'actuals_posted',
  'verified',
  'closed',
]

export const useChargesStore = defineStore('charges', () => {
  const loading = ref(false)
  const acting = ref(false)
  const error = ref<string | null>(null)
  const payload = ref<ChargesPayload | null>(null)
  /** Lines that received +CAF on last CAF apply */
  const lastCafLineCodes = ref<string[]>([])

  const tasksStore = useTasksStore()
  const lifecycleStore = useLifecycleStore()
  const adminStore = useAdminConfigStore()
  const role = computed(() => tasksStore.role)
  const showAdvanced = ref(false)
  const viewMode = ref<'ledger' | 'list'>('ledger')

  const unresolvedVarianceCount = computed(() => {
    if (!payload.value) return 0
    return payload.value.lines.filter((l) =>
      lineNeedsVarianceNote(l, payload.value!.varianceThresholdPct),
    ).length
  })

  const jobReadyToPost = computed(() => {
    if (!payload.value) return false
    return POST_READY.includes(payload.value.moneyState)
  })

  /** After Finance Approve, Ops cannot change accrued amounts (SoD lock). */
  const accrualsLocked = computed(() => {
    if (!payload.value) return true
    if (payload.value.blocked) return true
    return POST_READY.includes(payload.value.moneyState)
  })

  function lifecyclePermits(
    chargeAction: 'accrue' | 'approve' | 'open_invoice',
  ): boolean | null {
    const sid = payload.value?.shipmentId
    if (sid == null || lifecycleStore.lifecycle?.shipmentId !== sid) return null
    return chargesActionFromLifecycle(lifecycleStore.allowedActions, chargeAction)
  }

  const canAccrue = computed(() => {
    if (!payload.value || payload.value.blocked) return false
    if (!payload.value.allowedActions.includes('accrue')) return false
    if (!adminStore.raciEnforce) return role.value === 'operations'
    const fromLife = lifecyclePermits('accrue')
    if (fromLife === false) return false
    if (fromLife === true) return true
    return role.value === 'operations'
  })

  const canApprove = computed(() => {
    if (!payload.value || payload.value.blocked) return false
    if (!payload.value.allowedActions.includes('approve')) return false
    if (unresolvedVarianceCount.value > 0) return false
    if (!adminStore.raciEnforce) {
      return role.value === 'finance' || role.value === 'admin'
    }
    const fromLife = lifecyclePermits('approve')
    if (fromLife === false) return false
    if (fromLife === true) return true
    return role.value === 'finance' || role.value === 'admin'
  })

  const canOpenInvoice = computed(() => {
    if (!payload.value) return false
    if (adminStore.raciEnforce) {
      const fromLife = lifecyclePermits('open_invoice')
      if (fromLife === false) return false
    }
    return (
      payload.value.allowedActions.includes('open_invoice') ||
      payload.value.moneyState === 'charges_approved' ||
      payload.value.moneyState === 'part_invoiced' ||
      payload.value.moneyState === 'invoiced'
    )
  })

  /** Ops: edit provisional / accrued amounts until Finance Approve */
  const canEditAccrued = computed(() => {
    if (role.value !== 'operations' && role.value !== 'admin') return false
    if (!payload.value || accrualsLocked.value) return false
    return true
  })

  /** Finance + Admin: actuals (allowed after Approve — that’s the point of Post) */
  const canEditActual = computed(() => {
    if (!(role.value === 'finance' || role.value === 'admin')) return false
    if (!payload.value || payload.value.blocked) return false
    return true
  })

  /** CAF estimate on WIP — Ops + Finance before Approve (formal Accrue still gated separately) */
  const canEditCaf = computed(() => {
    if (!payload.value || accrualsLocked.value) return false
    return (
      role.value === 'operations' ||
      role.value === 'finance' ||
      role.value === 'admin'
    )
  })

  const canEditVarianceNote = computed(() => {
    if (!(role.value === 'finance' || role.value === 'admin')) return false
    if (!payload.value || payload.value.blocked) return false
    return true
  })

  /** Admin demo override only */
  const canEditFx = computed(() => role.value === 'admin' && !!payload.value && !payload.value.blocked)

  const canEditThreshold = computed(
    () => role.value === 'admin' && !!payload.value && !payload.value.blocked,
  )

  /**
   * Early continuous charge entry (stages 1–5): provisional / estimated lines
   * even while clearance holds formal Accrue. Locked after Finance Approve.
   */
  const canAddLine = computed(() => {
    if (role.value !== 'operations' && role.value !== 'admin') return false
    if (!payload.value || accrualsLocked.value) return false
    return true
  })

  const canAddProvisional = computed(() => canAddLine.value)

  /** Job-centric handoff — Financial Module remains SoR for issue / pay / GL */
  const readyForBilling = ref(false)
  const invoiceRequestStatus = ref<'none' | 'requested'>('none')

  const canMarkReadyForBilling = computed(() => {
    if (!payload.value) return false
    if (role.value !== 'operations' && role.value !== 'admin') return false
    return (
      !payload.value.blocked &&
      (payload.value.moneyState === 'provisioned' ||
        payload.value.moneyState === 'charges_approved' ||
        payload.value.lines.some((l) => l.state === 'accrued' || l.state === 'approved'))
    )
  })

  const canRequestFinalInvoice = computed(() => {
    if (!payload.value) return false
    if (
      role.value !== 'operations' &&
      role.value !== 'finance' &&
      role.value !== 'admin'
    ) {
      return false
    }
    return readyForBilling.value || payload.value.moneyState === 'charges_approved'
  })

  const canPostAny = computed(
    () =>
      (role.value === 'finance' || role.value === 'admin') && jobReadyToPost.value,
  )

  /** Short SoD strip for the acting seat */
  const roleCanDo = computed(() => {
    switch (role.value) {
      case 'operations':
        return accrualsLocked.value
          ? 'View · Accruals locked after Finance Approve'
          : 'Accrue · Edit accrued/base · Add stub line'
      case 'finance':
        return 'CAF · Actuals · Variance notes · Approve · Post to GL · Invoice'
      case 'admin':
        return 'Finance powers · Set job FX · Set variance gate'
      case 'sales':
        return 'View only'
      default:
        return 'View'
    }
  })

  function canPostLine(line: ChargeLine): boolean {
    if (!canPostAny.value || !line || line.posted || line.state === 'posted') return false
    if (line.state === 'approved' || line.state === 'invoiced_ar') return true
    if (
      line.side === 'AP' &&
      line.varianceCleared &&
      (line.state === 'variance' || line.state === 'actual_ap')
    ) {
      return true
    }
    return false
  }

  function applyPackHome(data: ChargesPayload) {
    data.homeCurrency = data.pack === 'US' ? 'USD' : 'AUD'
  }

  let loadSeq = 0

  async function load(shipmentId: number) {
    const seq = ++loadSeq
    loading.value = true
    error.value = null
    lastCafLineCodes.value = []
    // Job-scoped UI flags must not leak across shipment switches
    readyForBilling.value = false
    invoiceRequestStatus.value = 'none'
    payload.value = null
    try {
      const data = await fetchCharges(shipmentId)
      if (seq !== loadSeq) return
      applyPackHome(data)
      applyCafToLines(data)
      payload.value = data
    } catch (err) {
      if (seq !== loadSeq) return
      error.value = err instanceof Error ? err.message : 'Failed to load charges'
    } finally {
      if (seq === loadSeq) loading.value = false
    }
  }

  function actorLabel() {
    const map = {
      operations: 'Ops',
      sales: 'Sales',
      finance: 'Finance',
      admin: 'Admin',
    } as const
    return map[role.value]
  }

  function pushAudit(
    line: ChargeLine,
    kind: NonNullable<ChargeLine['audit']>[number]['kind'],
    extra?: { amount?: number; note?: string },
  ) {
    if (!line.audit) line.audit = []
    line.audit.unshift({
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kind,
      at: stamp(),
      by: actorLabel(),
      amount: extra?.amount,
      note: extra?.note,
    })
  }

  function setCafPercent(pct: number) {
    if (!payload.value || !canEditCaf.value) return
    payload.value.cafPercent = Math.max(0, Math.min(100, pct))
    applyCafToLines(payload.value)
    lastCafLineCodes.value = payload.value.lines
      .filter((l) => l.cafApplied)
      .map((l) => l.code)
    const n = lastCafLineCodes.value.length
    sonnerToast.message(
      n > 0
        ? `CAF ${payload.value.cafPercent}% applied — +CAF on ${n} foreign AP line(s): ${lastCafLineCodes.value.join(', ')}`
        : `CAF set to ${payload.value.cafPercent}% — no foreign AP lines`,
    )
  }

  function setJobFx(rate: number) {
    if (!payload.value || !canEditFx.value) return
    if (!Number.isFinite(rate) || rate <= 0) return
    payload.value.fxToAud = rate
    applyCafToLines(payload.value)
    sonnerToast.message(`Job FX set to 1 foreign = ${rate} ${payload.value.homeCurrency} (Admin demo)`)
  }

  function setVarianceThreshold(pct: number) {
    if (!payload.value || !canEditThreshold.value) return
    if (!Number.isFinite(pct) || pct < 0) return
    payload.value.varianceThresholdPct = pct
    sonnerToast.message(`Variance gate set to ${pct}% (Admin)`)
  }

  function updateLineAmount(lineId: string, field: 'accrued' | 'actual', value: number) {
    if (!payload.value) return
    if (field === 'accrued' && !canEditAccrued.value) {
      sonnerToast.message(
        accrualsLocked.value
          ? 'Accruals locked after Finance Approve — switch role or reopen (not in mock)'
          : 'Only Operations can edit accrued amounts',
      )
      return
    }
    if (field === 'actual' && !canEditActual.value) {
      sonnerToast.message('Only Finance (or Admin) can edit actuals')
      return
    }
    const line = payload.value.lines.find((l) => l.id === lineId)
    if (!line || line.posted || line.state === 'posted') return
    if (field === 'accrued') {
      if (line.side === 'AP') {
        line.baseAmount = value
        applyCafToLines(payload.value)
      } else {
        line.amount = value
        line.amountAud = toAud(
          value,
          line.currency,
          payload.value.fxToAud,
          payload.value.homeCurrency,
        )
      }
      pushAudit(line, 'accrual', { amount: line.amount })
      if (line.state === 'draft' || line.state === 'rated' || line.state === 'safeguard') {
        line.state = 'accrued'
      }
    } else {
      line.actualAmount = value
      line.actualAmountAud = toAud(
        value,
        line.currency,
        payload.value.fxToAud,
        payload.value.homeCurrency,
      )
      line.varianceAmount = value - (line.accruedAmount ?? line.amount)
      line.varianceCleared = false
      line.varianceNote = undefined
      if (line.side === 'AP') line.state = 'variance'
      pushAudit(line, 'actual', { amount: value })
      applyCafToLines(payload.value)
    }
    payload.value.gp = recomputeGp(payload.value)
    sonnerToast.message(field === 'accrued' ? 'Accrual updated' : 'Actual updated')
  }

  function clearVariance(lineId: string, note: string) {
    if (!payload.value || !note.trim()) return
    if (!canEditVarianceNote.value) {
      sonnerToast.message('Only Finance (or Admin) can clear variance')
      return
    }
    const line = payload.value.lines.find((l) => l.id === lineId)
    if (!line) return
    line.varianceNote = note.trim()
    line.varianceCleared = true
    pushAudit(line, 'variance_approved', { note: line.varianceNote })
    sonnerToast.message('Variance note saved — row cleared')
  }

  function postLine(lineId: string) {
    if (!payload.value) return
    const line = payload.value.lines.find((l) => l.id === lineId)
    if (!line || !canPostLine(line)) {
      if (!jobReadyToPost.value) {
        sonnerToast.message('Post blocked — Finance must Approve charges first')
      }
      return
    }
    line.posted = true
    line.state = 'posted'
    pushAudit(line, 'posted', { amount: line.amount })
    payload.value.gp = recomputeGp(payload.value)
    sonnerToast.message('Posted to GL (mock)')
  }

  function addChargeLine(opts?: {
    side?: 'AR' | 'AP'
    code?: string
    description?: string
    amount?: number
    provisional?: boolean
  }) {
    if (!payload.value || !canAddLine.value) return
    const id = `c-stub-${Date.now()}`
    const home = payload.value.homeCurrency
    const side = opts?.side ?? 'AR'
    const amount = opts?.amount ?? 0
    const provisional = opts?.provisional !== false
    const code = opts?.code ?? (side === 'AP' ? 'AP-EST' : 'MISC')
    const description =
      opts?.description ??
      (provisional
        ? side === 'AP'
          ? 'Provisional AP (estimate)'
          : 'Provisional AR (estimate)'
        : 'Manual charge (stub)')
    payload.value.lines.push({
      id,
      code,
      description,
      side,
      amount,
      baseAmount: side === 'AP' ? amount : undefined,
      currency: home,
      amountAud: amount,
      rateSource: 'manual',
      state: provisional ? 'draft' : 'rated',
      partyName: 'Manual',
      ratingBasis: provisional ? 'Provisional / estimated' : 'Manual',
      oversea: false,
      audit: [],
    })
    payload.value.gp = recomputeGp(payload.value)
    const holdNote = payload.value.blocked
      ? ' — formal Accrue locked until clearance / docs gate clears'
      : ''
    sonnerToast.message(
      `${side} line added as ${provisional ? 'Provisional' : 'Rated'}${holdNote}`,
    )
  }

  function addCommonSurcharge(code: 'CAF' | 'FSC' | 'THC' = 'CAF') {
    if (!payload.value || !canAddLine.value) return
    const labels: Record<string, string> = {
      CAF: 'Currency adjustment factor (surcharge line)',
      FSC: 'Fuel surcharge',
      THC: 'Terminal handling',
    }
    addChargeLine({
      side: 'AR',
      code,
      description: labels[code] ?? code,
      amount: 0,
      provisional: true,
    })
    if (code === 'CAF' && canEditCaf.value) {
      setCafPercent(payload.value.cafPercent || 3.5)
    }
  }

  function markReadyForBilling() {
    if (!payload.value || !canMarkReadyForBilling.value) {
      sonnerToast.message('Ready for Billing needs accrued lines and a clear money gate')
      return
    }
    readyForBilling.value = true
    sonnerToast.message('Job marked Ready for Billing — Finance Module notified (handoff)')
  }

  function requestFinalInvoice() {
    if (!payload.value || !canRequestFinalInvoice.value) {
      sonnerToast.message('Mark Ready for Billing (or get Finance approve) before requesting invoice')
      return
    }
    invoiceRequestStatus.value = 'requested'
    sonnerToast.message(
      'Final invoice requested — forwarded to Financial Module (no issue/post here)',
    )
  }

  async function accrue() {
    if (!payload.value || !canAccrue.value) return
    acting.value = true
    try {
      const shipmentId = payload.value.shipmentId
      payload.value = await accrueCharges(shipmentId)
      applyCafToLines(payload.value)
      for (const line of payload.value.lines) {
        if (line.state === 'accrued') pushAudit(line, 'accrual', { amount: line.amount })
      }
      // Hugh spine: refresh Milestone → Gate → Task + job next action
      await useLifecycleStore().load(shipmentId)
      await useJobStore().load(shipmentId)
      await useTasksStore().load()
      sonnerToast.message('Charges accrued — provisional GP frozen')
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Accrue failed'
    } finally {
      acting.value = false
    }
  }

  async function approve() {
    if (!payload.value || !canApprove.value) return
    acting.value = true
    try {
      const shipmentId = payload.value.shipmentId
      payload.value = await approveCharges(shipmentId)
      applyCafToLines(payload.value)
      await useLifecycleStore().load(shipmentId)
      await useJobStore().load(shipmentId)
      await useTasksStore().load()
      sonnerToast.message('Charges approved — ready to post to GL / issue invoice')
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Approve failed'
    } finally {
      acting.value = false
    }
  }

  function clear() {
    payload.value = null
    error.value = null
    lastCafLineCodes.value = []
    readyForBilling.value = false
    invoiceRequestStatus.value = 'none'
  }

  function notify(message: string) {
    sonnerToast.message(message)
  }

  return {
    loading,
    acting,
    error,
    payload,
    role,
    canAccrue,
    canApprove,
    canOpenInvoice,
    canEditAccrued,
    canEditActual,
    canEditCaf,
    canEditVarianceNote,
    canEditFx,
    canEditThreshold,
    canAddLine,
    canAddProvisional,
    canMarkReadyForBilling,
    canRequestFinalInvoice,
    readyForBilling,
    invoiceRequestStatus,
    canPostAny,
    canPostLine,
    jobReadyToPost,
    accrualsLocked,
    roleCanDo,
    unresolvedVarianceCount,
    lastCafLineCodes,
    showAdvanced,
    viewMode,
    load,
    accrue,
    approve,
    setCafPercent,
    setJobFx,
    setVarianceThreshold,
    updateLineAmount,
    clearVariance,
    postLine,
    addChargeLine,
    addCommonSurcharge,
    markReadyForBilling,
    requestFinalInvoice,
    clear,
    notify,
  }
})
