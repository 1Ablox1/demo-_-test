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

export function ledgerFilterCounts(rows: UnifiedLedgerRow[]) {
  return {
    all: rows.length,
    open: rows.filter((r) => r.open).length,
    variance: rows.filter((r) => r.varianceFlagged || (r.costVariance ?? 0) !== 0).length,
    posted: rows.filter((r) => r.fullyPosted).length,
    domestic: rows.filter((r) => !r.oversea).length,
    overseas: rows.filter((r) => r.oversea).length,
  }
}
