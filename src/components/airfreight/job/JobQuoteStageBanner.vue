<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useSeatPermissions } from '@/composables/useSeatPermissions'
import { parseCreateJobLob } from '@/lib/createJobIntent'
import type { JobLob } from '@/api/types'

const props = defineProps<{
  shipmentId: number
  lob?: JobLob | null
}>()

const router = useRouter()
const { t } = useI18n()
const { canEditQuote, isQuoteReadOnly, readOnlyLabel } = useSeatPermissions()

const lobPrefix = computed(() => parseCreateJobLob(props.lob ?? 'AI'))

function openQuote() {
  void router.push({ name: 'create-quote', query: { lob: lobPrefix.value } })
}
</script>

<template>
  <div
    class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3"
    role="status"
  >
    <div class="min-w-0">
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-[13px] font-semibold text-foreground">
          {{ t('quote.stageBanner.title') }}
        </span>
        <Badge variant="secondary" class="rounded-md text-[9px] font-bold tracking-wide">
          {{ t('quote.stageBanner.draft') }}
        </Badge>
        <Badge
          v-if="isQuoteReadOnly && readOnlyLabel"
          variant="high"
          class="rounded-md text-[10px] font-medium"
        >
          {{ readOnlyLabel }}
        </Badge>
      </div>
      <p class="mt-1 text-[12px] text-muted-foreground">
        {{ t('quote.stageBanner.body') }}
      </p>
    </div>
    <Button type="button" size="sm" variant="outline" @click="openQuote">
      {{ canEditQuote ? t('quote.stageBanner.edit') : t('quote.stageBanner.view') }}
    </Button>
  </div>
</template>
