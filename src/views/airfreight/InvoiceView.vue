<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { InvoicePaymentChip, InvoiceState } from '@/api/types'
import { useInvoiceStore } from '@/stores/invoice'

const route = useRoute()
const router = useRouter()
const store = useInvoiceStore()
const { t } = useI18n()

const shipmentId = computed(() => Number(route.params.shipmentId))

watch(
  shipmentId,
  (id) => {
    if (Number.isFinite(id)) void store.load(id)
  },
  { immediate: true },
)

onMounted(() => {
  if (Number.isFinite(shipmentId.value)) void store.load(shipmentId.value)
})

onUnmounted(() => store.clear())

function goCharges() {
  void router.push({
    name: 'job-charges',
    params: { shipmentId: String(shipmentId.value) },
  })
}

function money(n: number, currency = 'AUD') {
  return `${currency} ${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

function stateBadge(state: InvoiceState) {
  const map: Record<InvoiceState, string> = {
    draft: 'secondary',
    ready: 'pack',
    issued: 'normal',
    part_paid: 'medium',
    paid: 'normal',
  }
  return map[state]
}

function paymentBadge(chip: InvoicePaymentChip) {
  const map: Record<InvoicePaymentChip, string> = {
    unpaid: 'medium',
    part_paid: 'high',
    paid: 'normal',
    blocked: 'critical',
  }
  return map[chip]
}
</script>

<template>
  <div class="flex flex-col pb-6">
      <div v-if="store.loading" class="text-sm text-muted-foreground">
        {{ t('invoice.loading') }}
      </div>

      <div
        v-else-if="store.error"
        class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        {{ store.error }}
      </div>

      <template v-else-if="store.payload">
        <!-- Blocker banner -->
        <div
          v-if="store.blockersOpen.length"
          class="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5"
        >
          <div class="text-[13px] font-semibold text-amber-900">{{ t('invoice.blockedTitle') }}</div>
          <ul class="mt-1 list-inside list-disc text-xs text-amber-900">
            <li v-for="b in store.blockersOpen" :key="b.id">{{ b.label }}</li>
          </ul>
          <button type="button" class="mt-2 text-xs font-medium text-primary" @click="goCharges">
            {{ t('invoice.fixCharges') }} →
          </button>
        </div>

        <!-- Header strip -->
        <div class="mb-3 overflow-hidden rounded-[10px] border border-border bg-white">
          <div class="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
            <Badge :variant="stateBadge(store.payload.state) as any">
              {{ t(`invoice.state.${store.payload.state}`) }}
            </Badge>
            <Badge :variant="paymentBadge(store.payload.paymentChip) as any">
              {{ t(`invoice.payment.${store.payload.paymentChip}`) }}
            </Badge>
            <span class="text-[11px] text-muted-foreground">
              {{ t('invoice.roleHint', { role: t(`myTasks.roles.${store.role}`) }) }}
            </span>
            <Badge variant="outline">
              {{
                store.role === 'finance' || store.role === 'admin'
                  ? t('invoice.sod.finance')
                  : t('invoice.sod.view')
              }}
            </Badge>
            <div class="ml-auto flex flex-wrap gap-2">
              <Button
                size="sm"
                :disabled="!store.canIssue || store.acting"
                :title="
                  store.blockersOpen.length ? t('invoice.issueBlocked') : undefined
                "
                @click="store.issue()"
              >
                {{ t('invoice.actions.issue') }}
              </Button>
              <Button
                size="sm"
                variant="outline"
                :disabled="!store.canMarkPaid || store.acting"
                @click="store.markPaid()"
              >
                {{ t('invoice.actions.markPaid') }}
              </Button>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-0 sm:grid-cols-4">
            <div class="border-b border-border p-3 sm:border-r sm:border-b-0">
              <div class="mb-1 text-[10px] font-medium tracking-wide text-muted-foreground">
                {{ t('invoice.fields.customer').toUpperCase() }}
              </div>
              <div class="truncate text-[13px] font-semibold" :title="store.payload.customer">
                {{ store.payload.customer }}
              </div>
            </div>
            <div class="border-b border-border p-3 sm:border-r sm:border-b-0">
              <div class="mb-1 text-[10px] font-medium tracking-wide text-muted-foreground">
                {{ t('invoice.fields.lane').toUpperCase() }}
              </div>
              <div class="text-[13px] font-semibold">{{ store.payload.lane }}</div>
            </div>
            <div class="border-b border-border p-3 sm:border-r sm:border-b-0">
              <div class="mb-1 text-[10px] font-medium tracking-wide text-muted-foreground">
                {{ t('invoice.fields.invoiceNo').toUpperCase() }}
              </div>
              <div class="font-mono text-[13px] font-semibold">
                {{ store.payload.invoiceNo ?? '—' }}
              </div>
            </div>
            <div class="p-3">
              <div class="mb-1 text-[10px] font-medium tracking-wide text-muted-foreground">
                {{ t('invoice.fields.issuedAt').toUpperCase() }}
              </div>
              <div class="text-[13px] font-semibold">
                {{ store.payload.issuedAt ?? '—' }}
              </div>
            </div>
          </div>
        </div>

        <p class="mb-3 text-[11px] text-muted-foreground">{{ store.payload.settlementHint }}</p>

        <!-- Blockers checklist -->
        <div class="mb-3 overflow-hidden rounded-[10px] border border-border bg-white">
          <div
            class="border-b border-border px-4 py-2 text-[10px] font-semibold tracking-wide text-muted-foreground"
          >
            {{ t('invoice.blockersTitle') }}
          </div>
          <div
            v-for="b in store.payload.blockers"
            :key="b.id"
            class="flex items-center gap-2 border-b border-zinc-50 px-4 py-2.5 text-[13px] last:border-b-0"
          >
            <span :class="b.cleared ? 'text-emerald-600' : 'text-amber-600'">
              {{ b.cleared ? '✓' : '○' }}
            </span>
            <span :class="b.cleared ? 'text-zinc-600' : 'font-medium text-amber-900'">
              {{ b.label }}
            </span>
            <Badge
              class="ml-auto"
              :variant="(b.cleared ? 'normal' : 'critical') as any"
            >
              {{ b.cleared ? t('invoice.blocker.cleared') : t('invoice.blocker.open') }}
            </Badge>
          </div>
        </div>

        <!-- AR lines preview -->
        <div class="mb-3 overflow-hidden rounded-[10px] border border-border bg-white">
          <div
            class="flex items-center justify-between border-b border-border px-4 py-2"
          >
            <div class="text-[13px] font-semibold">{{ t('invoice.linesTitle') }}</div>
            <div class="text-[10px] text-muted-foreground">{{ t('invoice.linesSub') }}</div>
          </div>
          <table class="w-full text-left text-[12px]">
            <thead class="bg-zinc-50 text-[10px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th class="px-3 py-2">{{ t('invoice.cols.code') }}</th>
                <th class="px-3 py-2">{{ t('invoice.cols.description') }}</th>
                <th class="px-3 py-2 text-right">{{ t('invoice.cols.amount') }}</th>
                <th class="px-3 py-2 text-right">{{ t('invoice.cols.aud') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="line in store.payload.lines"
                :key="line.id"
                class="border-t border-zinc-100"
              >
                <td class="px-3 py-2.5 font-mono font-medium">{{ line.code }}</td>
                <td class="px-3 py-2.5">{{ line.description }}</td>
                <td class="px-3 py-2.5 text-right tabular-nums">
                  {{ money(line.amount, line.currency) }}
                </td>
                <td class="px-3 py-2.5 text-right tabular-nums">
                  {{ money(line.amountAud) }}
                </td>
              </tr>
            </tbody>
          </table>
          <div class="border-t border-border bg-zinc-50 px-4 py-3 text-[12px]">
            <div class="flex justify-between">
              <span class="text-muted-foreground">{{ t('invoice.totals.subtotal') }}</span>
              <span class="tabular-nums font-medium">{{ money(store.payload.subtotalAud) }}</span>
            </div>
            <div class="mt-1 flex justify-between">
              <span class="text-muted-foreground">{{ t('invoice.totals.tax') }}</span>
              <span class="tabular-nums">{{ money(store.payload.taxAud) }}</span>
            </div>
            <div class="mt-2 flex justify-between border-t border-border pt-2 text-[13px] font-semibold">
              <span>{{ t('invoice.totals.total') }}</span>
              <span class="tabular-nums">{{ money(store.payload.totalAud) }}</span>
            </div>
          </div>
        </div>

        <p class="text-[11px] text-muted-foreground">{{ t('invoice.hint') }}</p>
      </template>
  </div>
</template>
