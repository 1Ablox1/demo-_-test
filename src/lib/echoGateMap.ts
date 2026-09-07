import { AU_CLEARANCE_GATE_ID } from '@/lib/gateChecklist'

/** Western UI gate id → Echo task code (Air Import nodes). */
export const ECHO_TASK_BY_GATE_ID: Record<string, string> = {
  [AU_CLEARANCE_GATE_ID]: '03-08',
  'echo-gate-03-08': '03-08',
}

export function echoTaskCodeForGateId(gateId: string): string | null {
  return ECHO_TASK_BY_GATE_ID[gateId] ?? null
}

export function isEchoClearanceGate(gateId: string): boolean {
  return echoTaskCodeForGateId(gateId) === '03-08'
}
