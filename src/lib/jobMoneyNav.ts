import type { RouteLocationRaw } from 'vue-router'

/** Job operate spine step 5 — Charges & Invoice (accrue / approve / issue). */
export function operateChargesLocation(
  shipmentId: string | number,
  extraQuery?: Record<string, string>,
): RouteLocationRaw {
  return {
    name: 'shipment',
    params: { shipmentId: String(shipmentId) },
    query: { step: 'money_preview', ...extraQuery },
  }
}
