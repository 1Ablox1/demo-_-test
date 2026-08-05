import type { ChargeLine, ChargesGpSummary, ChargesPayload } from '@/api/types'

export function toAud(amount: number, currency: string, fxToAud: number, home = 'AUD') {
  if (currency === home) return round2(amount)
  return round2(amount * fxToAud)
}

export function round2(n: number) {
  return Math.round(n * 100) / 100
}

/** Apply CAF to AP foreign-currency lines: amount = base × (1+CAF%). */
export function applyCafToLines(payload: ChargesPayload) {
  const caf = payload.cafPercent / 100
  for (const line of payload.lines) {
    if (line.side !== 'AP') {
      line.amountAud = toAud(line.amount, line.currency, payload.fxToAud, payload.homeCurrency)
      if (line.actualAmount != null) {
        line.actualAmountAud = toAud(
          line.actualAmount,
          line.currency,
          payload.fxToAud,
          payload.homeCurrency,
        )
      }
      continue
    }
    const base = line.baseAmount ?? line.amount
    line.baseAmount = base
    if (line.currency !== payload.homeCurrency) {
      line.amount = round2(base * (1 + caf))
      line.cafApplied = true
    } else {
      line.amount = base
      line.cafApplied = false
    }
    line.accruedAmount = line.amount
    line.amountAud = toAud(line.amount, line.currency, payload.fxToAud, payload.homeCurrency)
    if (line.actualAmount != null) {
      line.actualAmountAud = toAud(
        line.actualAmount,
        line.currency,
        payload.fxToAud,
        payload.homeCurrency,
      )
      line.varianceAmount = round2(line.actualAmount - (line.accruedAmount ?? line.amount))
    }
  }
  payload.gp = recomputeGp(payload)
}

export function recomputeGp(payload: ChargesPayload): ChargesGpSummary {
  const ar = payload.lines.filter((l) => l.side === 'AR')
  const ap = payload.lines.filter((l) => l.side === 'AP')
  const sellTotal = round2(ar.reduce((s, l) => s + l.amountAud, 0))
  const accruedCostTotal = round2(ap.reduce((s, l) => s + l.amountAud, 0))
  const actuals = ap.filter((l) => l.actualAmountAud != null)
  const actualCostTotal =
    actuals.length === 0 ? null : round2(actuals.reduce((s, l) => s + (l.actualAmountAud ?? 0), 0))
  const provisionalGp = round2(sellTotal - accruedCostTotal)
  const actualGp = actualCostTotal == null ? null : round2(sellTotal - actualCostTotal)
  const varianceTotal =
    actualCostTotal == null ? null : round2(accruedCostTotal - actualCostTotal)
  const postedCount = payload.lines.filter((l) => l.posted || l.state === 'posted').length
  const unpostedCount = payload.lines.length - postedCount
  return {
    sellTotal,
    accruedCostTotal,
    provisionalGp,
    actualCostTotal,
    actualGp,
    varianceTotal,
    currency: payload.homeCurrency,
    wip: payload.moneyState !== 'closed' && payload.moneyState !== 'verified',
    postedCount,
    unpostedCount,
  }
}

export function varianceOverThreshold(line: ChargeLine, thresholdPct: number): boolean {
  if (line.side !== 'AP') return false
  if (line.actualAmount == null || line.accruedAmount == null) return false
  if (line.accruedAmount === 0) return Math.abs(line.actualAmount) > 0
  const pct = (Math.abs(line.actualAmount - line.accruedAmount) / line.accruedAmount) * 100
  return pct > thresholdPct
}

export function lineNeedsVarianceNote(line: ChargeLine, thresholdPct: number): boolean {
  return varianceOverThreshold(line, thresholdPct) && !line.varianceCleared
}
