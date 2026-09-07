<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { Check } from '@lucide/vue'

export type ToastKind = 'success' | 'info' | 'warn'

const visible = ref(false)
const message = ref('')
const kind = ref<ToastKind>('success')
let timer: ReturnType<typeof setTimeout> | null = null

function show(msg: string, k: ToastKind = 'success', ms = 2200) {
  message.value = msg
  kind.value = k
  visible.value = true
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    visible.value = false
  }, ms)
}

onUnmounted(() => {
  if (timer) clearTimeout(timer)
})

defineExpose({ show })
</script>

<template>
  <Teleport to="body">
    <Transition name="os-toast">
      <div
        v-if="visible"
        class="os-toast fixed bottom-20 left-1/2 z-[90] flex -translate-x-1/2 items-center gap-2 rounded-lg border px-3 py-2 text-[12px] shadow-lg"
        :class="{
          'border-emerald-200 bg-emerald-50 text-emerald-900': kind === 'success',
          'border-slate-200 bg-white text-slate-800': kind === 'info',
          'border-amber-200 bg-amber-50 text-amber-900': kind === 'warn',
        }"
        role="status"
      >
        <Check v-if="kind === 'success'" :size="14" class="text-emerald-600" />
        {{ message }}
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.os-toast-enter-active,
.os-toast-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.os-toast-enter-from,
.os-toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px);
}
</style>
