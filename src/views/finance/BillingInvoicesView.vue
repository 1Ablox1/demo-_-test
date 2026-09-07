<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'

const router = useRouter()
</script>

<template>
  <div class="flex flex-1 flex-col items-start gap-4 p-6">
    <h1 class="text-lg font-semibold tracking-tight">Invoices</h1>
    <p class="max-w-xl text-sm text-muted-foreground">
      Portfolio invoices stub. Issue invoice on the job file for Module 1.
    </p>
    <Button type="button" @click="router.push({ name: 'job-invoice', params: { shipmentId: '4096' } })">
      Open job 4096 invoice
    </Button>
  </div>
</template>
