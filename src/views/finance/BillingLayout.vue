<script setup lang="ts">
import AppShell from '@/components/AppShell.vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'

const route = useRoute()

const tabs = [
  { name: 'billing-ledger', label: 'Ledger', to: '/billing' },
  { name: 'billing-invoices', label: 'Invoices', to: '/billing/invoices' },
  { name: 'billing-payables', label: 'Payables', to: '/billing/payables' },
] as const
</script>

<template>
  <AppShell>
    <div class="flex min-h-0 flex-1 flex-col bg-background">
      <div class="flex items-center gap-1 border-b border-border px-5 pt-3">
        <RouterLink
          v-for="tab in tabs"
          :key="tab.name"
          :to="tab.to"
          class="rounded-t-md px-3 py-2 text-[13px] font-medium"
          :class="
            route.name === tab.name
              ? 'bg-card text-foreground border border-b-0 border-border'
              : 'text-muted-foreground hover:text-foreground'
          "
        >
          {{ tab.label }}
        </RouterLink>
        <p class="ml-auto pb-2 text-[11px] text-muted-foreground">
          Shell parity · Module 1 money stays on job Charges / Invoice
        </p>
      </div>
      <RouterView />
    </div>
  </AppShell>
</template>
