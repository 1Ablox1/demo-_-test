<script setup lang="ts">
import { computed } from 'vue'
import { X, LayoutGrid, RotateCcw } from '@lucide/vue'
import { TIER_SIZE } from '@/lib/dashboardGrid'
import { BLOCK_CATALOG } from '@/lib/dashboardRoleCatalog'
import { useAuthStore } from '@/stores/auth'
import { useDashboardStore, type TileKind, type TileSize } from '@/stores/dashboard'

const dash = useDashboardStore()
const auth = useAuthStore()

const sizes: TileSize[] = ['sm', 'md', 'lg', 'wide']

const sizeLabel: Record<TileSize, string> = {
  sm: TIER_SIZE.compact.label,
  md: TIER_SIZE.medium.label,
  lg: TIER_SIZE.large.label,
  wide: TIER_SIZE.hero.label,
}

const osBlocks = computed(() =>
  dash.choosableTileConfigs.filter((t) => BLOCK_CATALOG[t.id]?.source === 'os'),
)
const legacyBlocks = computed(() =>
  dash.choosableTileConfigs.filter((t) => BLOCK_CATALOG[t.id]?.source === 'legacy_bi'),
)
</script>

<template>
  <Teleport to="body">
    <div
      v-if="dash.customizerOpen"
      class="fixed inset-0 z-[200] flex items-center justify-center bg-foreground/25 p-4 backdrop-blur-[2px]"
      @click.self="dash.customizerOpen = false"
    >
      <div
        class="max-h-[85vh] w-full max-w-[480px] overflow-hidden rounded-[14px] border border-border bg-card"
        role="dialog"
        aria-labelledby="dash-customize-title"
      >
        <header class="flex items-center justify-between border-b border-border px-5 py-4">
          <div class="flex items-center gap-2">
            <LayoutGrid :size="18" :stroke-width="1.75" class="text-primary" />
            <div>
              <h2 id="dash-customize-title" class="text-[15px] font-bold">Edit blocks</h2>
              <p class="text-[11px] text-muted-foreground">
                {{ auth.seatLabel }} palette · OS blocks + legacy BI
              </p>
            </div>
          </div>
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted"
            @click="dash.customizerOpen = false"
          >
            <X :size="16" :stroke-width="1.75" />
          </button>
        </header>

        <div class="max-h-[50vh] overflow-y-auto px-5 py-3">
          <p class="mb-3 text-[12px] text-muted-foreground">
            Only blocks allowed for <span class="font-medium text-foreground">{{ auth.seatLabel }}</span>
            appear here. Legacy BI boards come from tenant
            <span class="font-mono text-[11px]">GET /bi/dashboard/list</span>.
          </p>
          <label class="mb-4 flex cursor-pointer items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <span class="text-[13px] font-medium">Allow moving blocks</span>
            <input v-model="dash.arrangeMode" type="checkbox" class="accent-primary" />
          </label>

          <p class="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            OS command blocks
          </p>
          <ul class="mb-4 space-y-2">
            <li
              v-for="tile in osBlocks"
              :key="tile.id"
              class="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
            >
              <label class="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  class="accent-primary"
                  :checked="tile.visible"
                  @change="dash.toggleTile(tile.id as TileKind)"
                />
                <span class="min-w-0">
                  <span class="block truncate text-[13px] font-medium">{{ tile.label }}</span>
                  <span class="block truncate text-[10px] text-muted-foreground">{{
                    dash.blockHint(tile.id)
                  }}</span>
                </span>
              </label>
              <select
                :value="tile.size"
                class="h-7 rounded border border-border bg-background px-1.5 text-[11px]"
                @change="
                  dash.setTileSize(
                    tile.id as TileKind,
                    ($event.target as HTMLSelectElement).value as TileSize,
                  )
                "
              >
                <option v-for="s in sizes" :key="s" :value="s">{{ sizeLabel[s] }}</option>
              </select>
            </li>
          </ul>

          <p class="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Legacy BI (Metabase)
          </p>
          <ul class="space-y-2">
            <li
              v-for="tile in legacyBlocks"
              :key="tile.id"
              class="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
            >
              <label class="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  class="accent-primary"
                  :checked="tile.visible"
                  @change="dash.toggleTile(tile.id as TileKind)"
                />
                <span class="min-w-0">
                  <span class="block truncate text-[13px] font-medium">{{ tile.label }}</span>
                  <span class="block truncate text-[10px] text-muted-foreground">{{
                    dash.blockHint(tile.id)
                  }}</span>
                </span>
              </label>
              <select
                :value="tile.size"
                class="h-7 rounded border border-border bg-background px-1.5 text-[11px]"
                @change="
                  dash.setTileSize(
                    tile.id as TileKind,
                    ($event.target as HTMLSelectElement).value as TileSize,
                  )
                "
              >
                <option v-for="s in sizes" :key="s" :value="s">{{ sizeLabel[s] }}</option>
              </select>
            </li>
          </ul>
        </div>

        <footer class="flex items-center justify-between border-t border-border px-5 py-3">
          <button
            type="button"
            class="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground"
            @click="dash.resetToRoleDefault()"
          >
            <RotateCcw :size="14" :stroke-width="1.75" />
            Reset {{ auth.seatLabel }} layout
          </button>
          <button
            type="button"
            class="rounded-lg bg-primary px-4 py-2 text-[12px] font-bold text-white hover:opacity-95"
            @click="dash.customizerOpen = false"
          >
            Done
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>
