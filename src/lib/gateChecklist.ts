import type { GateChecklistItem, TaskItem } from '@/api/types'

export const AU_CLEARANCE_GATE_ID = 'gate-au-clearance-held'

export function opsChecklistItemsMet(items: GateChecklistItem[]): boolean {
  return items
    .filter((i) => i.fulfilRole === 'operations')
    .every((i) => i.met)
}

export function allChecklistItemsMet(items: GateChecklistItem[]): boolean {
  return items.every((i) => i.met)
}

export function enrichClearanceDeskTask(
  task: TaskItem,
  items: GateChecklistItem[],
  gateOpen: boolean,
): TaskItem {
  if (
    task.gateId !== AU_CLEARANCE_GATE_ID &&
    task.id !== `gate-card-${AU_CLEARANCE_GATE_ID}` &&
    task.id !== 'task-4096-clear-clearance'
  ) {
    return task
  }

  const opsReady = opsChecklistItemsMet(items)

  return {
    ...task,
    gateChecklist: items,
    gateTitle: task.gateTitle ?? 'AU import clearance — held',
    regulatoryReason:
      'AU pack · biosecurity evidence + broker ref before Finance A stamps release.',
    blockedActions: ['accrue', 'approve', 'issue'],
    holdType: task.holdType ?? 'customs',
    title:
      task.nodeType === 'gate'
        ? task.title
        : opsReady
          ? 'AU clearance — pending Finance A stamp'
          : 'Complete AU clearance checklist',
    primaryCta: opsReady ? 'Pending Finance A stamp' : 'Complete checklist items',
    approveCta: 'Stamp clearance release',
    approvalGate:
      opsReady && gateOpen
        ? {
            open: true,
            approverSeat: 'Finance',
            approverName: 'Marcello Vance',
            reason:
              'Ops checklist complete — Finance A must stamp clearance release before Accrue / Invoice unlock.',
          }
        : undefined,
    nextHandoff: opsReady
      ? {
          taskTitle: 'Stamp clearance release',
          seat: 'Finance',
          personName: 'Marcello Vance',
          mark: 'A',
        }
      : {
          taskTitle: 'Confirm biosecurity + broker ref',
          seat: 'Operations',
          personName: 'Sarah Jenkins',
          mark: 'R',
        },
  }
}
