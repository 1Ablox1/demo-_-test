import type { GateChecklistItem, GateDetailPayload } from '@/api/types'
import { AU_CLEARANCE_GATE_ID } from '@/lib/gateChecklist'

export const AU_CLEARANCE_CHECKLIST_SEED: GateChecklistItem[] = [
  {
    itemCode: 'docs_on_file',
    itemName: 'Commercial docs on file',
    met: true,
    fulfilRole: 'auto',
    metBy: 'System',
    metAt: '2026-01-08',
  },
  {
    itemCode: 'awb_on_file',
    itemName: 'AWB / HAWB on file',
    met: true,
    fulfilRole: 'auto',
    metBy: 'System',
    metAt: '2026-01-08',
  },
  {
    itemCode: 'biosecurity_release',
    itemName: 'Biosecurity release confirmed',
    met: false,
    fulfilRole: 'operations',
  },
  {
    itemCode: 'broker_entry_ref',
    itemName: 'Broker entry reference captured',
    met: false,
    fulfilRole: 'operations',
  },
]

export function seedAuClearanceGateDetail(): GateDetailPayload {
  return {
    gateId: AU_CLEARANCE_GATE_ID,
    title: 'AU import clearance — held',
    status: 'open',
    items: structuredClone(AU_CLEARANCE_CHECKLIST_SEED),
    canStamp: false,
    approvalRequired: true,
    approverSeat: 'Finance',
    approverName: 'Marcello Vance',
  }
}
