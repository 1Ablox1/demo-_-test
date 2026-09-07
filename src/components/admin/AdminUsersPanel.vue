<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Link2,
  Lock,
  Mail,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ADMIN_ROLE_COLUMN,
  ADMIN_SEAT_COLUMN,
  OFFICE_OPTIONS,
  PROVIDER_LABELS,
  useUserAdminStore,
  type AuthProvider,
  type UserAccountProfile,
  type UserStatus,
} from '@/stores/userAdmin'
import { useRaciConfigStore } from '@/stores/raciConfig'

const emit = defineEmits<{
  gotoSeats: []
}>()

const { t } = useI18n()
const userAdmin = useUserAdminStore()
const raci = useRaciConfigStore()

const inviteName = ref('')
const inviteEmail = ref('')
const inviteOffice = ref('SYD')
const expandedId = ref<string | null>(null)
const legacyDraft = ref('')

const sortedUsers = computed(() =>
  [...userAdmin.users].sort((a, b) => a.name.localeCompare(b.name)),
)

function providerIcon(provider: AuthProvider) {
  if (provider === 'LOCAL_LEGACY') return Lock
  return ShieldCheck
}

function statusVariant(status: UserStatus): 'normal' | 'high' | 'pack' {
  if (status === 'ACTIVE') return 'normal'
  if (status === 'DRAFT_PENDING') return 'high'
  return 'pack'
}

function statusLabel(status: UserStatus): string {
  return t(`adminStudio.panels.users.status.${status}`)
}

function assignedRoles(userId: string) {
  return raci.getRolesForUser(userId)
}

function roleSeatLabel(role: Parameters<typeof raci.resolveEffectiveSeat>[0]) {
  return raci.resolveEffectiveSeat(role)
}

function toggleExpand(user: UserAccountProfile) {
  if (expandedId.value === user.id) {
    expandedId.value = null
    return
  }
  expandedId.value = user.id
  legacyDraft.value = user.legacyUserId ?? ''
}

function submitInvite() {
  if (!inviteName.value.trim() || !inviteEmail.value.trim()) return
  const created = userAdmin.inviteUser(
    inviteName.value,
    inviteEmail.value,
    inviteOffice.value,
  )
  inviteName.value = ''
  inviteEmail.value = ''
  inviteOffice.value = 'SYD'
  expandedId.value = created.id
  legacyDraft.value = created.legacyUserId ?? ''
}

