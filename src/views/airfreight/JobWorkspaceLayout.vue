<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter, RouterView } from 'vue-router'
import AppShell from '@/components/airfreight/AppShell.vue'
import ExceptionDrawer from '@/components/airfreight/ExceptionDrawer.vue'
import JobActionPanel from '@/components/airfreight/job/JobActionPanel.vue'
import JobGovernanceBar from '@/components/airfreight/job/JobGovernanceBar.vue'
import JobShellNav from '@/components/airfreight/job/JobShellNav.vue'
import type { JobShellTab } from '@/components/airfreight/job/JobShellNav.vue'
import type { HoldType } from '@/api/types'
import { displayJobNo } from '@/lib/jobIdentity'
import { buildJobOwnershipStrip } from '@/lib/jobOwnership'
import { clearanceBlocksMoney, chargesTabLocked, invoiceTabLocked, moneyBlockFromJob } from '@/lib/moneyGates'
import { AU_CLEARANCE_GATE_ID } from '@/lib/gateChecklist'
import { useJobStore } from '@/stores/job'
import { useLifecycleStore } from '@/stores/lifecycle'
import { useTasksStore } from '@/stores/tasks'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const jobStore = useJobStore()
const life = useLifecycleStore()
const tasks = useTasksStore()

const drawerOpen = ref(false)
const actionCompleted = ref(false)

const shipmentId = computed(() => Number(route.params.shipmentId))

const currentTab = computed<JobShellTab>(() => {
  const name = route.name
  if (name === 'job-spine') return 'timeline'
  if (name === 'job-charges') return 'charges'
  if (name === 'job-invoice') return 'invoice'
  return 'overview'
})

const job = computed(() => jobStore.job)

const ownershipStrip = computed(() =>
  buildJobOwnershipStrip(life.lifecycle, job.value),
)

const jobNo = computed(() => {
  if (job.value?.identity?.jobNo?.trim()) {
    return job.value.identity.jobNo.trim()
  }
  if (life.lifecycle?.jobNo?.trim()) return life.lifecycle.jobNo.trim()
  if (job.value) {
    return displayJobNo({
      identity: job.value.identity,
      lob: job.value.lob,
      shipmentId: job.value.shipmentId,
    })
  }
  return displayJobNo({ shipmentId: shipmentId.value })
})

const chargesLocked = computed(() => chargesTabLocked(job.value))

const invoiceLocked = computed(() => invoiceTabLocked(job.value))

const moneyBlockMessage = computed(() => {
  if (!job.value) return null
  const block = moneyBlockFromJob(job.value)
  if (!block.blocked) return null
  return block.message ?? t('jobContext.localFrame.moneyBlockClearance')
})

const clearanceHeld = computed(() => clearanceBlocksMoney(job.value?.clearance))

const clearanceChecklistPending = computed(
  () => clearanceHeld.value && shipmentId.value === 4096,
)

/** Hide AU clearance once Cleared; money gates are next-work, not amber “holds” */
const panelGates = computed(() => {
  const gates = life.openGates
  if (!clearanceHeld.value) {
    return gates.filter(
      (g) =>
        g.id !== AU_CLEARANCE_GATE_ID &&
        g.holdType !== 'invoice' &&
        g.milestoneId !== 'charges' &&
        g.milestoneId !== 'invoice',
    )
  }
  return gates
})

const moneyState = computed(() => job.value?.ops.moneyState)

/** Money pages unlocked (clearance cleared) — used for CTA routing */
const moneyUnlocked = computed(() => !chargesLocked.value && !clearanceHeld.value)

const osPulse = computed(
  () =>
    panelGates.value.length > 0 ||
    life.openTasks.length > 0 ||
    Boolean(job.value?.nextAction) ||
    moneyUnlocked.value,
)

const gpAmount = computed(() => {
  const j = job.value
  if (!j) return '—'
  if (j.ops.provisionalGp) return j.ops.provisionalGp.replace(/^GP:?\s*/i, '')
  // Derive a display amount from sell when provisional absent
  return j.ops.sellAmount.replace(/^[A-Z]{3}\s*/, '') || '—'
})

