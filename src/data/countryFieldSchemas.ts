import { packIdForCountry } from '@/data/marketPacks'
import type {
  CountryCode,
  CountryFieldSchema,
  DynamicFieldDef,
  FieldGroup,
  FieldValue,
} from '@/types/tenant'

export const HQ_COUNTRY_OPTIONS: { code: CountryCode; label: string; packHint: string }[] = [
  { code: 'AU', label: 'Australia', packHint: 'AU · GST / ABN / ICS' },
  { code: 'US', label: 'United States', packHint: 'US · EIN / ACE / AES' },
  { code: 'SG', label: 'Singapore', packHint: 'SG · UEN / GST / TradeNet' },
  { code: 'GB', label: 'United Kingdom', packHint: 'GB · VAT / EORI / CDS' },
  { code: 'CA', label: 'Canada', packHint: 'CA · BN / GST-HST / ACI' },
  { code: 'DE', label: 'Germany (EU)', packHint: 'EU · VAT / EORI / ICS2' },
  { code: 'NZ', label: 'New Zealand', packHint: 'GLOBAL only (no overlay pack)' },
]

const COMPANY_NAME: DynamicFieldDef = {
  key: 'legalName',
  label: 'Legal entity name',
  group: 'company',
  kind: 'text',
  required: true,
  placeholder: 'Registered company name',
}

function schema(
  countryCode: CountryCode,
  displayName: string,
  currency: string,
  taxLabel: string,
  taxRate: number,
  taxAppliesToInvoice: boolean,
  fields: DynamicFieldDef[],
): CountryFieldSchema {
  return {
    countryCode,
    packId: packIdForCountry(countryCode),
    displayName,
    currency,
    taxLabel,
    taxRate,
    taxAppliesToInvoice,
    fields: [COMPANY_NAME, ...fields],
  }
}

const AU: CountryFieldSchema = schema('AU', 'Australia', 'AUD', 'GST', 0.1, true, [
  {
    key: 'abn',
    label: 'ABN',
    group: 'tax',
    kind: 'text',
    required: true,
    placeholder: '11-digit ABN',
    pattern: '^\\d{11}$',
    patternMessage: 'ABN must be 11 digits',
    help: 'Australian Business Number. GST-registered entities use this ABN on tax invoices.',
  },
  {
    key: 'gstRegistered',
    label: 'GST registered',
    group: 'tax',
    kind: 'toggle',
    required: true,
    help: 'Taxable importations generally attract GST collected via ICS unless an exemption applies.',
  },
  {
    key: 'icsClientId',
    label: 'ICS client ID',
    group: 'customs',
    kind: 'text',
    required: true,
    placeholder: 'ICS identifier',
    help: 'Integrated Cargo System reporting identity for ABF cargo reports.',
  },
  {
    key: 'bsb',
    label: 'BSB',
    group: 'banking',
    kind: 'text',
    required: true,
    placeholder: 'XXX-XXX',
    pattern: '^\\d{3}-?\\d{3}$',
    patternMessage: 'BSB must be 6 digits (optional hyphen)',
  },
  {
    key: 'accountNumber',
    label: 'Account number',
    group: 'banking',
    kind: 'text',
    required: true,
    placeholder: 'Account number',
  },
  {
    key: 'accountName',
    label: 'Account name',
    group: 'banking',
    kind: 'text',
    required: true,
  },
  {
    key: 'icsFilerRole',
    label: 'ICS filer role',
    group: 'permissions',
    kind: 'select',
    required: true,
    options: [
      { value: 'self', label: 'Self-filer' },
      { value: 'broker', label: 'Licensed broker / declarant' },
    ],
    help: 'Who is allowed to lodge ICS reports for this entity.',
  },
])

const US: CountryFieldSchema = schema('US', 'United States', 'USD', 'Sales tax (not auto-applied)', 0, false, [
  {
    key: 'ein',
    label: 'EIN',
    group: 'tax',
    kind: 'text',
    required: true,
    placeholder: 'XX-XXXXXXX',
    pattern: '^\\d{2}-\\d{7}$',
    patternMessage: 'EIN format is XX-XXXXXXX',
    help: 'Employer Identification Number issued by the IRS.',
  },
  {
    key: 'aceAccount',
    label: 'ACE account',
    group: 'customs',
    kind: 'text',
    required: true,
    placeholder: 'ACE portal account',
    help: 'CBP Automated Commercial Environment account used for entry and cargo release.',
  },
  {
    key: 'aesFilerId',
    label: 'AES filer ID',
    group: 'customs',
    kind: 'text',
    required: true,
    placeholder: 'AES filer / EIN',
    help: 'Identity used to file EEI in AES. Required before US export departure.',
  },
  {
    key: 'routingNumber',
    label: 'ABA routing number',
    group: 'banking',
    kind: 'text',
    required: true,
    placeholder: '9 digits',
    pattern: '^\\d{9}$',
    patternMessage: 'Routing number must be 9 digits',
  },
  {
    key: 'accountNumber',
    label: 'Account number',
    group: 'banking',
    kind: 'text',
    required: true,
  },
  {
    key: 'accountName',
    label: 'Account name',
    group: 'banking',
    kind: 'text',
    required: true,
  },
  {
    key: 'aesFilerType',
    label: 'AES filer type',
    group: 'permissions',
    kind: 'select',
    required: true,
    options: [
      { value: 'usppi', label: 'USPPI (self-filer)' },
      { value: 'forwarding_agent', label: 'Forwarding agent' },
    ],
    help: 'Who may file EEI in AES for this company.',
  },
])

