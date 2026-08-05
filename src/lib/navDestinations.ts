import type { RaciMark, TaskItem } from '@/api/types'

/** Where a Needs You CTA actually navigates */
export type NavDestination =
  | 'create-quote'
  | 'job-context'
  | 'job-charges'
  | 'job-invoice'
  | 'mdm-approve'
  | 'none'

export function destinationForTask(task: TaskItem, canCreateQuote = true): NavDestination {
  if (task.id.startsWith('mdm-approve-')) return 'mdm-approve'
  const cta = `${task.primaryCta} ${task.approveCta ?? ''}`.toLowerCase()
  if (cta.includes('create quote') || task.shipmentId === 8801) {
    return canCreateQuote ? 'create-quote' : 'job-context'
  }
  if (cta.includes('charge') || cta.includes('accrual') || cta.includes('ledger')) {
    return 'job-charges'
  }
  if (cta.includes('invoice')) return 'job-invoice'
  return 'job-context'
}

/** Short action label on the button (what you do) */
export function actionLabelForTask(task: TaskItem, mark: RaciMark): string {
  if (task.id.startsWith('mdm-approve-')) {
    return mark === 'A' ? (task.approveCta || 'Approve customer') : 'Review customer'
  }
  if (mark === 'C' || mark === 'I') return 'View job'
  if (mark === 'A') return task.approveCta?.trim() || 'Approve'
  if (task.primaryCta?.trim()) return task.primaryCta.trim()
  return 'Open job'
}

/** Where it leads — shown under the button */
export function destinationHintKey(dest: NavDestination): string {
  switch (dest) {
    case 'create-quote':
      return 'nav.dest.createQuote'
    case 'job-charges':
      return 'nav.dest.charges'
    case 'job-invoice':
      return 'nav.dest.invoice'
    case 'mdm-approve':
      return 'nav.dest.mdmApprove'
    case 'job-context':
      return 'nav.dest.overview'
    default:
      return 'nav.dest.none'
  }
}
