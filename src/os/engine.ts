import type { ActingRole, TaskItem } from '@/api/types'
import {
  canAccrueCharges,
  canApproveCharges,
  canConvertQuoteToBooking,
  canCreateQuote,
  canEditQuoteForm,
  canIssueInvoice,
} from '@/lib/rolePermissions'
import { lobFromJobNo } from '@/lib/jobIdentity'
import type {
  AllowedAction,
  GateStatus,
  JobLifecycle,
  MilestoneId,
  MilestoneStatus,
  MilestoneView,
  OsGate,
  OsTask,
} from '@/os/types'

const ORDER: MilestoneId[] = [
  'quote',
  'booking',
  'documents',
  'charges',
  'invoice',
  'history',
]

export function gateById(life: JobLifecycle, id: string): OsGate | undefined {
  return life.gates.find((g) => g.id === id)
}

export function taskById(life: JobLifecycle, id: string): OsTask | undefined {
  return life.tasks.find((t) => t.id === id)
}

export function openGates(life: JobLifecycle): OsGate[] {
  return life.gates.filter((g) => g.status === 'open')
}

export function openTasks(life: JobLifecycle): OsTask[] {
  return life.tasks.filter((t) => t.status === 'open')
}

/** Gates that block a milestone (still open). */
export function blockingGatesForMilestone(
  life: JobLifecycle,
  milestoneId: MilestoneId,
): OsGate[] {
  const ms = life.milestones.find((m) => m.id === milestoneId)
  if (!ms) return []
  return ms.gateIds
    .map((id) => gateById(life, id))
    .filter((g): g is OsGate => !!g && g.status === 'open')
}

/**
 * Milestone status from Hugh-style rules:
 * - done: all tasks done AND gates cleared for this + prior focus
 * - current: currentMilestoneId
 * - locked: prior milestone not done OR blocking gates on path
 * - pending: unlocked but not current
 */
export function milestoneViews(life: JobLifecycle): MilestoneView[] {
  const currentIdx = ORDER.indexOf(life.currentMilestoneId)

  return life.milestones
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((ms) => {
      const openGateIds = blockingGatesForMilestone(life, ms.id).map((g) => g.id)
      const openTaskIds = ms.taskIds.filter((tid) => {
        const t = taskById(life, tid)
        return t && t.status === 'open'
      })

      const idx = ORDER.indexOf(ms.id)
      let status: MilestoneStatus = 'pending'

      if (idx < currentIdx) status = 'done'
      else if (idx === currentIdx) status = 'current'
      else {
        // Future: locked if previous not complete enough
        const prevId = ORDER[idx - 1]
        const prevGates = prevId ? blockingGatesForMilestone(life, prevId) : []
        const prevMs = life.milestones.find((m) => m.id === prevId)
        const prevOpenTasks =
          prevMs?.taskIds.filter((tid) => taskById(life, tid)?.status === 'open')
            .length ?? 0
        if (prevGates.length > 0 || (idx > currentIdx + 1 && prevOpenTasks > 0)) {
          status = 'locked'
        } else if (idx > currentIdx) {
          // money milestones locked while docs gates open on documents
          const docsOpen = blockingGatesForMilestone(life, 'documents')
          if (
            (ms.id === 'charges' || ms.id === 'invoice') &&
            docsOpen.length > 0
          ) {
            status = 'locked'
          } else {
            status = 'pending'
          }
        }
      }

      // Explicit: if this milestone has open blocking gates and is current, stay current
      if (ms.id === life.currentMilestoneId) status = 'current'

      return {
        id: ms.id,
        label: ms.label,
        status,
        openGateIds,
        openTaskIds,
      }
    })
}

