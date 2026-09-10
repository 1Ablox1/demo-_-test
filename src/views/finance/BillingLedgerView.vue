<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { operateChargesLocation } from '@/lib/jobMoneyNav'

const router = useRouter()
</script>

<template>
  <div class="flex flex-1 flex-col items-start gap-4 p-6">
    <h1 class="text-lg font-semibold tracking-tight">Billing ledger</h1>
    <p class="max-w-xl text-sm text-muted-foreground">
      Cross-job portfolio is a shell stub. Accrue / Approve / Issue run on Edit Job · Charges &amp;
      Invoice spine (e.g. golden job 4096).
    </p>
    <Button type="button" @click="router.push(operateChargesLocation('4096'))">
      Open job 4096 Charges &amp; Invoice
    </Button>
  </div>
</template>
