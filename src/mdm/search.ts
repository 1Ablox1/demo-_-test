import type { MasterOption } from './types'

function normalize(s: string): string {
  return s.trim().toLowerCase()
}

function tokens(opt: MasterOption): string[] {
  return [opt.label, opt.value, opt.meta ?? '', ...(opt.aliases ?? [])].map(normalize)
}

/** Match any keyword against label, value, aliases, meta. */
export function filterMasters(options: MasterOption[], query: string): MasterOption[] {
  const q = normalize(query)
  if (!q) return []
  return options.filter((opt) => tokens(opt).some((t) => t.includes(q)))
}

const RECENT_PREFIX = 'cw-os-mdm-recent:'
const MAX_RECENT = 5

export function loadRecentValues(kind: string): string[] {
  try {
    const raw = localStorage.getItem(RECENT_PREFIX + kind)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function pushRecentValue(kind: string, value: string): void {
  const next = [value, ...loadRecentValues(kind).filter((v) => v !== value)].slice(0, MAX_RECENT)
  try {
    localStorage.setItem(RECENT_PREFIX + kind, JSON.stringify(next))
  } catch {
    /* ignore quota */
  }
}

export function optionsByValues(
  options: MasterOption[],
  values: string[],
): MasterOption[] {
  const map = new Map(options.map((o) => [o.value, o]))
  return values.map((v) => map.get(v)).filter((o): o is MasterOption => Boolean(o))
}
