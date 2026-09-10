/**
 * Console (Consolidation / Master File) — core domain guards.
 * SoT: docs/CONSOLE-DOMAIN-MODEL.md
 */

export type ConsoleDomainErrorCode =
  | 'CONSOLE_AR_INVOICE_FORBIDDEN'
  | 'CONSOLE_CUSTOMS_ENTRY_FORBIDDEN'
  | 'HOUSE_MASTER_SCHEDULE_OVERRIDE_FORBIDDEN'

export class ConsoleDomainError extends Error {
  readonly code: ConsoleDomainErrorCode

  constructor(code: ConsoleDomainErrorCode, message: string) {
    super(message)
    this.name = 'ConsoleDomainError'
    this.code = code
  }
}

/** Customer AR invoice must target a House Job — never the Console. */
export function assertNotConsoleArInvoice(context: 'console' | 'house' | 'direct'): void {
  if (context === 'console') {
    throw new ConsoleDomainError(
      'CONSOLE_AR_INVOICE_FORBIDDEN',
      'Cannot issue customer AR invoice on a Console. Target a House Job (HAWB).',
    )
  }
}

/** Importer customs entry must target a House Job — never the Console. */
export function assertNotConsoleCustomsEntry(context: 'console' | 'house' | 'direct'): void {
  if (context === 'console') {
    throw new ConsoleDomainError(
      'CONSOLE_CUSTOMS_ENTRY_FORBIDDEN',
      'Cannot file importer customs entry on a Console. Target a House Job (HAWB).',
    )
  }
}

/**
 * Attached houses cannot override master schedule/routing fields.
 * Returns which keys are illegal to patch on the house while attached.
 */
export const MASTER_SCHEDULE_FIELDS = [
  'mawb',
  'route',
  'airline',
  'etd',
  'eta',
  'atd',
  'ata',
  'flight',
] as const

export type MasterScheduleField = (typeof MASTER_SCHEDULE_FIELDS)[number]

export function assertHouseMayPatchSchedule(
  attachedToConsole: boolean,
  patchKeys: string[],
): void {
  if (!attachedToConsole) return
  const illegal = patchKeys.filter((k) =>
    (MASTER_SCHEDULE_FIELDS as readonly string[]).includes(k),
  )
  if (illegal.length) {
    throw new ConsoleDomainError(
      'HOUSE_MASTER_SCHEDULE_OVERRIDE_FORBIDDEN',
      `House Job cannot override master schedule fields while attached to a Console: ${illegal.join(', ')}. Update the Console instead.`,
    )
  }
}

/** Safe check helpers for UI (no throw). */
export function canIssueArInvoice(context: 'console' | 'house' | 'direct'): boolean {
  return context !== 'console'
}

export function canFileCustomsEntry(context: 'console' | 'house' | 'direct'): boolean {
  return context !== 'console'
}
