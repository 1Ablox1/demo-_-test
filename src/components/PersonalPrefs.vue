<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'

defineEmits<{ close: [] }>()
const auth = useAuthStore()
const tenant = useTenantStore()
</script>

<template>
  <div class="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 p-4" @click.self="$emit('close')">
    <div class="w-full max-w-md rounded-[10px] border border-border bg-white shadow-xl">
      <div class="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 class="text-sm font-semibold">Personal preferences</h2>
          <p class="mt-0.5 text-[12px] text-muted-foreground">
            Operator settings only — not rulebook, packs, or numbering.
          </p>
        </div>
        <button type="button" class="text-muted-foreground hover:text-foreground" @click="$emit('close')">
          ✕
        </button>
      </div>
      <div class="space-y-4 px-5 py-4">
        <label class="block text-[12px] font-medium">
          Language
          <select v-model="auth.language" class="mt-1 h-9 w-full rounded-md border border-border px-2 text-[13px]">
            <option value="en">English</option>
            <option value="zh">中文</option>
          </select>
        </label>
        <label class="block text-[12px] font-medium">
          Default branch
          <select
            :value="tenant.activeBranchId"
            class="mt-1 h-9 w-full rounded-md border border-border px-2 text-[13px]"
            @change="tenant.setActiveBranch(($event.target as HTMLSelectElement).value)"
          >
            <option v-for="o in tenant.officeOptions" :key="o.branchId" :value="o.branchId">
              {{ o.label }}
            </option>
          </select>
        </label>
      </div>
      <div class="flex justify-end gap-2 border-t border-border px-5 py-3">
        <button
          type="button"
          class="rounded-md border border-border px-3 py-1.5 text-[13px] hover:bg-muted"
          @click="$emit('close')"
        >
          Close
        </button>
        <button
          type="button"
          class="rounded-md bg-primary px-3 py-1.5 text-[13px] font-medium text-white"
          @click="$emit('close')"
        >
          Save
        </button>
      </div>
    </div>
  </div>
</template>
