<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import AppShell from '@/components/airfreight/AppShell.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  allocateMawb,
  fetchMawbAirlines,
  fetchMawbPools,
  fetchNumberingAudits,
  fetchNumberingPolicies,
  generateNumbering,
  previewNumbering,
  resetNumberingMock,
  updateNumberingPolicy,
  validateMawb,
} from '@/api/client'
import type {
  GeneratedNumberAudit,
  MawbPool,
  MockAirline,
  NumberingPolicy,
} from '@/mdm/numberingTypes'

const { t } = useI18n()
const router = useRouter()

type Tab = 'shipment' | 'hawb' | 'mawb' | 'audit'
const tab = ref<Tab>('hawb')

const policies = ref<NumberingPolicy[]>([])
const audits = ref<GeneratedNumberAudit[]>([])
const airlines = ref<MockAirline[]>([])
const pools = ref<Array<MawbPool & { available: number; allocated: number }>>([])

const preview = ref('')
const previewNote = ref('')
const genResult = ref('')
const mawbInput = ref('160-10000113')
const mawbMsg = ref('')
const toast = ref<string | null>(null)
const loading = ref(false)

const hawbPolicy = computed(() => policies.value.find((p) => p.id === 'pol-hawb-sto'))
const shipPolicy = computed(() => policies.value.find((p) => p.id === 'pol-ship-sto'))

const hawbTemplate = ref('')
const hawbMode = ref('TEMPLATE')

