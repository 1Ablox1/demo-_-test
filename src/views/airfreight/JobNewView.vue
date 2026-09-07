<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ChevronDown, ChevronUp, Search } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import AppShell from '@/components/airfreight/AppShell.vue'
import SmartAutocomplete from '@/components/airfreight/SmartAutocomplete.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSeatPermissions } from '@/composables/useSeatPermissions'
import {
  MODULE1_BOOKING_JOB_NO,
  MODULE1_BOOKING_SHIPMENT_ID,
  lobMeta,
  parseCreateJobLob,
} from '@/lib/createJobIntent'
import {
  emptyAdvancedCriteria,
  filterJobsForInit,
  type JobInitAdvancedCriteria,
} from '@/lib/jobInitSearch'
import type { OsSearchEntry } from '@/lib/searchIndex'
import {
  frequentAirportValues,
  frequentCustomerValues,
  masterAirports,
  MODULE1_AI_LANE,
} from '@/mocks/fixtures/masters'
import type { MasterSelection } from '@/mdm/types'
import { useMastersStore } from '@/stores/masters'
import { useOsSearchStore } from '@/stores/osSearch'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { canInitializeBooking, role } = useSeatPermissions()
const osSearch = useOsSearchStore()
const masters = useMastersStore()

const lobPrefix = computed(() => parseCreateJobLob(route.query.lob))
const lob = computed(() => lobMeta(lobPrefix.value))
const isModule1Ai = computed(() => lobPrefix.value === 'AI')

/** find | create — connected steps on one page */
const mode = ref<'find' | 'create'>('find')
const basicQuery = ref('')
const advancedOpen = ref(false)
const advanced = reactive<JobInitAdvancedCriteria>(emptyAdvancedCriteria())

const customer = ref<MasterSelection>(null)
const originAirport = ref<MasterSelection>(null)
const destAirport = ref<MasterSelection>(null)
const mawb = ref('')
const hawb = ref('')
const customerRef = ref('')
const creating = ref(false)

const results = computed(() =>
  filterJobsForInit(osSearch.index, {
    lobPrefix: lobPrefix.value,
    basicQuery: basicQuery.value,
    advanced: { ...advanced },
    advancedOpen: advancedOpen.value,
  }),
)

onMounted(() => {
  if (!canInitializeBooking.value) {
    toast.error(t('createJob.forbidden'))
    void router.replace({ name: 'my-tasks' })
    return
  }
  void masters.refreshCustomers()
  seedCreateDefaults()
})

watch(lobPrefix, () => {
  basicQuery.value = ''
  Object.assign(advanced, emptyAdvancedCriteria())
  seedCreateDefaults()
})

function seedCreateDefaults() {
  if (lobPrefix.value === 'AI') {
    originAirport.value = {
      label: MODULE1_AI_LANE.origin,
      value: MODULE1_AI_LANE.origin,
      kind: 'airport',
      status: 'active',
    }
    destAirport.value = {
      label: MODULE1_AI_LANE.dest,
      value: MODULE1_AI_LANE.dest,
      kind: 'airport',
      status: 'active',
    }
  } else {
    originAirport.value = null
    destAirport.value = null
  }
}

function back() {
  void router.push({ name: 'my-tasks' })
}

function openJob(entry: OsSearchEntry) {
  osSearch.recordRecent(entry.shipmentId)
  toast.success(t('createJob.openedExisting', { jobNo: entry.jobNo || String(entry.shipmentId) }))
  void router.push({
    name: 'job-context',
    params: { shipmentId: String(entry.shipmentId) },
  })
}

function clearAdvanced() {
  Object.assign(advanced, emptyAdvancedCriteria())
}

function goCreate() {
  mode.value = 'create'
  if (!customer.value && isModule1Ai.value) {
    const nova = masters.customers.find((c) => c.value === 'NOVA-PHARMA')
      ?? masters.customers.find((c) => c.label.toLowerCase().includes('nova'))
    if (nova) {
      customer.value = {
        label: nova.label,
        value: nova.value,
        kind: nova.kind,
        status: nova.status ?? 'active',
      }
    }
  }
}

