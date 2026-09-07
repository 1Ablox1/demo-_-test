import { LOB_CATALOG, type LobCode } from '@/lib/lob'
import type { SpineLobPrefix } from '@/types/spineLob'

/** Air direction workspace under Air Freight (CW-style Import / Export split). */
export type AirDirection = 'AI' | 'AE'

export const AIR_DIRECTIONS: {
  prefix: AirDirection
  lob: LobCode
  label: string
}[] = [
  { prefix: 'AI', lob: 'air_import', label: 'Air Import' },
  { prefix: 'AE', lob: 'air_export', label: 'Air Export' },
]

export function isAirDirection(v: string): v is AirDirection {
  return v === 'AI' || v === 'AE'
}

export function airDirectionFromQuery(query: Record<string, unknown>): AirDirection | null {
  const raw = typeof query.lob === 'string' ? query.lob.toUpperCase() : ''
  return isAirDirection(raw) ? raw : null
}

export function lobCodeFromAir(air: AirDirection): LobCode {
  return air === 'AI' ? 'air_import' : 'air_export'
}

export function airFromLobCode(lob: LobCode): AirDirection | null {
  const prefix = LOB_CATALOG[lob]?.prefix
  return isAirDirection(prefix) ? prefix : null
}

export function airLabel(air: AirDirection): string {
  return air === 'AI' ? 'Air Import' : 'Air Export'
}

export function asSpineLob(air: AirDirection): SpineLobPrefix {
  return air
}
