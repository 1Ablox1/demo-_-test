import type { JobContext, TaskItem } from '@/api/types'
import { displayJobNo } from '@/lib/jobIdentity'
import { jobContextByShipment } from '@/mocks/fixtures/jobs'
import { myTasksFixture } from '@/mocks/fixtures/tasks'

export interface OsSearchEntry {
  shipmentId: number
  jobNo: string
  lob: string
  customer: string
  lane: string
  hawb: string | null
  mawb: string | null
  title?: string
  pack?: string
  airline?: string
  customerRef?: string
  etaLabel?: string
}

function lobLabel(lob: string): string {
  if (lob.includes('_')) return lob.replace(/_/g, ' ')
  const map: Record<string, string> = {
    AI: 'air import',
    AE: 'air export',
    SE: 'sea export',
    SI: 'sea import',
  }
  return map[lob.toUpperCase()] ?? lob
}

function entryFromTask(task: TaskItem): OsSearchEntry {
  return {
    shipmentId: task.shipmentId,
    jobNo: task.jobNo,
    lob: lobLabel(task.lob),
    customer: task.customer,
    lane: task.lane,
    hawb: task.hawb,
    mawb: task.mawb,
    title: task.title,
    pack: task.pack,
  }
}

function entryFromJob(job: JobContext): OsSearchEntry | null {
  if (!job.summary) return null
  return {
    shipmentId: job.shipmentId,
    jobNo: displayJobNo({
      identity: job.identity,
      lob: job.lob,
      shipmentId: job.shipmentId,
    }),
    lob: job.lob ?? 'AI',
    customer: job.summary.customer,
    lane: job.summary.route,
    hawb: job.ops.hawb,
    mawb: job.ops.mawb,
    pack: job.pack,
    airline: job.ops.airline ?? job.hostFacts?.airlineCode ?? undefined,
    customerRef: job.hostFacts?.ownerRef ?? undefined,
    etaLabel: job.ops.etaLabel ?? job.hostFacts?.firstArrivalDate ?? undefined,
  }
}

/** P0 mock search index — desk tasks + all seeded job contexts. */
export function buildOsSearchIndex(): OsSearchEntry[] {
  const byId = new Map<number, OsSearchEntry>()

  for (const task of myTasksFixture.tasks) {
    byId.set(task.shipmentId, entryFromTask(task))
  }

  for (const job of Object.values(jobContextByShipment)) {
    const row = entryFromJob(job)
    if (row) byId.set(row.shipmentId, { ...byId.get(row.shipmentId), ...row })
  }

  return [...byId.values()].sort((a, b) => a.shipmentId - b.shipmentId)
}

export function filterOsSearchIndex(entries: OsSearchEntry[], query: string): OsSearchEntry[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return entries.slice(0, 8)

  return entries.filter((e) => {
    const hay = [
      e.jobNo,
      String(e.shipmentId),
      e.customer,
      e.lane,
      e.hawb,
      e.mawb,
      e.title,
      e.pack,
      e.lob,
      e.airline,
      e.customerRef,
      e.etaLabel,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(needle)
  })
}

export function filterTasksByQuery(tasks: TaskItem[], query: string): TaskItem[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return tasks
  return tasks.filter((t) => {
    const hay = [t.jobNo, String(t.shipmentId), t.customer, t.lane, t.hawb, t.mawb, t.title]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(needle)
  })
}
