<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check } from '@lucide/vue'

defineProps<{
  visible: boolean
  dirty: boolean
}>()

const emit = defineEmits<{
  discard: []
  save: []
}>()

const { t } = useI18n()
const saved = ref(false)

async function handleSave() {
  emit('save')
  saved.value = true
  setTimeout(() => {
    saved.value = false
  }, 2400)
}
</script>

<template>
  <div
    v-if="visible"
    class="fixed bottom-6 left-1/2 z-[100] flex h-12 -translate-x-1/2 items-center gap-2 rounded-xl bg-[#0F172A] px-2 pl-5 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.3),0_10px_10px_-5px_rgba(0,0,0,0.1)]"
  >
    <div class="mr-2 flex items-center gap-2">
      <Check v-if="saved" class="h-3.5 w-3.5 text-[#2DD4BF]" :stroke-width="2" />
      <span
        v-else
        class="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_0_3px_rgba(245,158,11,0.25)]"
      />
      <span class="whitespace-nowrap text-xs text-[#E2E8F0]">
        {{
          saved
            ? t('adminStudio.dock.published')
            : dirty
              ? t('adminStudio.dock.unsaved')
              : t('adminStudio.dock.ready')
        }}
      </span>
    </div>

    <button
      type="button"
      class="h-[34px] rounded-lg border border-white/10 bg-transparent px-3.5 text-xs font-medium text-[#94A3B8] transition hover:border-white/25 hover:text-[#E2E8F0]"
      @click="emit('discard')"
    >
      {{ t('adminStudio.dock.discard') }}
    </button>

    <button
      type="button"
      class="flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-lg border-0 px-4 text-xs font-bold text-white transition"
      :class="saved ? 'bg-emerald-600' : 'bg-[#0D9488]'"
      @click="handleSave"
    >
      <Check v-if="saved" class="h-3 w-3" :stroke-width="2.5" />
      {{ saved ? t('adminStudio.dock.saved') : t('adminStudio.dock.publish') }}
    </button>
  </div>
</template>
