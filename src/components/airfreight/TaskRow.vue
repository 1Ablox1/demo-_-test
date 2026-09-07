<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { RaciMark, TaskItem } from '@/api/types'
import { awbDisplay } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  actionLabelForTask,
  destinationForTask,
  destinationHintKey,
} from '@/lib/navDestinations'

const props = defineProps<{
  task: TaskItem
  mark: RaciMark
}>()

const emit = defineEmits<{
  action: [task: TaskItem]
  exception: [task: TaskItem]
}>()

const { t } = useI18n()

const raciVariant = computed(() => {
  if (props.mark === 'R') return 'raciR'
  if (props.mark === 'A') return 'raciA'
  if (props.mark === 'C') return 'raciC'
  return 'raciI'
})

const priorityVariant = computed(() => {
  if (props.task.priority === 'critical') return 'critical'
  if (props.task.priority === 'high') return 'high'
  if (props.task.priority === 'medium') return 'medium'
  return 'normal'
})

const cta = computed(() => actionLabelForTask(props.task, props.mark))
const dest = computed(() => destinationForTask(props.task))
const destHint = computed(() => t(destinationHintKey(dest.value)))
const awbLine = computed(() => awbDisplay(props.task))

const urgentCutoff = computed(() => {
  const c = props.task.cutoffLabel.toLowerCase()
  return (
    props.task.priority === 'critical' ||
    c.includes('today') ||
    props.task.dueLabel === '4h' ||
    props.task.dueLabel === 'Today'
  )
})

const rowBorder = computed(() => {
  if (props.task.priority === 'critical') return 'border-l-red-600'
  if (props.task.priority === 'high') return 'border-l-amber-600'
  if (props.task.priority === 'medium') return 'border-l-yellow-500'
  return 'border-l-zinc-300'
})

const milestoneLabel = computed(() => {
  const id = props.task.milestoneId
  if (!id) return null
  return t(`myTasks.milestone.${id}`)
})

const holdLabel = computed(() => {
  if (props.task.holdType) return t(`exception.holdType.${props.task.holdType}`)
  if (props.task.nodeType === 'gate') return t('myTasks.nodeType.gate')
  return null
})

const showHoldChip = computed(() => Boolean(holdLabel.value))
</script>

<template>
  <article
    class="grid grid-cols-1 gap-2 border-b border-border border-l-[3px] bg-card px-3 py-2 transition hover:bg-muted/40 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)_88px_minmax(0,0.95fr)_minmax(0,1.1fr)_auto] sm:items-center sm:gap-2.5"
    :class="rowBorder"
  >
    <!-- Job + customer -->
    <div class="min-w-0">
      <div class="flex flex-wrap items-center gap-1.5">
        <span class="font-mono text-[12px] font-semibold tracking-tight">{{ task.jobNo }}</span>
        <Badge :variant="priorityVariant" class="h-4 rounded-md px-1.5 text-[9px] font-semibold">
          {{ t(`myTasks.priority.${task.priority}`) }}
        </Badge>
        <Badge variant="pack" class="h-4 rounded-md px-1.5 text-[9px]">{{ task.pack }}</Badge>
      </div>
      <div class="mt-0.5 truncate text-[12px] font-medium leading-tight text-foreground">
        {{ task.customer }}
      </div>
      <div class="truncate font-mono text-[10px] text-muted-foreground">
        {{ task.lane }} · {{ awbLine }}
      </div>
    </div>

    <!-- Stage + risk chips -->
    <div class="flex min-w-0 flex-wrap items-center gap-1">
      <Badge v-if="milestoneLabel" variant="secondary" class="h-5 rounded-md px-1.5 text-[10px]">
        {{ milestoneLabel }}
      </Badge>
      <Badge
        v-if="showHoldChip"
        variant="gate"
        class="h-5 cursor-pointer rounded-md px-1.5 text-[10px]"
        @click="emit('exception', task)"
      >
        {{ holdLabel }}
      </Badge>
      <Badge v-if="task.moneyRisk" variant="high" class="h-5 rounded-md px-1.5 text-[10px]">
        {{ t('myTasks.chips.moneyRisk') }}
      </Badge>
    </div>

    <!-- Handled by -->
    <div class="min-w-0">
      <div class="flex items-center gap-1">
        <Badge
          :variant="raciVariant"
          class="h-5 w-5 justify-center rounded-md px-0 text-[10px]"
          :title="mark"
        >
          {{ mark }}
        </Badge>
        <span class="truncate text-[11px] font-medium text-foreground" :title="task.responsible">
          {{ task.responsible }}
        </span>
      </div>
      <div v-if="task.accountable" class="truncate text-[10px] text-muted-foreground">
        A {{ task.accountable }}
      </div>
    </div>

    <!-- Cutoff / SLA -->
    <div class="min-w-0">
      <div
        class="text-[11px] font-semibold leading-snug"
        :class="urgentCutoff ? 'text-red-700' : 'text-foreground'"
      >
        {{ task.cutoffLabel }}
      </div>
      <div class="text-[10px] text-muted-foreground">{{ task.etdLabel }} · {{ task.dueLabel }}</div>
    </div>

    <!-- Why -->
    <TooltipProvider :delay-duration="200">
      <Tooltip>
        <TooltipTrigger as-child>
          <p class="min-w-0 cursor-default truncate text-[11px] leading-snug text-muted-foreground">
            <span class="font-medium text-foreground">{{ task.title }}</span>
            <span class="text-muted-foreground"> — {{ task.why }}</span>
          </p>
        </TooltipTrigger>
        <TooltipContent class="max-w-xs text-xs">
          <p class="font-medium">{{ task.title }}</p>
          <p class="mt-1 text-muted-foreground">{{ task.why }}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <!-- CTA -->
    <div class="flex shrink-0 flex-col items-stretch gap-0.5 sm:items-end">
      <Button size="xs" class="h-7 px-2.5" :title="destHint" @click="emit('action', task)">
        {{ cta }}
      </Button>
      <span class="hidden max-w-[140px] truncate text-right text-[9px] text-muted-foreground sm:block">
        {{ destHint }}
      </span>
    </div>
  </article>
</template>