const gpPct = computed(() => {
  const raw = job.value?.ops.marginPct ?? ''
  const m = raw.match(/([\d.]+)/)
  return m ? `${m[1]}%` : '—'
})

const nextAction = computed(() => {
  if (clearanceChecklistPending.value) {
    return 'Complete AU clearance checklist — Ops fulfil, Finance stamp'
  }
  // Prefer money spine over stale open tasks (Hugh Q2C)
  if (moneyState.value === 'invoiced' || moneyState.value === 'part_invoiced') {
    return 'Record payment (optional) — Module 1 complete'
  }
  if (moneyState.value === 'charges_approved') {
    return 'Issue customer invoice'
  }
  if (moneyState.value === 'provisioned') {
    return 'Approve charges (Finance A)'
  }
  const openTask = life.openTasks[0]
  if (openTask) return openTask.title
  if (!clearanceHeld.value) {
    return job.value?.nextAction ?? 'Accrue charge lines on Charges'
  }
  return (
    panelGates.value[0]?.title ??
    job.value?.nextAction ??
    t('spine.stepPlaceholder')
  )
})

const actionDetail = computed(() => {
  if (clearanceHeld.value) {
    return (
      job.value?.clearance?.note ??
      job.value?.documents.impact ??
      'Clearance held — Charges and Invoice stay locked.'
    )
  }
  if (moneyState.value === 'charges_approved') {
    return 'Charges approved — open Invoice to issue the customer bill.'
  }
  if (moneyState.value === 'provisioned') {
    return 'Charges accrued — switch to Finance seat and Approve, then Invoice.'
  }
  if (!clearanceHeld.value) {
    return 'Clearance Cleared. Path: Charges (Accrue) → Finance Approve → Invoice.'
  }
  return job.value?.documents.impact ?? panelGates.value[0]?.trigger ?? null
})

const ctaLabel = computed(() => {
  if (actionCompleted.value) return t('jobShell.cta.submitted')
  if (clearanceChecklistPending.value) return t('jobContext.clearanceGate.openChecklist')
  if (moneyState.value === 'invoiced' || moneyState.value === 'part_invoiced') {
    return currentTab.value === 'invoice' ? 'Stay on Invoice' : 'Open Invoice'
  }
  if (moneyState.value === 'charges_approved') {
    return currentTab.value === 'invoice' ? 'Stay on Invoice' : 'Open Invoice'
  }
  if (moneyState.value === 'provisioned') {
    return currentTab.value === 'charges' ? 'Stay on Charges · Finance Approve' : 'Open Charges · Approve'
  }
  if (!clearanceHeld.value && !chargesLocked.value) {
    if (currentTab.value === 'charges') return 'Stay on Charges · Accrue'
    return 'Open Charges'
  }
  if (life.openTasks[0] || panelGates.value[0]) return t('jobShell.cta.completeGate')
  if (currentTab.value === 'overview') return t('jobShell.cta.openTimeline')
  return t('jobShell.cta.completeGate')
})

const ctaHint = computed(() => {
  if (clearanceHeld.value) return 'Tab path: Overview (checklist) → Charges → Invoice'
  if (moneyState.value === 'invoiced' || moneyState.value === 'part_invoiced') {
    return 'Module 1 money path complete — payment chip is optional'
  }
  if (moneyState.value === 'provisioned') {
    return 'Tab path: Charges (Finance Approve) → Invoice'
  }
  if (moneyState.value === 'charges_approved') {
    return 'Tab path: Invoice (Issue)'
  }
  if (!clearanceHeld.value) return 'Tab path: Charges (Accrue) → Invoice (after Finance approve)'
  return null
})

const holdType = computed<HoldType>(() => {
  const g = panelGates.value[0]
  if (!g || g.holdType === 'none' || g.holdType === 'margin') {
    return job.value?.ops.holdType ?? 'docs'
  }
  return g.holdType
})

async function loadWorkspace(id: number) {
  actionCompleted.value = false
  if (!Number.isFinite(id) || id <= 0) {
    jobStore.clear()
    life.clear()
    return
  }
  await Promise.all([jobStore.load(id), life.load(id)])
}

watch(shipmentId, (id) => void loadWorkspace(id), { immediate: true })

onUnmounted(() => {
  jobStore.clear()
  life.clear()
})

