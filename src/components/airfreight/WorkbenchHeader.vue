<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ActingRole, MarketPack, MyTasksSummary } from '@/api/types'
import { Badge } from '@/components/ui/badge'

const props = defineProps<{
  role: ActingRole
  activePack: MarketPack
  summary: MyTasksSummary
}>()

const emit = defineEmits<{
  'update:role': [role: ActingRole]
  'update:activePack': [pack: MarketPack]
}>()

const { t } = useI18n()

const packs: MarketPack[] = ['GLOBAL', 'US', 'AU']
const roles: ActingRole[] = ['operations', 'sales', 'finance', 'admin']

const todaySummary = computed(() =>
  t('myTasks.todaySummary', {
    exceptions: props.summary.exceptions,
    jobs: props.summary.activeJobs,
  }),
)

function roleLabel(role: ActingRole) {
  return t(`myTasks.roles.${role}`)
}
</script>

<template>
  <header class="space-y-4 border-b border-zinc-200 pb-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {{ t('myTasks.productName') }}
        </p>
        <h1 class="text-2xl font-semibold">{{ t('myTasks.title') }}</h1>
      </div>

      <label class="flex items-center gap-2 text-sm">
        <span class="text-zinc-600">{{ t('myTasks.actingAs') }}:</span>
        <select
          class="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm"
          :value="role"
          @change="emit('update:role', ($event.target as HTMLSelectElement).value as ActingRole)"
        >
          <option v-for="item in roles" :key="item" :value="item">
            {{ roleLabel(item) }}
          </option>
        </select>
      </label>
    </div>

    <div class="flex flex-wrap items-center gap-4 text-sm text-zinc-700">
      <p>{{ todaySummary }}</p>
      <div class="flex items-center gap-2">
        <span class="font-medium">{{ t('myTasks.packLabel') }}:</span>
        <div class="flex gap-2">
          <button
            v-for="pack in packs"
            :key="pack"
            type="button"
            class="rounded-full border px-3 py-1 text-xs font-medium transition"
            :class="
              activePack === pack
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
            "
            @click="emit('update:activePack', pack)"
          >
            {{ t(`myTasks.pack.${pack}`) }}
          </button>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="font-medium">{{ t('myTasks.priorityLabel') }}:</span>
        <Badge variant="critical">🔴 {{ summary.priorityCounts.critical }} {{ t('myTasks.priority.critical') }}</Badge>
        <Badge variant="high">🟡 {{ summary.priorityCounts.high }} {{ t('myTasks.priority.high') }}</Badge>
        <Badge variant="medium">🟠 {{ summary.priorityCounts.medium }} {{ t('myTasks.priority.medium') }}</Badge>
      </div>
    </div>
  </header>
</template>
