<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Filter,
  Globe,
  Layers,
  Lock,
  MapPin,
  ShieldCheck,
} from '@lucide/vue'
import baselineRaciCatalog from '@/data/raciCatalog'
import {
  CORRIDOR_SCENARIOS,
  linkedTaskIdsForPack,
  MARKET_PACK_REGISTRY,
  type MarketPackManifest,
  type RegulatoryStandard,
} from '@/data/marketPacks'
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
import { useMarketPackStore } from '@/stores/marketPacks'
import { useTenantAdminStore } from '@/stores/tenantAdmin'

const emit = defineEmits<{
  openTask: [taskId: string]
}>()

const { t } = useI18n()
const packs = useMarketPackStore()
const tenant = useTenantAdminStore()

const processId = ref('all')
const standardId = ref('all')
const toolsOpen = ref(false)

const processList = baselineRaciCatalog.processes

const requiredPacks = computed(() =>
  tenant.requiredPackIds
    .map((id) => MARKET_PACK_REGISTRY[id])
    .filter(Boolean) as MarketPackManifest[],
)

const corridorPacks = computed(() =>
  packs.allPacks.filter((p) => p.id !== 'GLOBAL' && !packs.isLocked(p.id)),
)

const viewedPack = computed(() => packs.selectedPack)

function packStatusLabel(pack: MarketPackManifest): string {
  if (packs.isLocked(pack.id)) {
    if (pack.id === 'GLOBAL') return t('adminStudio.panels.market.statusSpine')
    return t('adminStudio.panels.market.statusRequired')
  }
  return packs.isEnabled(pack.id)
    ? t('adminStudio.panels.market.statusOn')
    : t('adminStudio.panels.market.statusOff')
}

function taskCountInProcess(pack: MarketPackManifest, process: string): number {
  const ids = linkedTaskIdsForPack(pack)
  if (process === 'all') return ids.length
  return ids.filter((id) => baselineRaciCatalog.getTask(id)?.process === process).length
}

function standardTouchesProcess(std: RegulatoryStandard, process: string): boolean {
  if (process === 'all') return true
  return std.linkedTaskIds.some((id) => baselineRaciCatalog.getTask(id)?.process === process)
}

const packsCoveringProcess = computed(() => {
  if (processId.value === 'all') return packs.allPacks
  return packs.allPacks.filter((p) => taskCountInProcess(p, processId.value) > 0)
})

const processIntent = computed(() => {
  if (processId.value === 'all') return ''
  return baselineRaciCatalog.processMeta[processId.value]?.intent ?? ''
})

const standardsInView = computed(() => {
  const list = viewedPack.value?.standards ?? []
  return list.filter((s) => standardTouchesProcess(s, processId.value))
})

const selectedStandard = computed(() => {
  if (standardId.value === 'all') return null
  return standardsInView.value.find((s) => s.id === standardId.value) ?? null
})

const taskIdsInView = computed(() => {
  const ids = selectedStandard.value
    ? [...selectedStandard.value.linkedTaskIds]
    : viewedPack.value
      ? linkedTaskIdsForPack(viewedPack.value)
      : []
  if (processId.value === 'all') return ids
  return ids.filter((id) => baselineRaciCatalog.getTask(id)?.process === processId.value)
})

const filteredTasks = computed(() =>
  taskIdsInView.value.map((id) => baselineRaciCatalog.getTask(id)).filter(Boolean),
)

const visibleGates = computed(() => {
  const pack = viewedPack.value
  if (!pack) return []
  const taskSet = new Set(taskIdsInView.value)
  return pack.sampleGates.filter((g) => taskSet.has(g.linkedTaskId))
})

function packIcon(pack: MarketPackManifest) {
  if (pack.id === 'GLOBAL') return Globe
  if (pack.regionGroup === 'AMER') return MapPin
  if (pack.regionGroup === 'APAC') return Layers
  return ShieldCheck
}

watch(processId, () => {
  if (standardId.value === 'all') return
  if (!standardsInView.value.some((s) => s.id === standardId.value)) standardId.value = 'all'
})