async function reload() {
  loading.value = true
  try {
    const [p, a, al, pl] = await Promise.all([
      fetchNumberingPolicies(),
      fetchNumberingAudits(),
      fetchMawbAirlines(),
      fetchMawbPools(),
    ])
    policies.value = p.items
    audits.value = a.items
    airlines.value = al.items
    pools.value = pl.items
    if (hawbPolicy.value) {
      hawbTemplate.value = hawbPolicy.value.template
      hawbMode.value = hawbPolicy.value.mode
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void reload()
})

async function runPreview() {
  const res = await previewNumbering({
    type: tab.value === 'shipment' ? 'SHIPMENT' : 'HAWB',
    officeId: 'off-sto',
    template: tab.value === 'hawb' ? hawbTemplate.value : shipPolicy.value?.template,
    mode: tab.value === 'hawb' ? hawbMode.value : shipPolicy.value?.mode,
  })
  preview.value = res.number
  previewNote.value = res.note ?? ''
}

async function runGenerate() {
  const type = tab.value === 'shipment' ? 'SHIPMENT' : 'HAWB'
  const res = await generateNumbering({
    type,
    officeId: 'off-sto',
    entityType: 'JOB',
    entityId: '8801',
  })
  genResult.value = res.number
  toast.value = t('numbering.generated', { n: res.number, v: res.policyVersion })
  await reload()
}

async function saveHawb() {
  if (!hawbPolicy.value) return
  await updateNumberingPolicy(hawbPolicy.value.id, {
    mode: hawbMode.value as NumberingPolicy['mode'],
    template: hawbTemplate.value,
  })
  toast.value = t('numbering.policySaved')
  await reload()
  await runPreview()
}

async function runValidate() {
  try {
    const res = await validateMawb({ mawb: mawbInput.value })
    mawbMsg.value = res.valid
      ? t('numbering.mawbValid', { n: res.normalized })
      : (res.message ?? t('numbering.mawbInvalid'))
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    mawbMsg.value = err.data?.message ?? t('numbering.mawbInvalid')
  }
}

async function runAllocate() {
  const res = await allocateMawb({ jobId: '8801', jobNo: 'AF-8801' })
  toast.value = t('numbering.mawbAllocated', { n: res.mawb })
  await reload()
}

async function resetMock() {
  await resetNumberingMock()
  toast.value = t('numbering.resetDone')
  await reload()
}

function goAdmin() {
  void router.push({ name: 'admin' })
}
</script>

<template>
  <AppShell>
    <div class="mx-auto max-w-[960px] px-6 py-8">
      <div class="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <button type="button" class="mb-1 text-xs text-primary" @click="goAdmin">
            ← {{ t('numbering.backAdmin') }}
          </button>
          <h1 class="text-xl font-semibold tracking-tight">{{ t('numbering.title') }}</h1>
          <p class="mt-1 max-w-xl text-[13px] text-muted-foreground">{{ t('numbering.subtitle') }}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <Badge variant="pack">{{ t('numbering.mockBadge') }}</Badge>
          <Button size="sm" variant="outline" @click="resetMock">{{ t('numbering.reset') }}</Button>
        </div>
      </div>

      <div
        v-if="toast"
        class="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800"
      >
        {{ toast }}
      </div>

      <div class="mb-4 flex flex-wrap gap-1 border-b border-border">
        <button
          v-for="item in [
            { id: 'shipment' as const, label: t('numbering.tabs.shipment') },
            { id: 'hawb' as const, label: t('numbering.tabs.hawb') },
            { id: 'mawb' as const, label: t('numbering.tabs.mawb') },
            { id: 'audit' as const, label: t('numbering.tabs.audit') },
          ]"
          :key="item.id"
          type="button"
          class="-mb-px border-b-2 px-3 py-2 text-[13px] font-medium"
          :class="
            tab === item.id
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          "
          @click="tab = item.id"
        >
          {{ item.label }}
        </button>
      </div>

      <div v-if="loading" class="text-sm text-muted-foreground">{{ t('numbering.loading') }}</div>

      <!-- Shipment -->
      <section
        v-else-if="tab === 'shipment' && shipPolicy"
        class="overflow-hidden rounded-xl border border-border bg-white"
      >
        <div class="border-b border-border px-4 py-3">
          <div class="text-sm font-semibold">{{ t('numbering.shipmentTitle') }}</div>
          <p class="text-[11px] text-muted-foreground">
            {{ t('numbering.legacyBind') }}: {{ shipPolicy.legacyBinding }}
          </p>
        </div>
        <div class="space-y-3 p-4">
          <div class="text-[12px]">
            <span class="text-muted-foreground">{{ t('numbering.template') }}</span>
            <div class="mt-1 font-mono text-sm">{{ shipPolicy.template }}</div>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" @click="runPreview">{{ t('numbering.preview') }}</Button>
            <Button size="sm" @click="runGenerate">{{ t('numbering.generate') }}</Button>
          </div>
          <div v-if="preview" class="rounded-lg bg-zinc-50 px-3 py-2 font-mono text-sm">
            {{ preview }}
            <div class="text-[11px] text-muted-foreground">{{ previewNote }}</div>
          </div>
          <div v-if="genResult" class="text-[12px] text-emerald-700">
            {{ t('numbering.lastGen') }}: {{ genResult }}
          </div>
        </div>
      </section>

      <!-- HAWB -->
      <section
        v-else-if="tab === 'hawb' && hawbPolicy"
        class="overflow-hidden rounded-xl border border-border bg-white"
      >
        <div class="border-b border-border px-4 py-3">
          <div class="text-sm font-semibold">{{ t('numbering.hawbTitle') }}</div>
          <p class="text-[11px] text-muted-foreground">{{ t('numbering.hawbSub') }}</p>
        </div>
        <div class="space-y-3 p-4">
          <div class="text-[12px] font-medium">{{ t('numbering.mode') }}</div>
          <div class="space-y-1.5">
            <label
              v-for="m in [
                { id: 'MANUAL', label: t('numbering.modes.MANUAL') },
                { id: 'EQUAL_TO_SOURCE', label: t('numbering.modes.EQUAL_TO_SOURCE') },
                { id: 'TEMPLATE', label: t('numbering.modes.TEMPLATE') },
                { id: 'DISABLED', label: t('numbering.modes.DISABLED') },
              ]"
              :key="m.id"
              class="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-[13px]"
              :class="hawbMode === m.id ? 'border-primary bg-primary/5' : ''"
            >
              <input v-model="hawbMode" type="radio" :value="m.id" />
              {{ m.label }}
            </label>
          </div>
          <label class="block text-[12px]">
            <span class="text-muted-foreground">{{ t('numbering.template') }}</span>
            <input
              v-model="hawbTemplate"
              class="mt-1 h-9 w-full rounded-md border border-border px-2 font-mono text-sm"
              :disabled="hawbMode !== 'TEMPLATE'"
            />
          </label>
          <p class="text-[11px] text-muted-foreground">{{ t('numbering.tokens') }}</p>
          <div class="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" @click="runPreview">{{ t('numbering.preview') }}</Button>
            <Button size="sm" variant="outline" @click="saveHawb">{{ t('numbering.savePolicy') }}</Button>
            <Button size="sm" @click="runGenerate">{{ t('numbering.generate') }}</Button>
          </div>
          <div v-if="preview" class="rounded-lg bg-zinc-50 px-3 py-2 font-mono text-sm">
            {{ preview }}
            <div class="text-[11px] text-muted-foreground">{{ previewNote }}</div>
          </div>
        </div>
      </section>

      <!-- MAWB -->
      <section v-else-if="tab === 'mawb'" class="space-y-3">
        <div class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-950">
          {{ t('numbering.mawbNotTemplate') }}
        </div>
        <div class="overflow-hidden rounded-xl border border-border bg-white">
          <div class="border-b border-border px-4 py-3 text-sm font-semibold">
            {{ t('numbering.airlines') }}
          </div>
          <div class="divide-y divide-zinc-100">
            <div
              v-for="a in airlines"
              :key="a.id"
              class="flex items-center gap-3 px-4 py-2.5 text-[13px]"
            >
              <span class="font-semibold">{{ a.airlineCode }}</span>
              <span class="text-muted-foreground">{{ a.name }}</span>
              <Badge variant="pack" class="ml-auto">prefix {{ a.mawbPrefix }}</Badge>
            </div>
          </div>
        </div>
        <div class="overflow-hidden rounded-xl border border-border bg-white">
          <div class="border-b border-border px-4 py-3 text-sm font-semibold">
            {{ t('numbering.pools') }}
          </div>
          <div v-for="p in pools" :key="p.id" class="border-b border-zinc-50 px-4 py-3 text-[13px]">
            <div class="font-medium">{{ p.prefix }} · {{ p.startNo }}</div>
            <div class="mt-1 text-[11px] text-muted-foreground">
              {{ t('numbering.poolStats', { a: p.available, x: p.allocated }) }}
            </div>
            <div class="mt-2 flex flex-wrap gap-1">
              <span
                v-for="d in p.details"
                :key="d.mawbNo"
                class="rounded border px-1.5 py-0.5 font-mono text-[10px]"
                :class="
                  d.state === 'available'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-500'
                "
              >
                {{ d.mawbNo }}
              </span>
            </div>
          </div>
        </div>
        <div class="overflow-hidden rounded-xl border border-border bg-white p-4">
          <div class="mb-2 text-sm font-semibold">{{ t('numbering.validateAllocate') }}</div>
          <div class="flex flex-wrap gap-2">
            <input
              v-model="mawbInput"
              class="h-9 min-w-[160px] flex-1 rounded-md border border-border px-2 font-mono text-sm"
            />
            <Button size="sm" variant="outline" @click="runValidate">{{ t('numbering.validate') }}</Button>
            <Button size="sm" @click="runAllocate">{{ t('numbering.allocate') }}</Button>
          </div>
          <p v-if="mawbMsg" class="mt-2 text-[12px] text-zinc-700">{{ mawbMsg }}</p>
        </div>
      </section>

      <!-- Audit -->
      <section
        v-else-if="tab === 'audit'"
        class="overflow-hidden rounded-xl border border-border bg-white"
      >
        <div class="border-b border-border px-4 py-3 text-sm font-semibold">
          {{ t('numbering.auditTitle') }}
        </div>
        <div v-if="!audits.length" class="px-4 py-6 text-[13px] text-muted-foreground">
          {{ t('numbering.auditEmpty') }}
        </div>
        <table v-else class="w-full text-left text-xs">
          <thead class="text-[10px] tracking-wide text-muted-foreground">
            <tr>
              <th class="px-4 py-2">{{ t('numbering.auditCols.number') }}</th>
              <th class="px-2 py-2">{{ t('numbering.auditCols.type') }}</th>
              <th class="px-2 py-2">{{ t('numbering.auditCols.version') }}</th>
              <th class="px-4 py-2">{{ t('numbering.auditCols.when') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in audits" :key="a.id" class="border-t border-zinc-100">
              <td class="px-4 py-2 font-mono">{{ a.generatedNumber }}</td>
              <td class="px-2 py-2">{{ a.numberType }}</td>
              <td class="px-2 py-2">v{{ a.policyVersion }}</td>
              <td class="px-4 py-2 text-muted-foreground">{{ a.createdAt.slice(0, 19) }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  </AppShell>
</template>