/** Project open tasks + open gates onto L1 desk rows. */
export function projectDeskTasks(life: JobLifecycle): TaskItem[] {
  const items: TaskItem[] = []

  for (const task of openTasks(life)) {
    // Skip if blocked by its gate still open and task marked blocked
    if (task.status === 'blocked') continue
    if (task.gateId) {
      const g = gateById(life, task.gateId)
      if (g?.status === 'open' && task.id.startsWith('task-after-gate')) continue
    }
    items.push({
      id: task.id,
      priority: task.priority,
      title: task.title,
      shipmentId: life.shipmentId,
      lob: lobFromJobNo(life.jobNo),
      jobNo: life.jobNo,
      pack: life.pack,
      roleMarks: task.roleMarks,
      nodeType: 'task',
      responsible: task.responsible,
      accountable: task.accountable,
      dueLabel: task.cutoffLabel,
      why: `${task.why} · Trigger: ${task.trigger}`,
      hawb: life.hawb,
      mawb: life.mawb,
      lane: life.lane,
      customer: life.customer,
      cutoffLabel: task.cutoffLabel,
      etdLabel: life.etdLabel,
      primaryCta: task.primaryCta,
      approveCta: task.approveCta,
      milestoneId: task.milestoneId,
      gateId: task.gateId,
      trigger: task.trigger,
      dataRequired: task.dataRequired,
      output: task.output,
    })
  }

  for (const gate of openGates(life)) {
    items.push({
      id: `gate-card-${gate.id}`,
      priority: gate.holdType === 'docs' || gate.holdType === 'customs' ? 'critical' : 'high',
      title: gate.title,
      shipmentId: life.shipmentId,
      lob: lobFromJobNo(life.jobNo),
      jobNo: life.jobNo,
      pack: life.pack,
      roleMarks: gate.roleMarks,
      nodeType: 'gate',
      responsible: 'Ops',
      accountable: 'Accountable seat',
      dueLabel: life.etdLabel,
      why: `Gate open · ${gate.trigger}`,
      hawb: life.hawb,
      mawb: life.mawb,
      lane: life.lane,
      customer: life.customer,
      cutoffLabel: life.etdLabel,
      etdLabel: life.etdLabel,
      primaryCta: 'Clear gate',
      approveCta: 'Stamp gate',
      milestoneId: gate.milestoneId,
      gateId: gate.id,
      trigger: gate.trigger,
      dataRequired: gate.dataRequired,
      output: gate.output,
      holdType: gate.holdType === 'none' || gate.holdType === 'margin' ? undefined : gate.holdType,
      gateTitle: gate.title,
    })
  }

  return items
}

export function moneyBlockedByGates(life: JobLifecycle): {
  blocked: boolean
  message?: string
  holdType?: OsGate['holdType']
} {
  const docs = blockingGatesForMilestone(life, 'documents')
  if (docs.length > 0) {
    const g = docs[0]
    return {
      blocked: true,
      message: `${g.title} — ${g.trigger}. Charges/invoice locked until gate clears.`,
      holdType: g.holdType,
    }
  }
  return { blocked: false }
}

export function invoiceBlockedByGates(life: JobLifecycle): {
  blocked: boolean
  reasons: string[]
} {
  const reasons: string[] = []
  const docs = blockingGatesForMilestone(life, 'documents')
  if (docs.length) reasons.push(...docs.map((g) => g.title))
  const chargeGates = blockingGatesForMilestone(life, 'charges')
  if (chargeGates.length) reasons.push(...chargeGates.map((g) => g.title))
  const invGates = blockingGatesForMilestone(life, 'invoice')
  if (invGates.length) reasons.push(...invGates.map((g) => g.title))
  return { blocked: reasons.length > 0, reasons }
}

/** Allowed actions for a seat at current lifecycle position. */
export function computeAllowedActions(
  life: JobLifecycle,
  role: ActingRole,
): AllowedAction[] {
  const views = milestoneViews(life)
  const chargesView = views.find((v) => v.id === 'charges')
  const invoiceView = views.find((v) => v.id === 'invoice')
  const moneyBlock = moneyBlockedByGates(life)

  const actions: AllowedAction[] = [
    {
      id: 'open_spine',
      label: 'Open job spine',
      enabled: true,
    },
    {
      id: 'create_quote',
      label: 'Create quote',
      enabled: canCreateQuote(role),
      reason: !canCreateQuote(role)
        ? 'Only Sales or Operations (R) create quotes'
        : undefined,
    },
    {
      id: 'edit_quote',
      label: 'Edit quote',
      enabled: canEditQuoteForm(role, {
        milestoneId: life.currentMilestoneId,
        tasks: life.tasks,
        gates: life.gates,
      }),
      reason: !canEditQuoteForm(role, {
        milestoneId: life.currentMilestoneId,
        tasks: life.tasks,
        gates: life.gates,
      })
        ? 'Only Sales or Operations (R) edit quotes at this stage'
        : undefined,
    },
    {
      id: 'convert_quote',
      label: 'Convert to booking',
      enabled:
        canConvertQuoteToBooking(role, {
          milestoneId: life.currentMilestoneId,
          tasks: life.tasks,
        }) && life.currentMilestoneId === 'quote',
      reason: !canConvertQuoteToBooking(role, {
        milestoneId: life.currentMilestoneId,
        tasks: life.tasks,
      })
        ? 'Operations (A/R) converts — Sales is Consulted'
        : undefined,
    },
    {
      id: 'open_charges',
      label: 'Open charges',
      enabled: !moneyBlock.blocked && chargesView?.status !== 'locked',
      reason: moneyBlock.blocked ? moneyBlock.message : undefined,
    },
    {
      id: 'accrue',
      label: 'Accrue charges',
      enabled:
        !moneyBlock.blocked &&
        canAccrueCharges(role, life.currentMilestoneId),
      reason:
        !canAccrueCharges(role, life.currentMilestoneId)
          ? 'Ops (R) accrues'
          : moneyBlock.message,
    },
    {
      id: 'approve_charges',
      label: 'Approve charges',
      enabled:
        !moneyBlock.blocked &&
        canApproveCharges(role) &&
        chargeGateClearedOrAbsent(life),
      reason: !canApproveCharges(role) ? 'Finance (A) approves' : undefined,
    },
    {
      id: 'open_invoice',
      label: 'Open invoice',
      enabled:
        !moneyBlock.blocked &&
        invoiceView?.status !== 'locked' &&
        (role === 'finance' || role === 'admin' || role === 'operations'),
      reason: moneyBlock.blocked ? moneyBlock.message : undefined,
    },
    {
      id: 'issue_invoice',
      label: 'Issue invoice',
      enabled:
        !invoiceBlockedByGates(life).blocked &&
        canIssueInvoice(role),
      reason:
        !canIssueInvoice(role)
          ? 'Finance issues'
          : invoiceBlockedByGates(life).reasons.join('; ') || undefined,
    },
  ]

  return actions
}

