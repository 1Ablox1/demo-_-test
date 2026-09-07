<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  Copy,
  Link2,
  Pencil,
  Plus,
  Save,
  Ticket,
  Unlink,
} from '@lucide/vue'
import AppShell from '@/components/AppShell.vue'
import ConsoleListGrid from '@/components/consoles/ConsoleListGrid.vue'
import HouseDetailDrawer from '@/components/consolidation/HouseDetailDrawer.vue'
import JobHandoffSpine, {
  type HandoffNode,
  type HandoffNodeId,
} from '@/components/job/JobHandoffSpine.vue'
import BatchActionBar from '@/components/ui/BatchActionBar.vue'
import CompactField from '@/components/ui/CompactField.vue'
import CompactSelect from '@/components/ui/CompactSelect.vue'
import CompactTextarea from '@/components/ui/CompactTextarea.vue'
import OsToast from '@/components/ui/OsToast.vue'
import { LOB_CATALOG } from '@/lib/lob'
import { airDirectionFromQuery, lobCodeFromAir } from '@/lib/airWorkspace'
import { operateTypeLabel } from '@/lib/splitBooking'
import { operatorLabel } from '@/data/seatOperators'
import {
  useFreightStore,
  type ConsolidationRecord,
  type ShipmentRecord,
  type ShipmentStatus,
} from '@/stores/freight'
import { JOB_STATUS } from '@/data/legacySearchOptions'
import { isBlockedJobStatus } from '@/lib/jobStatus'

const freight = useFreightStore()
const route = useRoute()
const router = useRouter()

const savedNote = ref('')
const attachCustomer = ref('')
const attachFromId = ref('')
const actionMsg = ref('')
const draft = ref<ConsolidationRecord | null>(null)
const selectedIds = ref<Set<string>>(new Set())
const focusedHouseId = ref<string | null>(null)
const drawerOpen = ref(false)
const drawerHouseId = ref<string | null>(null)
const activeNode = ref<HandoffNodeId>('customs')
const ctx = ref<{ x: number; y: number; house: ShipmentRecord } | null>(null)
const toastRef = ref<{ show: (msg: string, kind?: 'success' | 'info' | 'warn') => void } | null>(null)
const poolId = ref('')
const sectionEls = ref<Record<string, HTMLElement | null>>({})

const statusOptions = JOB_STATUS

const workspaceLob = computed(() => {
  const air = airDirectionFromQuery(route.query as Record<string, unknown>)
  return air ? lobCodeFromAir(air) : null
})

const isListMode = computed(() => !route.params.consolidationId)

const workspaceAir = computed(() => airDirectionFromQuery(route.query as Record<string, unknown>))

const workspaceTitle = computed(() =>
  workspaceLob.value ? LOB_CATALOG[workspaceLob.value].label : 'Consoles',
)

const consoleRows = computed(() => {
  const lob = workspaceLob.value
  return freight.consolidations.filter((c) => {
    if (lob && c.lob !== lob) return false
    return true
  })
})

const liveCon = computed(() =>
  draft.value ? freight.consolidations.find((c) => c.id === draft.value!.id) ?? draft.value : null,
)

const houses = computed(() => {
  if (!liveCon.value) return []
  return freight.shipments.filter((s) => liveCon.value!.houseIds.includes(s.id))
})

const freeDirects = computed(() => {
  if (!liveCon.value) return []
  return freight.freeDirectsForAttach(liveCon.value.lob).map((s) => ({
    value: s.id,
    label: `${s.jobNo} · ${s.customer}`,
  }))
})

const poolOptions = computed(() =>
  freight.availableMawbs.map((r) => ({
    value: r.id,
    label: `${r.mawb} · ${r.airline}`,
  })),
)

