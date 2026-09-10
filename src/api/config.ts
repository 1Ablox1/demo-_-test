export type ApiMode = 'mock' | 'hybrid' | 'live'

export function apiMode(): ApiMode {
  const raw = (import.meta.env.VITE_API_MODE as string | undefined)?.trim().toLowerCase()
  if (raw === 'hybrid' || raw === 'live') return raw
  return 'mock'
}

export function usesEchoReads(): boolean {
  return apiMode() === 'hybrid' || apiMode() === 'live'
}

/** Module 1 golden job gate writes (fulfil/stamp) go to Echo in hybrid/live. */
export function usesEchoGateWrites(): boolean {
  return apiMode() === 'hybrid' || apiMode() === 'live'
}

/**
 * MSW stays on for money / lifecycle / unmapped jobs in every mode until Echo
 * exposes those writes (WIRING: live = Echo reads + MSW for unimplemented).
 */
export function usesMswMocks(): boolean {
  return apiMode() === 'mock' || apiMode() === 'hybrid' || apiMode() === 'live'
}
