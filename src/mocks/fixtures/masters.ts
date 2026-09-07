import type { MasterOption } from '@/mdm/types'

/** Curated Operational MDM fixtures — production loads full catalog via adapter. */
export const masterCustomers: MasterOption[] = [
  {
    kind: 'customer',
    label: 'DHL Supply Chain',
    value: 'DHL-SC',
    aliases: ['DHL', 'DHL Logistics'],
    meta: 'Customer · DE',
  },
  {
    kind: 'customer',
    label: 'Kuehne + Nagel',
    value: 'KN',
    aliases: ['K+N', 'KN', 'Kuehne Nagel'],
    meta: 'Customer · CH',
  },
  {
    kind: 'customer',
    label: 'Maersk Logistics',
    value: 'MAERSK-L',
    aliases: ['Maersk', 'MSK'],
    meta: 'Customer · DK',
  },
  {
    kind: 'customer',
    label: 'DB Schenker',
    value: 'DBS',
    aliases: ['Schenker', 'DB'],
    meta: 'Customer · DE',
  },
  {
    kind: 'customer',
    label: 'FedEx Logistics',
    value: 'FDX-L',
    aliases: ['FedEx', 'FX'],
    meta: 'Customer · US',
  },
  {
    kind: 'customer',
    label: 'Nova Pharma',
    value: 'NOVA-PHARMA',
    aliases: ['Nova', 'Nova Pharma AU', 'NovaPharma'],
    meta: 'Customer · AU · Module 1 golden',
  },
]

export const masterCountries: MasterOption[] = [
  {
    kind: 'country',
    label: 'United States',
    value: 'US',
    aliases: ['USA', 'America', 'United States of America'],
  },
  {
    kind: 'country',
    label: 'United Kingdom',
    value: 'GB',
    aliases: ['UK', 'Britain', 'Great Britain', 'England'],
  },
  {
    kind: 'country',
    label: 'China',
    value: 'CN',
    aliases: ['PRC', 'People\'s Republic of China'],
  },
  {
    kind: 'country',
    label: 'Australia',
    value: 'AU',
    aliases: ['Aussie', 'AUS'],
  },
  {
    kind: 'country',
    label: 'Germany',
    value: 'DE',
    aliases: ['Deutschland', 'GER'],
  },
  {
    kind: 'country',
    label: 'Singapore',
    value: 'SG',
    aliases: ['SGP'],
  },
  {
    kind: 'country',
    label: 'United Arab Emirates',
    value: 'AE',
    aliases: ['UAE', 'Emirates'],
  },
]

export const masterAirports: MasterOption[] = [
  {
    kind: 'airport',
    label: 'Shanghai Pudong',
    value: 'PVG',
    aliases: ['Shanghai', 'Pudong', 'ZSPD'],
    meta: 'China',
  },
  {
    kind: 'airport',
    label: 'Los Angeles Intl',
    value: 'LAX',
    aliases: ['Los Angeles', 'LA', 'KLAX'],
    meta: 'United States',
  },
  {
    kind: 'airport',
    label: 'Singapore Changi',
    value: 'SIN',
    aliases: ['Singapore', 'Changi', 'WSSS'],
    meta: 'Singapore',
  },
  {
    kind: 'airport',
    label: 'New York JFK',
    value: 'JFK',
    aliases: ['New York', 'NY', 'NYC', 'Kennedy', 'KJFK'],
    meta: 'United States',
  },
  {
    kind: 'airport',
    label: 'Frankfurt',
    value: 'FRA',
    aliases: ['Frankfurt Main', 'EDDF'],
    meta: 'Germany',
  },
  {
    kind: 'airport',
    label: 'Sydney Kingsford Smith',
    value: 'SYD',
    aliases: ['Sydney', 'YSSY', 'Kingsford'],
    meta: 'Australia',
  },
]

/** Module 1 AU Air Import demo lane (quote → 4096-class). */
export const MODULE1_AI_LANE = {
  origin: 'PVG',
  dest: 'SYD',
  currency: 'AUD',
  airline: 'QF',
  customer: 'NOVA-PHARMA',
} as const