const handoffNodes = computed((): HandoffNode[] => {
  const held = houses.value.some(
    (h) =>
      isBlockedJobStatus(h.status) ||
      h.extras?.clearanceGate === 'held' ||
      h.auImport?.biosecurityRisk === 'daff_review',
  )
  return [
    {
      id: 'booking',
      label: 'Booking',
      short: '1. Booking',
      state: 'done',
      owner: operatorLabel('bookingOps'),
      raci: 'R',
      sla: 'SLA met',
      section: 'master',
    },
    {
      id: 'flight',
      label: 'Flight Departure',
      short: '2. Flight Departure',
      state: 'done',
      owner: operatorLabel('flightDesk'),
      raci: 'R',
      sla: liveCon.value?.etd ? `ETD ${liveCon.value.etd}` : 'Departed',
      section: 'master',
    },
    {
      id: 'customs',
      label: 'Customs Entry',
      short: '3. Customs Entry',
      state: held ? 'held' : 'active',
      owner: operatorLabel('customsOps'),
      raci: 'R',
      sla: held ? '4h 12m remaining' : 'Clearance open',
      section: 'houses',
    },
    {
      id: 'arrival',
      label: 'Cargo Arrival',
      short: '4. Cargo Arrival',
      state: 'pending',
      owner: operatorLabel('arrivalDesk'),
      raci: 'R',
      sla: liveCon.value?.eta ? `ETA ${liveCon.value.eta}` : 'Awaiting',
      section: 'houses',
    },
    {
      id: 'delivery',
      label: 'Final Delivery',
      short: '5. Final Delivery',
      state: 'pending',
      owner: operatorLabel('deliveryDesk'),
      raci: 'R',
      sla: 'Not started',
      section: 'attach',
    },
  ]
})

const allChecked = computed({
  get: () => houses.value.length > 0 && houses.value.every((h) => selectedIds.value.has(h.id)),
  set: (v: boolean) => {
    selectedIds.value = v ? new Set(houses.value.map((h) => h.id)) : new Set()
  },
})

const batchVisible = computed(() => selectedIds.value.size > 0)

function customsPill(h: ShipmentRecord) {
  if (h.extras?.clearanceGate === 'held' || h.auImport?.biosecurityRisk === 'daff_review') {
    return { label: 'HELD', cls: 'os-badge--amber', dot: 'bg-amber-600' }
  }
  if (isBlockedJobStatus(h.status)) {
    return { label: h.status.toUpperCase(), cls: 'os-badge--amber', dot: 'bg-amber-600' }
  }
  if (h.status === 'Verified') {
    return { label: 'VERIFIED', cls: 'os-badge--slate', dot: 'bg-slate-400' }
  }
  if (h.extras?.clearanceGate === 'cleared') {
    return { label: 'CLEARED', cls: 'os-badge--green', dot: 'bg-emerald-600' }
  }
  return { label: 'CLEARANCE READY', cls: 'os-badge--green', dot: 'bg-emerald-600' }
}

function setSectionRef(id: string, el: unknown) {
  sectionEls.value[id] = el as HTMLElement | null
}

function loadId(id: string | null) {
  ctx.value = null
  selectedIds.value = new Set()
  focusedHouseId.value = null
  if (!id) {
    draft.value = null
    freight.selectConsolidation(null)
    return
  }
  const row = freight.consolidations.find((c) => c.id === id)
  if (!row) {
    draft.value = null
    return
  }
  draft.value = { ...row, houseIds: [...row.houseIds] }
  freight.selectConsolidation(id)
  savedNote.value = ''
}

function openRow(id: string) {
  const lob = airDirectionFromQuery(route.query as Record<string, unknown>)
  void router.push({
    name: 'consolidation',
    params: { consolidationId: id },
    query: lob ? { lob } : {},
  })
}

function backToList() {
  const lob = airDirectionFromQuery(route.query as Record<string, unknown>)
  void router.push({
    name: 'consolidation',
    query: lob ? { lob } : {},
  })
}

