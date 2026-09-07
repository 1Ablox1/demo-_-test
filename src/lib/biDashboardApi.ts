import { envFetch } from '@/lib/apiAdapter'
import type { Seat } from '@/stores/auth'

/**
 * Legacy BI / Metabase seam — mirrors Abdalla's external-service flow:
 *
 * Browser → GET /bi/dashboard/list?branchId&deptId&showAll
 *   → BiController.getDashboardList
 *   → BiServiceImpl.getUserDashboards
 *        checkBiInitProcessingNError(tenantId)
 *        biDashboardDao.selectByExample(tenantId)
 *        addDefaultDashboard() if empty
 *        BiHttpService.getDashboard(id) → Metabase
 *        setDashboardFilters (company/dept/person scope)
 *        BiHandler.getEmbeddingUrl → signed JWT
 *   → List<{ url }> for Vue iframe
 *
 * FE never holds bi.secretKey — only consumes embed URLs.
 */

export interface BiDashboardVO {
  id: string
  name: string
  /** Signed Metabase embed URL (or mock placeholder). */
  url: string
  /** Seat tags that may surface this board in Workbench chooser. */
  seats: Seat[]
  source: 'metabase'
}

export interface BiDashboardListQuery {
  tenantId: string
  branchId: string
  deptId?: string
  showAll?: boolean
  seat: Seat
}

/** Mock tenant BI provisioned boards (stand-in for bi_dashboard MySQL rows). */
const TENANT_BOARDS: BiDashboardVO[] = [
  {
    id: 'mb-ops-std',
    name: '标准仪表盘 · Ops pipeline',
    url: '',
    seats: ['operations', 'admin'],
    source: 'metabase',
  },
  {
    id: 'mb-fin-pipeline',
    name: 'Finance · Unbilled & invoice ready',
    url: '',
    seats: ['finance', 'admin'],
    source: 'metabase',
  },
  {
    id: 'mb-sales-quotes',
    name: 'Sales · Quote conversion',
    url: '',
    seats: ['sales', 'admin'],
    source: 'metabase',
  },
]

function mockEmbedUrl(board: BiDashboardVO, q: BiDashboardListQuery): string {
  // Placeholder — real BFF returns Metabase {biWrapperHost}/embed/dashboard/{jwt}
  const params = new URLSearchParams({
    board: board.id,
    tenant: q.tenantId,
    branch: q.branchId,
    seat: q.seat,
    mock: '1',
  })
  return `about:blank#metabase-embed?${params.toString()}`
}

/**
 * Tenant permission → configured dashboard IDs → embed URLs.
 * Mock: filters boards by seat unless showAll (admin).
 */
export async function getBiDashboardList(
  query: BiDashboardListQuery,
): Promise<BiDashboardVO[]> {
  const list = TENANT_BOARDS.filter(
    (b) => query.showAll || b.seats.includes(query.seat),
  ).map((b) => ({
    ...b,
    url: mockEmbedUrl(b, query),
  }))

  await envFetch('/bi/dashboard/list', {
    method: 'GET',
    data: list,
    body: {
      branchId: query.branchId,
      deptId: query.deptId ?? '',
      showAll: query.showAll ?? false,
      seat: query.seat,
    },
  })

  return list
}

export function primaryBoardForSeat(
  boards: BiDashboardVO[],
  seat: Seat,
): BiDashboardVO | null {
  return boards.find((b) => b.seats.includes(seat)) ?? boards[0] ?? null
}