function goFind() {
  mode.value = 'find'
}

async function createDirect() {
  if (!customer.value || !originAirport.value || !destAirport.value) {
    toast.error(t('createJob.createNeedEssentials'))
    return
  }
  creating.value = true
  try {
    // Search-before-create: if criteria match an existing job, open it (dedupe)
    const probe: JobInitAdvancedCriteria = {
      ...emptyAdvancedCriteria(),
      mawb: mawb.value,
      hawb: hawb.value,
      customer: customer.value.label,
      origin: originAirport.value.value,
      destination: destAirport.value.value,
      customerRef: customerRef.value,
    }
    const hits = filterJobsForInit(osSearch.index, {
      lobPrefix: lobPrefix.value,
      basicQuery: '',
      advanced: probe,
      advancedOpen: Boolean(mawb.value || hawb.value),
    })
    if (hits.length === 1 && (mawb.value || hawb.value)) {
      openJob(hits[0])
      return
    }

    // Module 1 MSW: AI direct init lands on golden operational job (control-plane seam)
    if (isModule1Ai.value) {
      toast.success(t('createJob.createdDirect', { jobNo: MODULE1_BOOKING_JOB_NO }))
      void router.push({
        name: 'job-context',
        params: { shipmentId: String(MODULE1_BOOKING_SHIPMENT_ID) },
      })
      return
    }

    toast.message(t('createJob.bookingStub', { lob: lobPrefix.value }))
    void router.push({ name: 'my-tasks' })
  } finally {
    creating.value = false
  }
}

function awbLabel(entry: OsSearchEntry): string {
  const parts = [entry.hawb, entry.mawb].filter(Boolean)
  return parts.length ? parts.join(' · ') : '—'
}
</script>

