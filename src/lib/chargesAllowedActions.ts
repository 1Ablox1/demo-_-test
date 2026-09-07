import type { ChargesPayload, JobMoneyState } from '@/api/types'

/** Restore charge-page allowedActions[] after money gates clear (MSW + future control-plane). */
export function allowedActionsForMoneyState(
  moneyState: JobMoneyState,
  blocked: boolean,
): ChargesPayload['allowedActions'] {
  if (blocked) return []

  switch (moneyState) {
    case 'blocked':
    case 'open_wip':
      return ['accrue']
    case 'provisioned':
      // Ops already accrued — Finance A next (Hugh SoD)
      return ['approve', 'open_invoice']
    case 'charges_approved':
    case 'actuals_posted':
    case 'part_invoiced':
    case 'invoiced':
    case 'verified':
    case 'closed':
      return ['open_invoice']
    default:
      return ['accrue', 'approve', 'open_invoice']
  }
}
