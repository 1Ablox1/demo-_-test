<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { AdminNavId } from '@/stores/admin'
import { useShellJobStore } from '@/stores/shellJob'
import { useFreightStore } from '@/stores/freight'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const jobStore = useShellJobStore()
const freight = useFreightStore()

interface CrumbLink {
  label: string
  to: RouteLocationRaw
}

interface Crumb {
  label: string
  to?: RouteLocationRaw
  current?: boolean
  dropdown?: CrumbLink[]
}

const JOB_TABS: { name: string; label: string }[] = [
  { name: 'job-context', label: 'Overview' },
  { name: 'job-spine', label: 'Timeline' },
]

const BILLING_TABS = [
  { name: 'billing-ledger', label: 'Ledger' },
  { name: 'billing-invoices', label: 'Invoices' },
  { name: 'billing-payables', label: 'Payables' },
]

const ADMIN_SECTIONS: { id: AdminNavId; label: string }[] = [
  { id: 'builder', label: 'App Builder' },
  { id: 'tenant', label: 'Company' },
  { id: 'market', label: 'Market packs' },
  { id: 'users', label: 'Users' },
  { id: 'seats', label: 'Roles & seats' },
  { id: 'numbering', label: 'Job numbers' },
  { id: 'catalogs', label: 'Basic data' },
  { id: 'partners', label: 'Partners' },
  { id: 'mdm-setup', label: 'MDM setup' },
  { id: 'rulebook', label: 'Rules' },
  { id: 'digital', label: 'Helpers' },
]

/** Quick jumps kept on Overview crumb so related surfaces stay one click away. */
function jobRelatedLinks(shipmentId: string, exclude?: string): CrumbLink[] {
  const all: (CrumbLink & { key: string })[] = [
    {
      key: 'overview',
      label: 'Overview',
      to: { name: 'job-context', params: { shipmentId } },
    },
    {
      key: 'timeline',
      label: 'Timeline',
      to: { name: 'job-spine', params: { shipmentId } },
    },
    {
      key: 'edit',
      label: 'Edit Job · Charges & Invoice',
      to: {
        name: 'shipment',
        params: { shipmentId },
        query: { step: 'money_preview', from: 'overview' },
      },
    },
    {
      key: 'billing',
      label: 'Portfolio Billing',
      to: {
        name: 'billing-ledger',
        query: { job: shipmentId, from: 'overview' },
      },
    },
  ]
  return all.filter((l) => l.key !== exclude).map(({ label, to }) => ({ label, to }))
}

function jobSwitcherDropdown(activeId: string, tabName = 'job-context'): CrumbLink[] {
  return Object.values(jobStore.JOBS)
    .filter((j) => j.id !== activeId)
    .map((j) => ({
      label: `${j.jobNo} · ${j.customer}`,
      to: {
        name: tabName,
        params: { shipmentId: j.id },
      },
    }))
}

function resolveJobId(): string | null {
  const fromParam = route.params.shipmentId ? String(route.params.shipmentId) : ''
  const fromQuery = route.query.job ? String(route.query.job) : ''
  return fromParam || fromQuery || null
}

function jobLabelFor(id: string): string {
  return (
    jobStore.JOBS[id]?.jobNo ??
    jobStore.job?.jobNo ??
    freight.shipments.find((s) => s.id === id)?.jobNo ??
    id
  )
}

