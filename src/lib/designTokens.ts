/** CargoWare OS visual tokens — comfort palette (slate page + calmer teal). */

export type Priority = 'Critical' | 'High' | 'Medium' | 'Normal'
export type RaciMark = 'R' | 'A' | 'C' | 'I'
export type MarketPack = 'GLOBAL' | 'US' | 'AU'

export const OS = {
  teal: '#14B8A6',
  tealTint: '#E6F9F6',
  tealDeep: '#0F766E',
  primary: '#0D9488',
  text: '#0F172A',
  textAlt: '#1E293B',
  textMuted: '#64748B',
  textFaint: '#9CA3AF',
  border: '#E2E8F0',
  borderSoft: '#F3F4F6',
  page: '#F1F5F9',
  card: '#FFFFFF',
  chrome: '#0F172A',
  navyMid: '#1E293B',
  success: '#059669',
  successBg: '#D1FAE5',
  warn: '#D97706',
  warnDeep: '#B45309',
  warnBg: '#FFEDD5',
  warnBorder: '#FED7AA',
  critical: '#DC2626',
  criticalBg: '#FEE2E2',
  criticalBorder: '#FECACA',
  grayFill: '#F3F4F6',
  charcoal: '#1E293B',
} as const

export const PRIORITY_COLORS: Record<
  Priority,
  { dot: string; bg: string; text: string; border: string }
> = {
  Critical: { dot: '#DC2626', bg: '#FEE2E2', text: '#DC2626', border: '#FECACA' },
  High: { dot: '#D97706', bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' },
  Medium: { dot: '#CA8A04', bg: '#FEF9C3', text: '#CA8A04', border: '#FEF08A' },
  Normal: { dot: '#059669', bg: '#D1FAE5', text: '#059669', border: '#A7F3D0' },
}

export const RACI_COLORS: Record<RaciMark, { bg: string; text: string; border: string }> = {
  R: { bg: '#14B8A6', text: '#fff', border: '#14B8A6' },
  A: { bg: '#1E293B', text: '#fff', border: '#1E293B' },
  C: { bg: '#E6F9F6', text: '#0F766E', border: '#14B8A6' },
  I: { bg: '#F3F4F6', text: '#64748B', border: '#D1D5DB' },
}
