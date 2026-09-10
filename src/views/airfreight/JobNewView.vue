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
import { MODULE1_AI_LANE } from '@/mocks/fixtures/masters'
import type { MasterOption, MasterSelection } from '@/mdm/types'
import { useMastersStore } from '@/stores/masters'
import { useOsSearchStore } from '@/stores/osSearch'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { canInitializeBooking } = useSeatPermissions()
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

/** Legacy AI booking essentials — all MDM dropdowns where legacy used pickers */
const customer = ref<MasterSelection>(null)
const shipper = ref<MasterSelection>(null)
const consignee = ref<MasterSelection>(null)
const notifyParty = ref<MasterSelection>(null)
const nominatedAgent = ref<MasterSelection>(null)
const bookingAgent = ref<MasterSelection>(null)
const airline = ref<MasterSelection>(null)
const originAirport = ref<MasterSelection>(null)
const destAirport = ref<MasterSelection>(null)
const opOffice = ref<MasterSelection>(null)
const opDepartment = ref<MasterSelection>(null)
const operator = ref<MasterSelection>(null)
const sales = ref<MasterSelection>(null)
const incoterm = ref<MasterSelection>(null)
const freightTerm = ref<MasterSelection>(null)
const paymentTermHbl = ref<MasterSelection>(null)
const packing = ref<MasterSelection>(null)
const cargoType = ref<MasterSelection>(null)
const cargoSource = ref<'SC' | 'NC'>('SC')
const mawb = ref('')
const hawb = ref('')
const customerRef = ref('')
const creating = ref(false)

const customerOptions = computed(() =>
  masters.partyOptions('customer', masters.customers),
)
const shipperOptions = computed(() => masters.partyOptions('shipper', masters.shippers))
const consigneeOptions = computed(() =>
  masters.partyOptions('consignee', masters.consignees),
)
const notifyOptions = computed(() =>
  masters.partyOptions('notify', masters.notifyParties),
)
const agentOptions = computed(() => masters.partyOptions('agent', masters.agents))
const bookingAgentOptions = computed(() =>
  masters.partyOptions('bookingAgent', masters.bookingAgents),
)
const departmentOptions = computed(() => masters.departmentsForOffice(opOffice.value))

const results = computed(() =>
  filterJobsForInit(osSearch.index, {
    lobPrefix: lobPrefix.value,
    basicQuery: basicQuery.value,
    advanced: { ...advanced },
    advancedOpen: advancedOpen.value,
  }),
)

function pick(list: MasterOption[], value: string | undefined | null): MasterSelection {
  if (!value) return null
  const hit = list.find((x) => x.value === value)
  if (!hit) return null
  return {
    label: hit.label,
    value: hit.value,
    kind: hit.kind,
    status: hit.status ?? 'active',
  }
}

onMounted(() => {
  if (!canInitializeBooking.value) {
    toast.error(t('createJob.forbidden'))
    void router.replace({ name: 'my-tasks' })
    return
  }
  void masters.ensureEchoCatalog().then(() => {
    seedCreateDefaults()
  })
})

watch(lobPrefix, () => {
  basicQuery.value = ''
  Object.assign(advanced, emptyAdvancedCriteria())
  seedCreateDefaults()
})

watch(opOffice, () => {
  if (!opDepartment.value) return
  const stillOk = departmentOptions.value.some((d) => d.value === opDepartment.value?.value)
  if (!stillOk) opDepartment.value = null
})

