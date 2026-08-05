<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import AppShell from '@/components/airfreight/AppShell.vue'
import CreateQuoteModal from '@/components/airfreight/CreateQuoteModal.vue'
import { useTasksStore } from '@/stores/tasks'

const router = useRouter()
const tasks = useTasksStore()
const { t } = useI18n()

const open = ref(true)

const canCreateQuote = computed(
  () => tasks.role === 'sales' || tasks.role === 'operations',
)

onMounted(() => {
  if (!canCreateQuote.value) {
    void router.replace({ name: 'job-context', params: { shipmentId: '8801' } })
  }
})

function onClose() {
  open.value = false
  void router.push({ name: 'my-tasks' })
}
</script>

<template>
  <AppShell>
    <div class="mx-auto max-w-[760px] px-6 py-10">
      <p class="text-[13px] text-muted-foreground">
        {{ t('quote.modalRouteHint') }}
      </p>
    </div>
    <CreateQuoteModal
      v-if="canCreateQuote"
      :open="open"
      @close="onClose"
    />
  </AppShell>
</template>
