import { createRouter, createWebHistory } from 'vue-router'
import MyTasksView from '@/views/airfreight/MyTasksView.vue'
import JobContextView from '@/views/airfreight/JobContextView.vue'
import JobSpineView from '@/views/airfreight/JobSpineView.vue'
import ChargesView from '@/views/airfreight/ChargesView.vue'
import InvoiceView from '@/views/airfreight/InvoiceView.vue'
import QuoteCreateView from '@/views/airfreight/QuoteCreateView.vue'
import AdminStudioView from '@/views/airfreight/AdminStudioView.vue'
import NumberingAdminView from '@/views/airfreight/NumberingAdminView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/my-tasks',
    },
    {
      path: '/my-tasks',
      name: 'my-tasks',
      component: MyTasksView,
      meta: { title: 'My Tasks' },
    },
    {
      path: '/jobs/:shipmentId',
      name: 'job-context',
      component: JobContextView,
      meta: { title: 'Job Context' },
    },
    {
      path: '/jobs/:shipmentId/spine',
      name: 'job-spine',
      component: JobSpineView,
      meta: { title: 'Job Spine' },
    },
    {
      path: '/jobs/:shipmentId/charges',
      name: 'job-charges',
      component: ChargesView,
      meta: { title: 'Charges' },
    },
    {
      path: '/jobs/:shipmentId/invoice',
      name: 'job-invoice',
      component: InvoiceView,
      meta: { title: 'Invoice' },
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
      path: '/quotes/new',
      name: 'create-quote',
      component: QuoteCreateView,
      meta: { title: 'Create Quote' },
    },
    {
      path: '/admin',
      name: 'admin',
      component: AdminStudioView,
      meta: { title: 'Admin Studio' },
    },
    {
      path: '/admin/numbering',
      name: 'admin-numbering',
      component: NumberingAdminView,
      meta: { title: 'Numbering Policies' },
    },
  ],
})
