import type { LobCode } from '@/lib/lob'
import { LOB_CATALOG, formatJobNo } from '@/lib/lob'

/** Legacy AI OPERATE_TYPE: 0 console · 1 direct · 2 back-to-back */
export type OperateType = 'direct' | 'console' | 'back_to_back'

export type MawbPoolStatus = 'available' | 'allocated' | 'released'

export interface MawbPoolRow {
  id: string
  mawb: string
  airline: string
  status: MawbPoolStatus
  allocatedToJobId: string | null
}

/** Demo check: 3-digit airline prefix + serial (legacy uses real mod-7 in SoR). */
export function validateMawbMod7(mawb: string): boolean {
  const digits = mawb.replace(/\D/g, '')
  return digits.length >= 10 && digits.length <= 12
}

const HOUSE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'

/** Master job no with legacy-style Z suffix for console. */
export function masterJobNo(lob: LobCode, sequence: string | number): string {
  return `${formatJobNo(lob, sequence)}Z`
}

/** House under letter-suffix mode: …Z → …A, …B (simplified OS mock). */
export function houseJobNo(masterNo: string, houseIndex: number): string {
  const base = masterNo.replace(/Z$/i, '')
  if (houseIndex < HOUSE_LETTERS.length) {
    return `${base}${HOUSE_LETTERS[houseIndex]}`
  }
  return `${base}Z${houseIndex - HOUSE_LETTERS.length + 1}`
}

export function nextHawb(prefix: string, seq: number): string {
  const p = prefix.replace(/\D/g, '').slice(0, 3) || '160'
  const body = String(10000000 + seq).slice(1)
  return `${p}-${body}`
}

export function operateTypeLabel(t: OperateType): string {
  if (t === 'console') return 'Console (master + houses)'
  if (t === 'back_to_back') return 'Back-to-back (1 master + 1 house)'
  return 'Direct (MAWB + HAWB on one job)'
}

export function kindFromOperate(
  operateType: OperateType,
  role: 'master' | 'house' | 'direct',
): 'direct' | 'house' | 'master' {
  if (operateType === 'direct') return 'direct'
  return role === 'master' ? 'master' : 'house'
}

export const DEFAULT_MAWB_POOL: MawbPoolRow[] = [
  {
    id: 'pool-1',
    mawb: '999-55443322',
    airline: 'Qantas',
    status: 'allocated',
    allocatedToJobId: '4096',
  },
  {
    id: 'pool-2',
    mawb: '160-11223344',
    airline: 'Cathay Pacific',
    status: 'allocated',
    allocatedToJobId: '8790',
  },
  {
    id: 'pool-3',
    mawb: '081-55443322',
    airline: 'Qantas Freight',
    status: 'allocated',
    allocatedToJobId: '8800',
  },
  {
    id: 'pool-4',
    mawb: '618-99887766',
    airline: 'Singapore Airlines',
    status: 'allocated',
    allocatedToJobId: '8804',
  },
  {
    id: 'pool-5',
    mawb: '016-44556677',
    airline: 'United Airlines',
    status: 'allocated',
    allocatedToJobId: '8772',
  },
  {
    id: 'pool-6',
    mawb: '999-66778899',
    airline: 'Qantas',
    status: 'available',
    allocatedToJobId: null,
  },
  {
    id: 'pool-7',
    mawb: '160-77889900',
    airline: 'Cathay Pacific',
    status: 'available',
    allocatedToJobId: null,
  },
  {
    id: 'pool-8',
    mawb: '081-99001122',
    airline: 'Qantas Freight',
    status: 'available',
    allocatedToJobId: null,
  },
]

export function lobPrefix(lob: LobCode): string {
  return LOB_CATALOG[lob].prefix
}