function seedCreateDefaults() {
  if (lobPrefix.value !== 'AI') {
    originAirport.value = null
    destAirport.value = null
    airline.value = null
    opOffice.value = null
    opDepartment.value = null
    operator.value = null
    sales.value = null
    incoterm.value = null
    freightTerm.value = null
    return
  }

  originAirport.value = pick(masters.airports, MODULE1_AI_LANE.origin)
  destAirport.value = pick(masters.airports, MODULE1_AI_LANE.dest)

  const airlineHit =
    masters.airlines.find((a) => a.value === MODULE1_AI_LANE.airline) ||
    masters.airlines.find((a) =>
      a.label.toLowerCase().includes(String(MODULE1_AI_LANE.airline).toLowerCase()),
    )
  airline.value = airlineHit
    ? { label: airlineHit.label, value: airlineHit.value, kind: airlineHit.kind, status: 'active' }
    : null

  incoterm.value =
    pick(masters.incoterms, 'CIP') ?? pick(masters.incoterms, masters.incoterms[0]?.value)
  freightTerm.value =
    pick(masters.freightTerms, 'CC') ??
    pick(masters.freightTerms, masters.freightTerms[0]?.value)

  const officeHit =
    masters.offices.find((o) => /sydney|adp|australia|hq/i.test(o.label)) ?? masters.offices[0]
  opOffice.value = officeHit
    ? { label: officeHit.label, value: officeHit.value, kind: 'office', status: 'active' }
    : null

  const depts = masters.departmentsForOffice(opOffice.value)
  const opDept = depts.find((d) => /operation/i.test(d.label)) ?? depts[0]
  opDepartment.value = opDept
    ? { label: opDept.label, value: opDept.value, kind: 'department', status: 'active' }
    : null

  operator.value = pick(masters.opsUsers, masters.opsUsers[0]?.value)
  sales.value = pick(masters.salesUsers, masters.salesUsers[0]?.value)
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
  void masters.ensureEchoCatalog().then(() => seedCreateDefaults())
}

function goFind() {
  mode.value = 'find'
}

