import type { SpineLobPrefix } from '@/types/spineLob'
import { spineLobMeta } from '@/types/spineLob'

/** Label for master transport document — never merge with job number. */
export function masterBillLabel(lobPrefix: SpineLobPrefix): string {
  const mode = spineLobMeta(lobPrefix).mode
  if (mode === 'Air') return 'MAWB'
  if (mode === 'Ocean') return 'MBL'
  return 'Master Doc'
}

/** Label for house transport document. */
export function houseBillLabel(lobPrefix: SpineLobPrefix): string {
  const mode = spineLobMeta(lobPrefix).mode
  if (mode === 'Air') return 'HAWB'
  if (mode === 'Ocean') return 'HBL'
  return 'House Doc'
}

/** Display fallback when bill not yet assigned. */
export function formatMasterBill(value: string | null | undefined): string {
  return value?.trim() ? value : 'PENDING'
}

export function formatHouseBill(value: string | null | undefined): string {
  return value?.trim() ? value : 'DIRECT / NONE'
}