const SG: CountryFieldSchema = schema('SG', 'Singapore', 'SGD', 'GST', 0.09, true, [
  {
    key: 'uen',
    label: 'UEN',
    group: 'tax',
    kind: 'text',
    required: true,
    placeholder: 'Unique Entity Number',
    help: 'Unique Entity Number. Required for TradeNet and GST registration.',
  },
  {
    key: 'gstRegistered',
    label: 'GST registered',
    group: 'tax',
    kind: 'toggle',
    required: true,
  },
  {
    key: 'tradenetDa',
    label: 'TradeNet declaring agent',
    group: 'customs',
    kind: 'text',
    required: true,
    placeholder: 'DA / Customs Account',
    help: 'Declaring Agent or activated Customs Account used on TradeNet permits.',
  },
  {
    key: 'bankCode',
    label: 'Bank code',
    group: 'banking',
    kind: 'text',
    required: true,
    placeholder: '4-digit bank code',
  },
  {
    key: 'accountNumber',
    label: 'Account number',
    group: 'banking',
    kind: 'text',
    required: true,
  },
  {
    key: 'accountName',
    label: 'Account name',
    group: 'banking',
    kind: 'text',
    required: true,
  },
  {
    key: 'declaringAgentRole',
    label: 'Permit lodging role',
    group: 'permissions',
    kind: 'select',
    required: true,
    options: [
      { value: 'self', label: 'Self (Customs Account)' },
      { value: 'da', label: 'Appointed declaring agent' },
    ],
  },
])

const GB: CountryFieldSchema = schema('GB', 'United Kingdom', 'GBP', 'VAT', 0.2, true, [
  {
    key: 'vatNumber',
    label: 'VAT number',
    group: 'tax',
    kind: 'text',
    required: true,
    placeholder: 'GB123456789',
    help: 'UK VAT registration used on tax invoices.',
  },
  {
    key: 'eori',
    label: 'EORI',
    group: 'customs',
    kind: 'text',
    required: true,
    placeholder: 'GB EORI',
    help: 'Economic Operators Registration and Identification number for CDS declarations.',
  },
  {
    key: 'sortCode',
    label: 'Sort code',
    group: 'banking',
    kind: 'text',
    required: true,
    placeholder: 'XX-XX-XX',
    pattern: '^\\d{2}-?\\d{2}-?\\d{2}$',
    patternMessage: 'Sort code is 6 digits',
  },
  {
    key: 'accountNumber',
    label: 'Account number',
    group: 'banking',
    kind: 'text',
    required: true,
    placeholder: '8 digits',
  },
  {
    key: 'accountName',
    label: 'Account name',
    group: 'banking',
    kind: 'text',
    required: true,
  },
  {
    key: 'cdsRole',
    label: 'CDS declaration role',
    group: 'permissions',
    kind: 'select',
    required: true,
    options: [
      { value: 'self', label: 'Self-represent' },
      { value: 'direct', label: 'Direct representative' },
      { value: 'indirect', label: 'Indirect representative' },
    ],
  },
])

const CA: CountryFieldSchema = schema('CA', 'Canada', 'CAD', 'GST', 0.05, true, [
  {
    key: 'businessNumber',
    label: 'Business Number (BN)',
    group: 'tax',
    kind: 'text',
    required: true,
    placeholder: '9-digit BN',
    pattern: '^\\d{9}$',
    patternMessage: 'BN must be 9 digits',
  },
  {
    key: 'gstHst',
    label: 'GST/HST account',
    group: 'tax',
    kind: 'text',
    required: true,
    placeholder: 'BNRT0001',
    help: 'GST/HST program account (often BN + RT0001).',
  },
  {
    key: 'aciCarrierCode',
    label: 'ACI carrier code',
    group: 'customs',
    kind: 'text',
    required: true,
    placeholder: 'CBSA carrier code',
  },
  {
    key: 'institutionNumber',
    label: 'Institution number',
    group: 'banking',
    kind: 'text',
    required: true,
    placeholder: '3 digits',
    pattern: '^\\d{3}$',
    patternMessage: 'Institution number is 3 digits',
  },
  {
    key: 'transitNumber',
    label: 'Transit number',
    group: 'banking',
    kind: 'text',
    required: true,
    placeholder: '5 digits',
    pattern: '^\\d{5}$',
    patternMessage: 'Transit number is 5 digits',
  },
  {
    key: 'accountNumber',
    label: 'Account number',
    group: 'banking',
    kind: 'text',
    required: true,
  },
  {
    key: 'accountName',
    label: 'Account name',
    group: 'banking',
    kind: 'text',
    required: true,
  },
  {
    key: 'aciFilerRole',
    label: 'ACI filer role',
    group: 'permissions',
    kind: 'select',
    required: true,
    options: [
      { value: 'carrier', label: 'Carrier' },
      { value: 'freight_forwarder', label: 'Freight forwarder' },
    ],
  },
])

