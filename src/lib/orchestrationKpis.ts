import { WORKBENCH_JOBS } from '@/data/workbench'
import type { ShipmentRecord } from '@/stores/freight'

export interface OrchestrationKpi {
  id: string
  label: string
  value: string
  trend: string
  tone: 'up' | 'warn' | 'neutral'
}

/**
 * Live KPIs from OS shell freight + Needs You desk (mock control-plane seam).
 */
export function computeOrchestrationKpis(shipments: ShipmentRecord[]): OrchestrationKpi[] {
  const inTransit = shipments.filter((s) => s.status === 'Operating' || s.status === 'Pre Commit').length
  const pending = shipments.filter(
    (s) => s.status === 'Pending' || s.status === 'Committing' || s.status === 'Committed',
  ).length
  const delivered = shipments.filter((s) => s.status === 'Verified').length
  const held = shipments.filter((s) => s.status === 'Pending' || s.status === 'Shut Out' || s.status === 'Reject').length
  const exceptions = WORKBENCH_JOBS.filter((j) => j.hasGate || j.priority === 'Critical').length

  const closedOrOperating = inTransit + delivered
  const otdDenom = closedOrOperating + held
  const otdPct = otdDenom > 0 ? Math.round(((closedOrOperating - held * 0.1) / otdDenom) * 100) : 94

  const todayExceptions = WORKBENCH_JOBS.filter(
    (j) => j.due === '4h' || j.due === 'Today',
  ).length

  return [
    {
      id: 'in_transit',
      label: 'In Transit',
      value: String(inTransit),
      trend:
        inTransit > 0
          ? `↑ ${Math.max(1, Math.round(inTransit * 0.12))} vs yesterday`
          : 'No active operating files',
      tone: 'up',
    },
    {
      id: 'otd',
      label: 'OTD',
      value: `${Math.min(99, Math.max(80, otdPct))}%`,
      trend: '↑ 1.3% vs last week',
      tone: 'up',
    },
    {
      id: 'exceptions',
      label: 'Exceptions',
      value: String(exceptions),
      trend: `↑ ${todayExceptions} new today`,
      tone: exceptions > 5 ? 'warn' : 'up',
    },
    {
      id: 'pending',
      label: 'Pending',
      value: String(pending),
      trend: pending > 0 ? '↑ Awaiting carrier reply' : 'Queue clear',
      tone: 'neutral',
    },
    {
      id: 'delivered',
      label: 'Delivered',
      value: String(delivered),
      trend: delivered > 0 ? '↑ vs 28-day avg' : 'No closed files in mock set',
      tone: 'up',
    },
  ]
}

/** Distinct routes from live shipments for Origin/Destination step. */
export function routeOptionsFromShipments(shipments: ShipmentRecord[]): string[] {
  const set = new Set<string>()
  for (const s of shipments) {
    if (s.route?.trim()) set.add(s.route.replace(/\s*✈\s*/g, ' → ').replace(/\s*→\s*/g, ' → '))
  }
  return [...set].slice(0, 12)
}

export function customerOptionsFromShipments(shipments: ShipmentRecord[]): string[] {
  return [...new Set(shipments.map((s) => s.customer).filter(Boolean))].slice(0, 12)
}