const crumbs = computed<Crumb[]>(() => {
  const items: Crumb[] = [{ label: 'Home', to: { name: 'dashboard' } }]
  const name = String(route.name ?? '')
  const path = route.path

  if (name === 'dashboard' || name === 'workbench') {
    items.push({ label: 'Dashboard', current: true })
    return items
  }

  if (name === 'intel') {
    items.push({ label: 'Dashboard', current: true })
    return items
  }

  if (name === 'okta-dashboard') {
    items.push({ label: 'Okta Dashboard', current: true })
    return items
  }

  if (name === 'orchestrate') {
    const lob = typeof route.query.lob === 'string' ? route.query.lob.toUpperCase() : ''
    items.push({ label: 'Air Freight' })
    if (lob === 'AI') items.push({ label: 'Air Import' })
    else if (lob === 'AE') items.push({ label: 'Air Export' })
    items.push({ label: 'Book', current: true })
    return items
  }

  if (name.startsWith('billing-') || path.startsWith('/billing')) {
    const jobId = resolveJobId()
    const tab = BILLING_TABS.find((t) => t.name === name) ?? BILLING_TABS[0]!

    if (jobId) {
      items.push({
        label: jobLabelFor(jobId),
        to: { name: 'job-context', params: { shipmentId: jobId } },
        dropdown: jobSwitcherDropdown(jobId),
      })
      items.push({
        label: 'Overview',
        to: { name: 'job-context', params: { shipmentId: jobId } },
        dropdown: jobRelatedLinks(jobId, 'billing'),
      })
      items.push({
        label: `Billing · ${tab.label}`,
        current: true,
        dropdown: BILLING_TABS.filter((t) => t.name !== tab.name).map((t) => ({
          label: t.label,
          to: {
            name: t.name,
            query: {
              job: jobId,
              ...(route.query.from ? { from: String(route.query.from) } : {}),
            },
          },
        })),
      })
      return items
    }

    items.push({ label: 'Billing', to: { name: 'billing-ledger' } })
    items.push({
      label: tab.label,
      current: true,
      dropdown: BILLING_TABS.filter((t) => t.name !== tab.name).map((t) => ({
        label: t.label,
        to: { name: t.name },
      })),
    })
    return items
  }

  if (name === 'bi-workbench') {
    items.push({ label: 'Dashboard', to: { name: 'dashboard' } })
    items.push({ label: 'Workbench (BI)', current: true })
    return items
  }

  if (name === 'app-builder') {
    items.push({ label: 'Admin', to: { name: 'admin' } })
    items.push({ label: 'App Builder', current: true })
    return items
  }

  if (name === 'shipment' || path.startsWith('/shipments')) {
    const sid = route.params.shipmentId ? String(route.params.shipmentId) : ''
    const isNew = String(route.query.mode ?? '') === 'new'
    const row = sid ? freight.shipments.find((s) => s.id === sid) : undefined
    const fromOverview = route.query.from === 'overview'
    const knownJob = sid && (jobStore.JOBS[sid] || jobStore.job?.id === sid || row)

    if (fromOverview && sid && knownJob) {
      items.push({
        label: row?.jobNo ?? jobLabelFor(sid),
        to: { name: 'job-context', params: { shipmentId: sid } },
        dropdown: jobSwitcherDropdown(sid),
      })
      items.push({
        label: 'Overview',
        to: { name: 'job-context', params: { shipmentId: sid } },
        dropdown: jobRelatedLinks(sid, 'edit'),
      })
      items.push({ label: 'Edit booking', current: true })
      return items
    }

    items.push({ label: 'Air Freight' })
    {
      const lob = typeof route.query.lob === 'string' ? route.query.lob.toUpperCase() : ''
      const rowLob = row ? (row.lob === 'air_import' ? 'AI' : row.lob === 'air_export' ? 'AE' : '') : lob
      if (rowLob === 'AI') {
        items.push({ label: 'Air Import', to: { name: 'shipment', query: { lob: 'AI' } } })
      } else if (rowLob === 'AE') {
        items.push({ label: 'Air Export', to: { name: 'shipment', query: { lob: 'AE' } } })
      }
    }
    items.push({
      label: 'Jobs',
      to: {
        name: 'shipment',
        query: typeof route.query.lob === 'string' ? { lob: String(route.query.lob).toUpperCase() } : {},
      },
    })
    if (isNew) {
      items.push({ label: 'New', current: true })
      return items
    }
    if (sid) {
      const links: CrumbLink[] = [
        ...freight.shipments
          .filter((s) => s.id !== sid)
          .filter((s) => {
            const lob = typeof route.query.lob === 'string' ? route.query.lob.toUpperCase() : ''
            if (lob === 'AI') return s.lob === 'air_import'
            if (lob === 'AE') return s.lob === 'air_export'
            return true
          })
          .slice(0, 10)
          .map((s) => ({
            label: s.jobNo,
            to: {
              name: 'shipment',
              params: { shipmentId: s.id },
              query: typeof route.query.lob === 'string' ? { lob: String(route.query.lob).toUpperCase() } : {},
            } as RouteLocationRaw,
          })),
      ]
      if (jobStore.JOBS[sid] || jobStore.job?.id === sid) {
        links.unshift(...jobRelatedLinks(sid, 'edit'))
      }
      items.push({
        label: row?.jobNo ?? sid,
        current: true,
        dropdown: links,
      })
    } else {
      items[items.length - 1] = { label: 'Jobs', current: true }
    }
    return items
  }

  if (name === 'consolidation' || path.startsWith('/consolidations')) {
    items.push({ label: 'Air Freight' })
    const cid = route.params.consolidationId ? String(route.params.consolidationId) : ''
    const conRow = cid ? freight.consolidations.find((c) => c.id === cid) : undefined
    {
      const lob = typeof route.query.lob === 'string' ? route.query.lob.toUpperCase() : ''
      const rowLob = conRow
        ? conRow.lob === 'air_import'
          ? 'AI'
          : conRow.lob === 'air_export'
            ? 'AE'
            : ''
        : lob
      if (rowLob === 'AI') {
        items.push({ label: 'Air Import', to: { name: 'consolidation', query: { lob: 'AI' } } })
      } else if (rowLob === 'AE') {
        items.push({ label: 'Air Export', to: { name: 'consolidation', query: { lob: 'AE' } } })
      }
    }
    items.push({
      label: 'Consoles',
      to: {
        name: 'consolidation',
        query: typeof route.query.lob === 'string' ? { lob: String(route.query.lob).toUpperCase() } : {},
      },
    })
    if (cid) {
      items.push({
        label: conRow?.masterJobNo ?? cid,
        current: true,
        dropdown: freight.consolidations
          .filter((c) => c.id !== cid)
          .filter((c) => {
            const lob = typeof route.query.lob === 'string' ? route.query.lob.toUpperCase() : ''
            if (lob === 'AI') return c.lob === 'air_import'
            if (lob === 'AE') return c.lob === 'air_export'
            return true
          })
          .map((c) => ({
            label: c.masterJobNo,
            to: {
              name: 'consolidation',
              params: { consolidationId: c.id },
              query: typeof route.query.lob === 'string' ? { lob: String(route.query.lob).toUpperCase() } : {},
            },
          })),
      })
    } else {
      items[items.length - 1] = { label: 'Consoles', current: true }
    }
    return items
  }

  if (name.startsWith('job-') || path.startsWith('/jobs/')) {
    const shipmentId = String(route.params.shipmentId ?? '')
    const jobLabel = jobStore.job?.jobNo ?? shipmentId
    const tabName =
      name === 'job-billing' || name === 'job-documents' ? 'job-context' : name
    const tab = JOB_TABS.find((t) => t.name === tabName) ?? JOB_TABS[0]!
    const excludeKey =
      tab.name === 'job-spine' ? 'timeline' : tab.name === 'job-context' ? 'overview' : 'overview'

    items.push({ label: 'Air Freight' })
    {
      const ship = freight.shipments.find((s) => s.id === shipmentId)
      const air = ship?.lob === 'air_import' ? 'AI' : ship?.lob === 'air_export' ? 'AE' : null
      if (air === 'AI') {
        items.push({ label: 'Air Import', to: { name: 'shipment', query: { lob: 'AI' } } })
      } else if (air === 'AE') {
        items.push({ label: 'Air Export', to: { name: 'shipment', query: { lob: 'AE' } } })
      }
    }
    items.push({
      label: 'Jobs',
      to: {
        name: 'shipment',
        query: (() => {
          const ship = freight.shipments.find((s) => s.id === shipmentId)
          if (ship?.lob === 'air_import') return { lob: 'AI' }
          if (ship?.lob === 'air_export') return { lob: 'AE' }
          return {}
        })(),
      },
    })
    items.push({
      label: jobLabel,
      to: { name: 'job-context', params: { shipmentId } },
      dropdown: jobSwitcherDropdown(shipmentId, tabName),
    })

    if (tab.name === 'job-context' && name !== 'job-documents') {
      items.push({
        label: 'Overview',
        current: true,
        dropdown: jobRelatedLinks(shipmentId, 'overview'),
      })
    } else if (name === 'job-documents') {
      items.push({
        label: 'Overview',
        to: { name: 'job-context', params: { shipmentId } },
        dropdown: jobRelatedLinks(shipmentId, 'overview'),
      })
      items.push({ label: 'Documents', current: true })
    } else {
      items.push({
        label: 'Overview',
        to: { name: 'job-context', params: { shipmentId } },
        dropdown: jobRelatedLinks(shipmentId, excludeKey),
      })
      items.push({
        label: tab.label,
        current: true,
      })
    }
    return items
  }

  if (name === 'admin' || path.startsWith('/admin')) {
    items.push({ label: 'Dashboard', to: { name: 'dashboard' } })
    if (auth.isAdmin) {
      items.push({ label: 'Admin', to: { name: 'admin' } })
      const raw = String(route.params.section ?? '')
      const sectionId = ADMIN_SECTIONS.some((s) => s.id === raw) ? (raw as AdminNavId) : 'tenant'
      const section = ADMIN_SECTIONS.find((s) => s.id === sectionId) ?? ADMIN_SECTIONS[0]!
      items.push({
        label: section.label,
        current: true,
        dropdown: ADMIN_SECTIONS.filter((s) => s.id !== section.id).map((s) => ({
          label: s.label,
          to:
            s.id === 'builder'
              ? { name: 'app-builder' }
              : s.id === 'tenant'
                ? '/admin'
                : `/admin/${s.id}`,
        })),
      })
    } else {
      items.push({ label: 'Admin', current: true })
    }
    return items
  }

  items.push({ label: 'Dashboard', current: true })
  return items
})

