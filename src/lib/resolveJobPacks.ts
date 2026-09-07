import type { MarketPack } from '@/api/types'

/**
 * P0 mock — derive job Local Frame from tenant countries + lane corridor.
 * Production: adapter sets activePacks on GET /api/os/jobs/:id from legacy + corridor rules.
 */
export function resolveJobPacks(
  _shipmentId: number,
  tenantCountries: string[],
  lane: string,
  primaryPack?: MarketPack,
): MarketPack[] {
  const packs = new Set<MarketPack>(['GLOBAL'])
  if (primaryPack && primaryPack !== 'GLOBAL') packs.add(primaryPack)

  const laneUpper = lane.toUpperCase()
  if (tenantCountries.includes('US') || laneUpper.includes('ORD') || laneUpper.includes('LAX')) {
    packs.add('US')
  }
  if (tenantCountries.includes('AU') || laneUpper.includes('SYD') || laneUpper.includes('MEL')) {
    packs.add('AU')
  }

  return [...packs]
}

export function homeCurrencyForPacks(packs: MarketPack[]): 'AUD' | 'USD' {
  if (packs.includes('AU') && !packs.includes('US')) return 'AUD'
  if (packs.includes('US') && !packs.includes('AU')) return 'USD'
  return packs.includes('AU') ? 'AUD' : 'USD'
}
