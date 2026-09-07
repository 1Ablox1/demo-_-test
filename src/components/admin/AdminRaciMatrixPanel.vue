<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { AlertCircle, ChevronRight, Clock, ShieldCheck } from '@lucide/vue'
import baselineRaciCatalog from '@/data/raciCatalog'
import { Badge } from '@/components/ui/badge'
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
import { useRaciConfigStore, type RaciMark } from '@/stores/raciConfig'

const { t } = useI18n()
const raci = useRaciConfigStore()

const selectedTask = computed(() => raci.selectedMatrixTask)

const roleRows = computed(() => {
  const task = selectedTask.value
  if (!task) return []
  return Object.entries(task.assignments).map(([role, marks]) => ({
    role,
    marks,
    seat: raci.resolveEffectiveSeat(role as Parameters<typeof raci.resolveEffectiveSeat>[0]),
    users: raci.getUsersForRole(role as Parameters<typeof raci.getUsersForRole>[0]),
  }))
})

function markVariant(mark: RaciMark) {
  if (mark === 'R') return 'raciR' as const
  if (mark === 'A') return 'raciA' as const
  if (mark === 'C') return 'raciC' as const
  return 'raciI' as const
}
</script>

<template>
  <Card class="overflow-hidden rounded-[10px] border-border ring-border">
    <CardHeader class="border-b border-border px-4 py-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div class="flex items-center gap-2">
            <ShieldCheck :size="16" class="text-primary" :stroke-width="1.75" aria-hidden="true" />
            <CardTitle class="text-[13px]">{{ t('adminStudio.panels.seats.matrixTitle') }}</CardTitle>
          </div>
          <CardDescription class="mt-1 text-[11px]">
            {{ t('adminStudio.panels.seats.matrixSub', { tasks: raci.catalogTaskCount, note: baselineRaciCatalog.catalogNote }) }}
          </CardDescription>
        </div>
        <Badge variant="pack" class="rounded-md font-mono text-[10px]">
          {{ raci.catalogProcessCount }} {{ t('adminStudio.panels.seats.processes') }}
        </Badge>
      </div>
    </CardHeader>

    <CardContent class="flex min-h-[360px] flex-col p-0 lg:flex-row">
      <aside class="shrink-0 border-b border-border lg:w-[280px] lg:border-b-0 lg:border-r">
        <div class="border-b border-border p-2">
          <Select
            :model-value="raci.selectedProcess"
            @update:model-value="(v) => (raci.selectedProcess = String(v))"
          >
            <SelectTrigger class="h-8 w-full text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="proc in baselineRaciCatalog.processes" :key="proc" :value="proc">
                {{ proc }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="max-h-[280px] overflow-y-auto lg:max-h-[320px]">
          <button
            v-for="task in raci.processTasks"
            :key="task.id"
            type="button"
            class="flex w-full items-start gap-1 border-b border-border px-3 py-2 text-left text-[11px] hover:bg-muted/40"
            :class="raci.selectedMatrixTaskId === task.id ? 'bg-primary-tint' : ''"
            @click="raci.selectedMatrixTaskId = task.id"
          >
            <ChevronRight
              :size="12"
              :stroke-width="1.75"
              class="mt-0.5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <span>
              <span class="font-mono text-[10px] text-muted-foreground">{{ task.id }}</span>
              <span class="mt-0.5 block font-medium leading-snug">{{ task.title }}</span>
            </span>
          </button>
        </div>
      </aside>

      <div v-if="selectedTask" class="min-w-0 flex-1 p-4">
        <div class="mb-3">
          <div class="font-mono text-[10px] text-muted-foreground">{{ selectedTask.id }}</div>
          <h3 class="text-[14px] font-semibold text-foreground">{{ selectedTask.title }}</h3>
          <p class="mt-1 text-[11px] text-muted-foreground">
            {{ selectedTask.process }} · {{ selectedTask.stage }}
          </p>
        </div>

        <div
          v-if="selectedTask.gate"
          class="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
        >
          <AlertCircle :size="14" class="mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
          <div>
            <div class="text-[10px] font-bold uppercase tracking-wide text-amber-800">
              {{ t('adminStudio.panels.seats.gate') }}
            </div>
            <div class="text-[12px] text-amber-900">{{ selectedTask.gate }}</div>
          </div>
        </div>

        <div class="overflow-hidden rounded-lg border border-border">
          <div
            class="grid grid-cols-[1fr_72px_1fr_1fr] gap-2 border-b border-border bg-muted/60 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground"
          >
            <span>{{ t('adminStudio.panels.seats.colRole') }}</span>
            <span>RACI</span>
            <span>{{ t('adminStudio.panels.seats.colSeat') }}</span>
            <span>{{ t('adminStudio.panels.seats.colUsers') }}</span>
          </div>
          <div
            v-for="row in roleRows"
            :key="row.role"
            class="grid grid-cols-[1fr_72px_1fr_1fr] gap-2 border-b border-border px-3 py-2 text-[12px] last:border-0"
          >
            <span class="font-medium">{{ row.role }}</span>
            <span class="flex gap-0.5">
              <Badge
                v-for="m in row.marks"
                :key="m"
                :variant="markVariant(m)"
                class="h-5 w-5 justify-center px-0 text-[10px]"
              >
                {{ m }}
              </Badge>
            </span>
            <span class="font-mono text-[11px] text-primary">{{ row.seat }}</span>
            <span class="text-[11px] text-muted-foreground">
              {{
                row.users.length
                  ? row.users.map((u) => u.name).join(', ')
                  : t('adminStudio.panels.users.unassigned')
              }}
            </span>
          </div>
        </div>

        <div class="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
          <Clock :size="12" aria-hidden="true" />
          {{ t('adminStudio.panels.seats.trigger') }}: {{ selectedTask.trigger }}
        </div>
      </div>

      <div
        v-else
        class="flex flex-1 items-center justify-center p-6 text-[12px] text-muted-foreground"
      >
        {{ t('adminStudio.panels.seats.selectTask') }}
      </div>
    </CardContent>
  </Card>
</template>