async function createDirect() {
  if (!customer.value || !originAirport.value || !destAirport.value) {
    toast.error(t('createJob.createNeedEssentials'))
    return
  }
  if (!opDepartment.value) {
    toast.error(t('createJob.needOpsDept'))
    return
  }
  if (cargoSource.value === 'NC' && !nominatedAgent.value) {
    toast.error(t('createJob.needNominatedAgent'))
    return
  }
  if (cargoSource.value === 'SC' && !sales.value) {
    toast.error(t('createJob.needSales'))
    return
  }
  creating.value = true
  try {
    const probe: JobInitAdvancedCriteria = {
      ...emptyAdvancedCriteria(),
      mawb: mawb.value,
      hawb: hawb.value,
      customer: customer.value.label,
      origin: originAirport.value.value,
      destination: destAirport.value.value,
      customerRef: customerRef.value,
      airline: airline.value?.value ?? '',
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

    // Persist draft payload for trial handoff (session) until Echo booking write exists
    try {
      sessionStorage.setItem(
        'cw.os.ai.createDraft',
        JSON.stringify({
          lob: lobPrefix.value,
          cargoSource: cargoSource.value,
          customer: customer.value,
          shipper: shipper.value,
          consignee: consignee.value,
          notifyParty: notifyParty.value,
          nominatedAgent: nominatedAgent.value,
          bookingAgent: bookingAgent.value,
          airline: airline.value,
          originAirport: originAirport.value,
          destAirport: destAirport.value,
          opOffice: opOffice.value,
          opDepartment: opDepartment.value,
          operator: operator.value,
          sales: sales.value,
          incoterm: incoterm.value,
          freightTerm: freightTerm.value,
          paymentTermHbl: paymentTermHbl.value,
          packing: packing.value,
          cargoType: cargoType.value,
          mawb: mawb.value,
          hawb: hawb.value,
          customerRef: customerRef.value,
        }),
      )
    } catch {
      /* ignore */
    }

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
    <main class="mx-auto max-w-[920px] px-6 py-8">
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
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 class="text-[17px] font-semibold tracking-tight text-foreground">
                {{ t('createJob.title') }}
              </h1>
              <p class="mt-1 text-[12px] text-muted-foreground">
                {{ t('createJob.subtitle', { lob: lob.label }) }}
              </p>
            </div>
            <Badge variant="secondary" class="font-mono text-[10px]">{{ lob.prefix }}</Badge>
          </div>
          <div class="mt-3 flex gap-1 rounded-lg bg-muted p-1">
            <button
              type="button"
              class="flex-1 rounded-md px-3 py-1.5 text-[12px] font-medium transition"
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
              class="flex-1 rounded-md px-3 py-1.5 text-[12px] font-medium transition"
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

        <!-- FIND -->
        <section v-if="mode === 'find'" class="space-y-4 px-5 py-5">
          <p class="text-[12px] text-muted-foreground">{{ t('createJob.findHint') }}</p>
          <label class="block text-[11px] font-medium text-muted-foreground">
            {{ t('createJob.basicSearch') }}
            <div class="relative mt-1">
              <Search class="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input v-model="basicQuery" class="h-9 pl-8" :placeholder="t('createJob.basicPh')" />
            </div>
          </label>
          <button
            type="button"
            class="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            @click="advancedOpen = !advancedOpen"
          >
            <component :is="advancedOpen ? ChevronUp : ChevronDown" class="size-3.5" />
            {{ t('createJob.advanced') }}
          </button>
          <div v-if="advancedOpen" class="grid gap-2 rounded-lg border border-border bg-muted/30 p-3 sm:grid-cols-2">
            <Input v-model="advanced.jobNo" class="h-8" :placeholder="t('createJob.fields.jobNo')" />
            <Input v-model="advanced.customer" class="h-8" :placeholder="t('createJob.fields.customer')" />
            <Input v-model="advanced.mawb" class="h-8 font-mono" :placeholder="t('createJob.fields.mawb')" />
            <Input v-model="advanced.hawb" class="h-8 font-mono" :placeholder="t('createJob.fields.hawb')" />
            <Input v-model="advanced.origin" class="h-8" :placeholder="t('createJob.fields.origin')" />
            <Input v-model="advanced.destination" class="h-8" :placeholder="t('createJob.fields.destination')" />
            <Input v-model="advanced.airline" class="h-8" :placeholder="t('createJob.fields.airline')" />
            <Input v-model="advanced.customerRef" class="h-8" :placeholder="t('createJob.fields.customerRef')" />
            <div class="sm:col-span-2">
              <Button type="button" variant="ghost" size="sm" @click="clearAdvanced">
                {{ t('createJob.clearAdvanced') }}
              </Button>
            </div>
          </div>
          <div class="overflow-hidden rounded-lg border border-border">
            <ul v-if="results.length" class="divide-y divide-border">
              <li
                v-for="row in results"
                :key="row.shipmentId"
                class="flex items-center justify-between gap-3 px-3 py-2.5"
              >
                <div class="min-w-0">
                  <p class="truncate text-[13px] font-medium text-foreground">
                    {{ row.jobNo || row.shipmentId }}
                    <Badge
                      v-if="row.shipmentId === MODULE1_BOOKING_SHIPMENT_ID"
                      variant="outline"
                      class="ml-1 align-middle text-[9px]"
                    >
                      Module 1
                    </Badge>
                  </p>
                  <p class="truncate text-[11px] text-muted-foreground">
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

        <!-- CREATE NEW — legacy MDM dropdowns -->
        <section v-else class="space-y-5 px-5 py-5">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="text-[12px] text-muted-foreground">{{ t('createJob.createHintMdm') }}</p>
            <Badge v-if="masters.loading" variant="outline" class="text-[10px]">
              {{ t('createJob.loadingMdm') }}
            </Badge>
            <Badge v-else-if="masters.catalogLoaded" variant="secondary" class="text-[10px]">
              {{ t('createJob.mdmReady') }}
            </Badge>
          </div>

          <!-- Source -->
          <div>
            <p class="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {{ t('createJob.sectionSource') }}
            </p>
            <div class="flex gap-1 rounded-lg bg-muted p-1 sm:w-fit">
              <button
                type="button"
                class="rounded-md px-3 py-1.5 text-[12px] font-medium"
                :class="cargoSource === 'SC' ? 'bg-card shadow-sm' : 'text-muted-foreground'"
                @click="cargoSource = 'SC'"
              >
                SC · Sales
              </button>
              <button
                type="button"
                class="rounded-md px-3 py-1.5 text-[12px] font-medium"
                :class="cargoSource === 'NC' ? 'bg-card shadow-sm' : 'text-muted-foreground'"
                @click="cargoSource = 'NC'"
              >
                NC · Nominated
              </button>
            </div>
          </div>

          <!-- Parties -->
          <div>
            <p class="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {{ t('createJob.sectionParties') }}
            </p>
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="block text-[11px] font-medium text-muted-foreground sm:col-span-2">
                {{ t('createJob.fields.customer') }} <span class="text-red-600">*</span>
                <SmartAutocomplete
                  v-model="customer"
                  class="mt-1"
                  storage-key="ai-customer"
                  :options="customerOptions"
                  :frequent-values="masters.frequentCustomerValues"
                  :placeholder="t('mdm.searchCustomer')"
                />
              </label>
              <label class="block text-[11px] font-medium text-muted-foreground">
                {{ t('createJob.fields.shipper') }}
                <SmartAutocomplete
                  v-model="shipper"
                  class="mt-1"
                  storage-key="ai-shipper"
                  :options="shipperOptions"
                  placeholder="Search shipper"
                />
              </label>
              <label class="block text-[11px] font-medium text-muted-foreground">
                {{ t('createJob.fields.consignee') }}
                <SmartAutocomplete
                  v-model="consignee"
                  class="mt-1"
                  storage-key="ai-consignee"
                  :options="consigneeOptions"
                  placeholder="Search consignee"
                />
              </label>
              <label class="block text-[11px] font-medium text-muted-foreground">
                {{ t('createJob.fields.notify') }}
                <SmartAutocomplete
                  v-model="notifyParty"
                  class="mt-1"
                  storage-key="ai-notify"
                  :options="notifyOptions"
                  placeholder="Search notify party"
                />
              </label>
              <label class="block text-[11px] font-medium text-muted-foreground">
                {{ t('createJob.fields.nominatedAgent') }}
                <span v-if="cargoSource === 'NC'" class="text-red-600">*</span>
                <SmartAutocomplete
                  v-model="nominatedAgent"
                  class="mt-1"
                  storage-key="ai-nominated"
                  :options="agentOptions"
                  placeholder="Search nominated agent"
                />
              </label>
              <label class="block text-[11px] font-medium text-muted-foreground">
                {{ t('createJob.fields.bookingAgent') }}
                <SmartAutocomplete
                  v-model="bookingAgent"
                  class="mt-1"
                  storage-key="ai-booking-agent"
                  :options="bookingAgentOptions"
                  placeholder="Search booking agent"
                />
              </label>
              <label class="block text-[11px] font-medium text-muted-foreground sm:col-span-2">
                {{ t('createJob.fields.airline') }}
                <SmartAutocomplete
                  v-model="airline"
                  class="mt-1"
                  storage-key="ai-airline"
                  :options="masters.airlines"
                  placeholder="Search airline / carrier"
                />
              </label>
            </div>
          </div>

          <!-- Route -->
          <div>
            <p class="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {{ t('createJob.sectionRoute') }}
            </p>
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="block text-[11px] font-medium text-muted-foreground">
                {{ t('createJob.fields.origin') }} <span class="text-red-600">*</span>
                <SmartAutocomplete
                  v-model="originAirport"
                  class="mt-1"
                  storage-key="ai-origin"
                  :options="masters.airports"
                  :frequent-values="masters.frequentAirportValues"
                  :placeholder="t('mdm.searchAirport')"
                />
              </label>
              <label class="block text-[11px] font-medium text-muted-foreground">
                {{ t('createJob.fields.destination') }} <span class="text-red-600">*</span>
                <SmartAutocomplete
                  v-model="destAirport"
                  class="mt-1"
                  storage-key="ai-dest"
                  :options="masters.airports"
                  :frequent-values="masters.frequentAirportValues"
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
          </div>

          <!-- Terms -->
          <div>
            <p class="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {{ t('createJob.sectionTerms') }}
            </p>
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="block text-[11px] font-medium text-muted-foreground">
                {{ t('createJob.fields.incoterm') }}
                <SmartAutocomplete
                  v-model="incoterm"
                  class="mt-1"
                  storage-key="ai-incoterm"
                  :options="masters.incoterms"
                  placeholder="Incoterm"
                />
              </label>
              <label class="block text-[11px] font-medium text-muted-foreground">
                {{ t('createJob.fields.freightTerm') }}
                <SmartAutocomplete
                  v-model="freightTerm"
                  class="mt-1"
                  storage-key="ai-freight-term"
                  :options="masters.freightTerms"
                  placeholder="Freight term"
                />
              </label>
              <label class="block text-[11px] font-medium text-muted-foreground">
                {{ t('createJob.fields.paymentTermHbl') }}
                <SmartAutocomplete
                  v-model="paymentTermHbl"
                  class="mt-1"
                  storage-key="ai-payment-hbl"
                  :options="masters.paymentTerms"
                  placeholder="HBL payment term"
                />
              </label>
              <label class="block text-[11px] font-medium text-muted-foreground">
                {{ t('createJob.fields.packing') }}
                <SmartAutocomplete
                  v-model="packing"
                  class="mt-1"
                  storage-key="ai-packing"
                  :options="masters.packingOptions"
                  placeholder="Packing"
                />
              </label>
              <label class="block text-[11px] font-medium text-muted-foreground sm:col-span-2">
                {{ t('createJob.fields.cargoType') }}
                <SmartAutocomplete
                  v-model="cargoType"
                  class="mt-1"
                  storage-key="ai-cargo-type"
                  :options="masters.cargoTypes"
                  placeholder="Cargo type"
                />
              </label>
            </div>
          </div>

          <!-- Ops / Sales org -->
          <div>
            <p class="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {{ t('createJob.sectionOrg') }}
            </p>
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="block text-[11px] font-medium text-muted-foreground">
                {{ t('createJob.fields.opOffice') }}
                <SmartAutocomplete
                  v-model="opOffice"
                  class="mt-1"
                  storage-key="ai-op-office"
                  :options="masters.offices"
                  placeholder="Ops office"
                />
              </label>
              <label class="block text-[11px] font-medium text-muted-foreground">
                {{ t('createJob.fields.opDepartment') }} <span class="text-red-600">*</span>
                <SmartAutocomplete
                  v-model="opDepartment"
                  class="mt-1"
                  storage-key="ai-op-dept"
                  :options="departmentOptions"
                  placeholder="Ops department"
                />
              </label>
              <label class="block text-[11px] font-medium text-muted-foreground">
                {{ t('createJob.fields.operator') }}
                <SmartAutocomplete
                  v-model="operator"
                  class="mt-1"
                  storage-key="ai-op-user"
                  :options="masters.opsUsers"
                  placeholder="Operation"
                />
              </label>
              <label class="block text-[11px] font-medium text-muted-foreground">
                {{ t('createJob.fields.sales') }}
                <span v-if="cargoSource === 'SC'" class="text-red-600">*</span>
                <SmartAutocomplete
                  v-model="sales"
                  class="mt-1"
                  storage-key="ai-sales"
                  :options="masters.salesUsers"
                  placeholder="Sales"
                />
              </label>
            </div>
          </div>

          <div
            class="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground"
          >
            {{ t('createJob.bookingSeam') }}
            <span class="font-mono text-foreground">
              { lob: '{{ lob.prefix }}', source: '{{ cargoSource }}', operateType: 'direct' }
            </span>
          </div>

          <div class="flex flex-wrap gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" size="sm" @click="goFind">
              {{ t('createJob.backToFind') }}
            </Button>
            <Button type="button" size="sm" :disabled="creating || masters.loading" @click="createDirect">
              {{ creating ? t('createJob.creating') : t('createJob.createSubmit') }}
            </Button>
          </div>
        </section>
      </div>
    </main>
    </div>
  </AppShell>
</template>
