/**
 * P0 Hugh RACI catalog subset — AI air + billing tasks only.
 * Full constitution (~143 tasks) lives in shell-mock `raci.json`; western-ui projects open subset.
 * @see docs/OS-SHELL-TENANT-PACKS-ROLES-DESIGN.md §13
 */

export type RaciMark = 'R' | 'A' | 'C' | 'I'

export interface RaciTask {
  id: string
  process: string
  seq: number
  stage: string
  title: string
  trigger: string
  gate: string
  assignments: Record<string, RaciMark[]>
}

export const P0_L0_ROLES = ['Air Export', 'Air Import', 'Pricing', 'Billing'] as const
export type P0L0Role = (typeof P0_L0_ROLES)[number]

const PROCESS_META: Record<string, { intent: string }> = {
  '01 · Commercial & quote': { intent: 'Win the lane with compliant pricing before booking.' },
  '02 · Export air operations': { intent: 'Book, document, and tender export air freight.' },
  '03 · Import air operations': { intent: 'Receive, clear, and deliver import air freight.' },
  '08 · Customs brokerage & trade compliance': { intent: 'Filings, holds, and release gates.' },
  '11 · Billing & revenue': { intent: 'Accrue, approve, and invoice on cleared files.' },
}

const TASKS: RaciTask[] = [
  {
    id: '01-02',
    process: '01 · Commercial & quote',
    seq: 2,
    stage: 'Quote',
    title: 'Prepare and issue customer quote',
    trigger: 'New enquiry or rate request',
    gate: '',
    assignments: { Pricing: ['R'], 'Air Export': ['C'], Billing: ['I'] },
  },
  {
    id: '01-03',
    process: '01 · Commercial & quote',
    seq: 3,
    stage: 'Quote',
    title: 'Sanctions / denied-party pre-screen',
    trigger: 'Before quote acceptance',
    gate: 'Sanctions hold until cleared',
    assignments: { Pricing: ['R'], 'Air Export': ['C'], Billing: ['I'] },
  },
  {
    id: '02-08',
    process: '02 · Export air operations',
    seq: 8,
    stage: 'Documents',
    title: 'File AES / EEI export declaration (US)',
    trigger: 'US export lane · before departure',
    gate: 'AES Export Filing Missing',
    assignments: { 'Air Export': ['R'], Pricing: ['I'], Billing: ['I'] },
  },
  {
    id: '02-09',
    process: '02 · Export air operations',
    seq: 9,
    stage: 'Documents',
    title: 'Issue MAWB / HAWB',
    trigger: 'Booking confirmed',
    gate: '',
    assignments: { 'Air Export': ['R'], Billing: ['C'] },
  },
  {
    id: '02-10',
    process: '02 · Export air operations',
    seq: 10,
    stage: 'Documents',
    title: 'Pre-alert carrier and overseas agent',
    trigger: 'AWB issued',
    gate: '',
    assignments: { 'Air Export': ['R'] },
  },
  {
    id: '03-01',
    process: '03 · Import air operations',
    seq: 1,
    stage: 'Booking',
    title: 'Receive import booking and ICS pre-arrival data',
    trigger: 'Import job opened · AU pack',
    gate: '',
    assignments: { 'Air Import': ['R'], Billing: ['I'] },
  },
  {
    id: '03-03',
    process: '03 · Import air operations',
    seq: 3,
    stage: 'Documents',
    title: 'Biosecurity / quarantine assessment',
    trigger: 'Arrival notice · DAFF risk',
    gate: 'Biosecurity hold',
    assignments: { 'Air Import': ['R'], Billing: ['I'] },
  },
  {
    id: '03-05',
    process: '03 · Import air operations',
    seq: 5,
    stage: 'Documents',
    title: 'Confirm GST treatment on importation',
    trigger: 'AU import · before accrual',
    gate: '',
    assignments: { 'Air Import': ['R'], Billing: ['C'] },
  },
  {
    id: '03-08',
    process: '03 · Import air operations',
    seq: 8,
    stage: 'Documents',
    title: 'Obtain customs / biosecurity release',
    trigger: 'ICS status update',
    gate: 'AU Import Clearance Chip — Held',
    assignments: { 'Air Import': ['R'], Billing: ['A'] },
  },
  {
    id: '08-09',
    process: '08 · Customs brokerage & trade compliance',
    seq: 9,
    stage: 'Compliance',
    title: 'Validate GST codes on broker entry',
    trigger: 'Broker entry received',
    gate: '',
    assignments: { 'Air Import': ['C'], Billing: ['R'] },
  },
  {
    id: '08-10',
    process: '08 · Customs brokerage & trade compliance',
    seq: 10,
    stage: 'Compliance',
    title: 'Confirm filing proof on file',
    trigger: 'Export / import filing due',
    gate: 'Filing proof missing',
    assignments: { 'Air Export': ['R'], 'Air Import': ['R'] },
  },
  {
    id: '11-01',
    process: '11 · Billing & revenue',
    seq: 1,
    stage: 'Charges',
    title: 'Accrue charges on job',
    trigger: 'Docs gate clear · money unlocked',
    gate: 'Documents before Charges',
    assignments: { Billing: ['R'], 'Air Export': ['C'], 'Air Import': ['C'] },
  },
  {
    id: '11-03',
    process: '11 · Billing & revenue',
    seq: 3,
    stage: 'Invoice',
    title: 'Issue customer invoice',
    trigger: 'Charges approved',
    gate: '',
    assignments: { Billing: ['R'], Pricing: ['I'] },
  },
]

const taskById = new Map(TASKS.map((t) => [t.id, t]))
const processes = [...new Set(TASKS.map((t) => t.process))]

export const baselineRaciCatalog = {
  /** P0 subset — not full Hugh constitution count */
  tasks: TASKS,
  processes,
  processMeta: PROCESS_META,
  roleShorts: [...P0_L0_ROLES] as string[],
  catalogNote: 'P0 open subset (AI / AU / billing)',
  getTask: (id: string) => taskById.get(id),
  tasksOf: (process: string) => TASKS.filter((t) => t.process === process).sort((a, b) => a.seq - b.seq),
}

export default baselineRaciCatalog