function toast(msg: string, kind: 'success' | 'info' | 'warn' = 'success') {
  toastRef.value?.show(msg, kind)
}

function save() {
  if (!draft.value) return
  freight.updateConsolidation(draft.value.id, { ...draft.value })
  savedNote.value = 'Saved — MBL synced to houses'
  toast('Master saved · houses inherited MBL')
  setTimeout(() => {
    savedNote.value = ''
  }, 2000)
}

function flash(msg: string) {
  actionMsg.value = msg
  toast(msg)
  setTimeout(() => {
    actionMsg.value = ''
  }, 4000)
  if (draft.value) loadId(draft.value.id)
}

function onAttachNew() {
  if (!draft.value) return
  const r = freight.attachHouse(draft.value.id, { customer: attachCustomer.value || undefined })
  flash(r.message)
  attachCustomer.value = ''
}

function onAttachExisting() {
  if (!draft.value || !attachFromId.value) return
  const r = freight.attachHouse(draft.value.id, { fromDirectId: attachFromId.value })
  flash(r.message)
  attachFromId.value = ''
}

function onDetach(houseId: string) {
  const r = freight.detachHouse(houseId)
  drawerOpen.value = false
  selectedIds.value = new Set([...selectedIds.value].filter((id) => id !== houseId))
  flash(r.message)
  if (r.ok && !r.consolidationId) draft.value = null
  else if (draft.value) loadId(draft.value.id)
}

function onBatchDetach() {
  const ids = [...selectedIds.value]
  for (const id of ids) freight.detachHouse(id)
  selectedIds.value = new Set()
  drawerOpen.value = false
  flash(`Detached ${ids.length} house(s)`)
  if (draft.value) loadId(draft.value.id)
}

async function onBatchCopyHawb() {
  const texts = houses.value
    .filter((h) => selectedIds.value.has(h.id) && h.hawb)
    .map((h) => h.hawb)
  if (texts.length) await navigator.clipboard.writeText(texts.join('\n'))
  toast(`Copied ${texts.length} HAWB`)
}

function onBatchOpenDrawer() {
  const first = [...selectedIds.value][0]
  if (first) openHouseDrawer(first)
}

function onAllocate() {
  if (!liveCon.value || !poolId.value) return
  const r = freight.allocateMawb(liveCon.value.masterJobId, poolId.value)
  flash(r.message)
  poolId.value = ''
  if (draft.value) loadId(draft.value.id)
}

function openMasterShipment() {
  if (!liveCon.value) return
  const lob =
    airDirectionFromQuery(route.query as Record<string, unknown>) ??
    (liveCon.value.lob === 'air_import' ? 'AI' : liveCon.value.lob === 'air_export' ? 'AE' : null)
  void router.push({
    name: 'job-context',
    params: { shipmentId: liveCon.value.masterJobId },
    query: lob ? { lob } : {},
  })
}

function openMasterJob() {
  if (!liveCon.value) return
  void router.push({ name: 'job-context', params: { shipmentId: liveCon.value.masterJobId } })
}

