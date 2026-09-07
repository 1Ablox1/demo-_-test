/** Create Job intent — execution workspace + LOB (shell-mock pattern → western-ui). */

/** Module 1 quote-stage shipment (desk + lifecycle). */
export const QUOTE_STAGE_SHIPMENT_ID = 8801

/** Module 1 golden operational booking after convert / direct init. */
export const MODULE1_BOOKING_SHIPMENT_ID = 4096

export const MODULE1_BOOKING_JOB_NO = 'AI20260101001'

export type ExecutionType = 'quote' | 'booking'

/** LOB prefixes aligned with numbering policy (AE / AI / SE / SI / RE / RI). */
export type CreateJobLobPrefix = 'AI' | 'AE' | 'SI' | 'SE' | 'RI' | 'RE'

export interface CreateJobIntent {
  executionType: ExecutionType
  lobPrefix: CreateJobLobPrefix
}

export interface CreateJobRouteTarget {
  name: 'create-quote' | 'job-new'
  query: { lob: CreateJobLobPrefix }
}

export interface ExecutionTypeOption {
  value: ExecutionType
  label: string
  desc: string
}

export interface CreateJobLobOption {
  prefix: CreateJobLobPrefix
  label: string
  mode: 'Air' | 'Ocean' | 'Land'
}

/**
 * Thin routing seam — no number compilation or rate math in Vue.
 * Future: POST /os/jobs/intent → redirect from control plane.
 */
export function routeForCreateJob(intent: CreateJobIntent): CreateJobRouteTarget {
  if (intent.executionType === 'quote') {
    return { name: 'create-quote', query: { lob: intent.lobPrefix } }
  }
  return { name: 'job-new', query: { lob: intent.lobPrefix } }
}

export const EXECUTION_TYPE_OPTIONS: ExecutionTypeOption[] = [
  {
    value: 'quote',
    label: 'Commercial Quote',
    desc: 'Pre-execution. Open commercial offer workspace — save draft, then convert to booking.',
  },
  {
    value: 'booking',
    label: 'Direct Booking',
    desc: 'Confirmed cargo. Skip quote and initialize an operational job on the Lifecycle Ladder.',
  },
]

export const CREATE_JOB_LOB_OPTIONS: CreateJobLobOption[] = [
  { prefix: 'AI', label: 'Air Import', mode: 'Air' },
  { prefix: 'AE', label: 'Air Export', mode: 'Air' },
  { prefix: 'SI', label: 'Sea Import', mode: 'Ocean' },
  { prefix: 'SE', label: 'Sea Export', mode: 'Ocean' },
  { prefix: 'RI', label: 'Road Import', mode: 'Land' },
  { prefix: 'RE', label: 'Road Export', mode: 'Land' },
]

export function createJobSubmitLabel(executionType: ExecutionType | ''): string {
  if (executionType === 'quote') return 'Create quote'
  if (executionType === 'booking') return 'Initialize booking'
  return 'Continue'
}

export function parseCreateJobLob(raw: unknown): CreateJobLobPrefix {
  const q = String(raw ?? 'AI').toUpperCase()
  const allowed: CreateJobLobPrefix[] = ['AI', 'AE', 'SI', 'SE', 'RI', 'RE']
  return (allowed.includes(q as CreateJobLobPrefix) ? q : 'AI') as CreateJobLobPrefix
}

export function lobMeta(prefix: CreateJobLobPrefix): CreateJobLobOption {
  return CREATE_JOB_LOB_OPTIONS.find((l) => l.prefix === prefix) ?? CREATE_JOB_LOB_OPTIONS[0]
}
