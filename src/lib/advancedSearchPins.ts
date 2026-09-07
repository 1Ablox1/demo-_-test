/** Persist which Advanced Search fields the user pins as everyday criteria. */

const STORAGE_PREFIX = 'cw-os-adv-pins-v1'

export function loadPinnedCriteriaIds(pinsKey: string, fallback: string[] = []): string[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}:${pinsKey}`)
    if (!raw) return [...fallback]
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return [...fallback]
    return parsed.filter((x): x is string => typeof x === 'string')
  } catch {
    return [...fallback]
  }
}

export function savePinnedCriteriaIds(pinsKey: string, ids: string[]) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}:${pinsKey}`, JSON.stringify(ids))
  } catch {
    /* ignore */
  }
}

/** Sensible everyday starter pins — Air Import Jobs. */
export const SUGGESTED_JOB_PINS_AI = [
  'status',
  'customer',
  'mawb',
  'hawb',
  'auClearanceGate',
  'auBrokerRef',
  'auBiosecurityRisk',
]

/** Sensible everyday starter pins — Air Export Jobs. */
export const SUGGESTED_JOB_PINS_AE = [
  'status',
  'customer',
  'mawb',
  'hawb',
  'operateType',
  'etd',
  'airline',
]

/** Sensible everyday starter pins — Air Import Consoles. */
export const SUGGESTED_CONSOLE_PINS_AI = [
  'status',
  'masterJobNo',
  'mawb',
  'auClearanceGate',
  'auBiosecurityRisk',
  'airline',
]

/** Sensible everyday starter pins — Air Export Consoles. */
export const SUGGESTED_CONSOLE_PINS_AE = [
  'status',
  'masterJobNo',
  'mawb',
  'operateType',
  'etd',
  'airline',
]

export function suggestedPinsFor(pinsKey: string): string[] {
  if (pinsKey === 'jobs:AI') return SUGGESTED_JOB_PINS_AI
  if (pinsKey === 'jobs:AE') return SUGGESTED_JOB_PINS_AE
  if (pinsKey === 'consoles:AI') return SUGGESTED_CONSOLE_PINS_AI
  if (pinsKey === 'consoles:AE') return SUGGESTED_CONSOLE_PINS_AE
  return []
}
