<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowRight, UserCheck, UserPlus } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import AdminRaciMatrixPanel from '@/components/admin/AdminRaciMatrixPanel.vue'
import {
  ADMIN_ROLE_COLUMN,
  ADMIN_SEAT_COLUMN,
  useUserAdminStore,
} from '@/stores/userAdmin'
import {
  TIER_LABELS,
  useRaciConfigStore,
  type CompanyTier,
  type L0Function,
} from '@/stores/raciConfig'

const emit = defineEmits<{
  gotoUsers: []
}>()

const { t } = useI18n()
const raci = useRaciConfigStore()
const userAdmin = useUserAdminStore()

const expandedRole = ref<L0Function | null>('Air Export')

function toggleRole(role: L0Function) {
  expandedRole.value = expandedRole.value === role ? null : role
}

function unassignedUsers(role: L0Function) {
  const assigned = new Set(raci.assigneesForRole(role))
  return userAdmin.users.filter((u) => !assigned.has(u.id) && u.status !== 'SUSPENDED')
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 class="text-[17px] font-bold tracking-tight text-foreground">
        {{ t('adminStudio.legacy.seats.title') }}
      </h2>
      <p class="mt-1 text-xs text-muted-foreground">
        {{ t('adminStudio.legacy.seats.subtitle') }}
      </p>
    </div>

    <Card size="sm" class="rounded-[10px] border-border ring-border">
      <CardContent class="px-4 py-3 text-[11px] text-muted-foreground">
        {{ t('adminStudio.panels.seats.callout') }}
      </CardContent>
    </Card>

    <!-- Adaptive RACI Distribution — shell-mock pattern -->
    <Card class="rounded-[10px] border-border ring-border">
      <CardHeader class="border-b border-border px-4 py-3">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <UserCheck :size="16" class="text-primary" :stroke-width="1.75" aria-hidden="true" />
              <CardTitle class="text-[13px]">{{ t('adminStudio.panels.seats.distTitle') }}</CardTitle>
            </div>
            <CardDescription class="mt-1 text-[11px]">
              {{
                t('adminStudio.panels.seats.distCatalog', {
                  tasks: raci.catalogTaskCount,
                  processes: raci.catalogProcessCount,
                  roleCol: ADMIN_ROLE_COLUMN,
                })
              }}
            </CardDescription>
          </div>
          <Select
            :model-value="raci.companyTier"
            @update:model-value="(v) => raci.setCompanyTier(String(v) as CompanyTier)"
          >
            <SelectTrigger class="h-8 w-full min-w-[140px] text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="(label, tier) in TIER_LABELS" :key="tier" :value="tier">
                {{ label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent class="p-0">
        <div
          class="grid grid-cols-[1fr_1fr_100px] gap-2 border-b border-border bg-muted/60 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground"
        >
          <span>{{ ADMIN_ROLE_COLUMN }}</span>
          <span>{{ ADMIN_SEAT_COLUMN }}</span>
          <span>{{ t('adminStudio.panels.seats.colUsers') }}</span>
        </div>

        <div
          v-for="row in raci.roleMappingRows"
          :key="row.role"
          class="border-b border-border last:border-0"
        >
          <button
            type="button"
            class="grid w-full grid-cols-[1fr_1fr_100px] gap-2 px-3 py-2.5 text-left text-[12px] hover:bg-muted/30"
            @click="toggleRole(row.role)"
          >
            <span class="font-medium">{{ row.role }}</span>
            <span class="font-mono text-[11px] text-primary">{{ row.seat }}</span>
            <span class="truncate text-[11px] text-muted-foreground">
              {{
                row.userCount
                  ? row.users.map((u) => u.name.split(' ')[0]).join(', ')
                  : '—'
              }}
            </span>
          </button>

          <div v-if="expandedRole === row.role" class="border-t border-border bg-muted/20 px-3 py-3">
            <p class="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {{ t('adminStudio.panels.seats.assignedUsers') }}
            </p>
            <div v-if="row.users.length" class="mb-3 space-y-1">
              <div
                v-for="u in row.users"
                :key="u.id"
                class="flex items-center justify-between rounded-md border border-border bg-card px-2 py-1.5"
              >
                <div>
                  <span class="text-[12px] font-medium">{{ u.name }}</span>
                  <Badge
                    v-if="u.status === 'DRAFT_PENDING'"
                    variant="high"
                    class="ml-2 rounded-md text-[9px]"
                  >
                    {{ t('adminStudio.panels.users.status.DRAFT_PENDING') }}
                  </Badge>
                </div>
                <button
                  type="button"
                  class="text-[10px] text-destructive hover:underline"
                  @click="raci.removeUserFromRole(row.role, u.id)"
                >
                  {{ t('adminStudio.panels.seats.remove') }}
                </button>
              </div>
            </div>
            <p v-else class="mb-3 text-[11px] text-muted-foreground">
              {{ t('adminStudio.panels.seats.noneAssigned') }}
            </p>

            <div v-if="unassignedUsers(row.role).length" class="flex flex-wrap gap-1">
              <Button
                v-for="u in unassignedUsers(row.role)"
                :key="u.id"
                type="button"
                size="sm"
                variant="outline"
                class="h-7 gap-1 border-primary/30 bg-primary-tint text-[11px] text-primary hover:bg-primary/10"
                @click="raci.assignUserToRole(row.role, u.id)"
              >
                <UserPlus :size="12" aria-hidden="true" />
                {{ u.name }}
              </Button>
            </div>
            <p v-else-if="!row.users.length" class="text-[11px] text-muted-foreground">
              {{ t('adminStudio.panels.seats.inviteFirst') }}
            </p>
          </div>
        </div>
      </CardContent>

      <div class="border-t border-border px-4 py-2">
        <button
          type="button"
          class="text-[11px] font-medium text-primary hover:underline"
          @click="raci.resetToDefaults()"
        >
          {{ t('adminStudio.panels.seats.resetTier') }}
        </button>
      </div>
    </Card>

    <!-- Constitution catalog browser — replaces duplicate “desk lens” sample -->
    <AdminRaciMatrixPanel />

    <Card size="sm" class="rounded-[10px] border-border ring-border">
      <CardContent class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <p class="text-[13px] font-semibold text-foreground">
            {{ t('adminStudio.panels.seats.needAccount') }}
          </p>
          <p class="mt-0.5 text-[12px] text-muted-foreground">
            {{ t('adminStudio.panels.seats.needAccountSub', { roleCol: ADMIN_ROLE_COLUMN }) }}
          </p>
        </div>
        <Button size="sm" variant="outline" class="gap-1.5" @click="emit('gotoUsers')">
          {{ t('adminStudio.nav.users') }}
          <ArrowRight :size="14" aria-hidden="true" />
        </Button>
      </CardContent>
    </Card>
  </div>
</template>
