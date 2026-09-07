import type { JobContext } from '@/api/types'

/** Show hostFacts essentials block (AI import / AU Local Frame jobs). */
export function showHostFactsEssentials(job: JobContext): boolean {
  if (job.lob === 'AI') return true
  if (job.hostFacts && Object.keys(job.hostFacts).length > 0) return true
  const packs = job.activePacks?.length ? job.activePacks : [job.pack]
  return packs.includes('AU') && Boolean(job.clearance)
}

export function hostFactsPending(job: JobContext): boolean {
  return showHostFactsEssentials(job) && !job.hostFacts
}

export function formatHostFactValue(value: string | null | undefined): string {
  if (value == null || String(value).trim() === '') return '—'
  return String(value).trim()
}

export function formatHostFactDate(iso: string | undefined): string {
  if (!iso?.trim()) return '—'
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function airlineDisplay(facts: JobContext['hostFacts']): string {
  if (!facts) return '—'
  const code = facts.airlineCode?.trim()
  const name = facts.airlineName?.trim()
  if (code && name) return `${code} · ${name}`
  return code ?? name ?? '—'
}
