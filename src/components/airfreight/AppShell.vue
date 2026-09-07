<script setup lang="ts">
/**
 * Re-export shell IA AppShell so Module 1 views keep the same import path.
 */
import AppShell from '@/components/AppShell.vue'
</script>

<template>
  <AppShell>
    <slot />
  </AppShell>
</template>
