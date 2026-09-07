/**
 * Control-plane allowed-actions bridge — Echo (hybrid/live) overlays MSW baseline.
 * Frontend never compiles RACI; it consumes merged `allowedActions[]` from fetchJobLifecycle.
 */
import type { OsNodeActions, OsNodeActionVerb } from '@/api/echo/types'
import type { AllowedAction } from '@/os/types'

export const LIFECYCLE_ACTION_IDS = [
  'open_spine',
  'create_quote',
  'edit_quote',
  'convert_quote',
  'open_charges',
  'accrue',
  'approve_charges',
  'open_invoice',
  'issue_invoice',
  'stamp_gate',
  'fulfil_gate',
] as const

export type LifecycleActionId = (typeof LIFECYCLE_ACTION_IDS)[number]

export type AllowedActionsSource = 'msw' | 'hybrid'

interface EchoBinding {
  taskCodes: string[]
  verbs: string[]
  /** any = enabled when any verb on any task is allowed */
  mode?: 'any' | 'all'
}

/** Hugh / Echo task codes → Western UI lifecycle action ids */
const ECHO_BINDINGS: Partial<Record<LifecycleActionId, EchoBinding>> = {
  edit_quote: { taskCodes: ['01-08', '01-02'], verbs: ['work'] },
  convert_quote: { taskCodes: ['01-11', 'ACT-04'], verbs: ['work'] },
  accrue: { taskCodes: ['11-01'], verbs: ['work'] },
  approve_charges: { taskCodes: ['11-02', '11-01'], verbs: ['work', 'stamp'] },
  issue_invoice: { taskCodes: ['11-03'], verbs: ['work'] },
  stamp_gate: { taskCodes: ['03-08', '03-02', '03-12'], verbs: ['stamp'] },
  fulfil_gate: { taskCodes: ['03-08', '03-02'], verbs: ['fulfil'] },
}

const PASSED_NODE_STATES = new Set(['done', 'passed', 'complete', 'completed'])

function echoBlockReason(verb: OsNodeActionVerb): string | undefined {
  if (verb.allowed) return undefined
  const detail = verb.blockDetail?.filter(Boolean).join(', ')
  const blockMsg = verb.blocks?.[0]?.detail
  if (detail) return detail
  if (blockMsg) return String(blockMsg)
  if (verb.blockType) return verb.blockType.replace(/_/g, ' ').toLowerCase()
  return undefined
}

function resolveEchoBinding(
  nodes: OsNodeActions[],
  binding: EchoBinding,
): { allowed: boolean; reason?: string } | null {
  const hits: { allowed: boolean; reason?: string }[] = []

  for (const node of nodes) {
    if (!binding.taskCodes.includes(node.taskCode)) continue
    for (const verb of node.actions ?? []) {
      if (!binding.verbs.includes(verb.verb)) continue
      hits.push({ allowed: verb.allowed, reason: echoBlockReason(verb) })
    }
  }

  if (hits.length === 0) return null

  if (binding.mode === 'all') {
    const allowed = hits.every((h) => h.allowed)
    return {
      allowed,
      reason: allowed ? undefined : hits.find((h) => !h.allowed)?.reason,
    }
  }

  const allowedHit = hits.find((h) => h.allowed)
  if (allowedHit) return { allowed: true }
  return { allowed: false, reason: hits.find((h) => h.reason)?.reason }
}

/** Echo clearance gate (03-08) blocks money tabs until passed or stamp allowed. */
export function echoClearanceMoneyBlock(
  nodes: OsNodeActions[],
): { blocked: boolean; reason?: string } {
  const clearance = nodes.find((n) => n.taskCode === '03-08')
  if (!clearance) return { blocked: false }

  const state = (clearance.nodeState ?? '').toLowerCase()
  if (PASSED_NODE_STATES.has(state)) return { blocked: false }

  const stamp = clearance.actions?.find((a) => a.verb === 'stamp')
  if (stamp?.allowed) return { blocked: false }

  const reason =
    echoBlockReason(stamp ?? { verb: 'stamp', allowed: false }) ??
    'AU import clearance gate open — Finance stamp required before accrue'

  return { blocked: true, reason }
}

/**
 * Merge Echo allowed-actions onto MSW baseline.
 * Echo governs RACI verbs it returns; MSW retains state gates (milestone lock, money fixtures).
 */
export function mergeLifecycleAllowedActions(
  mswActions: AllowedAction[],
  echoNodes: OsNodeActions[] | null | undefined,
): { actions: AllowedAction[]; source: AllowedActionsSource } {
  if (!echoNodes?.length) {
    return { actions: mswActions, source: 'msw' }
  }

  const moneyBlock = echoClearanceMoneyBlock(echoNodes)
  const moneyIds = new Set<LifecycleActionId>([
    'open_charges',
    'accrue',
    'approve_charges',
    'open_invoice',
    'issue_invoice',
  ])

  const actions = mswActions.map((action) => {
    const id = action.id as LifecycleActionId
    const binding = ECHO_BINDINGS[id]
    let enabled = action.enabled
    let reason = action.reason

    if (binding) {
      const echo = resolveEchoBinding(echoNodes, binding)
      if (echo) {
        enabled = action.enabled && echo.allowed
        if (!enabled) {
          reason = echo.reason ?? reason
        }
      }
    }

    if (moneyBlock.blocked && moneyIds.has(id)) {
      enabled = false
      reason = moneyBlock.reason ?? reason
    }

    return { ...action, enabled, reason }
  })

  return { actions, source: 'hybrid' }
}

export function findLifecycleAction(
  actions: AllowedAction[],
  id: LifecycleActionId,
): AllowedAction | undefined {
  return actions.find((a) => a.id === id)
}

/** Prefer control-plane answer; fall back to local raciCompiler when action absent. */
export function isLifecycleActionEnabled(
  actions: AllowedAction[],
  id: LifecycleActionId,
  fallback: () => boolean,
): boolean {
  const entry = findLifecycleAction(actions, id)
  if (entry) return entry.enabled
  return fallback()
}

export function lifecycleActionReason(
  actions: AllowedAction[],
  id: LifecycleActionId,
): string | undefined {
  return findLifecycleAction(actions, id)?.reason
}

/** Charges payload uses short ids — map to lifecycle action ids. */
export function chargesActionFromLifecycle(
  lifecycleActions: AllowedAction[],
  chargeAction: 'accrue' | 'approve' | 'open_invoice',
): boolean | null {
  const map = {
    accrue: 'accrue',
    approve: 'approve_charges',
    open_invoice: 'open_invoice',
  } as const
  const entry = findLifecycleAction(lifecycleActions, map[chargeAction])
  if (!entry) return null
  return entry.enabled
}
