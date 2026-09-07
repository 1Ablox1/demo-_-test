<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import AppShell from '@/components/airfreight/AppShell.vue'
import AdminStudioShell, { type AdminNavId } from '@/components/admin/AdminStudioShell.vue'
import AdminTenantPanel from '@/components/admin/AdminTenantPanel.vue'
import AdminMarketPacksPanel from '@/components/admin/AdminMarketPacksPanel.vue'
import AdminUsersPanel from '@/components/admin/AdminUsersPanel.vue'
import AdminSeatsPanel from '@/components/admin/AdminSeatsPanel.vue'
import NumberingFormulaBuilder from '@/components/admin/NumberingFormulaBuilder.vue'
import MawbInventoryPool from '@/components/admin/MawbInventoryPool.vue'
import AdminFloatingDock from '@/components/admin/AdminFloatingDock.vue'
import AdminLegacyPanels from '@/components/admin/AdminLegacyPanels.vue'
import { bindTenantToMarketPacks, useTenantAdminStore } from '@/stores/tenantAdmin'
import { useMarketPackStore } from '@/stores/marketPacks'
import { useRaciConfigStore } from '@/stores/raciConfig'
import { fetchNumberingPolicies } from '@/api/client'
import type { NumberingPolicy } from '@/mdm/numberingTypes'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const tenant = useTenantAdminStore()
const marketPacks = useMarketPackStore()
const raci = useRaciConfigStore()

const NAV_IDS: AdminNavId[] = [
  'tenant',
  'market',
  'users',
  'seats',
  'numbering',
  'rulebook',
  'digital',
]

function navFromRoute(): AdminNavId {
  const q = route.query.nav
  if (typeof q === 'string' && (NAV_IDS as string[]).includes(q)) return q as AdminNavId
  return 'tenant'
}

/** Best practice: land on Tenant; deep links via ?nav= or /admin/users. */
const activeNav = ref<AdminNavId>(navFromRoute())
const dirty = ref(false)
const dockVisible = ref(true)
const loading = ref(true)
const shipPolicy = ref<NumberingPolicy | null>(null)
const formulaRef = ref<InstanceType<typeof NumberingFormulaBuilder> | null>(null)

async function loadPolicies() {
  loading.value = true
  try {
    const res = await fetchNumberingPolicies()
    shipPolicy.value = res.items.find((p) => p.id === 'pol-ship-sto') ?? res.items[0] ?? null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  bindTenantToMarketPacks(tenant, marketPacks)
  void loadPolicies()
})

function openMatrixTask(taskId: string) {
  raci.openMatrixTask(taskId)
  onNav('seats')
}

watch(
  () => route.query.nav,
  () => {
    activeNav.value = navFromRoute()
  },
)

function onNav(id: AdminNavId) {
  activeNav.value = id
  void router.replace({ name: 'admin', query: id === 'tenant' ? {} : { nav: id } })
}

function markDirty() {
  dirty.value = true
  dockVisible.value = true
}

function discard() {
  formulaRef.value?.reset()
  dirty.value = false
  dockVisible.value = false
}

async function publish() {
  const ok = await formulaRef.value?.save()
  if (ok !== false) dirty.value = false
}
</script>

<template>
  <AppShell>
    <AdminStudioShell :active-nav="activeNav" @nav="onNav">
      <AdminTenantPanel
        v-if="activeNav === 'tenant'"
        @goto="onNav"
      />

      <AdminMarketPacksPanel
        v-else-if="activeNav === 'market'"
        @open-task="openMatrixTask"
      />

      <AdminUsersPanel
        v-else-if="activeNav === 'users'"
        @goto-seats="onNav('seats')"
      />

      <AdminSeatsPanel
        v-else-if="activeNav === 'seats'"
        @goto-users="onNav('users')"
      />

      <template v-else-if="activeNav === 'numbering'">
        <div class="mb-5">
          <h2 class="m-0 text-[17px] font-bold leading-snug tracking-tight text-foreground">
            {{ t('adminStudio.section.numberingTitle') }}
          </h2>
          <p class="mt-1 text-xs text-muted-foreground">
            {{ t('adminStudio.section.numberingSub') }}
          </p>
        </div>

        <div v-if="loading" class="text-sm text-muted-foreground">{{ t('numbering.loading') }}</div>

        <div v-else class="flex flex-col gap-5">
          <NumberingFormulaBuilder
            ref="formulaRef"
            :policy="shipPolicy"
            @dirty="markDirty"
            @saved="dirty = false"
          />
          <MawbInventoryPool @dirty="markDirty" />
        </div>
      </template>

      <AdminLegacyPanels
        v-else-if="activeNav === 'rulebook' || activeNav === 'digital'"
        :section="activeNav"
      />
    </AdminStudioShell>

    <AdminFloatingDock
      :visible="dockVisible && activeNav === 'numbering'"
      :dirty="dirty"
      @discard="discard"
      @save="publish"
    />
  </AppShell>
</template>
