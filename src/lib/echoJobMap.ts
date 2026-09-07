/** Western UI shipment id ↔ Echo legacy job uuid (Module 1 golden + wire map). */
export const ECHO_JOB_BY_SHIPMENT: Record<number, string> = {
  4096: 'poc-job-001',
}

const SHIPMENT_BY_ECHO_JOB = Object.fromEntries(
  Object.entries(ECHO_JOB_BY_SHIPMENT).map(([sid, jid]) => [jid, Number(sid)]),
) as Record<string, number>

export function echoJobIdForShipment(shipmentId: number): string | null {
  return ECHO_JOB_BY_SHIPMENT[shipmentId] ?? null
}

export function shipmentIdForEchoJob(jobId: string): number | null {
  return SHIPMENT_BY_ECHO_JOB[jobId] ?? null
}

export function isEchoWiredShipment(shipmentId: number): boolean {
  return shipmentId in ECHO_JOB_BY_SHIPMENT
}
