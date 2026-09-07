/** Line-of-business codes that drive job-number prefixes. */
export type LobCode =
  | 'air_export'
  | 'air_import'
  | 'sea_export'
  | 'sea_import'
  | 'road_export'
  | 'road_import'

export interface LobMeta {
  code: LobCode
  /** Job number prefix, e.g. AE / AI */
  prefix: string
  label: string
  mode: 'Air' | 'Sea' | 'Road'
  direction: 'Export' | 'Import'
}

export const LOB_CATALOG: Record<LobCode, LobMeta> = {
  air_export: {
    code: 'air_export',
    prefix: 'AE',
    label: 'Air Export',
    mode: 'Air',
    direction: 'Export',
  },
  air_import: {
    code: 'air_import',
    prefix: 'AI',
    label: 'Air Import',
    mode: 'Air',
    direction: 'Import',
  },
  sea_export: {
    code: 'sea_export',
    prefix: 'SE',
    label: 'Sea Export',
    mode: 'Sea',
    direction: 'Export',
  },
  sea_import: {
    code: 'sea_import',
    prefix: 'SI',
    label: 'Sea Import',
    mode: 'Sea',
    direction: 'Import',
  },
  road_export: {
    code: 'road_export',
    prefix: 'RE',
    label: 'Road Export',
    mode: 'Road',
    direction: 'Export',
  },
  road_import: {
    code: 'road_import',
    prefix: 'RI',
    label: 'Road Import',
    mode: 'Road',
    direction: 'Import',
  },
}

/** Build a display job number from LOB + numeric sequence. */
export function formatJobNo(lob: LobCode, sequence: string | number): string {
  const seq = String(sequence).replace(/\D/g, '')
  return `${LOB_CATALOG[lob].prefix}-${seq}`
}

/** Strip LOB prefix (AE/AI/SE/SI/RE/RI/legacy AF) → numeric id. */
export function jobNoToId(jobNo: string): string {
  return jobNo.replace(/^(AE|AI|SE|SI|RE|RI|AF)-/i, '').trim()
}

export function lobFromJobNo(jobNo: string): LobMeta | null {
  const m = jobNo.match(/^(AE|AI|SE|SI|RE|RI|AF)-/i)
  if (!m) return null
  const prefix = m[1].toUpperCase()
  if (prefix === 'AF') return LOB_CATALOG.air_export // legacy fallback
  return Object.values(LOB_CATALOG).find((l) => l.prefix === prefix) ?? null
}
