<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ArrowRight, PanelRightOpen, ShieldAlert } from '@lucide/vue'
import type { RaciMark, TaskItem } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  actionLabelForTask,
  destinationForTask,
  destinationHintKey,
} from '@/lib/navDestinations'
import { ownershipChipFor } from '@/lib/taskOwnership'
import { useTasksStore } from '@/stores/tasks'

const props = defineProps<{
  tasks: TaskItem[]
  selectedId?: string | null
}>()

const emit = defineEmits<{
  action: [task: TaskItem]
  inspect: [task: TaskItem]
}>()

const { t } = useI18n()
const store = useTasksStore()

function markFor(task: TaskItem): RaciMark {
  return store.markFor(task)
}

function chipFor(task: TaskItem) {
  return ownershipChipFor(task)
}

function raciVariant(mark: RaciMark) {
  if (mark === 'R') return 'raciR'
  if (mark === 'A') return 'raciA'
  if (mark === 'C') return 'raciC'
  return 'raciI'
}

function priorityVariant(p: TaskItem['priority']) {
  if (p === 'critical') return 'critical'
  if (p === 'high') return 'high'
  if (p === 'medium') return 'medium'
  return 'normal'
}

function priorityDot(p: TaskItem['priority']) {
  if (p === 'critical') return 'bg-red-600'
  if (p === 'high') return 'bg-amber-600'
  if (p === 'medium') return 'bg-yellow-500'
  return 'bg-zinc-400'
}

function rowBorder(p: TaskItem['priority']) {
  if (p === 'critical') return 'border-l-red-600'
  if (p === 'high') return 'border-l-amber-600'
  if (p === 'medium') return 'border-l-yellow-500'
  return 'border-l-transparent'
}

function milestoneLabel(task: TaskItem) {
  if (!task.milestoneId) return null
  return t(`myTasks.milestone.${task.milestoneId}`)
}

function cutoffAt(task: TaskItem) {
  return task.cutoffAt ?? task.cutoffLabel
}

function cutoffKind(task: TaskItem) {
  return task.cutoffKind ?? t('myTasks.fields.cutoff')
}

function cta(task: TaskItem) {
  return actionLabelForTask(task, markFor(task))
}

function destHint(task: TaskItem) {
  return t(destinationHintKey(destinationForTask(task)))
}

function onRowClick(task: TaskItem, e: MouseEvent) {
  const el = e.target as HTMLElement | null
  if (el?.closest('[data-row-action]')) return
  emit('inspect', task)
}

function onActionClick(task: TaskItem, e: MouseEvent) {
  e.stopPropagation()
  emit('action', task)
}

