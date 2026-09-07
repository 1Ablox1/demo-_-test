import raw from '@/data/raci.json'
import type { RaciMark } from '@/types/raci'

interface RawRole {
  id: string
  name: string
  short: string
}

interface RawFunction {
  id: string
  name: string
  short: string
  roles: RawRole[]
}

interface RawTask {
  id: string
  process: string
  seq: number
  stage: string
  type: string
  title: string
  trigger: string
  gate: string
  output: string
  raci: Record<string, string>
  sources?: string[]
}

interface RawData {
  order: string[]
  meta: Record<string, { intent: string; owner: string }>
  functions: RawFunction[]
  tasks: RawTask[]
}

const payload = raw as { DATA: RawData }
const DATA = payload.DATA

/** Expand combined marks (e.g. RA) into atomic RaciMark values. */
export function expandRaciMark(mark: string): RaciMark[] {
  if (!mark) return []
  if (mark === 'RA') return ['R', 'A']
  if (mark === 'R' || mark === 'A' || mark === 'C' || mark === 'I') return [mark]
  return []
}

const roleIdToShort = new Map<string, string>()
for (const fn of DATA.functions) {
  for (const role of fn.roles) {
    roleIdToShort.set(role.id, role.short)
  }
}

export interface NormalizedRaciTask {
  id: string
  process: string
  seq: number
  stage: string
  type: string
  title: string
  trigger: string
  gate: string
  output: string
  /** Role short name → atomic RACI marks */
  assignments: Record<string, RaciMark[]>
  sources: string[]
}

function normalizeTask(task: RawTask): NormalizedRaciTask {
  const assignments: Record<string, RaciMark[]> = {}
  for (const [roleId, mark] of Object.entries(task.raci)) {
    const roleName = roleIdToShort.get(roleId) ?? roleId
    const marks = expandRaciMark(mark)
    if (marks.length) assignments[roleName] = marks
  }
  return {
    id: task.id,
    process: task.process,
    seq: task.seq,
    stage: task.stage,
    type: task.type,
    title: task.title,
    trigger: task.trigger,
    gate: task.gate,
    output: task.output,
    assignments,
    sources: task.sources ?? [],
  }
}

const normalizedTasks = DATA.tasks.map(normalizeTask)
const taskById = new Map(normalizedTasks.map((t) => [t.id, t]))

export const baselineRaciCatalog = {
  processes: DATA.order,
  processMeta: DATA.meta,
  functions: DATA.functions,
  tasks: normalizedTasks,
  roleIdToShort,
  roleShorts: [...new Set(roleIdToShort.values())].sort(),
  getTask: (id: string) => taskById.get(id),
  tasksOf: (process: string) => normalizedTasks.filter((t) => t.process === process),
}

export default baselineRaciCatalog
