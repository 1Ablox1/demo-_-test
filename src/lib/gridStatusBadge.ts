/** Dense tonal micro-badges for AG Grid status / gate columns (CW1-familiar caps). */

export type BadgeTone = 'green' | 'amber' | 'red' | 'slate' | 'teal'

const TONE_CLASS: Record<BadgeTone, string> = {
  green: 'os-micro-badge os-micro-badge--green',
  amber: 'os-micro-badge os-micro-badge--amber',
  red: 'os-micro-badge os-micro-badge--red',
  slate: 'os-micro-badge os-micro-badge--slate',
  teal: 'os-micro-badge os-micro-badge--teal',
}

export function statusBadgeTone(status: string): BadgeTone {
  const s = status.toLowerCase()
  if (
    s === 'operating' ||
    s === 'committed' ||
    s === 'verified' ||
    s === 'cleared' ||
    s === 'unlocked'
  ) {
    return 'green'
  }
  if (
    s === 'pending' ||
    s === 'pre commit' ||
    s === 'committing' ||
    s === 'held' ||
    s.includes('daff') ||
    s === 'open'
  ) {
    return 'amber'
  }
  if (s === 'shut out' || s === 'reject' || s.includes('lock') || s === 'locked') return 'red'
  return 'slate'
}

export function formatStatusBadgeLabel(fieldId: string, raw: string): string {
  const v = String(raw ?? '').trim()
  if (!v) return '—'
  if (fieldId === 'status') return `[${v.toUpperCase()}]`
  if (fieldId === 'auClearanceGate') {
    if (v === 'held') return '[HELD: CLEARANCE]'
    if (v === 'cleared') return '[CUSTOMS RELEASED]'
    if (v === 'open') return '[GATE OPEN]'
  }
  if (fieldId === 'auMoneyLock') {
    if (v === 'locked') return '[MONEY LOCK]'
    if (v === 'unlocked') return '[MONEY OPEN]'
  }
  if (fieldId === 'auBiosecurityRisk') {
    if (v === 'daff_review') return '[HELD: DAFF]'
    if (v === 'permit_required') return '[PERMIT REQ]'
    if (v === 'none') return '[BIO OK]'
  }
  return `[${v.replace(/_/g, ' ').toUpperCase()}]`
}

export function badgeHtml(fieldId: string, raw: unknown): string {
  const text = String(raw ?? '').trim()
  if (!text) return '<span class="text-slate-400">—</span>'
  const label = formatStatusBadgeLabel(fieldId, text)
  const tone = statusBadgeTone(
    fieldId === 'auMoneyLock' && text === 'locked'
      ? 'locked'
      : fieldId === 'auBiosecurityRisk' && text === 'daff_review'
        ? 'daff'
        : fieldId === 'auClearanceGate' && text === 'cleared'
          ? 'cleared'
          : fieldId === 'auClearanceGate' && text === 'held'
            ? 'held'
            : text,
  )
  return `<span class="${TONE_CLASS[tone]}">${label}</span>`
}

export const BADGE_FIELD_IDS = new Set([
  'status',
  'auClearanceGate',
  'auMoneyLock',
  'auBiosecurityRisk',
])