function go(to?: RouteLocationRaw) {
  if (!to) return
  void router.push(to)
}
</script>

<template>
  <nav class="os-breadcrumb-bar" aria-label="Path">
    <ol class="os-breadcrumb">
      <li
        v-for="(crumb, i) in crumbs"
        :key="`${crumb.label}-${i}`"
        :class="{
          active: crumb.current,
          relative: !!crumb.dropdown,
          'drop-container': !!crumb.dropdown,
        }"
      >
        <a
          v-if="crumb.to && !crumb.current"
          href="#"
          @click.prevent="go(crumb.to)"
        >
          {{ crumb.label }}
          <span v-if="crumb.dropdown" class="caret caret--link" aria-hidden="true" />
        </a>
        <span v-else>
          {{ crumb.label }}
          <span v-if="crumb.dropdown" class="caret" aria-hidden="true" />
        </span>
        <div v-if="crumb.dropdown?.length" class="drop bg-white">
          <ul class="list pl0">
            <li v-for="opt in crumb.dropdown" :key="opt.label">
              <a href="#" @click.prevent="go(opt.to)">{{ opt.label }}</a>
            </li>
          </ul>
        </div>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
/* CodePen PQxvaa — Bootstrap breadcrumb + hover dropdown, OS tokens */
.os-breadcrumb-bar {
  border-bottom: 1px solid #e4e7ec;
  background: #fff;
  padding: 0 24px;
}

