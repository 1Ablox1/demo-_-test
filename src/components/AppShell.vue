<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  FileStack,
  LayoutDashboard,
  Package,
  Plane,
  PlaneLanding,
  PlaneTakeoff,
  Receipt,
  Search,
  Settings,
} from '@lucide/vue'
import BookingIcon from '@/components/icons/BookingIcon.vue'
import { SEAT_LABELS, type Seat, useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import { useFreightStore } from '@/stores/freight'
import {
  AIR_DIRECTIONS,
  airDirectionFromQuery,
  airFromLobCode,
  type AirDirection,
} from '@/lib/airWorkspace'
import PersonalPrefs from '@/components/PersonalPrefs.vue'
import CommandPalette from '@/components/CommandPalette.vue'
import BreadcrumbNav from '@/components/BreadcrumbNav.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const tenant = useTenantStore()
const freight = useFreightStore()

const seatOpen = ref(false)
const avatarOpen = ref(false)
const airFreightOpen = ref(true)
const airImportOpen = ref(true)
const airExportOpen = ref(true)
const seats = Object.keys(SEAT_LABELS) as Seat[]

function goBook(air: AirDirection) {
  void router.push({ name: 'orchestrate', query: { lob: air } })
}

function goJobs(air: AirDirection) {
  void router.push({
    name: 'shipment',
    query: { lob: air },
  })
}

function goConsoles(air: AirDirection) {
  void router.push({
    name: 'consolidation',
    query: { lob: air },
  })
}

const globalModules = [
  { name: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, go: () => router.push({ name: 'dashboard' }) },
] as const

const airChildren = [
  { key: 'book' as const, label: 'Book', icon: BookingIcon },
  { key: 'consoles' as const, label: 'Consoles', icon: FileStack },
  { key: 'jobs' as const, label: 'Jobs', icon: Package },
]

const airLanes = [
  {
    prefix: 'AI' as AirDirection,
    label: 'Air Import',
    icon: PlaneLanding,
    open: airImportOpen,
    toggle: () => {
      airImportOpen.value = !airImportOpen.value
    },
  },
  {
    prefix: 'AE' as AirDirection,
    label: 'Air Export',
    icon: PlaneTakeoff,
    open: airExportOpen,
    toggle: () => {
      airExportOpen.value = !airExportOpen.value
    },
  },
]

const trailingModules = [
  { name: 'billing-ledger', label: 'Billing', icon: Receipt, go: () => router.push({ name: 'billing-ledger' }) },
  { name: 'bi-workbench', label: 'Workbench (BI)', icon: BarChart3, go: () => router.push({ name: 'bi-workbench' }) },
] as const

function inferredAirDirection(): AirDirection | null {
  const fromQuery = airDirectionFromQuery(route.query as Record<string, unknown>)
  if (fromQuery) return fromQuery

  if (route.name === 'shipment' || route.path.startsWith('/shipments') || route.path.startsWith('/jobs/')) {
    const id = String(route.params.shipmentId ?? freight.selectedShipmentId ?? '')
    const row = freight.shipments.find((s) => s.id === id)
    if (row) return airFromLobCode(row.lob)
  }
  if (route.name === 'consolidation' || route.path.startsWith('/consolidations')) {
    const id = String(route.params.consolidationId ?? freight.selectedConsolidationId ?? '')
    const row = freight.consolidations.find((c) => c.id === id)
    if (row) return airFromLobCode(row.lob)
  }
  return null
}

function isGlobalActive(name: string): boolean {
  if (name === 'dashboard') {
    return (
      route.name === 'dashboard' ||
      route.path === '/dashboard' ||
      route.path.startsWith('/intel') ||
      route.path === '/my-tasks' ||
      route.path === '/needs-you'
    )
  }
  if (name === 'billing-ledger') {
    return String(route.name ?? '').startsWith('billing-') || route.path.startsWith('/billing')
  }
  if (name === 'bi-workbench') {
    return route.name === 'bi-workbench' || route.name === 'app-builder'
  }
  return route.name === name
}

function isAirChildActive(air: AirDirection, key: (typeof airChildren)[number]['key']): boolean {
  const dir = inferredAirDirection()
  if (key === 'book') {
    const onBook = route.name === 'orchestrate' || route.path.startsWith('/orchestrate')
    if (!onBook) return false
    if (dir) return dir === air
    return air === 'AI'
  }
  if (key === 'jobs') {
    const onJobs =
      route.name === 'shipment' ||
      route.path.startsWith('/shipments') ||
      route.path.startsWith('/jobs/')
    return onJobs && dir === air
  }
  if (key === 'consoles') {
    const onConsoles = route.name === 'consolidation' || route.path.startsWith('/consolidations')
    return onConsoles && dir === air
  }
  return false
}

function isAirLaneActive(air: AirDirection): boolean {
  return airChildren.some((c) => isAirChildActive(air, c.key))
}

const airFreightActive = computed(() => AIR_DIRECTIONS.some((d) => isAirLaneActive(d.prefix)))

watch(
  airFreightActive,
  (active) => {
    if (active) airFreightOpen.value = true
  },
  { immediate: true },
)

watch(
  () => inferredAirDirection(),
  (dir) => {
    if (dir === 'AI') airImportOpen.value = true
    if (dir === 'AE') airExportOpen.value = true
  },
  { immediate: true },
)

function toggleAirFreight() {
  airFreightOpen.value = !airFreightOpen.value
}

function goAirChild(air: AirDirection, key: (typeof airChildren)[number]['key']) {
  if (key === 'book') goBook(air)
  else if (key === 'consoles') goConsoles(air)
  else goJobs(air)
}

function goAdmin() {
  if (!auth.isAdmin) return
  void router.push({ name: 'admin' })
}

function onSettingsClick() {
  if (auth.isAdmin) {
    void router.push({ name: 'admin' })
    return
  }
  auth.openPrefs()
}

function goEchoLogin() {
  avatarOpen.value = false
  void router.push({ name: 'echo-login' })
}

async function signOut() {
  avatarOpen.value = false
  await auth.logout()
  void router.push({ name: 'echo-login' })
}

function pickSeat(s: Seat) {
  auth.setSeat(s)
  seatOpen.value = false
  if (s !== 'admin' && String(route.name).startsWith('admin')) {
    void router.push({ name: 'dashboard' })
  }
}

function onKey(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    auth.toggleCommand()
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="flex min-h-screen bg-background text-foreground">
    <aside
      class="os-shell-sidebar sticky top-0 z-50 flex h-screen w-[220px] shrink-0 flex-col"
      aria-label="Modules"
    >
      <a
        href="/dashboard"
        class="os-brand-lockup flex shrink-0 items-center gap-2.5 px-4 pb-3 pt-4"
        aria-label="WALLTECH CargoWare OS — Dashboard"
        @click.prevent="router.push({ name: 'dashboard' })"
      >
        <img
          src="/assets/logo-waltech-icon.png"
          alt=""
          width="32"
          height="38"
          class="os-brand-lockup__mark h-8 w-auto object-contain"
          aria-hidden="true"
        />
        <span class="os-brand-lockup__wordmark flex flex-col justify-center leading-none">
          <span class="os-brand-lockup__waltech text-[9px] font-bold tracking-[0.14em]">
            <span class="os-brand-lockup__wal">WALL</span><span class="os-brand-lockup__tech">TECH</span>
          </span>
          <span class="os-brand-lockup__product mt-0.5 text-[13px] font-bold tracking-tight">
            CargoWare OS
          </span>
        </span>
      </a>

      <nav class="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-4 pt-1" aria-label="Primary modules">
        <button
          v-for="mod in globalModules"
          :key="mod.name"
          type="button"
          class="os-sidebar-nav-item"
          :class="{ 'os-sidebar-nav-item--active': isGlobalActive(mod.name) }"
          @click="mod.go()"
        >
          <component :is="mod.icon" :size="16" :stroke-width="1.75" class="shrink-0 opacity-90" />
          <span class="truncate">{{ mod.label }}</span>
        </button>

        <div class="os-sidebar-section" :class="{ 'os-sidebar-section--active': airFreightActive }">
          <button
            type="button"
            class="os-sidebar-section__toggle"
            :aria-expanded="airFreightOpen"
            aria-controls="air-freight-nav"
            @click="toggleAirFreight"
          >
            <Plane :size="16" :stroke-width="1.75" class="shrink-0 opacity-90" />
            <span class="min-w-0 flex-1 truncate text-left">Air Freight</span>
            <component
              :is="airFreightOpen ? ChevronDown : ChevronRight"
              :size="14"
              :stroke-width="2"
              class="shrink-0 opacity-70"
            />
          </button>

          <div
            v-show="airFreightOpen"
            id="air-freight-nav"
            class="os-sidebar-section__children"
            role="group"
            aria-label="Air Freight"
          >
            <div
              v-for="lane in airLanes"
              :key="lane.prefix"
              class="os-sidebar-lane"
              :class="{ 'os-sidebar-lane--active': isAirLaneActive(lane.prefix) }"
            >
              <button
                type="button"
                class="os-sidebar-lane__toggle"
                :aria-expanded="lane.open.value"
                @click="lane.toggle()"
              >
                <component :is="lane.icon" :size="14" :stroke-width="1.75" class="shrink-0 opacity-90" />
                <span class="min-w-0 flex-1 truncate text-left">{{ lane.label }}</span>
                <component
                  :is="lane.open.value ? ChevronDown : ChevronRight"
                  :size="12"
                  :stroke-width="2"
                  class="shrink-0 opacity-60"
                />
              </button>
              <div v-show="lane.open.value" class="os-sidebar-lane__children" role="group" :aria-label="lane.label">
                <button
                  v-for="child in airChildren"
                  :key="`${lane.prefix}-${child.key}`"
                  type="button"
                  class="os-sidebar-nav-item os-sidebar-nav-item--grandchild"
                  :class="{ 'os-sidebar-nav-item--active': isAirChildActive(lane.prefix, child.key) }"
                  @click="goAirChild(lane.prefix, child.key)"
                >
                  <component :is="child.icon" :size="14" :stroke-width="1.75" class="shrink-0 opacity-90" />
                  <span class="truncate">{{ child.label }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <button
          v-for="mod in trailingModules"
          :key="mod.name"
          type="button"
          class="os-sidebar-nav-item"
          :class="{ 'os-sidebar-nav-item--active': isGlobalActive(mod.name) }"
          @click="mod.go()"
        >
          <component :is="mod.icon" :size="16" :stroke-width="1.75" class="shrink-0 opacity-90" />
          <span class="truncate">{{ mod.label }}</span>
        </button>
      </nav>
    </aside>

    <div class="flex min-h-screen min-w-0 flex-1 flex-col">
      <div class="sticky top-0 z-40" data-sticky-region="global-shell">
        <header class="os-tier1-header flex h-14 items-center gap-3 px-5 lg:h-16 lg:px-6">
          <select
            :value="tenant.activeBranchId"
            class="hidden h-9 max-w-[200px] rounded-md border border-slate-600 bg-slate-800 px-2.5 font-mono text-[12px] text-slate-200 outline-none focus:border-teal-500 sm:block"
            aria-label="Branch"
            @change="tenant.setActiveBranch(($event.target as HTMLSelectElement).value)"
          >
            <option v-for="o in tenant.officeOptions" :key="o.branchId" :value="o.branchId">
              {{ o.label }}
            </option>
          </select>

          <button
            type="button"
            class="mx-1 hidden h-9 min-w-[240px] flex-1 items-center gap-2 rounded-lg border border-slate-600 bg-slate-800/80 px-3.5 text-left text-[13px] text-slate-400 md:flex lg:max-w-lg"
            @click="auth.toggleCommand(true)"
          >
            <Search :size="15" :stroke-width="1.75" class="shrink-0" />
            <span>Search jobs, HAWB, MAWB…</span>
            <kbd
              class="ml-auto rounded border border-slate-600 bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] text-slate-400"
            >
              ⌘K
            </kbd>
          </button>

          <div class="flex-1" />

          <div class="relative">
            <button
              type="button"
              class="flex h-9 items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 text-[13px] font-medium text-slate-200"
              @click="seatOpen = !seatOpen; avatarOpen = false"
            >
              <span
                class="flex h-5 w-5 items-center justify-center rounded-full bg-primary-tint text-[10px] font-bold text-primary"
              >
                {{ auth.seatLabel[0] }}
              </span>
              <span class="hidden text-slate-300 sm:inline">Seat: {{ auth.seatLabel }}</span>
              <ChevronDown :size="12" class="text-slate-400" />
            </button>
            <div v-if="seatOpen" class="os-shell-dropdown">
              <button
                v-for="s in seats"
                :key="s"
                type="button"
                class="os-shell-dropdown__item"
                :class="auth.seat === s ? 'os-shell-dropdown__item--active' : ''"
                @click="pickSeat(s)"
              >
                {{ SEAT_LABELS[s] }}
              </button>
            </div>
          </div>

          <button
            type="button"
            class="hidden h-9 w-9 items-center justify-center rounded-md border border-slate-600 text-slate-300 hover:bg-slate-800 sm:flex"
            :title="auth.isAdmin ? 'Admin Studio' : 'My settings'"
            @click="onSettingsClick"
          >
            <Settings :size="16" />
          </button>

          <div class="relative">
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-[11px] font-bold text-white"
              @click="avatarOpen = !avatarOpen; seatOpen = false"
            >
              U
            </button>
            <div v-if="avatarOpen" class="os-shell-dropdown">
              <button type="button" class="os-shell-dropdown__item" @click="avatarOpen = false; auth.openPrefs()">
                My settings
              </button>
              <button
                v-if="auth.isAdmin"
                type="button"
                class="os-shell-dropdown__item"
                @click="avatarOpen = false; goAdmin()"
              >
                Admin Studio
              </button>
              <div class="my-1 h-px bg-border" />
              <button
                v-if="auth.isAuthenticated"
                type="button"
                class="os-shell-dropdown__item text-[10px] text-muted-foreground"
                disabled
              >
                Echo · {{ auth.session?.userName || auth.sessionId }}
              </button>
              <button type="button" class="os-shell-dropdown__item" @click="goEchoLogin">
                Echo connect…
              </button>
              <button type="button" class="os-shell-dropdown__item text-destructive" @click="signOut">
                Sign out
              </button>
            </div>
          </div>
        </header>

        <BreadcrumbNav />
      </div>

      <div class="flex min-h-0 flex-1 flex-col overflow-auto">
        <slot />
      </div>
    </div>

    <PersonalPrefs v-if="auth.prefsOpen" @close="auth.closePrefs()" />
    <CommandPalette v-if="auth.commandOpen" @close="auth.toggleCommand(false)" />
  </div>
</template>
