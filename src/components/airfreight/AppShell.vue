<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import type { ActingRole, MarketPack } from '@/api/types'
import { useTasksStore } from '@/stores/tasks'

const store = useTasksStore()
const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()

const roleOpen = ref(false)
const packs: MarketPack[] = ['GLOBAL', 'US', 'AU']
const roles: ActingRole[] = ['operations', 'sales', 'finance', 'admin']

const screen = computed(() => {
  if (route.name === 'admin' || route.name === 'admin-numbering') return 'admin'
  return 'workbench'
})

function goWorkbench() {
  void router.push({ name: 'my-tasks' })
}

function goAdmin() {
  void router.push({ name: 'admin' })
}

function setRole(role: ActingRole) {
  store.role = role
  roleOpen.value = false
}

function toggleLocale() {
  locale.value = locale.value === 'en_US' ? 'zh_CN' : 'en_US'
}

function roleLabel(role: ActingRole) {
  return t(`myTasks.roles.${role}`)
}
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <header
      class="sticky top-0 z-50 flex h-[52px] items-center gap-5 border-b border-border bg-white px-6"
    >
      <div class="mr-1 flex items-center gap-2">
        <svg width="22" height="22" viewBox="0 0 20 20" aria-hidden="true">
          <rect x="1" y="1" width="8" height="8" rx="2" fill="#2EC4B6" />
          <rect x="11" y="1" width="8" height="8" rx="2" fill="#2EC4B6" opacity="0.7" />
          <rect x="1" y="11" width="8" height="8" rx="2" fill="#2EC4B6" opacity="0.55" />
          <rect x="11" y="11" width="8" height="8" rx="2" fill="#2EC4B6" opacity="0.3" />
        </svg>
        <span class="text-sm font-semibold tracking-tight">{{ t('myTasks.productName') }}</span>
        <span class="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          mocks
        </span>
      </div>

      <nav class="flex items-center gap-0.5">
        <button
          type="button"
          class="rounded-md px-3 py-1.5 text-[13px] font-medium transition"
          :class="
            screen === 'workbench'
              ? 'bg-primary-tint text-primary'
              : 'text-muted-foreground hover:bg-muted'
          "
          @click="goWorkbench"
        >
          {{ t('shell.workbench') }}
        </button>
        <button
          type="button"
          class="rounded-md px-3 py-1.5 text-[13px] font-medium transition"
          :class="
            screen === 'admin'
              ? 'bg-primary-tint text-primary'
              : 'text-muted-foreground hover:bg-muted'
          "
          @click="goAdmin"
        >
          {{ t('shell.adminStudio') }}
        </button>
      </nav>

      <div class="flex-1" />

      <div class="flex items-center gap-1.5">
        <span class="text-[11px] font-medium text-muted-foreground">{{ t('shell.mode') }}</span>
        <span
          class="flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium"
        >
          ✈ {{ t('shell.air') }}
        </span>
      </div>

      <div class="flex items-center gap-1">
        <button
          v-for="pack in packs"
          :key="pack"
          type="button"
          class="rounded-md px-2.5 py-1 text-[11px] font-semibold tracking-wide transition"
          :class="
            store.activePack === pack
              ? 'bg-primary text-white'
              : 'bg-muted text-muted-foreground hover:bg-zinc-200'
          "
          @click="store.activePack = pack"
        >
          {{ pack }}
        </button>
      </div>

      <div class="relative">
        <button
          type="button"
          class="flex items-center gap-2 rounded-lg border border-border bg-white px-2.5 py-1 text-[13px] font-medium"
          @click="roleOpen = !roleOpen"
        >
          <span
            class="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-primary-tint text-[11px] font-bold text-primary"
          >
            {{ roleLabel(store.role).charAt(0) }}
          </span>
          {{ roleLabel(store.role) }}
        </button>
        <div
          v-if="roleOpen"
          class="absolute right-0 top-[calc(100%+4px)] z-[100] min-w-[148px] rounded-[10px] border border-border bg-white p-1 shadow-lg"
        >
          <button
            v-for="r in roles"
            :key="r"
            type="button"
            class="block w-full rounded-md px-3 py-1.5 text-left text-[13px]"
            :class="
              store.role === r
                ? 'bg-primary-tint font-medium text-primary'
                : 'text-zinc-700 hover:bg-muted'
            "
            @click="setRole(r)"
          >
            {{ roleLabel(r) }}
          </button>
        </div>
      </div>

      <button
        type="button"
        class="rounded-md border border-border bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-muted"
        @click="toggleLocale"
      >
        {{ locale === 'en_US' ? '中文' : 'EN' }}
      </button>
    </header>

    <slot />
  </div>
</template>
