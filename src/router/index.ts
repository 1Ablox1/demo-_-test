import { createRouter, createWebHistory } from 'vue-router'
import type { CreateFlowSeat } from '@/lib/rolePermissions'
import { seatAllowsCreateFlow } from '@/lib/rolePermissions'
import { useTasksStore } from '@/stores/tasks'
import DashboardView from '@/views/DashboardView.vue'
import OrchestrationView from '@/views/OrchestrationView.vue'
import ShipmentView from '@/views/ShipmentView.vue'
import ConsolidationView from '@/views/ConsolidationView.vue'
import WorkbenchView from '@/views/WorkbenchView.vue'
import BillingLayout from '@/views/finance/BillingLayout.vue'
import BillingLedgerView from '@/views/finance/BillingLedgerView.vue'
import BillingInvoicesView from '@/views/finance/BillingInvoicesView.vue'
import BillingPayablesView from '@/views/finance/BillingPayablesView.vue'
import JobWorkspaceLayout from '@/views/airfreight/JobWorkspaceLayout.vue'
import JobContextView from '@/views/airfreight/JobContextView.vue'
import JobSpineView from '@/views/airfreight/JobSpineView.vue'
import ChargesView from '@/views/airfreight/ChargesView.vue'
import InvoiceView from '@/views/airfreight/InvoiceView.vue'
import QuoteCreateView from '@/views/airfreight/QuoteCreateView.vue'
import CreateJobView from '@/views/airfreight/CreateJobView.vue'
import JobNewView from '@/views/airfreight/JobNewView.vue'
import AdminStudioView from '@/views/airfreight/AdminStudioView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    {
      path: '/my-tasks',
      redirect: (to) => ({ path: '/dashboard', query: { ...to.query, desk: to.query.desk ?? 'tasks' } }),
    },
    {
      path: '/needs-you',
      redirect: (to) => ({ path: '/dashboard', query: { ...to.query, desk: to.query.desk ?? 'alerts' } }),
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView,
      meta: { title: 'Dashboard' },
    },
    {
      path: '/orchestrate',
      name: 'orchestrate',
      component: OrchestrationView,
      meta: { title: 'Book' },
    },
    {
      path: '/shipments/:shipmentId?',
      name: 'shipment',
      component: ShipmentView,
      meta: { title: 'Jobs' },
    },
    {
      path: '/consolidations/:consolidationId?',
      name: 'consolidation',
      component: ConsolidationView,
      meta: { title: 'Consoles' },
    },
    {
      path: '/workbench',
      name: 'bi-workbench',
      component: WorkbenchView,
      meta: { title: 'Workbench (BI)' },
    },
    {
      path: '/billing',
      component: BillingLayout,
      children: [
        { path: '', name: 'billing-ledger', component: BillingLedgerView, meta: { title: 'Billing' } },
        { path: 'invoices', name: 'billing-invoices', component: BillingInvoicesView, meta: { title: 'Invoices' } },
        { path: 'payables', name: 'billing-payables', component: BillingPayablesView, meta: { title: 'Payables' } },
      ],
    },
    {
      path: '/jobs/:shipmentId',
      component: JobWorkspaceLayout,
      meta: { title: 'Job' },
      children: [
        {
          path: '',
          name: 'job-context',
          component: JobContextView,
          meta: { title: 'Job Context' },
        },
        {
          path: 'spine',
          name: 'job-spine',
          component: JobSpineView,
          meta: { title: 'Job Spine' },
        },
        {
          path: 'charges',
          name: 'job-charges',
          component: ChargesView,
          meta: { title: 'Charges' },
        },
        {
          path: 'invoice',
          name: 'job-invoice',
          component: InvoiceView,
          meta: { title: 'Invoice' },
        },
      ],
    },
    {
      path: '/af-05/:shipmentId',
      redirect: (to) => `/jobs/${to.params.shipmentId}/charges`,
    },
    {
      path: '/af-06/:shipmentId',
      redirect: (to) => `/jobs/${to.params.shipmentId}/invoice`,
    },
    {
      path: '/jobs/create',
      name: 'create-job',
      component: CreateJobView,
      meta: { title: 'Create Job', requiresSeat: 'create_job' satisfies CreateFlowSeat },
    },
    {
      path: '/quotes/new',
      name: 'create-quote',
      component: QuoteCreateView,
      meta: { title: 'Create Quote', requiresSeat: 'create_quote' satisfies CreateFlowSeat },
    },
    {
      path: '/jobs/new',
      name: 'job-new',
      component: JobNewView,
      meta: { title: 'Initialize Booking', requiresSeat: 'initialize_booking' satisfies CreateFlowSeat },
    },
    {
      path: '/admin',
      name: 'admin',
      component: AdminStudioView,
      meta: { title: 'Admin Studio' },
    },
    {
      path: '/admin/market',
      redirect: { name: 'admin', query: { nav: 'market' } },
    },
    {
      path: '/admin/users',
      redirect: { name: 'admin', query: { nav: 'users' } },
    },
    {
      path: '/admin/seats',
      redirect: { name: 'admin', query: { nav: 'seats' } },
    },
    {
      path: '/admin/numbering',
      redirect: { name: 'admin', query: { nav: 'numbering' } },
    },
  ],
})

router.beforeEach((to) => {
  const seat = to.meta.requiresSeat as CreateFlowSeat | undefined
  if (!seat) return true

  const role = useTasksStore().role
  if (seatAllowsCreateFlow(seat, role)) return true

  return { name: 'dashboard', query: { denied: seat } }
})
