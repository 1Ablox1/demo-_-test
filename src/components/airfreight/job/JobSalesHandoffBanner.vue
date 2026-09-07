<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Badge } from '@/components/ui/badge'

defineProps<{
  readOnlyLabel?: string | null
}>()

const { t } = useI18n()
</script>

<template>
  <div
    class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200/80 bg-amber-50/80 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30"
    role="status"
  >
    <div class="min-w-0">
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-[13px] font-semibold text-foreground">
          {{ t('jobContext.handoffBanner.title') }}
        </span>
        <Badge
          v-if="readOnlyLabel"
          variant="high"
          class="rounded-md text-[10px] font-medium"
        >
          {{ readOnlyLabel }}
        </Badge>
      </div>
      <p class="mt-1 text-[12px] text-muted-foreground">
        {{ t('jobContext.handoffBanner.body') }}
      </p>
    </div>
  </div>
</template>
