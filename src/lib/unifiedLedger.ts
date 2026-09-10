import type { ChargeLine, ChargeLineState } from '@/api/types'
import { lineNeedsVarianceNote } from '@/lib/chargesMoney'

export type LedgerMatchState = 'matched' | 'ap_only' | 'ar_only'

export type LedgerFilter =
  | 'all'
  | 'open'
  | 'variance'
  | 'posted'
  | 'domestic'
  | 'overseas'

export interface UnifiedLedgerRow {
  code: string
  label: string
  currency: string
  ap: ChargeLine | null
  ar: ChargeLine | null
  apAmount: number | null
  arAmount: number | null
  apAmountAud: number | null
  arAmountAud: number | null
  apState: ChargeLineState | null
  arState: ChargeLineState | null
  marginPct: number | null
  costVariance: number | null
  matchState: LedgerMatchState
  oversea: boolean
  varianceFlagged: boolean
  fullyPosted: boolean
  open: boolean
  cafApplied: boolean
}

function cleanLabel(description: string) {
  return description
    .replace(/\s*\(estimate\)\s*/i, ' ')
    .replace(/\s+sell$/i, '')
    .replace(/\s+buy$/i, '')
    .replace(/\s+cost$/i, '')
    .trim()
}

/** Pair AP + AR lines by charge code for Unified Ledger view. */
export function buildUnifiedLedger(
  lines: ChargeLine[],
  varianceThresholdPct = 10,
): UnifiedLedgerRow[] {
  const codes = [...new Set(lines.map((l) => l.code))]
  return codes.map((code) => {
    const group = lines.filter((l) => l.code === code)
    const apLines = group.filter((l) => l.side === 'AP')
    const arLines = group.filter((l) => l.side === 'AR')
    const ap =
      apLines.length === 0
        ? null
        : apLines.length === 1
          ? apLines[0]
          : {
              ...apLines[0],
              amount: apLines.reduce((s, l) => s + l.amount, 0),
              amountAud: apLines.reduce((s, l) => s + l.amountAud, 0),
              varianceAmount:
                apLines.reduce((s, l) => s + (l.varianceAmount ?? 0), 0) || undefined,
            }
    const ar =
      arLines.length === 0
        ? null
        : arLines.length === 1
          ? arLines[0]
          : {
              ...arLines[0],
              amount: arLines.reduce((s, l) => s + l.amount, 0),
              amountAud: arLines.reduce((s, l) => s + l.amountAud, 0),
            }

    let matchState: LedgerMatchState = 'matched'
    if (ap && !ar) matchState = 'ap_only'
    if (ar && !ap) matchState = 'ar_only'

    const apAmount = ap ? ap.amount : null
    const arAmount = ar ? ar.amount : null
    let marginPct: number | null = null
    if (matchState === 'matched' && arAmount != null && arAmount !== 0 && apAmount != null) {
      marginPct = ((arAmount - apAmount) / arAmount) * 100
    }

    const costVariance =
      ap?.varianceAmount != null
        ? ap.varianceAmount
        : ap?.accruedAmount != null && ap?.actualAmount != null
          ? ap.actualAmount - ap.accruedAmount
          : null

    const varianceFlagged = ap ? lineNeedsVarianceNote(ap, varianceThresholdPct) : false
    const fullyPosted = group.every((l) => l.posted || l.state === 'posted')
    const open = group.some(
      (l) =>
        !l.posted &&
        l.state !== 'posted' &&
        l.state !== 'approved' &&
        l.state !== 'invoiced_ar',
    )
    const oversea = Boolean(ar?.oversea ?? ap?.oversea)
    const labelSource = ar?.description ?? ap?.description ?? code
    const cafApplied = Boolean(ap?.cafApplied)

    return {
      code,
      label: cleanLabel(labelSource),
      currency: ar?.currency ?? ap?.currency ?? 'USD',
      ap,
      ar,
      apAmount,
      arAmount,
      apAmountAud: ap?.amountAud ?? null,
      arAmountAud: ar?.amountAud ?? null,
      apState: ap?.state ?? null,
      arState: ar?.state ?? null,
      marginPct,
      costVariance,
      matchState,
      oversea,
      varianceFlagged,
      fullyPosted,
      open,
      cafApplied,
    }
  })
}

export function filterLedgerRows(rows: UnifiedLedgerRow[], filter: LedgerFilter) {
  if (filter === 'all') return rows
  if (filter === 'open') return rows.filter((r) => r.open)
  if (filter === 'variance') return rows.filter((r) => r.varianceFlagged || (r.costVariance ?? 0) !== 0)
  if (filter === 'posted') return rows.filter((r) => r.fullyPosted)
  if (filter === 'domestic') return rows.filter((r) => !r.oversea)
  if (filter === 'overseas') return rows.filter((r) => r.oversea)
  return rows
}

export type LedgerUiStatus = 'Draft' | 'Accrued' | 'Approved' | 'Posted' | 'Variance'

export function ledgerRowStatus(row: UnifiedLedgerRow): LedgerUiStatus {
  if (row.varianceFlagged) return 'Variance'
  if (row.fullyPosted) return 'Posted'
  const states = [row.apState, row.arState]
  if (states.some((s) => s === 'approved' || s === 'invoiced_ar')) return 'Approved'
  if (states.some((s) => s === 'accrued' || s === 'actual_ap' || s === 'rated')) return 'Accrued'
  return 'Draft'
}

export function formatLedgerMoney(n: number | null | undefined, currency = 'AUD') {
  if (n == null) return '—'
  const sign = n < 0 ? '-' : ''
  return `${sign}${currency} ${Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function ledgerStatusClass(s: LedgerUiStatus) {
  const map: Record<LedgerUiStatus, string> = {
    Draft: 'border-[#E4E7EC] bg-[#F3F4F6] text-[#6B7280]',
    Accrued: 'border-[#BFDBFE] bg-[#EFF6FF] text-[#2563EB]',
    Approved: 'border-[#A7F3D0] bg-[#D1FAE5] text-[#059669]',
    Posted: 'border-[#1F2937] bg-[#1F2937] text-white',
    Variance: 'border-[#FDE68A] bg-[#FEF3C7] text-[#B45309]',
  }
  return map[s]
}

export function ledgerChipCounts(rows: UnifiedLedgerRow[]) {
  return {
    all: rows.length,
    open: rows.filter((r) => {
      const s = ledgerRowStatus(r)
      return s === 'Draft' || s === 'Accrued'
    }).length,
    variance: rows.filter((r) => ledgerRowStatus(r) === 'Variance').length,
    posted: rows.filter((r) => ledgerRowStatus(r) === 'Posted').length,
    domestic: rows.filter((r) => !r.oversea).length,
    overseas: rows.filter((r) => r.oversea).length,
  }
}

export function ledgerFilterCounts(rows: UnifiedLedgerRow[]) {
  return ledgerChipCounts(rows)
}
