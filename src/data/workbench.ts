import type { MarketPack, Priority, RaciMark } from '@/lib/designTokens'
import type { SpineLobPrefix } from '@/types/spineLob'

export type DeskTab = 'tasks' | 'approvals' | 'watching'

/**
 * Needs You task row — three identities from control plane (mock slots).
 * `jobNo`, `masterBill`, `houseBill` are API-shaped; never compile in Vue.
 */
export interface WorkbenchJob {
  id: string
  jobId: string
  lobPrefix: SpineLobPrefix
  /** identity.jobNo — e.g. AI20260824001 */
  jobNo: string
  masterBill: string | null
  houseBill: string | null
  priority: Priority
  /**
   * Numeric severity for High→Low sort (0=Critical … 3=Normal/Low).
   * Optional — derived from priority when omitted.
   */
  severityIndex?: number
  /** Financial hold / uninvoiced exposure (AUD mock). */
  moneyRisk?: number
  raci: RaciMark
  hasGate: boolean
  title: string
  route: string
  jobType: string
  pack: MarketPack
  packExtra?: MarketPack
  responsible: string
  accountable: string
  due: string
  why: string
  tab: DeskTab
  customer: string
  actionLabel?: string
}

export interface WorkboardRow {
  jobNo: string
  jobId: string
  lobPrefix: SpineLobPrefix
  route: string
  status: string
  color: string
}

export const WORKBENCH_JOBS: WorkbenchJob[] = [
  {
    id: 'task-1024',
    jobId: 'job-1024',
    lobPrefix: 'AE',
    jobNo: 'AE20260824001',
    masterBill: '999-55443322',
    houseBill: null,
    priority: 'Critical',
    severityIndex: 0,
    moneyRisk: 4820,
    raci: 'R',
    hasGate: true,
    title: 'Customs declaration missing',
    route: 'PVG ✈ LAX',
    jobType: 'Air Export',
    pack: 'GLOBAL',
    packExtra: 'US',
    responsible: 'Alex Rivera',
    accountable: 'Mei Chen',
    due: '4h',
    why: 'AWB filed but customs entry not submitted. Gate blocks booking conversion.',
    tab: 'tasks',
    customer: 'ABC Logistics',
    actionLabel: 'Complete customs checklist',
  },
  {
    id: 'task-3056',
    jobId: 'job-3056',
    lobPrefix: 'AI',
    jobNo: 'AI20260824109',
    masterBill: '176-88221100',
    houseBill: '160-44112233',
    priority: 'Medium',
    severityIndex: 2,
    moneyRisk: 0,
    raci: 'C',
    hasGate: false,
    title: 'Carrier schedule change — delivery window TBC',
    route: 'ORD ✈ MEL',
    jobType: 'Air Import',
    pack: 'US',
    responsible: 'Sam Okonkwo',
    accountable: 'Priya Nair',
    due: 'Today',
    why: 'Carrier notified of schedule change. Impact on delivery window under review.',
    tab: 'tasks',
    customer: 'Midwest Cargo Ltd.',
  },
  {
    id: 'task-8801',
    jobId: 'job-8801',
    lobPrefix: 'OI',
    jobNo: 'OI20260402008',
    masterBill: 'MAEU44920192',
    houseBill: 'HBL-993012',
    priority: 'High',
    severityIndex: 1,
    moneyRisk: 2100,
    raci: 'R',
    hasGate: false,
    title: 'Quote fields incomplete — margin blocked',
    route: 'SFO → SYD',
    jobType: 'Ocean Import',
    pack: 'GLOBAL',
    packExtra: 'US',
    responsible: 'Jordan Lee',
    accountable: 'Mei Chen',
    due: 'Today',
    why: 'Commodity and insurance fields required before margin can be calculated.',
    tab: 'tasks',
    customer: 'East Coast Forwarding',
  },
  {
    id: 'task-2048',
    jobId: 'job-2048',
    lobPrefix: 'AE',
    jobNo: 'AE20260822044',
    masterBill: '125-66778899',
    houseBill: null,
    priority: 'High',
    severityIndex: 1,
    moneyRisk: 9600,
    raci: 'A',
    hasGate: false,
    title: 'Invoice approval pending',
    route: 'LAX ✈ SYD',
    jobType: 'Air Export',
    pack: 'GLOBAL',
    responsible: 'Rita Gomez',
    accountable: 'Claire Nguyen',
    due: 'Today',
    why: 'Invoice #INV-2048 awaiting Finance approval before submission to shipper.',
    tab: 'approvals',
    customer: 'Pacific Freight Co.',
  },
  {
    id: 'task-4072',
    jobId: 'job-4072',
    lobPrefix: 'AI',
    jobNo: 'AI20260820016',
    masterBill: '999-11223344',
    houseBill: '160-99887766',
    priority: 'Normal',
    severityIndex: 3,
    moneyRisk: 0,
    raci: 'I',
    hasGate: false,
    title: 'SYD delivery confirmed — POD received',
    route: 'LAX ✈ SYD',
    jobType: 'Air Import',
    pack: 'AU',
    responsible: 'Luis Ortega',
    accountable: 'Hana Park',
    due: 'Fri',
    why: 'Shipment cleared AU customs. Final-mile delivery confirmed for Friday.',
    tab: 'watching',
    customer: 'Sydney Trade Group',
  },
  {
    id: 'task-5099',
    jobId: 'job-5099',
    lobPrefix: 'OE',
    jobNo: 'OE20260819003',
    masterBill: 'HLCU88291002',
    houseBill: 'HBL-440012',
    priority: 'Medium',
    severityIndex: 2,
    moneyRisk: 1250,
    raci: 'C',
    hasGate: false,
    title: 'Booking rate confirmation — B/L pending',
    route: 'MEL → LAX',
    jobType: 'Ocean Export',
    pack: 'AU',
    responsible: 'Tom Walsh',
    accountable: 'Alex Rivera',
    due: 'Tomorrow',
    why: 'Carrier rate confirmed. Awaiting ops sign-off before B/L issuance.',
    tab: 'watching',
    customer: 'Southern Cross Air',
  },
  {
    id: 'task-6110',
    jobId: 'job-6110',
    lobPrefix: 'TR',
    jobNo: 'TR20260821007',
    masterBill: null,
    houseBill: 'RD-CON-4412',
    priority: 'High',
    severityIndex: 1,
    moneyRisk: 890,
    raci: 'R',
    hasGate: true,
    title: 'Delivery order pending — money lock',
    route: 'SYD → MEL',
    jobType: 'Road / Land',
    pack: 'AU',
    responsible: 'Ops Desk MEL',
    accountable: 'Claire Nguyen',
    due: '4h',
    why: 'Final-mile D/O not released. Money lock until local charges confirmed.',
    tab: 'tasks',
    customer: 'AU Domestic Hub',
    actionLabel: 'Release D/O',
  },
]