function toggleCheck(id: string, e: Event) {
  e.stopPropagation()
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

function openHouseDrawer(id: string) {
  focusedHouseId.value = id
  drawerHouseId.value = id
  drawerOpen.value = true
  ctx.value = null
}

function onRowContext(e: MouseEvent, h: ShipmentRecord) {
  e.preventDefault()
  focusedHouseId.value = h.id
  ctx.value = { x: Math.min(e.clientX, window.innerWidth - 200), y: Math.min(e.clientY, window.innerHeight - 160), house: h }
}

async function copyHawb(h: ShipmentRecord) {
  if (h.hawb) await navigator.clipboard.writeText(h.hawb)
  toast(`Copied HAWB ${h.hawb || '—'}`)
  ctx.value = null
}

async function copyMawb(h: ShipmentRecord) {
  if (h.mawb) await navigator.clipboard.writeText(h.mawb)
  toast(`Copied MAWB ${h.mawb || '—'}`)
  ctx.value = null
}

function onSpineSelect(node: HandoffNode) {
  activeNode.value = node.id
  const key = node.section || 'houses'
  nextTick(() => {
    sectionEls.value[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function onKey(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

  if (e.key === 'Escape') {
    if (ctx.value) {
      ctx.value = null
      return
    }
    if (drawerOpen.value) {
      drawerOpen.value = false
      return
    }
    if (selectedIds.value.size) {
      selectedIds.value = new Set()
      return
    }
  }

  if (!houses.value.length) return
  const ids = houses.value.map((h) => h.id)
  const idx = focusedHouseId.value ? ids.indexOf(focusedHouseId.value) : -1

  if (e.key === 'j' || e.key === 'J' || e.key === 'ArrowDown') {
    e.preventDefault()
    focusedHouseId.value = ids[Math.min(idx + 1, ids.length - 1)] ?? ids[0]
  }
  if (e.key === 'k' || e.key === 'K' || e.key === 'ArrowUp') {
    e.preventDefault()
    focusedHouseId.value = ids[Math.max(idx - 1, 0)] ?? ids[0]
  }
  if (e.key === 'Enter' && focusedHouseId.value) {
    e.preventDefault()
    openHouseDrawer(focusedHouseId.value)
  }
  if (e.key === ' ' && focusedHouseId.value) {
    e.preventDefault()
    const next = new Set(selectedIds.value)
    if (next.has(focusedHouseId.value)) next.delete(focusedHouseId.value)
    else next.add(focusedHouseId.value)
    selectedIds.value = next
  }
}

function closeCtx() {
  ctx.value = null
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  window.addEventListener('click', closeCtx)
  const id = route.params.consolidationId ? String(route.params.consolidationId) : null
  if (id) loadId(id)
  else {
    draft.value = null
    freight.selectConsolidation(null)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('click', closeCtx)
})

watch(
  () => route.params.consolidationId,
  (id) => {
    if (id) loadId(String(id))
    else {
      draft.value = null
      freight.selectConsolidation(null)
    }
  },
)
</script>

<template>
  <AppShell>
    <div class="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <!-- LIST -->
      <ConsoleListGrid
        v-if="isListMode"
        :rows="consoleRows"
        :lob-key="workspaceAir ?? 'ALL'"
        :title="workspaceTitle"
        @open="openRow"
      />

      <!-- DETAIL -->
      <template v-else>
      <JobHandoffSpine
        v-if="liveCon"
        class="shrink-0"
        :nodes="handoffNodes"
        :active-id="activeNode"
        @select="onSpineSelect"
      />

      <div class="flex min-h-0 flex-1 overflow-hidden">
        <section v-if="draft && liveCon" class="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div class="flex items-center gap-2 border-b border-border bg-card px-4 py-2">
            <button
              type="button"
              class="flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-[11px] font-medium hover:bg-muted"
              @click="backToList"
            >
              <ArrowLeft :size="13" />
              List
            </button>
          </div>
          <div :ref="(el) => setSectionRef('master', el)" class="os-panel m-3 mb-0 shrink-0 p-3">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-mono text-[15px] font-bold">{{ liveCon.masterJobNo }}</span>
                  <span class="os-badge os-badge--teal">{{ LOB_CATALOG[liveCon.lob].prefix }}</span>
                  <span class="os-badge os-badge--slate">{{ operateTypeLabel(liveCon.operateType) }}</span>
                </div>
                <div class="mt-2 flex flex-wrap gap-1.5">
                  <span class="os-badge os-badge--slate">MBL {{ liveCon.mawb }}</span>
                  <span class="os-badge os-badge--slate">{{ liveCon.airline }}</span>
                  <span class="os-badge os-badge--slate">{{ liveCon.route }}</span>
                  <span class="os-badge os-badge--slate">ETD {{ liveCon.etd || '—' }}</span>
                  <span class="os-badge os-badge--slate">ETA {{ liveCon.eta || '—' }}</span>
                </div>
                <p class="mt-2 flex items-center gap-1.5 text-[11px] text-teal-700">
                  <Link2 :size="12" :stroke-width="2" />
                  Inherited by linked houses
                </p>
              </div>
              <div class="flex flex-wrap items-end gap-1.5">
                <span v-if="savedNote || actionMsg" class="mr-1 text-[11px] font-medium text-teal-700">
                  {{ actionMsg || savedNote }}
                </span>
                <CompactSelect
                  v-model="poolId"
                  label="MAWB pool"
                  hint="Allocate…"
                  class="w-[170px]"
                  :options="poolOptions"
                />
                <button
                  type="button"
                  class="flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-[11px] font-medium hover:bg-muted"
                  @click="onAllocate"
                >
                  <Ticket :size="13" />
                  Allocate MAWB
                </button>
                <button
                  type="button"
                  class="flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-[11px] font-medium hover:bg-muted"
                  @click="openMasterShipment"
                >
                  <Pencil :size="13" />
                  Edit Master
                </button>
                <button
                  type="button"
                  class="flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-[11px] font-medium hover:bg-muted"
                  @click="openMasterJob"
                >
                  Master Job Desk
                </button>
                <button
                  type="button"
                  class="flex h-8 items-center gap-1 rounded-md bg-primary px-3 text-[11px] font-bold text-white"
                  @click="save"
                >
                  <Save :size="13" />
                  Save
                </button>
              </div>
            </div>

            <div class="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 sm:grid-cols-4 lg:grid-cols-6">
              <CompactField v-model="draft.mawb" label="MBL / MAWB" mono required />
              <CompactField v-model="draft.route" label="Route" mono required />
              <CompactField v-model="draft.airline" label="Airline" />
              <CompactField v-model="draft.etd" label="ETD" mono />
              <CompactField v-model="draft.eta" label="ETA" mono />
              <CompactSelect
                :model-value="draft.status"
                label="Status"
                :options="statusOptions"
                @update:model-value="draft.status = $event as ShipmentStatus"
              />
            </div>
          </div>

          <div
            :ref="(el) => setSectionRef('houses', el)"
            class="os-panel m-3 flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <div class="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
              <div class="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                House shipments
              </div>
              <span class="text-[11px] text-muted-foreground">
                J/K move · Space check · Enter drawer · right-click
              </span>
            </div>

            <div class="min-h-0 flex-1 overflow-auto">
              <table class="os-grid-table">
                <thead>
                  <tr>
                    <th class="w-8">
                      <input v-model="allChecked" type="checkbox" class="accent-primary" />
                    </th>
                    <th>Job No</th>
                    <th>Customer</th>
                    <th>HAWB</th>
                    <th>Gross / Chg Wt</th>
                    <th>Customs</th>
                    <th class="w-20">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="h in houses"
                    :key="h.id"
                    :class="{
                      'is-selected': focusedHouseId === h.id,
                      'is-checked': selectedIds.has(h.id),
                    }"
                    @click="openHouseDrawer(h.id)"
                    @contextmenu="onRowContext($event, h)"
                  >
                    <td @click.stop>
                      <input
                        type="checkbox"
                        class="accent-primary"
                        :checked="selectedIds.has(h.id)"
                        @change="toggleCheck(h.id, $event)"
                      />
                    </td>
                    <td class="font-mono text-[11px] font-semibold text-primary">{{ h.jobNo }}</td>
                    <td class="max-w-[160px] truncate">{{ h.customer }}</td>
                    <td class="font-mono text-[11px]">{{ h.hawb || '—' }}</td>
                    <td class="font-mono text-[11px] text-muted-foreground">
                      {{ h.chargeableWt || '—' }}
                    </td>
                    <td>
                      <span class="os-badge" :class="customsPill(h).cls">
                        <span class="inline-block h-1.5 w-1.5 rounded-full" :class="customsPill(h).dot" />
                        {{ customsPill(h).label }}
                      </span>
                    </td>
                    <td @click.stop>
                      <button
                        type="button"
                        class="inline-flex items-center gap-1 text-[11px] text-amber-800 hover:underline"
                        @click="onDetach(h.id)"
                      >
                        <Unlink :size="12" />
                        Detach
                      </button>
                    </td>
                  </tr>
                  <tr v-if="!houses.length">
                    <td colspan="7" class="py-10 text-center text-[12px] text-muted-foreground">
                      No houses — attach below
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div
              :ref="(el) => setSectionRef('attach', el)"
              v-if="liveCon.operateType === 'console' || houses.length < 1"
              class="flex shrink-0 flex-wrap items-end gap-2 border-t border-border bg-slate-50/80 px-3 py-2.5"
            >
              <CompactField
                v-model="attachCustomer"
                label="New house customer"
                hint="Create house + HBL"
                class="min-w-[160px] flex-1"
              />
              <CompactSelect
                v-model="attachFromId"
                label="Attach existing Direct"
                hint="Free Direct…"
                class="min-w-[180px] flex-1"
                :options="freeDirects"
              />
              <button
                type="button"
                class="flex h-8 items-center gap-1 rounded-md bg-primary px-3 text-[11px] font-bold text-white"
                @click="onAttachNew"
              >
                <Plus :size="13" />
                Add house
              </button>
              <button
                type="button"
                class="flex h-8 items-center gap-1 rounded-md border border-border bg-white px-3 text-[11px] font-medium hover:bg-muted disabled:opacity-40"
                :disabled="!attachFromId"
                @click="onAttachExisting"
              >
                Attach Direct
              </button>
            </div>
          </div>

          <div class="mx-3 mb-3">
            <CompactTextarea v-model="draft.notes" label="Console notes" hint="Internal note" :rows="2" />
          </div>
        </section>

        <section
          v-else
          class="flex flex-1 flex-col items-center justify-center gap-2 text-[13px] text-muted-foreground"
        >
          <p>Console not found.</p>
          <button
            type="button"
            class="rounded-md border border-border px-3 py-1.5 text-[12px] font-semibold text-foreground hover:bg-muted"
            @click="backToList"
          >
            Back to list
          </button>
        </section>
      </div>
      </template>
    </div>

    <div
      v-if="ctx"
      class="os-ctx-menu"
      :style="{ left: `${ctx.x}px`, top: `${ctx.y}px` }"
      @click.stop
    >
      <button type="button" @click="openHouseDrawer(ctx.house.id)">
        <Pencil :size="13" />
        Quick edit
      </button>
      <button type="button" @click="copyHawb(ctx.house)">
        <Copy :size="13" />
        Copy HAWB
      </button>
      <button type="button" @click="copyMawb(ctx.house)">
        <Copy :size="13" />
        Copy MAWB
      </button>
      <button type="button" @click="openHouseDrawer(ctx.house.id)">
        Open drawer
      </button>
      <button type="button" class="is-danger" @click="onDetach(ctx.house.id)">
        <Unlink :size="13" />
        Detach row
      </button>
    </div>

    <BatchActionBar
      :visible="batchVisible"
      :count="selectedIds.size"
      @clear="selectedIds = new Set()"
      @copy-hawb="onBatchCopyHawb"
      @detach="onBatchDetach"
      @open-drawer="onBatchOpenDrawer"
    />

    <HouseDetailDrawer
      :open="drawerOpen"
      :house-id="drawerHouseId"
      @close="drawerOpen = false"
      @autosaved="toast($event)"
      @detach="onDetach"
    />

    <OsToast ref="toastRef" />
  </AppShell>
</template>
