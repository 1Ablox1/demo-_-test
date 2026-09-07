<script setup lang="ts">

import { computed, ref } from 'vue'

import { useI18n } from 'vue-i18n'

import { useRoute, useRouter } from 'vue-router'

import AppShell from '@/components/airfreight/AppShell.vue'

import CreateQuoteModal from '@/components/airfreight/CreateQuoteModal.vue'

import { Badge } from '@/components/ui/badge'

import { useSeatPermissions } from '@/composables/useSeatPermissions'

import { parseCreateJobLob } from '@/lib/createJobIntent'



const route = useRoute()

const router = useRouter()

const { t } = useI18n()

const { isQuoteReadOnly, readOnlyLabel } = useSeatPermissions()



const open = ref(true)

const lobPrefix = computed(() => parseCreateJobLob(route.query.lob))



function onClose() {

  open.value = false

  void router.push({ name: 'my-tasks' })

}

</script>



<template>

  <AppShell>
    <div class="h-full overflow-y-auto">
    <div class="mx-auto max-w-[760px] px-6 py-6">

      <div class="mb-4 flex flex-wrap items-center gap-2">

        <p class="text-[13px] text-muted-foreground">

          {{ t('quote.modalRouteHint') }}

          <span class="ml-1 font-mono text-foreground">{{ lobPrefix }}</span>

        </p>

        <Badge

          v-if="isQuoteReadOnly && readOnlyLabel"

          variant="high"

          class="rounded-md text-[10px] font-medium"

        >

          {{ readOnlyLabel }}

        </Badge>

      </div>

      <p v-if="isQuoteReadOnly" class="text-[12px] text-muted-foreground">

        {{ t('quote.readOnlyHint') }}

      </p>

    </div>

    <CreateQuoteModal

      :open="open"

      :lob-prefix="lobPrefix"

      :read-only="isQuoteReadOnly"

      @close="onClose"

    />

    </div>
  </AppShell>

</template>