function onInspectClick(task: TaskItem, e: MouseEvent) {
  e.stopPropagation()
  emit('inspect', task)
}
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-border bg-card">
    <Table>
      <TableHeader>
        <TableRow class="hover:bg-transparent">
          <TableHead class="h-9 px-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {{ t('myTasks.fields.jobNo') }} / {{ t('myTasks.fields.customer') }}
          </TableHead>
          <TableHead class="h-9 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {{ t('myTasks.fields.stage') }}
          </TableHead>
          <TableHead class="h-9 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {{ t('myTasks.fields.handledBy') }}
          </TableHead>
          <TableHead class="h-9 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {{ t('myTasks.fields.cutoff') }}
          </TableHead>
          <TableHead class="h-9 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {{ t('myTasks.fields.why') }}
          </TableHead>
          <TableHead
            class="h-9 px-3 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {{ t('myTasks.fields.action') }}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow
          v-for="task in tasks"
          :key="task.id"
          class="h-11 cursor-pointer border-l-[3px] data-[state=selected]:bg-primary-tint/40"
          :class="rowBorder(task.priority)"
          :data-state="selectedId === task.id ? 'selected' : undefined"
          @click="onRowClick(task, $event)"
        >
          <!-- Job / Customer -->
          <TableCell class="px-3 py-1.5">
            <div class="flex min-w-0 items-center gap-2">
              <span
                class="inline-flex h-5 shrink-0 items-center rounded-md border border-border bg-muted/60 px-1.5 font-mono text-[11px] font-semibold tracking-tight"
              >
                {{ task.jobNo }}
              </span>
              <span class="flex items-center gap-1">
                <span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="priorityDot(task.priority)" />
                <Badge
                  :variant="priorityVariant(task.priority)"
                  class="h-5 rounded-md px-1.5 text-[9px] font-semibold"
                >
                  {{ t(`myTasks.priority.${task.priority}`) }}
                </Badge>
              </span>
              <span class="min-w-0 truncate text-xs font-medium text-foreground">
                {{ task.customer }}
              </span>
            </div>
          </TableCell>

          <!-- Stage + single ownership chip -->
          <TableCell class="px-2 py-1.5">
            <div class="flex flex-wrap items-center gap-1">
              <Badge
                v-if="milestoneLabel(task)"
                variant="secondary"
                class="h-5 rounded-md px-1.5 text-[10px]"
              >
                {{ milestoneLabel(task) }}
              </Badge>
              <Badge
                v-if="task.holdType || task.nodeType === 'gate'"
                variant="gate"
                class="h-5 rounded-md px-1.5 text-[10px]"
              >
                {{ t('myTasks.nodeType.gate') }}
              </Badge>
              <template v-if="chipFor(task)">
                <Badge
                  v-if="chipFor(task)!.kind === 'signoff'"
                  variant="high"
                  class="h-5 max-w-[140px] gap-0.5 rounded-md px-1.5 text-[10px]"
                  :title="chipFor(task)!.title"
                >
                  <ShieldAlert :size="11" :stroke-width="2" aria-hidden="true" />
                  <span class="truncate">
                    {{ t('myTasks.chips.signoff') }} · {{ chipFor(task)!.label }}
                  </span>
                </Badge>
                <Badge
                  v-else
                  variant="outline"
                  class="h-5 max-w-[140px] gap-0.5 rounded-md px-1.5 text-[10px]"
                  :title="chipFor(task)!.title"
                >
                  <ArrowRight :size="11" :stroke-width="2" aria-hidden="true" />
                  <span class="truncate">
                    {{ t('myTasks.chips.next') }} · {{ chipFor(task)!.label }}
                  </span>
                </Badge>
              </template>
            </div>
          </TableCell>

          <!-- Handled by: Name · L2/L0 seat -->
          <TableCell class="px-2 py-1.5">
            <div class="flex min-w-0 items-center gap-1.5">
              <Badge
                :variant="raciVariant(markFor(task))"
                class="h-5 w-5 shrink-0 justify-center rounded-md px-0 text-[10px]"
              >
                {{ markFor(task) }}
              </Badge>
              <div class="min-w-0">
                <div class="truncate text-xs font-medium leading-tight">{{ task.responsible }}</div>
                <div
                  v-if="task.responsibleTitle"
                  class="truncate text-[10px] text-muted-foreground"
                >
                  {{ task.responsibleTitle }}
                </div>
              </div>
            </div>
          </TableCell>

          <!-- Cutoff -->
          <TableCell class="px-2 py-1.5">
            <div class="text-xs font-semibold leading-tight">{{ cutoffAt(task) }}</div>
            <div class="text-[10px] text-muted-foreground">{{ cutoffKind(task) }}</div>
          </TableCell>

          <!-- Why -->
          <TableCell class="max-w-[220px] px-2 py-1.5">
            <p class="truncate text-xs text-muted-foreground" :title="task.why">
              {{ task.why }}
            </p>
          </TableCell>

          <!-- Action & Inspect -->
          <TableCell class="px-3 py-1.5 text-right" data-row-action>
            <div class="flex items-center justify-end gap-1">
              <Button
                size="xs"
                class="h-7 px-2.5"
                :title="destHint(task)"
                @click="onActionClick(task, $event)"
              >
                {{ cta(task) }}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                class="h-7 w-7"
                :title="t('myTasks.inspector.inspect')"
                @click="onInspectClick(task, $event)"
              >
                <PanelRightOpen :size="14" :stroke-width="2" aria-hidden="true" />
                <span class="sr-only">{{ t('myTasks.inspector.inspect') }}</span>
              </Button>
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