function chargeGateClearedOrAbsent(life: JobLifecycle) {
  const g = life.gates.find(
    (x) =>
      x.id === 'gate-charges-approve' ||
      x.id === 'gate-charges-4096' ||
      (x.milestoneId === 'charges' && x.holdType === 'invoice'),
  )
  return !g || g.status === 'cleared'
}

export function clearGate(life: JobLifecycle, gateId: string): JobLifecycle {
  const next = structuredClone(life)
  const g = next.gates.find((x) => x.id === gateId)
  if (!g) return life
  g.status = 'cleared' as GateStatus

  // Complete tasks that were waiting on this gate
  for (const t of next.tasks) {
    if (t.gateId === gateId && t.status === 'open' && t.id.includes('clear')) {
      t.status = 'done'
    }
  }

  // Module 1: quote completeness cleared → Convert to booking becomes actionable
  if (gateId === 'gate-quote-complete') {
    for (const t of next.tasks) {
      if (t.id.includes('convert') && t.status === 'blocked') {
        t.status = 'open'
      }
    }
  }

  // Advance current milestone if documents gates all clear (incl. AU clearance)
  if (
    gateId.startsWith('gate-docs') ||
    gateId.startsWith('gate-customs') ||
    gateId === 'gate-au-clearance-held'
  ) {
    const docsOpen = blockingGatesForMilestone(next, 'documents')
    if (docsOpen.length === 0 && next.currentMilestoneId === 'documents') {
      next.currentMilestoneId = 'charges'
    }
  }

  if (
    gateId === 'gate-charges-approve' ||
    gateId === 'gate-charges-4096' ||
    gateId.startsWith('gate-charges')
  ) {
    for (const t of next.tasks) {
      if (
        t.id === 'task-approve-charges' ||
        t.id === 'task-4096-approve-charges' ||
        (t.milestoneId === 'charges' && t.id.includes('approve'))
      ) {
        t.status = 'done'
      }
    }
    if (next.currentMilestoneId === 'charges') {
      next.currentMilestoneId = 'invoice'
    }
  }

  if (gateId.startsWith('gate-invoice')) {
    for (const t of next.tasks) {
      if (t.milestoneId === 'invoice' && (t.id.includes('issue') || t.gateId === gateId)) {
        t.status = 'done'
      }
    }
    if (next.currentMilestoneId === 'invoice') {
      next.currentMilestoneId = 'history'
    }
  }

  return next
}

export function completeTask(life: JobLifecycle, taskId: string): JobLifecycle {
  const next = structuredClone(life)
  const t = next.tasks.find((x) => x.id === taskId)
  if (!t || t.status !== 'open') return life
  t.status = 'done'

  // If task clears a gate, clear it
  if (t.gateId) {
    const g = next.gates.find((x) => x.id === t.gateId)
    if (g && (t.primaryCta.toLowerCase().includes('clear') || t.approveCta)) {
      // R completes work; A may still need stamp — only auto-clear if gate task is A-complete style
    }
  }

  return next
}

export function advanceMilestone(
  life: JobLifecycle,
  to: MilestoneId,
): JobLifecycle {
  const next = structuredClone(life)
  const views = milestoneViews(next)
  const target = views.find((v) => v.id === to)
  if (!target || target.status === 'locked') return life
  next.currentMilestoneId = to
  return next
}
