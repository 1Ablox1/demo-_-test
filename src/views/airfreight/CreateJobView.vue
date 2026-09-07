<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import AppShell from '@/components/airfreight/AppShell.vue'
import CreateJobModal from '@/components/airfreight/CreateJobModal.vue'
import { useSeatPermissions } from '@/composables/useSeatPermissions'
import type { CreateJobRouteTarget } from '@/lib/createJobIntent'

const router = useRouter()
const { t } = useI18n()
const { canOpenCreateJob } = useSeatPermissions()

const open = ref(true)

onMounted(() => {
  if (!canOpenCreateJob.value) {
    toast.error(t('quote.forbidden'))
    void router.replace({ name: 'my-tasks' })
  }
})

function onClose() {
  open.value = false
  void router.push({ name: 'my-tasks' })
}

function onSubmit(target: CreateJobRouteTarget) {
  open.value = false
  void router.push({ name: target.name, query: target.query })
}
</script>

<template>
  <AppShell>
    <CreateJobModal
      v-if="canOpenCreateJob"
      :open="open"
      @close="onClose"
      @submit="onSubmit"
    />
  </AppShell>
</template>
