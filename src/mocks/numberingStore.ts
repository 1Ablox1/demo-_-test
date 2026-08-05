import type {
  GeneratedNumberAudit,
  MawbPool,
  MockAirline,
  NumberingGenerateRequest,
  NumberingPolicy,
  NumberingPreviewRequest,
  SequenceConfig,
} from '@/mdm/numberingTypes'

const STORAGE_KEY = 'cw-os-numbering-mock-v1'

function padSeq(n: number, len: number) {
  return String(n).padStart(len, '0')
}

function nowKey(policy: ResetPolicyLike, d = new Date()) {
  if (policy === 'YEARLY') return `${d.getUTCFullYear()}`
  if (policy === 'MONTHLY') return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  return 'NEVER'
}

type ResetPolicyLike = SequenceConfig['resetPolicy']

/** IATA AWB check digit: first 7 of 8-digit body % 7 === last digit */
export function validateMawbCheckDigit(mawb: string): { ok: boolean; reason?: string } {
  const raw = mawb.replace(/[\s-]/g, '')
  if (!/^\d{11}$/.test(raw) && !/^\d{8}$/.test(raw)) {
    return { ok: false, reason: 'MAWB must be 11 digits (prefix+serial) or 8-digit serial' }
  }
  const body = raw.length === 11 ? raw.slice(3) : raw
  const before7 = Number(body.slice(0, 7))
  const last = Number(body.slice(7, 8))
  if (before7 % 7 !== last) {
    return { ok: false, reason: 'Invalid IATA modulo-7 check digit' }
  }
  return { ok: true }
}

export function validateMawbFull(
  mawb: string,
  expectedPrefix?: string,
): { ok: boolean; reason?: string; normalized?: string } {
  const raw = mawb.replace(/[\s-]/g, '')
  const check = validateMawbCheckDigit(raw)
  if (!check.ok) return check
  if (raw.length === 11 && expectedPrefix && raw.slice(0, 3) !== expectedPrefix) {
    return { ok: false, reason: `Prefix must be ${expectedPrefix}` }
  }
  const normalized =
    raw.length === 11 ? `${raw.slice(0, 3)}-${raw.slice(3)}` : raw
  return { ok: true, normalized }
}

/** Stock generation: valid serials with mod-7; step +11 like legacy stock books. */
export function generateMawbSerials(startSerial7: number, count: number, prefix: string): string[] {
  let n = startSerial7
  const out: string[] = []
  for (let i = 0; i < count; i++) {
    const check = n % 7
    const eight = `${String(n).padStart(7, '0')}${check}`
    out.push(`${prefix}${eight}`)
    n += 11
  }
  return out
}

function applyTemplate(
  template: string,
  seq: SequenceConfig,
  ctx: { office: string; company: string; year: string; month: string; day: string },
): string {
  const seqStr = padSeq(seq.currentNumber, seq.sequenceLength)
  return template
    .replaceAll('{OFFICE}', ctx.office)
    .replaceAll('{COMPANY}', ctx.company)
    .replaceAll('{COUNTRY}', 'US')
    .replaceAll('{CUSTOMER}', 'CUST')
    .replaceAll('{YEAR}', ctx.year)
    .replaceAll('{MONTH}', ctx.month)
    .replaceAll('{DAY}', ctx.day)
    .replaceAll('{SEQ}', seqStr)
}

