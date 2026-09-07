import { formatJobNo, type LobCode } from '@/lib/lob'

export type Seat = 'sales' | 'operations' | 'finance' | 'admin'

export const SEAT_LABELS: Record<Seat, string> = {
  sales: 'Sales',
  operations: 'Operations',
  finance: 'Finance',
  admin: 'Admin',
}

export type TaskTab = 'todo' | 'approvals' | 'following'

export interface DeskTask {
  id: string
  jobNo: string
  lob: LobCode
  customer: string
  title: string
  urgency: 'high' | 'medium' | 'low'
  milestone: string
  handledBy: string
  seat: Seat
  tab: TaskTab
}

export const FAKE_TASKS: DeskTask[] = [
  {
    id: 't1',
    jobNo: formatJobNo('air_export', '8801'),
    lob: 'air_export',
    customer: 'Acme Logistics',
    title: 'Complete quote — missing chargeable weight',
    urgency: 'high',
    milestone: 'Quote',
    handledBy: 'Mei Chen',
    seat: 'sales',
    tab: 'todo',
  },
  {
    id: 't2',
    jobNo: formatJobNo('air_export', '8804'),
    lob: 'air_export',
    customer: 'Pacific Fresh',
    title: 'Capture AWB / milestones',
    urgency: 'medium',
    milestone: 'Booking',
    handledBy: 'Alex Rivera',
    seat: 'operations',
    tab: 'todo',
  },
  {
    id: 't3',
    jobNo: formatJobNo('air_import', '8790'),
    lob: 'air_import',
    customer: 'Sydney Pharma',
    title: 'Docs hold — import clearance chip held',
    urgency: 'high',
    milestone: 'Docs',
    handledBy: 'Priya Nair',
    seat: 'operations',
    tab: 'todo',
  },
  {
    id: 't4',
    jobNo: formatJobNo('air_export', '8801'),
    lob: 'air_export',
    customer: 'Acme Logistics',
    title: 'Approve special pricing (below floor)',
    urgency: 'high',
    milestone: 'Quote',
    handledBy: 'Claire Nguyen',
    seat: 'finance',
    tab: 'approvals',
  },
  {
    id: 't5',
    jobNo: formatJobNo('air_export', '8772'),
    lob: 'air_export',
    customer: 'Blue Ocean Co',
    title: 'Approve charges & ready to post',
    urgency: 'medium',
    milestone: 'Charges',
    handledBy: 'Devon Brooks',
    seat: 'finance',
    tab: 'approvals',
  },
  {
    id: 't6',
    jobNo: formatJobNo('air_export', '8804'),
    lob: 'air_export',
    customer: 'Pacific Fresh',
    title: 'Watching booking convert',
    urgency: 'low',
    milestone: 'Booking',
    handledBy: 'Jordan Lee',
    seat: 'sales',
    tab: 'following',
  },
  {
    id: 't7',
    jobNo: formatJobNo('air_import', '8790'),
    lob: 'air_import',
    customer: 'Sydney Pharma',
    title: 'Following import clearance gate',
    urgency: 'medium',
    milestone: 'Docs',
    handledBy: 'Rita Gomez',
    seat: 'finance',
    tab: 'following',
  },
]