/** Thin airline list for quote — not full legacy airline MDM. */
export const masterAirlines: MasterOption[] = [
  { kind: 'airline', label: 'Qantas', value: 'QF', aliases: ['Qantas Airways'], meta: 'Australia' },
  { kind: 'airline', label: 'China Airlines', value: 'CI', aliases: ['CAL'], meta: 'Taiwan' },
  { kind: 'airline', label: 'Cathay Pacific', value: 'CX', aliases: ['Cathay'], meta: 'Hong Kong' },
  { kind: 'airline', label: 'Singapore Airlines', value: 'SQ', aliases: ['SIA'], meta: 'Singapore' },
  { kind: 'airline', label: 'United Airlines', value: 'UA', aliases: ['United'], meta: 'United States' },
  { kind: 'airline', label: 'Lufthansa', value: 'LH', aliases: ['DLH'], meta: 'Germany' },
]

/**
 * Thin charge codes for AI quote / AF-05 — not full charge MDM.
 * Sell/cost pairing stays on the job; Rating service later.
 */
export const masterChargeCodes: MasterOption[] = [
  { kind: 'charge', label: 'Air Freight', value: 'FREIGHT', aliases: ['FRT', 'Airfreight'], meta: 'Per kg' },
  { kind: 'charge', label: 'Fuel Surcharge', value: 'FSC', aliases: ['Fuel'], meta: 'Per kg' },
  { kind: 'charge', label: 'Security Surcharge', value: 'SSC', aliases: ['Security'], meta: 'Per kg' },
  { kind: 'charge', label: 'Destination Charges', value: 'DCH', aliases: ['Dest charges'], meta: 'Per shipment · AI' },
  { kind: 'charge', label: 'Origin Charges', value: 'OCA', aliases: ['Origin'], meta: 'Per shipment' },
  { kind: 'charge', label: 'Customs Clearance', value: 'CCL', aliases: ['Clearance'], meta: 'Per shipment · AU' },
]

export const masterCurrencies: MasterOption[] = [
  { kind: 'currency', label: 'Australian Dollar', value: 'AUD', aliases: ['A$'] },
  { kind: 'currency', label: 'US Dollar', value: 'USD', aliases: ['$'] },
  { kind: 'currency', label: 'Euro', value: 'EUR', aliases: ['€'] },
  { kind: 'currency', label: 'Chinese Yuan', value: 'CNY', aliases: ['RMB', '¥'] },
  { kind: 'currency', label: 'Hong Kong Dollar', value: 'HKD', aliases: ['HK$'] },
  { kind: 'currency', label: 'Singapore Dollar', value: 'SGD', aliases: ['S$'] },
]

export const masterPorts: MasterOption[] = [
  {
    kind: 'port',
    label: 'Shanghai',
    value: 'CNSHA',
    aliases: ['SHA', 'Shanghai Port'],
    meta: 'China',
  },
  {
    kind: 'port',
    label: 'Los Angeles',
    value: 'USLAX',
    aliases: ['LA', 'LAX Port'],
    meta: 'United States',
  },
  {
    kind: 'port',
    label: 'Singapore',
    value: 'SGSIN',
    aliases: ['SIN Port'],
    meta: 'Singapore',
  },
  {
    kind: 'port',
    label: 'Rotterdam',
    value: 'NLRTM',
    aliases: ['RTM'],
    meta: 'Netherlands',
  },
  {
    kind: 'port',
    label: 'Hamburg',
    value: 'DEHAM',
    aliases: ['HAM'],
    meta: 'Germany',
  },
]

/** Seed “frequently used” for high-frequency desks (mock). */
export const frequentCustomerValues = ['NOVA-PHARMA', 'DHL-SC', 'KN', 'MAERSK-L']
export const frequentAirportValues = ['PVG', 'SYD', 'LAX', 'SIN']
export const frequentCountryValues = ['US', 'CN', 'AU']
