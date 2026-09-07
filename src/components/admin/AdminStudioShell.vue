<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  Building2,
  Globe,
  UserPlus,
  Users,
  ClipboardList,
  BookOpen,
  Bot,
  ChevronRight,
} from '@lucide/vue'
import { Badge } from '@/components/ui/badge'

/**
 * Best-practice Admin nav order (Hugh / tenant-packs design):
 * Tenant → Packs → Users → Seats → Numbering → Rulebook → Workers
 */
export type AdminNavId =
  | 'tenant'
  | 'market'
  | 'users'
  | 'seats'
  | 'numbering'
  | 'rulebook'
  | 'digital'

defineProps<{
  activeNav: AdminNavId
}>()

const emit = defineEmits<{
  nav: [id: AdminNavId]
}>()

const { t } = useI18n()

const navItems: { id: AdminNavId; icon: typeof Building2 }[] = [
  { id: 'tenant', icon: Building2 },
  { id: 'market', icon: Globe },
  { id: 'users', icon: UserPlus },
  { id: 'seats', icon: Users },
  { id: 'numbering', icon: ClipboardList },
  { id: 'rulebook', icon: BookOpen },
  { id: 'digital', icon: Bot },
]
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden bg-muted/40 font-sans">
    <header
      class="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card px-6"
    >
      <nav class="flex items-center gap-1.5 text-[13px]">
        <span class="text-muted-foreground">{{ t('adminStudio.breadcrumbRoot') }}</span>
        <ChevronRight class="h-3.5 w-3.5 text-muted-foreground" :stroke-width="2" aria-hidden="true" />
        <span class="font-semibold text-foreground">{{ t(`adminStudio.nav.${activeNav}`) }}</span>
      </nav>
      <Badge variant="pack" class="gap-1.5 rounded-full px-2.5 py-0.5 text-[10px]">
        <span class="h-1.5 w-1.5 rounded-full bg-primary" />
        {{ t('adminStudio.engineConnected') }}
      </Badge>
    </header>

    <div class="flex min-h-0 flex-1 overflow-hidden">
      <aside class="flex w-[220px] shrink-0 flex-col border-r border-border bg-card py-2">
        <p class="mb-1 px-4 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
          {{ t('adminStudio.navGroup.setup') }}
        </p>
        <button
          v-for="item in navItems.slice(0, 4)"
          :key="item.id"
          type="button"
          class="relative mx-2 my-px flex items-center gap-2.5 rounded-md px-3 py-[7px] text-left text-xs transition-colors"
          :class="
            activeNav === item.id
              ? 'bg-muted font-semibold text-foreground'
              : 'font-normal text-muted-foreground hover:bg-muted/60'
          "
          @click="emit('nav', item.id)"
        >
          <span
            v-if="activeNav === item.id"
            class="absolute -left-2 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-sm bg-primary"
          />
          <component
            :is="item.icon"
            class="h-[15px] w-[15px] shrink-0"
            :class="activeNav === item.id ? 'text-primary' : 'text-muted-foreground'"
            :stroke-width="1.75"
            aria-hidden="true"
          />
          <span class="leading-snug">{{ t(`adminStudio.nav.${item.id}`) }}</span>
        </button>

        <div class="mx-4 my-2 h-px bg-border" />

        <p class="mb-1 px-4 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
          {{ t('adminStudio.navGroup.engine') }}
        </p>
        <button
          v-for="item in navItems.slice(4)"
          :key="item.id"
          type="button"
          class="relative mx-2 my-px flex items-center gap-2.5 rounded-md px-3 py-[7px] text-left text-xs transition-colors"
          :class="
            activeNav === item.id
              ? 'bg-muted font-semibold text-foreground'
              : 'font-normal text-muted-foreground hover:bg-muted/60'
          "
          @click="emit('nav', item.id)"
        >
          <span
            v-if="activeNav === item.id"
            class="absolute -left-2 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-sm bg-primary"
          />
          <component
            :is="item.icon"
            class="h-[15px] w-[15px] shrink-0"
            :class="activeNav === item.id ? 'text-primary' : 'text-muted-foreground'"
            :stroke-width="1.75"
            aria-hidden="true"
          />
          <span class="leading-snug">{{ t(`adminStudio.nav.${item.id}`) }}</span>
        </button>
      </aside>

      <main class="min-w-0 flex-1 overflow-y-auto px-6 py-6 pb-24 sm:px-8">
        <slot />
      </main>
    </div>
  </div>
</template>
