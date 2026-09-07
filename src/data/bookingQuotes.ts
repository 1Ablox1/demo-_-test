import type { BookingQuoteSeed } from '@/types/bookingWizard'

/** Pending commercial quotes — Book → From Quote inherits these fields. */
export const BOOKING_QUOTES: BookingQuoteSeed[] = [
  {
    id: 'q-4102',
    quoteNo: 'Q-AI-4102',
    customer: 'Nova Pharma AU',
    lobPrefix: 'AI',
    route: 'PVG → SYD',
    origin: 'PVG',
    destination: 'SYD',
    airline: 'China Eastern',
    pieces: '18',
    weightKg: '960',
    volumeCbm: '6.2',
    commodity: 'Pharma · cold chain',
    sellTotal: 4280,
    currency: 'AUD',
    chargeLines: [
      { code: 'AFR', description: 'Air freight sell', side: 'AR', amount: 3200, currency: 'AUD' },
      { code: 'FSC', description: 'Fuel surcharge', side: 'AR', amount: 480, currency: 'AUD' },
      { code: 'THC', description: 'Terminal handling', side: 'AR', amount: 600, currency: 'AUD' },
      { code: 'AFR', description: 'Airline buy', side: 'AP', amount: 2650, currency: 'AUD' },
    ],
  },
  {
    id: 'q-8808',
    quoteNo: 'Q-AE-8808',
    customer: 'Acme Logistics',
    lobPrefix: 'AE',
    route: 'SYD → LAX',
    origin: 'SYD',
    destination: 'LAX',
    airline: 'Qantas Freight',
    pieces: '24',
    weightKg: '1540',
    volumeCbm: '9.1',
    commodity: 'General cargo',
    sellTotal: 5120,
    currency: 'AUD',
    chargeLines: [
      { code: 'AFR', description: 'Air freight sell', side: 'AR', amount: 4100, currency: 'AUD' },
      { code: 'DOC', description: 'Documentation', side: 'AR', amount: 180, currency: 'AUD' },
      { code: 'AFR', description: 'Airline buy', side: 'AP', amount: 3380, currency: 'AUD' },
    ],
  },
  {
    id: 'q-2201',
    quoteNo: 'Q-OI-2201',
    customer: 'Pacific Trade Co.',
    lobPrefix: 'OI',
    route: 'SHA → MEL',
    origin: 'SHA',
    destination: 'MEL',
    airline: 'COSCO',
    pieces: '2 × 40HC',
    weightKg: '18400',
    volumeCbm: '118',
    commodity: 'Machinery',
    sellTotal: 8900,
    currency: 'AUD',
    chargeLines: [
      { code: 'OFR', description: 'Ocean freight', side: 'AR', amount: 7200, currency: 'AUD' },
      { code: 'THC', description: 'Destination THC', side: 'AR', amount: 1700, currency: 'AUD' },
      { code: 'OFR', description: 'Carrier buy', side: 'AP', amount: 6100, currency: 'AUD' },
    ],
  },
]

export function quoteById(id: string): BookingQuoteSeed | undefined {
  return BOOKING_QUOTES.find((q) => q.id === id)
}
