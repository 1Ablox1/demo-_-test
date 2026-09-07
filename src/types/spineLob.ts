/** Global Spine LOB prefixes — display / routing only; numbering comes from control plane. */
export type SpineLobPrefix = 'AI' | 'AE' | 'OI' | 'OE' | 'TR'

export interface SpineLobMeta {
  prefix: SpineLobPrefix
  label: string
  mode: 'Air' | 'Ocean' | 'Land'
}

/** Mandatory standard LOB selectors for Create Job modal (Echo `/os/*` maps these). */
export const SPINE_LOB_OPTIONS: SpineLobMeta[] = [
  { prefix: 'AI', label: 'Air Import', mode: 'Air' },
  { prefix: 'AE', label: 'Air Export', mode: 'Air' },
  { prefix: 'OI', label: 'Ocean Import', mode: 'Ocean' },
  { prefix: 'OE', label: 'Ocean Export', mode: 'Ocean' },
  { prefix: 'TR', label: 'Trucking / Land', mode: 'Land' },
]

export function spineLobMeta(prefix: SpineLobPrefix): SpineLobMeta {
  return SPINE_LOB_OPTIONS.find((l) => l.prefix === prefix) ?? SPINE_LOB_OPTIONS[0]
}