export const WORKBOARD: WorkboardRow[] = [
  {
    jobNo: 'AE20260824001',
    jobId: 'job-1024',
    lobPrefix: 'AE',
    route: 'PVG → LAX',
    status: 'Exception',
    color: '#DC2626',
  },
  {
    jobNo: 'AE20260822044',
    jobId: 'job-2048',
    lobPrefix: 'AE',
    route: 'LAX → SYD',
    status: 'Awaiting Approval',
    color: '#D97706',
  },
  {
    jobNo: 'AI20260824109',
    jobId: 'job-3056',
    lobPrefix: 'AI',
    route: 'ORD → MEL',
    status: 'In Transit',
    color: '#059669',
  },
  {
    jobNo: 'AI20260820016',
    jobId: 'job-4072',
    lobPrefix: 'AI',
    route: 'LAX → SYD',
    status: 'Delivered',
    color: '#059669',
  },
  {
    jobNo: 'OE20260819003',
    jobId: 'job-5099',
    lobPrefix: 'OE',
    route: 'MEL → LAX',
    status: 'Booking',
    color: '#CA8A04',
  },
  {
    jobNo: 'TR20260815007',
    jobId: 'job-7003',
    lobPrefix: 'TR',
    route: 'SFO → NRT',
    status: 'Quoted',
    color: '#6B7280',
  },
  {
    jobNo: 'AI20260814022',
    jobId: 'job-7118',
    lobPrefix: 'AI',
    route: 'DFW → FRA',
    status: 'Documents',
    color: '#CA8A04',
  },
]
