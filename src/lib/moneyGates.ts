import type { JobClearance, JobContext, JobOpsFacts } from '@/api/types'

export type MoneyHoldType = 'docs' | 'customs' | 'invoice' | 'none'

export interface MoneyBlockState {
  blocked: boolean
  message?: string
  holdType: MoneyHoldType
  source: 'clearance' | 'docs' | 'compliance' | 'none'
}

export function clearanceBlocksMoney(clearance?: JobClearance): boolean {
  if (!clearance) return false
  return clearance.status === 'held' || clearance.status === 'in_progress'
}

/** Shared money-lock rules for shell tabs, MSW, and banners (Module 1 · 4b). */
export function moneyBlockFromJob(job: JobContext | null | undefined): MoneyBlockState {
  if (!job) {
    return { blocked: false, holdType: 'none', source: 'none' }
  }

  if (clearanceBlocksMoney(job.clearance)) {
    return {
      blocked: true,
      message:
        job.clearance?.note ??
        'AU clearance held — Accrue and Invoice stay locked until Cleared.',
      holdType: 'customs',
      source: 'clearance',
    }
  }

  const hold = job.ops.holdType
  if (hold === 'customs' || hold === 'docs') {
    return {
      blocked: true,
      message: docsHoldMessage(job.ops, job.documents.missing),
      holdType: hold,
      source: 'docs',
    }
  }

  if (job.compliance.customs === 'warn' || job.compliance.documents === 'warn') {
    return {
      blocked: true,
      message: 'Docs or customs hold — clear before accruing charges.',
      holdType: 'docs',
      source: 'compliance',
    }
  }

  if (job.documents.missing.length > 0) {
    return {
      blocked: true,
      message: `Missing: ${job.documents.missing.join(', ')}`,
      holdType: 'docs',
      source: 'docs',
    }
  }

  return { blocked: false, holdType: 'none', source: 'none' }
}

export function chargesTabLocked(job: JobContext | null | undefined): boolean {
  return moneyBlockFromJob(job).blocked
}

export function invoiceTabLocked(job: JobContext | null | undefined): boolean {
  if (!job) return false
  // After Finance approve (or issued), Invoice is the next work — never lock on gate-invoice holdType
  const money = job.ops.moneyState
  if (
    money === 'charges_approved' ||
    money === 'invoiced' ||
    money === 'part_invoiced' ||
    money === 'actuals_posted'
  ) {
    return false
  }
  if (chargesTabLocked(job)) return true
  if (clearanceBlocksMoney(job.clearance)) return true
  // Prerequisite holds only — not the invoice gate itself
  if (job.ops.holdType === 'customs' || job.ops.holdType === 'docs') return true
  return false
}

function docsHoldMessage(ops: JobOpsFacts, missing: string[]): string {
  if (missing.length > 0) {
    return `Missing documents: ${missing.join(', ')}`
  }
  if (ops.holdType === 'customs') return 'Customs hold — money locked until cleared.'
  return 'Docs hold — money locked until cleared.'
}