async function onPrimaryAction() {
  if (actionCompleted.value) {
    await router.push({
      name: 'job-charges',
      params: { shipmentId: String(shipmentId.value) },
    })
    return
  }

  if (clearanceChecklistPending.value) {
    if (currentTab.value !== 'overview') {
      await router.push({
        name: 'job-context',
        params: { shipmentId: String(shipmentId.value) },
      })
    }
    document.getElementById('clearance-gate-panel')?.scrollIntoView({ behavior: 'smooth' })
    return
  }

  if (moneyState.value === 'charges_approved') {
    await router.push({
      name: 'job-invoice',
      params: { shipmentId: String(shipmentId.value) },
    })
    return
  }

  if (moneyUnlocked.value) {
    await router.push({
      name: 'job-charges',
      params: { shipmentId: String(shipmentId.value) },
    })
    return
  }

  const task = life.openTasks[0]
  if (task) {
    await life.completeTask(task.id)
    actionCompleted.value = true
    return
  }
  const gate = panelGates.value[0]
  if (gate) {
    // AU clearance must use checklist + stamp — never bare clearGate
    if (gate.id === AU_CLEARANCE_GATE_ID) {
      if (currentTab.value !== 'overview') {
        await router.push({
          name: 'job-context',
          params: { shipmentId: String(shipmentId.value) },
        })
      }
      document.getElementById('clearance-gate-panel')?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    await life.clearGate(gate.id)
    await jobStore.load(shipmentId.value)
    actionCompleted.value = true
    return
  }
  if (currentTab.value === 'overview') {
    void router.push({
      name: 'job-spine',
      params: { shipmentId: String(shipmentId.value) },
    })
  }
}
</script>

<template>
  <AppShell>
    <!-- Job Cockpit frame — matches Downloads/job cokpit JobCockpitView -->
    <div class="flex h-full flex-col overflow-hidden bg-background font-sans">
      <JobGovernanceBar :strip="ownershipStrip" />

      <div
        v-if="jobStore.loading && !job"
        class="px-6 py-8 text-sm text-muted-foreground"
      >
        {{ t('jobContext.loading') }}
      </div>

      <div
        v-else-if="jobStore.error && !job"
        class="m-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        {{ jobStore.error }}
      </div>

      <div v-else class="flex min-h-0 flex-1 overflow-hidden">
        <JobShellNav
          :shipment-id="shipmentId"
          :job-no="jobNo"
          :hawb="job?.ops.hawb ?? null"
          :pack="job?.pack ?? 'GLOBAL'"
          :active-packs="job?.activePacks"
          :current="currentTab"
          :gp-amount="gpAmount"
          :gp-pct="gpPct"
          :seat="tasks.role"
          :charges-locked="chargesLocked"
          :invoice-locked="invoiceLocked"
          :os-pulse="osPulse"
        />

        <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div
            v-if="moneyBlockMessage && (chargesLocked || invoiceLocked)"
            class="mx-6 mt-3 shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900"
            role="status"
          >
            {{ moneyBlockMessage }}
            <span class="mt-1 block text-xs text-amber-800/80">
              Unlock path: Overview checklist → Finance stamp → Charges → Invoice
            </span>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto px-6 pb-10 pt-6">
            <RouterView />
          </div>
        </div>

        <div
          class="hidden w-[360px] shrink-0 overflow-y-auto border-l border-border bg-background px-0 pb-10 pt-6 lg:block"
        >
          <div class="pl-5 pr-6">
            <JobActionPanel
              :next-action="nextAction"
              :action-detail="actionDetail"
              :cta-label="ctaLabel"
              :cta-hint="ctaHint"
              :completed="actionCompleted"
              :gates="panelGates"
              :documents="job?.documents ?? null"
              :clearance="job?.clearance ?? null"
              :money-state="moneyState ?? null"
              @action="onPrimaryAction"
            />
          </div>
        </div>
      </div>
    </div>

    <ExceptionDrawer
      :open="drawerOpen"
      :role="tasks.role"
      :shipment-id="String(shipmentId)"
      :hold-type="holdType"
      @close="drawerOpen = false"
    />
  </AppShell>
</template>
