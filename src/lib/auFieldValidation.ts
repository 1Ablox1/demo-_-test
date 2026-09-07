import type { AuImportFields, AuImportStepId } from '@/types/auAirImport'
import type { ShipmentRecord } from '@/stores/freight'

/** First empty / missing field in a step — for validation badge jumps. */
export function firstIncompleteFieldInStep(
  stepId: AuImportStepId,
  fields: AuImportFields,
  shipment: ShipmentRecord,
): string | null {
  switch (stepId) {
    case 'commercial':
      if (!fields.customerId) return 'customerId'
      if (!fields.incoTerm) return 'incoTerm'
      if (!fields.ownerContact.trim()) return 'ownerContact'
      if (!fields.ownerAbn.trim() && fields.customerId !== 'cust-pharma') return 'ownerAbn'
      return 'customerId'
    case 'route':
      if (!fields.laneId) return 'laneId'
      if (!fields.loadingPort.trim()) return 'loadingPort'
      if (!fields.dischargingPort.trim()) return 'dischargingPort'
      if (!fields.destinationPort.trim()) return 'destinationPort'
      if (!fields.airlineCode) return 'airlineCode'
      if (!shipment.etd.trim()) return 'etd'
      if (!shipment.eta.trim()) return 'eta'
      return 'laneId'
    case 'awb_cargo':
      if (!shipment.hawb.trim()) return 'hawb'
      if (!shipment.mawb.trim() && shipment.kind !== 'house') return 'mawb'
      if (fields.pieces === '') return 'pieces'
      if (fields.grossWeightKg === '') return 'grossWeightKg'
      if (!fields.cargoDescription.trim()) return 'cargoDescription'
      if (!fields.countryOfOrigin) return 'countryOfOrigin'
      return 'hawb'
    case 'parties_delivery':
      if (!fields.shipperId) return 'shipperId'
      if (!fields.consigneeId) return 'consigneeId'
      if (!fields.deliveryAddress.trim()) return 'deliveryAddress'
      return 'shipperId'
    case 'customs_handoff':
      if (!fields.brokerRef.trim()) return 'brokerRef'
      if (!fields.freightTerm) return 'freightTerm'
      if (!fields.biosecurityRisk) return 'biosecurityRisk'
      return 'brokerRef'
    case 'money_preview':
      return 'dutyAmountEst'
    default:
      return null
  }
}