const DE: CountryFieldSchema = schema('DE', 'Germany (EU)', 'EUR', 'VAT', 0.19, true, [
  {
    key: 'vatNumber',
    label: 'VAT ID (USt-IdNr.)',
    group: 'tax',
    kind: 'text',
    required: true,
    placeholder: 'DE123456789',
  },
  {
    key: 'eori',
    label: 'EORI',
    group: 'customs',
    kind: 'text',
    required: true,
    placeholder: 'DE EORI',
    help: 'Used for ICS2 ENS and customs declarations.',
  },
  {
    key: 'iban',
    label: 'IBAN',
    group: 'banking',
    kind: 'text',
    required: true,
    placeholder: 'DE89 …',
    pattern: '^[A-Z]{2}\\d{2}[A-Z0-9]+$',
    patternMessage: 'Enter a valid IBAN',
  },
  {
    key: 'bic',
    label: 'BIC / SWIFT',
    group: 'banking',
    kind: 'text',
    required: true,
    placeholder: '8 or 11 characters',
  },
  {
    key: 'accountName',
    label: 'Account name',
    group: 'banking',
    kind: 'text',
    required: true,
  },
  {
    key: 'ics2FilerRole',
    label: 'ICS2 filer role',
    group: 'permissions',
    kind: 'select',
    required: true,
    options: [
      { value: 'self', label: 'Self-filer' },
      { value: 'representative', label: 'Customs representative' },
    ],
  },
])

const NZ: CountryFieldSchema = schema('NZ', 'New Zealand', 'NZD', 'GST', 0.15, true, [
  {
    key: 'irdNumber',
    label: 'IRD number',
    group: 'tax',
    kind: 'text',
    required: true,
    placeholder: 'IRD / GST number',
    help: 'No dedicated Market Pack overlay — GLOBAL spine only.',
  },
  {
    key: 'gstRegistered',
    label: 'GST registered',
    group: 'tax',
    kind: 'toggle',
    required: true,
  },
  {
    key: 'accountNumber',
    label: 'Account number',
    group: 'banking',
    kind: 'text',
    required: true,
  },
  {
    key: 'accountName',
    label: 'Account name',
    group: 'banking',
    kind: 'text',
    required: true,
  },
])

export const COUNTRY_FIELD_SCHEMAS: Record<CountryCode, CountryFieldSchema> = {
  AU,
  US,
  SG,
  GB,
  CA,
  DE,
  NZ,
}

export const FIELD_GROUP_LABELS: Record<FieldGroup, string> = {
  company: 'Company profile',
  tax: 'Tax identifiers',
  customs: 'Customs / filing',
  banking: 'Banking',
  permissions: 'Permission management',
}

export const FIELD_GROUP_ORDER: FieldGroup[] = [
  'company',
  'tax',
  'customs',
  'banking',
  'permissions',
]

export function resolveFieldSchema(countryCode: string): CountryFieldSchema {
  const code = countryCode.toUpperCase() as CountryCode
  return COUNTRY_FIELD_SCHEMAS[code] ?? NZ
}

export function emptyValuesForSchema(schemaDef: CountryFieldSchema): Record<string, FieldValue> {
  const values: Record<string, FieldValue> = {}
  for (const field of schemaDef.fields) {
    values[field.key] = field.kind === 'toggle' ? false : ''
  }
  return values
}

export function validateField(field: DynamicFieldDef, value: FieldValue): string | null {
  if (field.kind === 'toggle') return null
  const text = String(value ?? '').trim()
  if (field.required && !text) return `${field.label} is required`
  if (text && field.pattern && !new RegExp(field.pattern).test(text)) {
    return field.patternMessage ?? `${field.label} is invalid`
  }
  return null
}

export function validateSchema(
  schemaDef: CountryFieldSchema,
  values: Record<string, FieldValue>,
): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const field of schemaDef.fields) {
    const message = validateField(field, values[field.key] ?? (field.kind === 'toggle' ? false : ''))
    if (message) errors[field.key] = message
  }
  return errors
}
