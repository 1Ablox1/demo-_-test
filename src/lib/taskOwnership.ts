import type { TaskItem } from '@/api/types'
import { chipPersonLabel, ownershipLabel } from '@/lib/seedPeople'

export type OwnershipChip =
  | { kind: 'signoff'; seat: string; personName?: string; title: string; label: string }
  | { kind: 'next'; seat: string; personName?: string; title: string; label: string }

/**
 * Single row chip: Sign-off (A open) wins over Next handoff.
 * Dense label = person first name; tooltip = Name · L2 seat.
 */
export function ownershipChipFor(task: TaskItem): OwnershipChip | null {
  const gate = task.approvalGate
  if (gate?.open) {
    const title = ownershipLabel(
      gate.approverName ?? gate.approverSeat,
      gate.approverSeat,
    )
    return {
      kind: 'signoff',
      seat: gate.approverSeat,
      personName: gate.approverName,
      title,
      label: chipPersonLabel(gate.approverName, gate.approverSeat),
    }
  }
  const next = task.nextHandoff
  if (next) {
    const title = ownershipLabel(next.personName ?? next.seat, next.seat)
    return {
      kind: 'next',
      seat: next.seat,
      personName: next.personName,
      title,
      label: chipPersonLabel(next.personName, next.seat),
    }
  }
  return null
}

export function canApproveGate(task: TaskItem, mark: string | null | undefined): boolean {
  return Boolean(task.approvalGate?.open && mark === 'A')
}
