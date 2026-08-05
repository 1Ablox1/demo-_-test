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
export const frequentCustomerValues = ['DHL-SC', 'KN', 'MAERSK-L']
export const frequentAirportValues = ['PVG', 'LAX', 'SIN']
export const frequentCountryValues = ['US', 'CN', 'AU']
