<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { RaciMark, TaskItem } from '@/api/types'
import { awbDisplay } from '@/api/types'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import {
  actionLabelForTask,
  destinationForTask,
  destinationHintKey,
} from '@/lib/navDestinations'
import { useTasksStore } from '@/stores/tasks'

const props = defineProps<{
  task: TaskItem
  mark: RaciMark
}>()

const emit = defineEmits<{
  action: [task: TaskItem]
  exception: []
}>()

const { t } = useI18n()
const tasks = useTasksStore()

const canCreateQuote = computed(
  () => tasks.role === 'sales' || tasks.role === 'operations',
)

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
const dest = computed(() => destinationForTask(props.task, canCreateQuote.value))
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
</script>

<template>
  <article
    class="flex flex-col gap-1.5 border-b border-border border-l-[3px] bg-white px-3 py-2.5 transition hover:bg-zinc-50/80 sm:flex-row sm:items-stretch sm:gap-3"
    :class="rowBorder"
  >
    <div class="min-w-0 flex-1 sm:max-w-[280px]">
      <div class="mb-1 flex flex-wrap items-center gap-1.5">
        <span class="font-mono text-[12px] font-semibold tracking-tight text-foreground">{{
          task.jobNo
        }}</span>
        <Badge :variant="priorityVariant" class="h-5 px-1.5 text-[10px]">
          {{ t(`myTasks.priority.${task.priority}`) }}
        </Badge>
        <Badge :variant="raciVariant" class="h-5 w-5 justify-center px-0 text-[10px]" :title="mark">
          {{ mark }}
        </Badge>
        <Badge
          v-if="task.nodeType === 'gate'"
          variant="gate"
          class="h-5 cursor-pointer px-1.5 text-[10px]"
          @click="emit('exception')"
        >
          {{ t('myTasks.nodeType.gate') }}
        </Badge>
        <Badge variant="pack" class="h-5 px-1.5 text-[10px]">{{ task.pack }}</Badge>
      </div>
      <div class="text-[13px] font-semibold leading-snug text-foreground">{{ task.title }}</div>
      <div class="mt-0.5 font-mono text-[11px] text-muted-foreground">{{ awbLine }}</div>
    </div>

    <div class="min-w-0 sm:w-[160px] sm:shrink-0">
      <div class="text-[12px] font-medium text-foreground">{{ task.lane }}</div>
      <div class="truncate text-[11px] text-muted-foreground" :title="task.customer">
        {{ task.customer }}
      </div>
    </div>

    <div class="min-w-0 sm:w-[170px] sm:shrink-0">
      <div
        class="text-[11px] font-semibold leading-snug"
        :class="urgentCutoff ? 'text-red-700' : 'text-foreground'"
      >
        {{ task.cutoffLabel }}
      </div>
      <div class="text-[11px] text-muted-foreground">{{ task.etdLabel }}</div>
    </div>

    <div class="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p class="min-w-0 flex-1 text-[12px] leading-snug text-zinc-700">{{ task.why }}</p>
      <div class="flex shrink-0 flex-col items-stretch gap-0.5 self-start sm:items-end sm:self-center">
        <Button
          size="sm"
          :title="destHint"
          @click="emit('action', task)"
        >
          {{ cta }}
        </Button>
        <span class="max-w-[160px] text-right text-[10px] leading-snug text-muted-foreground">
          {{ destHint }}
        </span>
      </div>
    </div>
  </article>
</template>
