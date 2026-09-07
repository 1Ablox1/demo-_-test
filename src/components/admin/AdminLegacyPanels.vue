<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAdminConfigStore, type AdminToggleKey } from '@/stores/adminConfig'

defineProps<{
  section: 'rulebook' | 'digital'
}>()

const { t } = useI18n()
const admin = useAdminConfigStore()

const sopToggles: { key: AdminToggleKey; label: string; desc: string }[] = [
  { key: 'autoGates', label: 'admin.autoGates', desc: 'admin.autoGatesDesc' },
  { key: 'raciEnforce', label: 'admin.raciEnforce', desc: 'admin.raciEnforceDesc' },
  { key: 'marginAlerts', label: 'admin.marginAlerts', desc: 'admin.marginAlertsDesc' },
]

const workerToggles: { key: AdminToggleKey; label: string; desc: string }[] = [
  { key: 'agentQuote', label: 'admin.suggestRates', desc: 'admin.suggestRatesDesc' },
  { key: 'agentDocs', label: 'admin.autoDocs', desc: 'admin.autoDocsDesc' },
  { key: 'agentMarginGuard', label: 'admin.marginGuard', desc: 'admin.marginGuardDesc' },
  { key: 'agentChargeDraft', label: 'admin.chargeDraft', desc: 'admin.chargeDraftDesc' },
  { key: 'agentGateWatch', label: 'admin.gateWatch', desc: 'admin.gateWatchDesc' },
]

const triggers = [
  { id: 'trg-quote-incomplete', worker: 'dw-quote-assist' },
  { id: 'trg-docs-hold', worker: 'dw-gate-watch' },
  { id: 'trg-margin-below', worker: 'dw-margin-guard' },
  { id: 'trg-charges-ready', worker: 'dw-charge-draft' },
  { id: 'trg-variance-open', worker: 'dw-margin-guard' },
]
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 class="text-[17px] font-bold tracking-tight text-foreground">
        {{ t(`adminStudio.legacy.${section}.title`) }}
      </h2>
      <p class="mt-1 text-xs text-muted-foreground">
        {{ t(`adminStudio.legacy.${section}.subtitle`) }}
      </p>
    </div>

    <template v-if="section === 'rulebook'">
      <div class="grid gap-4 lg:grid-cols-2">
        <Card class="rounded-[10px] border-border ring-border">
          <CardHeader class="border-b border-border px-4 py-3">
            <CardTitle class="text-[13px]">{{ t('admin.workflow') }}</CardTitle>
            <CardDescription class="text-[11px]">{{ t('admin.workflowSub') }}</CardDescription>
          </CardHeader>
          <CardContent class="space-y-3.5 px-4 py-4">
            <div v-for="item in sopToggles" :key="item.key" class="flex items-start gap-3">
              <div class="min-w-0 flex-1">
                <div class="text-[13px] font-medium">{{ t(item.label) }}</div>
                <div class="mt-0.5 text-[11px] text-muted-foreground">{{ t(item.desc) }}</div>
              </div>
              <button
                type="button"
                class="relative h-5 w-9 shrink-0 rounded-[10px] border-0 transition"
                :class="admin[item.key] ? 'bg-primary' : 'bg-border'"
                :aria-pressed="admin[item.key]"
                @click="admin.flip(item.key)"
              >
                <span
                  class="absolute top-[3px] block h-3.5 w-3.5 rounded-full bg-card shadow transition"
                  :class="admin[item.key] ? 'left-[18px]' : 'left-[3px]'"
                />
              </button>
            </div>
          </CardContent>
        </Card>

        <Card class="rounded-[10px] border-border ring-border lg:col-span-2">
          <CardHeader class="border-b border-border px-4 py-3">
            <CardTitle class="text-[13px]">{{ t('admin.triggers') }}</CardTitle>
            <CardDescription class="text-[11px]">{{ t('admin.triggersSub') }}</CardDescription>
          </CardHeader>
          <CardContent class="overflow-x-auto px-4 py-3">
            <table class="w-full min-w-[640px] text-left text-xs">
              <thead class="text-[10px] font-semibold tracking-wide text-muted-foreground">
                <tr>
                  <th class="py-2 pr-3">{{ t('admin.triggerCols.id') }}</th>
                  <th class="py-2 pr-3">{{ t('admin.triggerCols.when') }}</th>
                  <th class="py-2 pr-3">{{ t('admin.triggerCols.worker') }}</th>
                  <th class="py-2">{{ t('admin.triggerCols.human') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="trg in triggers" :key="trg.id" class="border-t border-border">
                  <td class="py-2.5 pr-3 font-mono text-[11px]">{{ trg.id }}</td>
                  <td class="py-2.5 pr-3">{{ t(`admin.triggerWhen.${trg.id}`) }}</td>
                  <td class="py-2.5 pr-3">
                    <Badge variant="pack">{{ trg.worker }}</Badge>
                  </td>
                  <td class="py-2.5 text-muted-foreground">
                    {{ t(`admin.triggerHuman.${trg.id}`) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </template>

    <template v-else-if="section === 'digital'">
      <Card class="rounded-[10px] border-border ring-border">
        <CardHeader class="border-b border-border px-4 py-3">
          <CardTitle class="text-[13px]">{{ t('admin.agents') }}</CardTitle>
          <CardDescription class="text-[11px]">{{ t('admin.agentsSub') }}</CardDescription>
        </CardHeader>
        <CardContent class="space-y-3 px-4 py-4">
          <p class="text-[10px] font-semibold tracking-wide text-muted-foreground">
            {{ t('admin.agentsCan') }}
          </p>
          <div v-for="item in workerToggles" :key="item.key" class="flex items-start gap-3">
            <div class="min-w-0 flex-1">
              <div class="text-[13px] font-medium">{{ t(item.label) }}</div>
              <div class="mt-0.5 text-[11px] text-muted-foreground">{{ t(item.desc) }}</div>
            </div>
            <button
              type="button"
              class="relative h-5 w-9 shrink-0 rounded-[10px] border-0 transition"
              :class="admin[item.key] ? 'bg-primary' : 'bg-border'"
              :aria-pressed="admin[item.key]"
              @click="admin.flip(item.key)"
            >
              <span
                class="absolute top-[3px] block h-3.5 w-3.5 rounded-full bg-card shadow transition"
                :class="admin[item.key] ? 'left-[18px]' : 'left-[3px]'"
              />
            </button>
          </div>
          <p class="mt-2 text-[10px] font-semibold tracking-wide text-muted-foreground">
            {{ t('admin.agentsCannot') }}
          </p>
          <div
            v-for="c in [
              t('admin.cannotApprove'),
              t('admin.cannotBooking'),
              t('admin.cannotRaci'),
              t('admin.cannotSop'),
            ]"
            :key="c"
            class="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <span class="text-muted-foreground/50">×</span>{{ c }}
          </div>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
