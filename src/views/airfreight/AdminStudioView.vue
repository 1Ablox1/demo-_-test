<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppShell from '@/components/airfreight/AppShell.vue'
import Badge from '@/components/ui/Badge.vue'
import { useAdminConfigStore, type AdminToggleKey } from '@/stores/adminConfig'

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
  <AppShell>
    <div class="mx-auto max-w-[960px] px-6 py-8">
      <div class="mb-7">
        <div class="mb-1.5 flex flex-wrap items-center gap-2.5">
          <h1 class="text-xl font-semibold tracking-tight">{{ t('admin.title') }}</h1>
          <span
            class="rounded border border-border bg-muted px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground"
          >
            {{ t('admin.configOnly') }}
          </span>
        </div>
        <p class="text-[13px] leading-relaxed text-muted-foreground">
          {{ t('admin.subtitle') }}
        </p>
      </div>

      <div class="mb-4 flex flex-wrap gap-2 text-[11px]">
        <span class="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800">
          {{ t('admin.tunable') }}
        </span>
        <span class="rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-medium text-zinc-600">
          {{ t('admin.locked') }}
        </span>
        <span class="text-muted-foreground">{{ t('admin.envelopeHint') }}</span>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <!-- SOP / trigger knobs -->
        <div class="overflow-hidden rounded-xl border border-border bg-white">
          <div class="border-b border-border px-4 py-3.5">
            <div class="flex items-center gap-2">
              <div class="text-sm font-semibold">{{ t('admin.workflow') }}</div>
              <span class="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                {{ t('admin.tunable') }}
              </span>
            </div>
            <div class="mt-0.5 text-[11px] text-muted-foreground">{{ t('admin.workflowSub') }}</div>
          </div>
          <div class="flex flex-col gap-3.5 px-4 py-4">
            <div v-for="item in sopToggles" :key="item.key" class="flex items-start gap-3">
              <div class="flex-1">
                <div class="text-[13px] font-medium">{{ t(item.label) }}</div>
                <div class="mt-0.5 text-[11px] text-muted-foreground">{{ t(item.desc) }}</div>
              </div>
              <button
                type="button"
                class="relative h-5 w-9 shrink-0 rounded-[10px] border-0 transition"
                :class="admin[item.key] ? 'bg-primary' : 'bg-border'"
                @click="admin.flip(item.key)"
              >
                <span
                  class="absolute top-[3px] block h-3.5 w-3.5 rounded-full bg-white shadow transition"
                  :class="admin[item.key] ? 'left-[18px]' : 'left-[3px]'"
                />
              </button>
            </div>
          </div>
        </div>

        <!-- Digital workers (suggest-only) -->
        <div class="overflow-hidden rounded-xl border border-border bg-white">
          <div class="border-b border-border px-4 py-3.5">
            <div class="flex items-center gap-2">
              <div class="text-sm font-semibold">{{ t('admin.agents') }}</div>
              <span class="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                {{ t('admin.tunable') }}
              </span>
            </div>
            <div class="mt-0.5 text-[11px] text-muted-foreground">{{ t('admin.agentsSub') }}</div>
          </div>
          <div class="flex flex-col gap-3 px-4 py-4">
            <div class="text-[10px] font-semibold tracking-wide text-muted-foreground">
              {{ t('admin.agentsCan') }}
            </div>
            <div v-for="item in workerToggles" :key="item.key" class="flex items-start gap-3">
              <div class="flex-1">
                <div class="text-[13px] font-medium">{{ t(item.label) }}</div>
                <div class="mt-0.5 text-[11px] text-muted-foreground">{{ t(item.desc) }}</div>
              </div>
              <button
                type="button"
                class="relative h-5 w-9 shrink-0 rounded-[10px] border-0 transition"
                :class="admin[item.key] ? 'bg-primary' : 'bg-border'"
                @click="admin.flip(item.key)"
              >
                <span
                  class="absolute top-[3px] block h-3.5 w-3.5 rounded-full bg-white shadow transition"
                  :class="admin[item.key] ? 'left-[18px]' : 'left-[3px]'"
                />
              </button>
            </div>
            <div class="mt-1.5 text-[10px] font-semibold tracking-wide text-muted-foreground">
              {{ t('admin.agentsCannot') }}
              <span class="ml-1 rounded bg-zinc-100 px-1 py-0.5 font-medium text-zinc-600">{{
                t('admin.locked')
              }}</span>
            </div>
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
              <span class="text-zinc-300">×</span>{{ c }}
            </div>
          </div>
        </div>

        <!-- Trigger process map -->
        <div class="overflow-hidden rounded-xl border border-border bg-white md:col-span-2">
          <div class="border-b border-border px-4 py-3.5">
            <div class="flex items-center gap-2">
              <div class="text-sm font-semibold">{{ t('admin.triggers') }}</div>
              <span class="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">
                {{ t('admin.locked') }}
              </span>
            </div>
            <div class="mt-0.5 text-[11px] text-muted-foreground">{{ t('admin.triggersSub') }}</div>
          </div>
          <div class="overflow-x-auto px-4 py-3">
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
                <tr
                  v-for="trg in triggers"
                  :key="trg.id"
                  class="border-t border-zinc-100"
                >
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
          </div>
          <div class="border-t border-border bg-zinc-50 px-4 py-2 text-[11px] text-muted-foreground">
            {{ t('admin.triggerHint') }}
          </div>
        </div>

        <!-- Operational MDM — policy only, not catalog CRUD -->
        <div class="overflow-hidden rounded-xl border border-border bg-white md:col-span-2">
          <div class="border-b border-border px-4 py-3.5">
            <div class="flex flex-wrap items-center gap-2">
              <div class="text-sm font-semibold">{{ t('admin.mdmPolicy') }}</div>
              <span class="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                {{ t('admin.tunable') }}
              </span>
              <button
                type="button"
                class="ml-auto text-[12px] font-medium text-primary hover:underline"
                @click="$router.push({ name: 'admin-numbering' })"
              >
                {{ t('admin.openNumbering') }} →
              </button>
            </div>
            <div class="mt-0.5 text-[11px] text-muted-foreground">{{ t('admin.mdmPolicySub') }}</div>
          </div>
          <div class="grid gap-3 px-4 py-4 sm:grid-cols-3">
            <div class="rounded-lg border border-border bg-zinc-50/80 p-3">
              <div class="text-[10px] font-semibold tracking-wide text-muted-foreground">
                {{ t('admin.mdmApprovalRules') }}
              </div>
              <div class="mt-1.5 text-[13px] font-medium">{{ t('admin.mdmNewCustomerA') }}</div>
              <div class="mt-1 text-[11px] text-muted-foreground">{{ t('admin.mdmNewCustomerADesc') }}</div>
            </div>
            <div class="rounded-lg border border-border bg-zinc-50/80 p-3">
              <div class="text-[10px] font-semibold tracking-wide text-muted-foreground">
                {{ t('admin.mdmRequiredFields') }}
              </div>
              <div class="mt-1.5 text-[13px] font-medium">{{ t('admin.mdmQuickCreateFields') }}</div>
              <div class="mt-1 text-[11px] text-muted-foreground">{{ t('admin.mdmQuickCreateFieldsDesc') }}</div>
            </div>
            <div class="rounded-lg border border-border bg-zinc-50/80 p-3">
              <div class="text-[10px] font-semibold tracking-wide text-muted-foreground">
                {{ t('admin.mdmDataPolicy') }}
              </div>
              <div class="mt-1.5 text-[13px] font-medium">{{ t('admin.mdmNoCatalog') }}</div>
              <div class="mt-1 text-[11px] text-muted-foreground">{{ t('admin.mdmNoCatalogDesc') }}</div>
            </div>
          </div>
          <div class="border-t border-border bg-zinc-50 px-4 py-2 text-[11px] text-muted-foreground">
            {{ t('admin.mdmPackNote') }}
          </div>
        </div>

        <!-- Role rules -->
        <div class="overflow-hidden rounded-xl border border-border bg-white">
          <div class="border-b border-border px-4 py-3.5">
            <div class="flex items-center gap-2">
              <div class="text-sm font-semibold">{{ t('admin.roles') }}</div>
              <span class="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">
                {{ t('admin.locked') }}
              </span>
            </div>
            <div class="mt-0.5 text-[11px] text-muted-foreground">{{ t('admin.rolesSub') }}</div>
          </div>
          <div class="flex flex-col gap-2.5 px-4 py-4">
            <div
              v-for="row in [
                { role: t('myTasks.roles.sales'), r: 'Quote · Margin', a: '—', c: 'Booking', i: 'Documents' },
                { role: t('myTasks.roles.operations'), r: 'Booking · AWB', a: 'Customs', c: 'Charges', i: 'Invoice' },
                { role: t('myTasks.roles.finance'), r: 'Invoice', a: 'Charges · Approve', c: 'Quote', i: 'Booking' },
              ]"
              :key="row.role"
              class="border-b border-zinc-50 py-2"
            >
              <div class="mb-1.5 text-xs font-semibold text-zinc-700">{{ row.role }}</div>
              <div class="flex flex-wrap gap-2.5">
                <div class="flex items-center gap-1">
                  <Badge variant="raciR" class="h-5 w-5 justify-center px-0 text-[10px]">R</Badge>
                  <span class="text-[11px] text-muted-foreground">{{ row.r }}</span>
                </div>
                <div class="flex items-center gap-1">
                  <Badge variant="raciA" class="h-5 w-5 justify-center px-0 text-[10px]">A</Badge>
                  <span class="text-[11px] text-muted-foreground">{{ row.a }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Market packs -->
        <div class="overflow-hidden rounded-xl border border-border bg-white">
          <div class="border-b border-border px-4 py-3.5">
            <div class="flex items-center gap-2">
              <div class="text-sm font-semibold">{{ t('admin.governance') }}</div>
              <span class="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                {{ t('admin.tunable') }}
              </span>
            </div>
            <div class="mt-0.5 text-[11px] text-muted-foreground">{{ t('admin.governanceSub') }}</div>
          </div>
          <div class="flex flex-col gap-3 px-4 py-4">
            <div
              v-for="p in [
                { pack: 'GLOBAL', sop: 'v2.4.1', desc: 'IATA · CASS · MAWB/HAWB' },
                { pack: 'US', sop: 'v1.8.0', desc: 'CBP · ACE · AES/EEI' },
                { pack: 'AU', sop: 'v1.3.2', desc: 'GST · export declaration handoff' },
              ]"
              :key="p.pack"
              class="flex items-center gap-2.5 border-b border-zinc-50 py-2"
            >
              <Badge variant="pack">{{ p.pack }}</Badge>
              <div class="flex-1">
                <div class="text-xs font-medium text-zinc-700">{{ p.desc }}</div>
                <div class="mt-0.5 text-[11px] text-muted-foreground">SOP {{ p.sop }}</div>
              </div>
              <span class="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                {{ t('admin.active') }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppShell>
</template>