<template>
  <AppShell>
    <div class="h-full overflow-y-auto">
    <main class="mx-auto max-w-[880px] px-6 py-8">
      <!-- Flow strip: Create Job → Direct → Find/Create → Job -->
      <nav
        class="mb-4 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground"
        aria-label="Create job path"
      >
        <button
          type="button"
          class="rounded px-1.5 py-0.5 font-medium hover:bg-muted hover:text-foreground"
          @click="back"
        >
          {{ t('createJob.crumbDesk') }}
        </button>
        <span aria-hidden="true">/</span>
        <span class="font-medium text-foreground">{{ t('createJob.crumbDirect') }}</span>
        <span aria-hidden="true">/</span>
        <span class="font-mono text-foreground">{{ lob.prefix }}</span>
        <span aria-hidden="true">/</span>
        <span class="text-foreground">
          {{ mode === 'find' ? t('createJob.crumbFind') : t('createJob.crumbCreate') }}
        </span>
      </nav>

      <div class="rounded-[14px] border border-border bg-card shadow-sm">
        <header class="border-b border-border px-5 py-4">
          <p class="text-[10px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
            {{ t('createJob.bookingEyebrow') }}
          </p>
          <div class="mt-1 flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <h1 class="text-[18px] font-bold text-foreground">
                {{ t('createJob.bookingTitle') }}
              </h1>
              <p class="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                {{ t('createJob.bookingBodyConnected', { prefix: lob.prefix, label: lob.label }) }}
              </p>
            </div>
            <Badge variant="secondary" class="rounded-md text-[10px] font-medium">
              {{ t('myTasks.roles.' + role) }} · {{ t('createJob.bookingSeatHint') }}
            </Badge>
          </div>

          <div class="mt-4 flex gap-1 rounded-lg bg-muted p-1">
            <button
              type="button"
              class="flex-1 rounded-md px-3 py-2 text-[12px] font-semibold transition"
              :class="
                mode === 'find'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              "
              @click="goFind"
            >
              {{ t('createJob.tabFind') }}
            </button>
            <button
              type="button"
              class="flex-1 rounded-md px-3 py-2 text-[12px] font-semibold transition"
              :class="
                mode === 'create'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              "
              @click="goCreate"
            >
              {{ t('createJob.tabCreate') }}
            </button>
          </div>
        </header>

        <!-- FIND EXISTING -->
        <section v-if="mode === 'find'" class="space-y-4 px-5 py-5">
          <p class="text-[12px] text-muted-foreground">
            {{ t('createJob.findHint') }}
          </p>

          <div class="relative">
            <Search
              class="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              v-model="basicQuery"
              class="h-9 pl-9"
              :placeholder="t('createJob.basicSearchPlaceholder')"
            />
          </div>

          <div class="rounded-lg border border-border">
            <button
              type="button"
              class="flex w-full items-center justify-between px-3 py-2.5 text-left text-[12px] font-semibold text-foreground hover:bg-muted/40"
              @click="advancedOpen = !advancedOpen"
            >
              <span>{{ t('createJob.advancedSearch') }}</span>
              <component :is="advancedOpen ? ChevronUp : ChevronDown" class="size-4 text-muted-foreground" />
            </button>

            <div
              v-if="advancedOpen"
              class="grid gap-3 border-t border-border px-3 py-3 sm:grid-cols-2"
            >
              <label class="block text-[11px] font-medium text-muted-foreground">
                {{ t('createJob.fields.jobNo') }}
                <Input v-model="advanced.jobNo" class="mt-1 h-8" placeholder="AI20260101001" />
              </label>
              <label class="block text-[11px] font-medium text-muted-foreground">
                {{ t('createJob.fields.customer') }}
                <Input v-model="advanced.customer" class="mt-1 h-8" placeholder="Sydney Retail" />
              </label>
              <label class="block text-[11px] font-medium text-muted-foreground">
                {{ t('createJob.fields.mawb') }}
                <Input v-model="advanced.mawb" class="mt-1 h-8 font-mono" placeholder="999-55443322" />
              </label>
              <label class="block text-[11px] font-medium text-muted-foreground">
                {{ t('createJob.fields.hawb') }}
                <Input v-model="advanced.hawb" class="mt-1 h-8 font-mono" placeholder="160-44112233" />
              </label>
              <label class="block text-[11px] font-medium text-muted-foreground">
                {{ t('createJob.fields.origin') }}
                <Input v-model="advanced.origin" class="mt-1 h-8 font-mono" placeholder="PVG" />
              </label>
              <label class="block text-[11px] font-medium text-muted-foreground">
                {{ t('createJob.fields.destination') }}
                <Input v-model="advanced.destination" class="mt-1 h-8 font-mono" placeholder="SYD" />
              </label>
              <label class="block text-[11px] font-medium text-muted-foreground">
                {{ t('createJob.fields.airline') }}
                <Input v-model="advanced.airline" class="mt-1 h-8" placeholder="QF" />
              </label>
              <label class="block text-[11px] font-medium text-muted-foreground">
                {{ t('createJob.fields.customerRef') }}
                <Input v-model="advanced.customerRef" class="mt-1 h-8" placeholder="SRG-IMP-2408" />
              </label>
              <div class="flex flex-wrap gap-2 sm:col-span-2">
                <Button type="button" variant="outline" size="sm" @click="clearAdvanced">
                  {{ t('createJob.clearAdvanced') }}
                </Button>
                <span class="self-center text-[11px] text-muted-foreground">
                  {{ t('createJob.advancedHint') }}
                </span>
              </div>
            </div>
          </div>

          <div class="overflow-hidden rounded-lg border border-border">
            <div
              class="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-2 text-[11px] font-semibold text-muted-foreground"
            >
              <span>{{ t('createJob.results') }}</span>
              <span>{{ t('createJob.resultCount', { n: results.length }) }}</span>
            </div>

            <ul v-if="results.length" class="divide-y divide-border">
              <li
                v-for="row in results"
                :key="row.shipmentId"
                class="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 hover:bg-muted/40"
              >
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="font-mono text-[13px] font-semibold text-foreground">
                      {{ row.jobNo || row.shipmentId }}
                    </span>
                    <Badge variant="secondary" class="rounded text-[9px]">{{ row.lob }}</Badge>
                    <Badge
                      v-if="row.shipmentId === MODULE1_BOOKING_SHIPMENT_ID"
                      variant="secondary"
                      class="rounded text-[9px]"
                    >
                      Module 1
                    </Badge>
                  </div>
                  <p class="mt-0.5 truncate text-[12px] text-muted-foreground">
                    {{ row.customer }} · {{ row.lane }} · {{ awbLabel(row) }}
                  </p>
                </div>
                <Button type="button" size="sm" @click="openJob(row)">
                  {{ t('createJob.openJob') }}
                </Button>
              </li>
            </ul>
            <div v-else class="px-3 py-8 text-center text-[13px] text-muted-foreground">
              <p>{{ t('createJob.noResults') }}</p>
              <Button type="button" class="mt-3" size="sm" @click="goCreate">
                {{ t('createJob.createInstead') }}
              </Button>
            </div>
          </div>

          <div class="flex flex-wrap gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" size="sm" @click="back">
              {{ t('createJob.backDesk') }}
            </Button>
            <Button type="button" size="sm" variant="secondary" @click="goCreate">
              {{ t('createJob.tabCreate') }}
            </Button>
          </div>
        </section>

        <!-- CREATE NEW -->
        <section v-else class="space-y-4 px-5 py-5">
          <p class="text-[12px] text-muted-foreground">
            {{ t('createJob.createHint') }}
          </p>

          <div class="grid gap-3 sm:grid-cols-2">
            <label class="block text-[11px] font-medium text-muted-foreground sm:col-span-2">
              {{ t('createJob.fields.customer') }} <span class="text-red-600">*</span>
              <SmartAutocomplete
                v-model="customer"
                class="mt-1"
                storage-key="job-init-customer"
                :options="masters.customers"
                :frequent-values="frequentCustomerValues"
                :placeholder="t('mdm.searchCustomer')"
              />
            </label>
            <label class="block text-[11px] font-medium text-muted-foreground">
              {{ t('createJob.fields.origin') }} <span class="text-red-600">*</span>
              <SmartAutocomplete
                v-model="originAirport"
                class="mt-1"
                storage-key="job-init-origin"
                :options="masterAirports"
                :frequent-values="frequentAirportValues"
                :placeholder="t('mdm.searchAirport')"
              />
            </label>
            <label class="block text-[11px] font-medium text-muted-foreground">
              {{ t('createJob.fields.destination') }} <span class="text-red-600">*</span>
              <SmartAutocomplete
                v-model="destAirport"
                class="mt-1"
                storage-key="job-init-dest"
                :options="masterAirports"
                :frequent-values="frequentAirportValues"
                :placeholder="t('mdm.searchAirport')"
              />
            </label>
            <label class="block text-[11px] font-medium text-muted-foreground">
              {{ t('createJob.fields.mawb') }}
              <Input v-model="mawb" class="mt-1 h-9 font-mono" placeholder="999-55443322" />
            </label>
            <label class="block text-[11px] font-medium text-muted-foreground">
              {{ t('createJob.fields.hawb') }}
              <Input v-model="hawb" class="mt-1 h-9 font-mono" placeholder="160-44112233" />
            </label>
            <label class="block text-[11px] font-medium text-muted-foreground sm:col-span-2">
              {{ t('createJob.fields.customerRef') }}
              <Input v-model="customerRef" class="mt-1 h-9" placeholder="SRG-IMP-2408" />
            </label>
          </div>

          <div
            class="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground"
          >
            {{ t('createJob.bookingSeam') }}
            <span class="font-mono text-foreground">
              { lob: '{{ lob.prefix }}', operateType: 'direct' }
            </span>
            — {{ t('createJob.createNumberingHint') }}
          </div>

          <div class="flex flex-wrap gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" size="sm" @click="goFind">
              {{ t('createJob.backToFind') }}
            </Button>
            <Button type="button" size="sm" :disabled="creating" @click="createDirect">
              {{ creating ? t('createJob.creating') : t('createJob.createSubmit') }}
            </Button>
          </div>
        </section>
      </div>
    </main>
    </div>
  </AppShell>
</template>
