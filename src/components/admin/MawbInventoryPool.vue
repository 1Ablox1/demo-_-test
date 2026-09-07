<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { fetchMawbAirlines, fetchMawbPools } from '@/api/client'
import type { MockAirline } from '@/mdm/numberingTypes'

type InventoryRow = {
  code: string
  airline: string
  available: number
  threshold: number
}

const emit = defineEmits<{ dirty: [] }>()

const { t } = useI18n()

const rows = ref<InventoryRow[]>([])
const loading = ref(true)

/** Design defaults when API has sparse pool data */
const DESIGN_DEFAULTS: Record<string, { available: number; threshold: number }> = {
  '081': { available: 42, threshold: 15 },
  '160': { available: 4, threshold: 10 },
  '180': { available: 18, threshold: 10 },
  '618': { available: 18, threshold: 10 },
  '016': { available: 24, threshold: 10 },
}

function mergeRows(airlines: MockAirline[], pools: Array<{ prefix: string; available: number }>) {
  const poolByPrefix = new Map(pools.map((p) => [p.prefix, p.available]))
  const merged: InventoryRow[] = airlines.map((a) => {
    const defaults = DESIGN_DEFAULTS[a.mawbPrefix] ?? { available: 12, threshold: 10 }
    const fromPool = poolByPrefix.get(a.mawbPrefix)
    return {
      code: a.mawbPrefix,
      airline: a.name,
      available: fromPool ?? defaults.available,
      threshold: defaults.threshold,
    }
  })

  // Ensure Cathay-style low-stock demo row exists
  if (!merged.some((r) => r.code === '160')) {
    merged.push({
      code: '160',
      airline: 'Cathay Pacific',
      available: 4,
      threshold: 10,
    })
  }
  if (!merged.some((r) => r.code === '081')) {
    merged.unshift({
      code: '081',
      airline: 'Qantas Freight',
      available: 42,
      threshold: 15,
    })
  }
  if (!merged.some((r) => r.code === '180')) {
    merged.push({
      code: '180',
      airline: 'Korean Air Cargo',
      available: 18,
      threshold: 10,
    })
  }

  return merged.sort((a, b) => a.code.localeCompare(b.code))
}

async function load() {
  loading.value = true
  try {
    const [al, pl] = await Promise.all([fetchMawbAirlines(), fetchMawbPools()])
    rows.value = mergeRows(al.items, pl.items)
  } finally {
    loading.value = false
  }
}

onMounted(() => void load())

function updateThreshold(idx: number, val: string) {
  const n = parseInt(val, 10)
  if (!Number.isNaN(n) && n >= 0) {
    rows.value = rows.value.map((r, i) => (i === idx ? { ...r, threshold: n } : r))
    emit('dirty')
  }
}

function isLow(row: InventoryRow) {
  return row.available <= row.threshold
}

defineExpose({ rows })
</script>

<template>
  <div class="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
    <div class="border-b border-[#E2E8F0] px-6 pb-3.5 pt-[18px]">
      <div class="text-sm font-semibold tracking-tight text-[#0F172A]">
        {{ t('adminStudio.inventory.title') }}
      </div>
      <div class="mt-0.5 text-xs text-[#64748B]">
        {{ t('adminStudio.inventory.subtitle') }}
      </div>
    </div>

    <div v-if="loading" class="px-6 py-8 text-sm text-[#64748B]">
      {{ t('numbering.loading') }}
    </div>

    <div v-else>
      <div
        class="grid grid-cols-[1fr_140px_160px_180px] border-b border-[#E2E8F0] bg-[#F8FAFC] px-6 py-2"
      >
        <span
          v-for="h in ['airline', 'stock', 'threshold', 'status']"
          :key="h"
          class="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]"
        >
          {{ t(`adminStudio.inventory.cols.${h}`) }}
        </span>
      </div>

      <div
        v-for="(row, i) in rows"
        :key="row.code"
        class="grid grid-cols-[1fr_140px_160px_180px] items-center px-6 py-3 transition-colors"
        :class="[
          i < rows.length - 1 ? 'border-b border-[#E2E8F0]' : '',
          isLow(row) ? 'bg-amber-500/[0.03]' : 'bg-white',
        ]"
      >
        <div class="flex items-center gap-2.5">
          <span
            class="inline-flex h-[22px] w-9 shrink-0 items-center justify-center rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] font-mono text-[11px] font-bold text-[#334155]"
          >
            {{ row.code }}
          </span>
          <span class="text-[13px] font-medium text-[#0F172A]">{{ row.airline }}</span>
        </div>

        <div class="flex items-center gap-1.5">
          <span
            class="font-mono text-sm font-bold"
            :class="isLow(row) ? 'text-amber-900' : 'text-[#0F172A]'"
          >
            {{ row.available }}
          </span>
          <span class="text-[11px] text-[#64748B]">{{ t('adminStudio.inventory.available') }}</span>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-[11px] text-[#64748B]">{{ t('adminStudio.inventory.alertAt') }}</span>
          <input
            type="number"
            min="0"
            :value="row.threshold"
            class="h-[30px] w-14 rounded-md border border-[#CBD5E1] bg-white text-center font-mono text-xs font-semibold text-[#0F172A] outline-none focus:border-[#0D9488] focus:shadow-[0_0_0_2px_#CCFBF1]"
            @input="updateThreshold(i, ($event.target as HTMLInputElement).value)"
          />
          <span class="text-[11px] text-[#64748B]">{{ t('adminStudio.inventory.units') }}</span>
        </div>

        <span
          class="inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
          :class="
            isLow(row)
              ? 'border-[#FDE68A] bg-[#FFFBEB] text-amber-900'
              : 'border-[#A7F3D0] bg-[#ECFDF5] text-emerald-800'
          "
        >
          <span
            class="h-1.5 w-1.5 shrink-0 rounded-full"
            :class="isLow(row) ? 'bg-amber-500' : 'bg-emerald-500'"
          />
          {{
            isLow(row)
              ? t('adminStudio.inventory.lowStock')
              : t('adminStudio.inventory.normal')
          }}
        </span>
      </div>
    </div>
  </div>
</template>