function seedPolicies(): NumberingPolicy[] {
  const seq = (current: number): SequenceConfig => ({
    prefix: '',
    suffix: '',
    sequenceLength: 6,
    startNumber: 1,
    currentNumber: current,
    resetPolicy: 'YEARLY',
    lastResetKey: '2026',
  })
  const ts = new Date().toISOString()
  return [
    {
      id: 'pol-ship-sto',
      tenantId: 't-demo',
      officeId: 'off-sto',
      officeCode: 'STO',
      type: 'SHIPMENT',
      mode: 'TEMPLATE',
      template: 'AE-{OFFICE}-{YEAR}-{SEQ}',
      sequence: seq(128),
      currentVersion: 1,
      versions: [
        {
          version: 1,
          mode: 'TEMPLATE',
          template: 'AE-{OFFICE}-{YEAR}-{SEQ}',
          sequence: seq(128),
          createdAt: ts,
          createdBy: 'system',
        },
      ],
      legacyBinding: 'AEJobNoPattern',
      updatedAt: ts,
    },
    {
      id: 'pol-hawb-sto',
      tenantId: 't-demo',
      officeId: 'off-sto',
      officeCode: 'STO',
      type: 'HAWB',
      mode: 'TEMPLATE',
      template: '{OFFICE}-{YEAR}-{SEQ}',
      sequence: seq(42),
      currentVersion: 1,
      versions: [
        {
          version: 1,
          mode: 'TEMPLATE',
          template: '{OFFICE}-{YEAR}-{SEQ}',
          sequence: seq(42),
          createdAt: ts,
          createdBy: 'system',
        },
      ],
      legacyBinding: 'AEHblNoPattern',
      updatedAt: ts,
    },
    {
      id: 'pol-hawb-lax',
      tenantId: 't-demo',
      officeId: 'off-lax',
      officeCode: 'LAX',
      type: 'HAWB',
      mode: 'EQUAL_TO_SOURCE',
      template: '',
      sourceType: 'SHIPMENT',
      sequence: seq(1),
      currentVersion: 1,
      versions: [
        {
          version: 1,
          mode: 'EQUAL_TO_SOURCE',
          template: '',
          sequence: seq(1),
          createdAt: ts,
          createdBy: 'system',
        },
      ],
      legacyBinding: 'AEHAWBNOEQJobNo=1',
      updatedAt: ts,
    },
  ]
}

function seedAirlines(): MockAirline[] {
  return [
    { id: 'al-cx', airlineCode: 'CX', name: 'Cathay Pacific', mawbPrefix: '160' },
    { id: 'al-sq', airlineCode: 'SQ', name: 'Singapore Airlines', mawbPrefix: '618' },
    { id: 'al-ua', airlineCode: 'UA', name: 'United Airlines', mawbPrefix: '016' },
  ]
}

function seedPools(airlines: MockAirline[]): MawbPool[] {
  const cx = airlines[0]
  const serials = generateMawbSerials(1000001, 5, cx.mawbPrefix)
  return [
    {
      id: 'pool-cx-sto',
      airlineId: cx.id,
      officeId: 'off-sto',
      prefix: cx.mawbPrefix,
      startNo: serials[0],
      count: serials.length,
      details: serials.map((mawbNo, i) => ({
        mawbNo,
        state: i === 0 ? 'allocated' : 'available',
        jobId: i === 0 ? '1024' : undefined,
        jobNo: i === 0 ? 'AF-1024' : undefined,
      })),
    },
  ]
}

interface NumberingStoreState {
  policies: NumberingPolicy[]
  audits: GeneratedNumberAudit[]
  airlines: MockAirline[]
  pools: MawbPool[]
}

function loadState(): NumberingStoreState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as NumberingStoreState
  } catch {
    /* ignore */
  }
  const airlines = seedAirlines()
  const state: NumberingStoreState = {
    policies: seedPolicies(),
    audits: [],
    airlines,
    pools: seedPools(airlines),
  }
  saveState(state)
  return state
}

