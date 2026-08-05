/** OS Numbering Policy — mock domain (maps to legacy ConfigDef / MAWB pools later). */

export type NumberingPolicyType = 'SHIPMENT' | 'HAWB' | 'REFERENCE'
export type NumberingMode =
  | 'MANUAL'
  | 'AUTO_SEQUENCE'
  | 'TEMPLATE'
  | 'EQUAL_TO_SOURCE'
  | 'DISABLED'

export type ResetPolicy = 'NEVER' | 'YEARLY' | 'MONTHLY'

export interface SequenceConfig {
  prefix: string
  suffix: string
  sequenceLength: number
  startNumber: number
  currentNumber: number
  resetPolicy: ResetPolicy
  lastResetKey?: string
}

export interface NumberingPolicyVersion {
  version: number
  mode: NumberingMode
  template: string
  sequence: SequenceConfig
  createdAt: string
  createdBy: string
}

export interface NumberingPolicy {
  id: string
  tenantId: string
  officeId: string
  officeCode: string
  type: NumberingPolicyType
  mode: NumberingMode
  template: string
  sequence: SequenceConfig
  /** For EQUAL_TO_SOURCE */
  sourceType?: 'SHIPMENT'
  currentVersion: number
  versions: NumberingPolicyVersion[]
  legacyBinding?: string
  updatedAt: string
}

export interface GeneratedNumberAudit {
  id: string
  tenantId: string
  entityType: string
  entityId: string
  numberType: NumberingPolicyType
  generatedNumber: string
  policyId: string
  policyVersion: number
  createdAt: string
  createdBy: string
}

export interface MockAirline {
  id: string
  airlineCode: string
  name: string
  /** IATA 3-digit AWB prefix */
  mawbPrefix: string
}

export interface MawbPoolDetail {
  mawbNo: string
  state: 'available' | 'allocated' | 'void'
  jobId?: string
  jobNo?: string
}

export interface MawbPool {
  id: string
  airlineId: string
  officeId: string
  prefix: string
  startNo: string
  count: number
  details: MawbPoolDetail[]
}

export interface NumberingPreviewRequest {
  type: NumberingPolicyType
  officeId?: string
  template?: string
  mode?: NumberingMode
}

export interface NumberingGenerateRequest {
  type: NumberingPolicyType
  officeId: string
  entityType?: string
  entityId?: string
  createdBy?: string
}