watch(
  () => packs.selectedPackId,
  () => {
    if (
      standardId.value !== 'all' &&
      !viewedPack.value?.standards.some((s) => s.id === standardId.value)
    ) {
      standardId.value = 'all'
    }
  },
)
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 class="text-[17px] font-bold tracking-tight text-foreground">
        {{ t('adminStudio.panels.market.title') }}
      </h2>
      <p class="mt-1 text-xs text-muted-foreground">
        {{ t('adminStudio.panels.market.subtitle') }}
      </p>
    </div>

    <Card size="sm" class="rounded-[10px] border-border ring-border">
      <CardContent class="px-4 py-3">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
          <span class="inline-flex items-center gap-1.5 font-semibold text-foreground">
            <Globe :size="14" class="text-primary" aria-hidden="true" />
            {{ t('adminStudio.panels.market.companyHome') }} · {{ tenant.hqCountryCode }}
            {{ tenant.hqLabel }}
          </span>
          <span class="text-muted-foreground">{{ t('adminStudio.panels.market.alwaysOn') }}</span>
          <Badge
            v-for="id in tenant.requiredPackIds"
            :key="id"
            variant="pack"
            class="rounded-md font-mono text-[10px]"
          >
            {{ id }}
          </Badge>
          <span v-if="tenant.branchPackNotes.length" class="text-[11px] text-muted-foreground">
            {{ tenant.branchPackNotes.join(', ') }}
          </span>
        </div>
        <p class="mt-1.5 text-[11px] leading-snug text-muted-foreground">
          {{ t('adminStudio.panels.market.tenantPosture') }}
        </p>
      </CardContent>
    </Card>

    <Card class="rounded-[10px] border-border ring-border">
      <CardHeader class="px-4 pb-0 pt-0">
        <div class="flex items-center gap-2">
          <Filter :size="16" class="text-primary" aria-hidden="true" />
          <CardTitle class="text-[13px]">{{ t('adminStudio.panels.market.filtersTitle') }}</CardTitle>
        </div>
      </CardHeader>
      <CardContent class="space-y-3 px-4">
        <div class="grid gap-3 sm:grid-cols-3">
          <label class="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {{ t('adminStudio.panels.market.selectPack') }}
            <Select
              :model-value="packs.selectedPackId"
              @update:model-value="(v) => packs.selectPack(String(v))"
            >
              <SelectTrigger class="mt-1 h-8 w-full text-[12px] normal-case tracking-normal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="p in requiredPacks" :key="p.id" :value="p.id">
                  {{ p.id }} — {{ packStatusLabel(p) }}
                </SelectItem>
                <SelectItem v-for="p in corridorPacks" :key="p.id" :value="p.id">
                  {{ p.id }} — {{ packStatusLabel(p) }}
                </SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label class="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {{ t('adminStudio.panels.market.process') }}
            <Select v-model="processId">
              <SelectTrigger class="mt-1 h-8 w-full text-[12px] normal-case tracking-normal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{{ t('adminStudio.panels.market.allProcesses') }}</SelectItem>
                <SelectItem v-for="proc in processList" :key="proc" :value="proc">
                  {{ proc }}
                </SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label class="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {{ t('adminStudio.panels.market.standard') }}
            <Select v-model="standardId">
              <SelectTrigger class="mt-1 h-8 w-full text-[12px] normal-case tracking-normal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{{ t('adminStudio.panels.market.allStandards') }}</SelectItem>
                <SelectItem v-for="s in standardsInView" :key="s.id" :value="s.id">
                  {{ s.code }} — {{ s.title }}
                </SelectItem>
              </SelectContent>
            </Select>
          </label>
        </div>
        <p v-if="processIntent" class="text-[11px] leading-snug text-muted-foreground">
          {{ processIntent }}
        </p>
        <div v-if="processId !== 'all'" class="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span class="text-muted-foreground">{{ t('adminStudio.panels.market.processCovers') }}</span>
          <Button
            v-for="p in packsCoveringProcess"
            :key="p.id"
            type="button"
            size="sm"
            :variant="viewedPack?.id === p.id ? 'default' : 'outline'"
            class="h-6 gap-1 font-mono text-[10px]"
            @click="packs.selectPack(p.id)"
          >
            {{ p.id }}
            <span class="font-sans">{{ taskCountInProcess(p, processId) }}</span>
          </Button>
        </div>
      </CardContent>
    </Card>

    <Card v-if="viewedPack" class="rounded-[10px] border-border ring-border">
      <CardHeader class="border-b border-border px-4 py-3">
        <div class="flex flex-wrap items-start gap-3">
          <component
            :is="packIcon(viewedPack)"
            :size="16"
            class="mt-0.5 shrink-0 text-primary"
            aria-hidden="true"
          />
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-mono text-[11px] font-bold text-primary">{{ viewedPack.id }}</span>
              <CardTitle class="text-[13px]">{{ viewedPack.name }}</CardTitle>
              <Badge variant="pack" class="font-mono text-[10px]">SOP {{ viewedPack.sopVersion }}</Badge>
            </div>
            <CardDescription class="mt-1 text-[11px]">{{ viewedPack.summary }}</CardDescription>
            <p class="mt-1 text-[11px] text-muted-foreground">
              <span class="font-semibold text-foreground">{{ t('adminStudio.panels.market.appliesWhen') }}</span>
              {{ viewedPack.appliesWhen }}
            </p>
          </div>
          <Badge v-if="packs.isLocked(viewedPack.id)" variant="normal" class="gap-1 rounded-md text-[10px]">
            <Lock :size="10" aria-hidden="true" />
            {{ t('adminStudio.panels.market.required') }}
          </Badge>
          <Button
            v-else
            size="sm"
            :variant="packs.isEnabled(viewedPack.id) ? 'default' : 'outline'"
            class="text-[11px]"
            @click="packs.togglePack(viewedPack.id)"
          >
            {{
              packs.isEnabled(viewedPack.id)
                ? t('adminStudio.panels.market.statusOn')
                : t('adminStudio.panels.market.statusOff')
            }}
          </Button>
        </div>
      </CardHeader>

      <CardContent class="space-y-4 border-t border-border bg-muted/20 px-4 py-4">
        <div>
          <div class="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            <BookOpen :size="12" aria-hidden="true" />
            {{
              selectedStandard
                ? t('adminStudio.panels.market.standardDetail')
                : t('adminStudio.panels.market.standardsCount', { n: standardsInView.length })
            }}
          </div>

          <div v-if="selectedStandard" class="rounded-lg border border-border bg-card p-3">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div>
                <span class="font-mono text-[11px] font-bold text-primary">{{ selectedStandard.code }}</span>
                <p class="text-[13px] font-semibold">{{ selectedStandard.title }}</p>
                <p class="mt-1 text-[11px] text-muted-foreground">{{ selectedStandard.whyWeCare }}</p>
              </div>
              <a
                :href="selectedStandard.officialUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                {{ t('adminStudio.panels.market.official') }}
                <ExternalLink :size="12" aria-hidden="true" />
              </a>
            </div>
            <Button size="sm" variant="link" class="mt-2 h-auto px-0 text-[11px]" @click="standardId = 'all'">
              {{ t('adminStudio.panels.market.showList') }}
            </Button>
          </div>

          <div v-else class="space-y-1">
            <button
              v-for="s in standardsInView"
              :key="s.id"
              type="button"
              class="flex w-full items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-left text-[12px] hover:border-primary/40 hover:bg-primary-tint"
              @click="standardId = s.id"
            >
              <span>
                <span class="font-mono text-[10px] font-bold text-primary">{{ s.code }}</span>
                <span class="ml-2 font-medium">{{ s.title }}</span>
              </span>
              <span class="text-[10px] text-muted-foreground">{{ s.linkedTaskIds.length }} tasks</span>
            </button>
          </div>

          <p class="mt-2 text-[10px] text-muted-foreground">
            {{ t('adminStudio.panels.market.standardsSpineNote') }}
          </p>
        </div>

        <div v-if="visibleGates.length" class="space-y-2">
          <p class="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {{ t('adminStudio.panels.market.gatesTitle') }}
          </p>
          <div
            v-for="g in visibleGates"
            :key="g.gateId"
            class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
          >
            <p class="text-[12px] font-semibold text-amber-950">{{ g.label }}</p>
            <p class="mt-0.5 text-[11px] text-amber-900">{{ g.reason }}</p>
          </div>
        </div>

        <div v-if="filteredTasks.length">
          <p class="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {{ t('adminStudio.panels.market.relatedTasks') }}
          </p>
          <div class="overflow-hidden rounded-lg border border-border">
            <button
              v-for="task in filteredTasks"
              :key="task!.id"
              type="button"
              class="flex w-full items-center justify-between border-b border-border px-3 py-2 text-left text-[12px] last:border-0 hover:bg-primary-tint"
              @click="emit('openTask', task!.id)"
            >
              <span>
                <span class="font-mono text-[10px] text-primary">{{ task!.id }}</span>
                <span class="ml-2">{{ task!.title }}</span>
              </span>
              <span class="text-[10px] text-muted-foreground">{{ task!.stage }}</span>
            </button>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card class="rounded-[10px] border-border ring-border">
      <button
        type="button"
        class="flex w-full items-center justify-between px-4 py-3 text-left"
        @click="toolsOpen = !toolsOpen"
      >
        <span class="text-[13px] font-semibold">{{ t('adminStudio.panels.market.laneCheck') }}</span>
        <span class="text-[11px] font-medium text-primary">
          {{ toolsOpen ? t('adminStudio.panels.market.hide') : t('adminStudio.panels.market.show') }}
        </span>
      </button>
      <CardContent v-if="toolsOpen" class="space-y-3 border-t border-border px-4 pb-4">
        <Select v-model="packs.corridorId">
          <SelectTrigger class="h-8 max-w-md text-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="c in CORRIDOR_SCENARIOS" :key="c.id" :value="c.id">
              {{ c.label }}
            </SelectItem>
          </SelectContent>
        </Select>
        <div
          v-if="packs.corridor"
          class="rounded-lg border border-border bg-muted/20 px-3 py-2 text-[12px]"
        >
          <p class="font-medium">{{ packs.corridor.label }} · {{ packs.corridor.jobHint }}</p>
          <p class="mt-1 flex items-center gap-1.5 text-[11px]">
            <CheckCircle2
              v-if="packs.corridorWouldFire.covered"
              :size="14"
              class="text-emerald-600"
              aria-hidden="true"
            />
            <AlertCircle v-else :size="14" class="text-amber-600" aria-hidden="true" />
            {{
              packs.corridorWouldFire.covered
                ? t('adminStudio.panels.market.laneOk')
                : t('adminStudio.panels.market.laneMissing', {
                    packs: packs.corridorWouldFire.missing.join(', '),
                  })
            }}
          </p>
          <Button
            size="sm"
            variant="link"
            class="mt-1 h-auto px-0 text-[11px]"
            @click="emit('openTask', packs.corridor!.taskId)"
          >
            {{ t('adminStudio.panels.market.openTask') }}
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