function saveState(state: NumberingStoreState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

let state = loadState()

function ctxFor(officeCode: string) {
  const d = new Date()
  return {
    office: officeCode,
    company: 'WESTERN',
    year: String(d.getUTCFullYear()),
    month: String(d.getUTCMonth() + 1).padStart(2, '0'),
    day: String(d.getUTCDate()).padStart(2, '0'),
  }
}

function maybeReset(seq: SequenceConfig) {
  const key = nowKey(seq.resetPolicy)
  if (seq.resetPolicy === 'NEVER') return
  if (seq.lastResetKey !== key) {
    seq.currentNumber = seq.startNumber
    seq.lastResetKey = key
  }
}

export const numberingMockDb = {
  reset() {
    localStorage.removeItem(STORAGE_KEY)
    state = loadState()
    return state
  },

  listPolicies(type?: string, officeId?: string) {
    return state.policies.filter((p) => {
      if (type && p.type !== type) return false
      if (officeId && p.officeId !== officeId) return false
      return true
    })
  },

  getPolicy(id: string) {
    return state.policies.find((p) => p.id === id) ?? null
  },

  updatePolicy(id: string, patch: Partial<NumberingPolicy>) {
    const p = state.policies.find((x) => x.id === id)
    if (!p) return null
    const nextVersion = p.currentVersion + 1
    if (patch.mode) p.mode = patch.mode
    if (patch.template != null) p.template = patch.template
    if (patch.sequence) p.sequence = { ...p.sequence, ...patch.sequence }
    if (patch.sourceType) p.sourceType = patch.sourceType
    p.currentVersion = nextVersion
    p.versions.push({
      version: nextVersion,
      mode: p.mode,
      template: p.template,
      sequence: { ...p.sequence },
      createdAt: new Date().toISOString(),
      createdBy: 'admin',
    })
    p.updatedAt = new Date().toISOString()
    saveState(state)
    return p
  },

  preview(req: NumberingPreviewRequest) {
    const officeId = req.officeId ?? 'off-sto'
    const policy =
      state.policies.find((p) => p.type === req.type && p.officeId === officeId) ??
      state.policies.find((p) => p.type === req.type)
    if (!policy) return { number: '', note: 'No policy' }
    const mode = req.mode ?? policy.mode
    const template = req.template ?? policy.template
    const seq = { ...policy.sequence }
    maybeReset(seq)
    if (mode === 'MANUAL') return { number: '(manual entry)', note: 'User types HAWB' }
    if (mode === 'DISABLED') return { number: '', note: 'Disabled (e.g. direct MAWB)' }
    if (mode === 'EQUAL_TO_SOURCE') {
      return { number: 'AE-STO-2026-000128', note: 'Equals shipment number (example)' }
    }
    const number = applyTemplate(template || '{SEQ}', seq, ctxFor(policy.officeCode))
    return { number, note: `Preview only · policy v${policy.currentVersion}` }
  },

  generate(req: NumberingGenerateRequest) {
    const policy = state.policies.find(
      (p) => p.type === req.type && p.officeId === req.officeId,
    )
    if (!policy) return { error: 'Policy not found', status: 404 as const }
    if (policy.mode === 'MANUAL') {
      return { error: 'MANUAL mode — no auto generate', status: 400 as const }
    }
    if (policy.mode === 'DISABLED') {
      return { error: 'DISABLED — no house number', status: 400 as const }
    }
    maybeReset(policy.sequence)
    let number: string
    if (policy.mode === 'EQUAL_TO_SOURCE') {
      const ship = state.policies.find(
        (p) => p.type === 'SHIPMENT' && p.officeId === req.officeId,
      )
      if (!ship) return { error: 'No shipment policy for EQUAL_TO_SOURCE', status: 400 as const }
      maybeReset(ship.sequence)
      number = applyTemplate(ship.template, ship.sequence, ctxFor(ship.officeCode))
    } else {
      number = applyTemplate(policy.template, policy.sequence, ctxFor(policy.officeCode))
      policy.sequence.currentNumber += 1
    }
    const audit: GeneratedNumberAudit = {
      id: `gen-${Date.now()}`,
      tenantId: policy.tenantId,
      entityType: req.entityType ?? 'JOB',
      entityId: req.entityId ?? 'mock',
      numberType: policy.type,
      generatedNumber: number,
      policyId: policy.id,
      policyVersion: policy.currentVersion,
      createdAt: new Date().toISOString(),
      createdBy: req.createdBy ?? 'ops',
    }
    state.audits.unshift(audit)
    saveState(state)
    return {
      number,
      policyId: policy.id,
      policyVersion: policy.currentVersion,
      audit,
    }
  },

  listAudits(limit = 20) {
    return state.audits.slice(0, limit)
  },

  listAirlines() {
    return state.airlines
  },

  listPools() {
    return state.pools.map((p) => ({
      ...p,
      available: p.details.filter((d) => d.state === 'available').length,
      allocated: p.details.filter((d) => d.state === 'allocated').length,
    }))
  },

  allocateMawb(jobId: string, jobNo: string, airlineId?: string) {
    for (const pool of state.pools) {
      if (airlineId && pool.airlineId !== airlineId) continue
      const slot = pool.details.find((d) => d.state === 'available')
      if (!slot) continue
      const check = validateMawbFull(slot.mawbNo, pool.prefix)
      if (!check.ok) continue
      slot.state = 'allocated'
      slot.jobId = jobId
      slot.jobNo = jobNo
      saveState(state)
      return {
        mawb: check.normalized ?? slot.mawbNo,
        poolId: pool.id,
        jobId,
        jobNo,
      }
    }
    return { error: 'No available MAWB in pool', status: 409 as const }
  },

  validateMawb(mawb: string, airlineId?: string) {
    const airline = airlineId
      ? state.airlines.find((a) => a.id === airlineId)
      : undefined
    return validateMawbFull(mawb, airline?.mawbPrefix)
  },
}