.os-breadcrumb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin: 0;
  padding: 8px 0;
  list-style: none;
  font-size: 13px;
  line-height: 1.4;
}

.os-breadcrumb > li {
  display: inline-flex;
  align-items: center;
}

.os-breadcrumb > li + li::before {
  padding: 0 8px;
  color: #ccc;
  content: '/\00a0';
}

.os-breadcrumb a {
  color: var(--color-primary);
  text-decoration: none;
}

.os-breadcrumb a:hover {
  color: var(--color-brand-blue);
  text-decoration: underline;
}

.os-breadcrumb > .active {
  color: #777;
}

.caret {
  display: inline-block;
  width: 0;
  height: 0;
  margin-left: 4px;
  vertical-align: middle;
  border-top: 4px solid #777;
  border-right: 4px solid transparent;
  border-left: 4px solid transparent;
}

.caret--link {
  border-top-color: var(--color-primary);
}

.drop-container {
  position: relative;
}

.drop-container:hover .drop,
.drop-container:focus-within .drop {
  display: block;
}

.drop {
  display: none;
  position: absolute;
  top: 100%;
  left: 8px;
  z-index: 60;
  min-width: 180px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  box-shadow: 0 6px 16px rgba(26, 35, 46, 0.12);
}

.drop .list {
  margin: 0;
  padding-left: 0;
  list-style: none;
}

.drop a {
  display: block;
  padding: 8px 16px;
  color: var(--color-foreground);
  text-decoration: none;
}

.drop a:hover {
  background: var(--color-primary-tint);
  color: var(--color-primary);
  text-decoration: none;
}
</style>
