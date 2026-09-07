<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { RaciMark, TaskItem } from '@/api/types'
import { awbDisplay } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
const hovered = ref(false)

const priorityVariant = computed(() => {
  if (props.task.priority === 'critical') return 'critical'
  if (props.task.priority === 'high') return 'high'
  if (props.task.priority === 'medium') return 'medium'
  return 'normal'
})

const raciVariant = computed(() => {
  if (props.mark === 'R') return 'raciR'
  if (props.mark === 'A') return 'raciA'
  if (props.mark === 'C') return 'raciC'
  return 'raciI'
})

const cta = computed(() => actionLabelForTask(props.task, props.mark))
const destHint = computed(() =>
  t(destinationHintKey(destinationForTask(props.task))),
)

const urgentCutoff = computed(() => {
  const c = props.task.cutoffLabel.toLowerCase()
  return (
    props.task.priority === 'critical' ||
    c.includes('today') ||
    c.includes('14:00') ||
    c.includes('16:00')
  )
})

const priorityDot = computed(() => {
  const map = {
    critical: 'bg-red-600',
    high: 'bg-amber-600',
    medium: 'bg-yellow-500',
    normal: 'bg-emerald-600',
  } as const
  return map[props.task.priority]
})

const awbLine = computed(() => awbDisplay(props.task))
</script>

<template>
  <article
    class="flex flex-col gap-2.5 rounded-[10px] border bg-white p-3.5 shadow-sm transition"
    :class="hovered ? 'border-primary shadow-[0_4px_18px_rgba(46,196,182,0.1)]' : 'border-border'"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
  >
    <div class="flex flex-wrap items-center gap-1.5">
      <Badge :variant="priorityVariant">
        <span class="inline-block h-1.5 w-1.5 rounded-full" :class="priorityDot" />
        {{ t(`myTasks.priority.${task.priority}`) }}
      </Badge>
      <Badge :variant="raciVariant" class="h-[22px] w-[22px] justify-center px-0" :title="mark">
        {{ mark }}
      </Badge>
      <Badge
        v-if="task.nodeType === 'gate'"
        variant="gate"
        class="cursor-pointer"
        @click="emit('exception', task)"
      >
        {{ t('myTasks.nodeType.gate') }}
      </Badge>
      <div class="flex-1" />
      <span
        class="font-mono text-[11px] font-semibold tracking-tight text-foreground"
        :title="t('myTasks.fields.jobNo')"
      >
        {{ task.jobNo }}
      </span>
    </div>

    <div>
      <h3 class="text-[13px] font-semibold leading-snug text-foreground">{{ task.title }}</h3>
      <p class="mt-1 font-mono text-[11px] text-muted-foreground">{{ awbLine }}</p>
      <p class="mt-0.5 text-xs text-muted-foreground">
        {{ task.lane }} · {{ task.customer }}
      </p>
    </div>

    <div class="flex flex-wrap gap-1">
      <Badge variant="pack">{{ task.pack }}</Badge>
      <span
        class="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium"
        :class="urgentCutoff ? 'border-red-200 bg-red-50 text-red-700' : 'bg-zinc-50 text-muted-foreground'"
      >
        {{ task.cutoffLabel }}
      </span>
      <span class="rounded bg-zinc-50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
        {{ task.etdLabel }}
      </span>
    </div>

    <div
      class="rounded-md border-l-[2.5px] bg-zinc-50 px-2.5 py-1.5 text-xs leading-relaxed text-zinc-700"
      :class="{
        'border-l-red-300': task.priority === 'critical',
        'border-l-amber-300': task.priority === 'high',
        'border-l-yellow-300': task.priority === 'medium',
        'border-l-emerald-300': task.priority === 'normal',
      }"
    >
      {{ task.why }}
    </div>

    <div class="flex gap-4 text-xs text-muted-foreground">
      <div>
        <span class="mr-1 text-zinc-300">R</span>{{ task.responsible }}
      </div>
      <div v-if="task.accountable">
        <span class="mr-1 text-zinc-300">A</span>{{ task.accountable }}
      </div>
    </div>

    <div class="flex items-center justify-between border-t border-zinc-100 pt-2">
      <span class="font-mono text-[11px] text-muted-foreground">{{ task.jobNo }}</span>
      <div class="flex flex-col items-end gap-0.5">
        <Button size="sm" :title="destHint" @click="emit('action', task)">{{ cta }}</Button>
        <span class="max-w-[140px] text-right text-[10px] text-muted-foreground">{{ destHint }}</span>
      </div>
    </div>

    <div
      v-if="hovered"
      class="flex flex-wrap items-center gap-1.5 border-t border-zinc-100 pt-2 text-[11px] text-muted-foreground"
    >
      <span>{{ t('myTasks.whoCanAct') }}:</span>
      <Badge :variant="raciVariant" class="h-5 w-5 justify-center px-0 text-[10px]">{{ mark }}</Badge>
      <span>{{
        mark === 'R' || mark === 'A'
          ? t(`myTasks.roles.${mark === 'R' ? 'operations' : 'finance'}`)
          : t('myTasks.viewOnly')
      }}</span>
    </div>
  </article>
</template>