function saveLegacy(userId: string) {
  userAdmin.linkLegacyUser(userId, legacyDraft.value)
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 class="text-[17px] font-bold tracking-tight text-foreground">
        {{ t('adminStudio.panels.users.title') }}
      </h2>
      <p class="mt-1 text-xs text-muted-foreground">
        {{ t('adminStudio.panels.users.subtitle') }}
      </p>
    </div>

    <!-- Identity-only SoT callout -->
    <Card size="sm" class="rounded-[10px] border-border ring-border">
      <CardContent class="px-4 py-3 text-[12px] leading-snug text-muted-foreground">
        <span class="font-semibold text-foreground">{{ t('adminStudio.panels.users.sotTitle') }}</span>
        {{ t('adminStudio.panels.users.sotBody') }}
        <button
          type="button"
          class="ml-1 font-medium text-primary hover:underline"
          @click="emit('gotoSeats')"
        >
          {{ t('adminStudio.nav.seats') }}
        </button>
        — {{ t('adminStudio.panels.users.sotTail') }}
      </CardContent>
    </Card>

    <!-- Stats -->
    <div class="grid gap-3 sm:grid-cols-3">
      <Card size="sm" class="rounded-[10px] border-border ring-border">
        <CardContent class="px-4 py-3">
          <div class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            <UserCheck :size="12" :stroke-width="1.75" aria-hidden="true" />
            {{ t('adminStudio.panels.users.statActive') }}
          </div>
          <div class="mt-1 font-mono text-[18px] font-bold text-foreground">
            {{ userAdmin.activeCount }}
          </div>
        </CardContent>
      </Card>
      <Card size="sm" class="rounded-[10px] border-border ring-border">
        <CardContent class="px-4 py-3">
          <div class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            <AlertCircle :size="12" :stroke-width="1.75" aria-hidden="true" />
            {{ t('adminStudio.panels.users.statPending') }}
          </div>
          <div class="mt-1 font-mono text-[18px] font-bold text-foreground">
            {{ userAdmin.pendingCount }}
          </div>
        </CardContent>
      </Card>
      <Card size="sm" class="rounded-[10px] border-border ring-border">
        <CardContent class="px-4 py-3">
          <div class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            <ShieldCheck :size="12" :stroke-width="1.75" aria-hidden="true" />
            {{ t('adminStudio.panels.users.statFederated') }}
          </div>
          <div class="mt-1 font-mono text-[18px] font-bold text-foreground">
            {{ userAdmin.ssoLinkedCount }}
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Entra callout -->
    <Card size="sm" class="rounded-[10px] border-amber-200 bg-amber-50 ring-amber-200/60">
      <CardContent class="flex items-start gap-2 px-4 py-3">
        <ShieldCheck
          :size="16"
          :stroke-width="1.75"
          class="mt-0.5 shrink-0 text-amber-800"
          aria-hidden="true"
        />
        <div>
          <p class="text-[13px] font-semibold text-amber-950">
            {{ t('adminStudio.panels.users.entraTitle') }}
          </p>
          <p class="mt-0.5 text-[12px] leading-snug text-amber-900">
            {{ t('adminStudio.panels.users.entraBody') }}
          </p>
        </div>
      </CardContent>
    </Card>

    <!-- Invite (identity only — no L0 dropdown) -->
    <Card class="rounded-[10px] border-border ring-border">
      <CardHeader class="px-4 pb-0 pt-0">
        <div class="flex items-center gap-2">
          <UserPlus :size="16" class="text-primary" :stroke-width="1.75" aria-hidden="true" />
          <CardTitle class="text-[13px]">{{ t('adminStudio.panels.users.inviteTitle') }}</CardTitle>
        </div>
        <CardDescription class="text-[11px]">
          {{ t('adminStudio.panels.users.inviteSub') }}
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-3 px-4">
        <div class="grid gap-2 sm:grid-cols-3">
          <Input
            v-model="inviteName"
            type="text"
            class="h-8 text-[12px]"
            :placeholder="t('adminStudio.panels.users.phName')"
          />
          <Input
            v-model="inviteEmail"
            type="email"
            class="h-8 text-[12px]"
            :placeholder="t('adminStudio.panels.users.phEmail')"
          />
          <Select v-model="inviteOffice">
            <SelectTrigger class="h-8 w-full text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="o in OFFICE_OPTIONS" :key="o.id" :value="o.id">
                {{ o.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" class="gap-1.5" @click="submitInvite">
          <Mail :size="14" :stroke-width="1.75" aria-hidden="true" />
          {{ t('adminStudio.panels.users.sendInvite') }}
        </Button>
      </CardContent>
    </Card>

    <!-- Directory -->
    <Card class="overflow-hidden rounded-[10px] border-border ring-border">
      <CardHeader class="border-b border-border px-4 py-3">
        <div class="flex items-center justify-between gap-2">
          <CardTitle class="text-[13px]">{{ t('adminStudio.panels.users.directoryTitle') }}</CardTitle>
          <Badge variant="secondary" class="rounded-full font-mono text-[10px]">
            {{ sortedUsers.length }}
          </Badge>
        </div>
      </CardHeader>
      <CardContent class="p-0">
        <div
          class="hidden grid-cols-[1.3fr_1.4fr_1.5fr_72px_88px_64px] gap-2 border-b border-border bg-muted/60 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground lg:grid"
        >
          <span>{{ t('adminStudio.panels.users.colUser') }}</span>
          <span>{{ t('adminStudio.panels.users.colIdentity') }}</span>
          <span>{{ ADMIN_ROLE_COLUMN }}</span>
          <span>{{ t('adminStudio.panels.users.colOffice') }}</span>
          <span>{{ t('adminStudio.panels.users.colStatus') }}</span>
          <span>{{ t('adminStudio.panels.users.colActions') }}</span>
        </div>

        <div
          v-for="user in sortedUsers"
          :key="user.id"
          class="border-b border-border last:border-0"
        >
          <button
            type="button"
            class="grid w-full grid-cols-1 gap-2 px-3 py-2.5 text-left text-[12px] hover:bg-muted/30 lg:grid-cols-[1.3fr_1.4fr_1.5fr_72px_88px_64px]"
            @click="toggleExpand(user)"
          >
            <span>
              <span class="block font-medium text-foreground">{{ user.name }}</span>
              <span class="block text-[11px] text-muted-foreground">{{ user.email }}</span>
              <span
                v-if="user.legacyUserId"
                class="mt-0.5 block font-mono text-[10px] text-muted-foreground"
              >
                Legacy {{ user.legacyUserId }}
              </span>
            </span>
            <span class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <component
                :is="providerIcon(user.provider)"
                :size="12"
                :stroke-width="1.75"
                class="shrink-0 text-primary"
                aria-hidden="true"
              />
              {{ PROVIDER_LABELS[user.provider] }}
            </span>
            <span class="text-[11px]">
              <template v-if="assignedRoles(user.id).length">
                <span
                  v-for="role in assignedRoles(user.id)"
                  :key="role"
                  class="mb-0.5 block"
                >
                  <span class="font-medium text-foreground">{{ role }}</span>
                  <span class="ml-1 font-mono text-primary">→ {{ roleSeatLabel(role) }}</span>
                </span>
              </template>
              <span
                v-else
                class="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800"
              >
                <Users :size="10" :stroke-width="1.75" aria-hidden="true" />
                {{ t('adminStudio.panels.users.unassigned') }}
              </span>
            </span>
            <span class="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
              <Building2 :size="11" :stroke-width="1.75" aria-hidden="true" />
              {{ user.defaultOfficeId }}
            </span>
            <span>
              <Badge :variant="statusVariant(user.status)" class="rounded-md text-[10px]">
                {{ statusLabel(user.status) }}
              </Badge>
            </span>
            <span class="text-[11px] font-medium text-primary">
              {{
                expandedId === user.id
                  ? t('adminStudio.panels.users.close')
                  : t('adminStudio.panels.users.edit')
              }}
            </span>
          </button>

          <div
            v-if="expandedId === user.id"
            class="border-t border-border bg-muted/20 px-3 py-3"
          >
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {{ t('adminStudio.panels.users.defaultOffice') }}
                <Select
                  :model-value="user.defaultOfficeId"
                  @update:model-value="
                    (v) => userAdmin.updateUserProfile(user.id, { defaultOfficeId: String(v) })
                  "
                >
                  <SelectTrigger class="mt-1 h-8 w-full text-[12px] normal-case tracking-normal">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="o in OFFICE_OPTIONS" :key="o.id" :value="o.id">
                      {{ o.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <label class="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {{ t('adminStudio.panels.users.legacyId') }}
                <span class="mt-1 flex gap-1">
                  <Input
                    v-model="legacyDraft"
                    type="text"
                    class="h-8 flex-1 text-[12px] normal-case tracking-normal"
                    :placeholder="t('adminStudio.panels.users.phLegacy')"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    class="h-8 gap-1 px-2 text-[11px]"
                    @click="saveLegacy(user.id)"
                  >
                    <Link2 :size="12" :stroke-width="1.75" aria-hidden="true" />
                    {{ t('adminStudio.panels.users.link') }}
                  </Button>
                </span>
              </label>
            </div>

            <div class="mt-3 rounded-lg border border-border bg-card px-3 py-2.5">
              <div class="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {{ ADMIN_ROLE_COLUMN }} · {{ t('adminStudio.panels.users.readOnly') }}
              </div>
              <div v-if="assignedRoles(user.id).length" class="mt-1.5 flex flex-wrap gap-1">
                <Badge
                  v-for="role in assignedRoles(user.id)"
                  :key="role"
                  variant="pack"
                  class="rounded-md border-primary/30 bg-primary-tint text-[11px] font-medium text-primary"
                >
                  {{ role }}
                  <span class="font-mono text-[10px] opacity-75">({{ roleSeatLabel(role) }})</span>
                </Badge>
              </div>
              <p v-else class="mt-1 text-[11px] text-muted-foreground">
                {{ t('adminStudio.panels.users.noRolesYet') }}
              </p>
              <button
                type="button"
                class="mt-2 flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                @click="emit('gotoSeats')"
              >
                {{ t('adminStudio.panels.users.linkSeats') }}
                <ArrowRight :size="12" :stroke-width="1.75" aria-hidden="true" />
              </button>
            </div>

            <div class="mt-3 flex flex-wrap gap-2">
              <Button
                v-if="user.status !== 'ACTIVE'"
                type="button"
                size="sm"
                variant="outline"
                class="h-7 gap-1 border-emerald-200 bg-emerald-50 text-[11px] text-emerald-800 hover:bg-emerald-100"
                @click="userAdmin.updateUserStatus(user.id, 'ACTIVE')"
              >
                <UserCheck :size="12" :stroke-width="1.75" aria-hidden="true" />
                {{ t('adminStudio.panels.users.activate') }}
              </Button>
              <Button
                v-if="user.status !== 'SUSPENDED'"
                type="button"
                size="sm"
                variant="outline"
                class="h-7 gap-1 text-[11px]"
                @click="userAdmin.updateUserStatus(user.id, 'SUSPENDED')"
              >
                <UserX :size="12" :stroke-width="1.75" aria-hidden="true" />
                {{ t('adminStudio.panels.users.suspend') }}
              </Button>
              <Button
                v-if="user.status === 'SUSPENDED'"
                type="button"
                size="sm"
                variant="outline"
                class="h-7 gap-1 border-amber-200 bg-amber-50 text-[11px] text-amber-800 hover:bg-amber-100"
                @click="userAdmin.updateUserStatus(user.id, 'DRAFT_PENDING')"
              >
                <AlertCircle :size="12" :stroke-width="1.75" aria-hidden="true" />
                {{ t('adminStudio.panels.users.returnPending') }}
              </Button>
            </div>
            <p class="mt-2 text-[11px] text-muted-foreground">
              {{ t('adminStudio.panels.users.created', { date: user.createdAt }) }}
              · {{ ADMIN_SEAT_COLUMN }} {{ t('adminStudio.panels.users.seatDerived') }}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
