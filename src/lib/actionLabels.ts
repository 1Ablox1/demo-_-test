import type { ActionToken, AllowedActionsResult } from '@/types/governance'
import type { RaciMark } from '@/types/raci'
import type { WorkbenchJob } from '@/data/workbench'

/** Plain-English labels for Echo action tokens (Module 1 minimal set). */
export const ACTION_LABELS: Record<ActionToken, string> = {
  create_quote: 'Create quote',
  save_draft: 'Save draft',
  convert: 'Convert to booking',
  fulfil: 'Complete checklist item',
  stamp: 'Release clearance',
  accrue: 'Accrue charges',
  approve: 'Approve charges',
  issue_invoice: 'Issue invoice',
  open_job: 'Open job',
}

/** Backward-compat aliases from legacy mock tokens → canonical Echo tokens. */
export const ACTION_ALIASES: Record<string, ActionToken> = {
  complete_task: 'fulfil',
  clear_gate: 'stamp',
  accrue_charges: 'accrue',
  approve_charges: 'approve',
  work: 'fulfil',
}

export function normalizeActionToken(token: string): ActionToken | null {
  if (token in ACTION_LABELS) return token as ActionToken
  return ACTION_ALIASES[token] ?? null
}

export function labelForAction(token: ActionToken | string, hint?: string): string {
  const normalized = typeof token === 'string' ? normalizeActionToken(token) : token
  if (!normalized) return String(token)
  const base = ACTION_LABELS[normalized]
  return hint ? `${base} ${hint}` : base
}

export function isTokenAllowed(result: AllowedActionsResult, token: ActionToken | string): boolean {
  const normalized = normalizeActionToken(token)
  if (!normalized) return false
  return result.allowed.some((a) => normalizeActionToken(a) === normalized)
}

export function denyReasonFor(
  result: AllowedActionsResult,
  token: ActionToken | string,
): string | undefined {
  const normalized = normalizeActionToken(token)
  if (!normalized) return undefined
  if (result.denyReasons[normalized]) return result.denyReasons[normalized]
  for (const [alias, canonical] of Object.entries(ACTION_ALIASES)) {
    if (canonical === normalized && result.denyReasons[alias as ActionToken]) {
      return result.denyReasons[alias as ActionToken]
    }
  }
  return undefined
}

/** Priority order for picking the single primary lifecycle CTA on a surface. */
const PRIMARY_ACTION_ORDER: ActionToken[] = [
  'fulfil',
  'stamp',
  'convert',
  'accrue',
  'approve',
  'issue_invoice',
  'create_quote',
]

export function primaryLifecycleAction(result: AllowedActionsResult): ActionToken | null {
  for (const token of PRIMARY_ACTION_ORDER) {
    if (isTokenAllowed(result, token)) return token
  }
  return null
}

/** Optional destination hint for tab routing (→ Charges, → Timeline). */
export function actionHint(token: ActionToken | null): string | null {
  switch (token) {
    case 'accrue':
      return '→ Charges'
    case 'approve':
      return '→ Charges'
    case 'issue_invoice':
      return '→ Invoice'
    case 'fulfil':
      return '→ Timeline'
    default:
      return null
  }
}

export function primaryCtaLabel(result: AllowedActionsResult, gateName?: string): string {
  const primary = primaryLifecycleAction(result)
  if (!primary) return ACTION_LABELS.open_job
  if (primary === 'stamp' && gateName) {
    return labelForAction('stamp')
  }
  const hint = actionHint(primary)
  return hint ? `${ACTION_LABELS[primary]} ${hint}` : ACTION_LABELS[primary]
}

/** Desk / Needs You row CTA — context-specific over vague RACI verbs. */
export function deskCtaLabel(job: WorkbenchJob): string {
  if (job.actionLabel) return job.actionLabel.replace(/\s*↗\s*$/, '')
  const title = job.title.toLowerCase()
  if (job.raci === 'A' && job.hasGate) return ACTION_LABELS.stamp
  if (job.raci === 'R') {
    if (title.includes('customs') || title.includes('declaration')) return 'Complete customs checklist'
    if (title.includes('invoice')) return ACTION_LABELS.approve
    if (title.includes('quote')) return ACTION_LABELS.convert
    return ACTION_LABELS.fulfil
  }
  if (job.raci === 'A') return ACTION_LABELS.approve
  return ACTION_LABELS.open_job
}

export function ctaForRaci(mark: RaciMark): string {
  if (mark === 'R') return ACTION_LABELS.fulfil
  if (mark === 'A') return ACTION_LABELS.stamp
  return ACTION_LABELS.open_job
}
