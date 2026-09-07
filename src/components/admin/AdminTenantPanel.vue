<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Building2, Languages, Lock, MapPin } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { HQ_COUNTRY_OPTIONS } from '@/data/marketPacks'
import { TENANT_LOCALE_OPTIONS, useTenantAdminStore } from '@/stores/tenantAdmin'

const emit = defineEmits<{
  goto: [id: 'market' | 'users' | 'seats']
}>()

const { t } = useI18n()
const tenant = useTenantAdminStore()
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 class="text-[17px] font-bold tracking-tight text-foreground">
        {{ t('adminStudio.panels.tenant.title') }}
      </h2>
      <p class="mt-1 text-xs text-muted-foreground">
        {{ t('adminStudio.panels.tenant.subtitle') }}
      </p>
    </div>

    <!-- Setup sequence — chunked, not a wall of forms -->
    <Card size="sm" class="rounded-[10px] border-border ring-border">
      <CardHeader class="px-4 pb-0 pt-0">
        <CardTitle class="text-[13px]">{{ t('adminStudio.panels.tenant.setupTitle') }}</CardTitle>
        <CardDescription class="text-[11px]">
          {{ t('adminStudio.panels.tenant.setupSub') }}
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-2 px-4">
        <ol class="space-y-1.5 text-[12px] text-muted-foreground">
          <li class="flex gap-2">
            <span class="font-mono text-[10px] font-bold text-primary">1</span>
            {{ t('adminStudio.panels.tenant.step1') }}
          </li>
          <li class="flex gap-2">
            <span class="font-mono text-[10px] font-bold text-primary">2</span>
            <button type="button" class="text-left text-primary hover:underline" @click="emit('goto', 'market')">
              {{ t('adminStudio.panels.tenant.step2') }}
            </button>
          </li>
          <li class="flex gap-2">
            <span class="font-mono text-[10px] font-bold text-primary">3</span>
            <button type="button" class="text-left text-primary hover:underline" @click="emit('goto', 'users')">
              {{ t('adminStudio.panels.tenant.step3') }}
            </button>
          </li>
          <li class="flex gap-2">
            <span class="font-mono text-[10px] font-bold text-primary">4</span>
            <button type="button" class="text-left text-primary hover:underline" @click="emit('goto', 'seats')">
              {{ t('adminStudio.panels.tenant.step4') }}
            </button>
          </li>
        </ol>
      </CardContent>
    </Card>

    <Card class="rounded-[10px] border-border ring-border">
      <CardHeader class="px-4 pb-0 pt-0">
        <div class="flex items-center gap-2">
          <Building2 :size="16" class="text-primary" :stroke-width="1.75" aria-hidden="true" />
          <CardTitle class="text-[13px]">{{ t('adminStudio.panels.tenant.contextTitle') }}</CardTitle>
        </div>
      </CardHeader>
      <CardContent class="grid gap-3 px-4 sm:grid-cols-3">
        <label class="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          {{ t('adminStudio.panels.tenant.tenantId') }}
          <input
            readonly
            class="mt-1 h-8 w-full rounded-lg border border-border bg-muted/40 px-2 font-mono text-[12px] font-medium normal-case tracking-normal text-foreground"
            :value="tenant.tenantId"
          />
        </label>
        <label class="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          {{ t('adminStudio.panels.tenant.legalName') }}
          <input
            readonly
            class="mt-1 h-8 w-full rounded-lg border border-border bg-muted/40 px-2 text-[12px] font-medium normal-case tracking-normal text-foreground"
            :value="tenant.legalName"
          />
        </label>
        <label class="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          {{ t('adminStudio.panels.tenant.env') }}
          <input
            readonly
            class="mt-1 h-8 w-full rounded-lg border border-border bg-muted/40 px-2 font-mono text-[12px] font-medium normal-case tracking-normal text-foreground"
            :value="tenant.env"
          />
        </label>
      </CardContent>
    </Card>

    <Card class="rounded-[10px] border-border ring-border">
      <CardHeader class="px-4 pb-0 pt-0">
        <CardTitle class="text-[13px]">{{ t('adminStudio.panels.tenant.hqTitle') }}</CardTitle>
        <CardDescription class="text-[11px]">
          {{ t('adminStudio.panels.tenant.hqSub') }}
        </CardDescription>
      </CardHeader>
      <CardContent class="px-4">
        <Select
          :model-value="tenant.hqCountryCode"
          @update:model-value="(v) => tenant.setHqCountry(String(v))"
        >
          <SelectTrigger class="h-8 w-full max-w-xs text-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="o in HQ_COUNTRY_OPTIONS" :key="o.code" :value="o.code">
              {{ o.label }} ({{ o.code }})
            </SelectItem>
          </SelectContent>
        </Select>
        <div class="mt-3 flex flex-wrap items-center gap-1.5">
          <span class="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {{ t('adminStudio.panels.tenant.alwaysOn') }}
          </span>
          <Badge
            v-for="p in tenant.requiredPackIds"
            :key="p"
            variant="pack"
            class="gap-1 rounded-md font-mono text-[10px]"
          >
            <Lock :size="10" aria-hidden="true" />
            {{ p }}
          </Badge>
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-1.5">
          <span class="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {{ t('adminStudio.panels.tenant.currencyPreview') }}
          </span>
          <Badge
            v-for="hint in tenant.currencyHints"
            :key="hint"
            variant="secondary"
            class="rounded-md font-mono text-[10px]"
          >
            {{ hint }}
          </Badge>
        </div>
        <p class="mt-3 text-[11px] text-muted-foreground">
          {{ t('adminStudio.panels.tenant.operatorDoctrine') }}
        </p>
      </CardContent>
    </Card>

    <Card class="rounded-[10px] border-border ring-border">
      <CardHeader class="border-b border-border px-4 py-3">
        <div class="flex items-center gap-2">
          <MapPin :size="16" class="text-primary" :stroke-width="1.75" aria-hidden="true" />
          <CardTitle class="text-[13px]">{{ t('adminStudio.panels.tenant.branchesTitle') }}</CardTitle>
        </div>
      </CardHeader>
      <CardContent class="p-0">
        <div
          class="grid grid-cols-[72px_1fr_88px_72px_96px] gap-2 border-b border-border bg-muted/60 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground"
        >
          <span>{{ t('adminStudio.panels.tenant.colCode') }}</span>
          <span>{{ t('adminStudio.panels.tenant.colOffice') }}</span>
          <span>{{ t('adminStudio.panels.tenant.colCountry') }}</span>
          <span>{{ t('adminStudio.panels.tenant.colInherit') }}</span>
          <span>{{ t('adminStudio.panels.tenant.colMode') }}</span>
        </div>
        <div
          v-for="b in tenant.branches"
          :key="b.officeCode"
          class="grid grid-cols-[72px_1fr_88px_72px_96px] items-center gap-2 border-b border-border px-3 py-2 text-[12px] last:border-0 hover:bg-muted/30"
        >
          <span class="font-mono font-semibold">{{ b.officeCode }}</span>
          <span class="truncate font-medium">{{ b.name }}</span>
          <Select
            v-if="!b.inheritCountry"
            :model-value="b.country"
            @update:model-value="(v) => tenant.setBranchCountry(b.officeCode, String(v))"
          >
            <SelectTrigger class="h-7 text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="o in HQ_COUNTRY_OPTIONS" :key="o.code" :value="o.code">
                {{ o.code }}
              </SelectItem>
            </SelectContent>
          </Select>
          <span v-else class="font-mono text-muted-foreground">{{ tenant.hqCountryCode }}</span>
          <Switch
            :checked="b.inheritCountry"
            class="scale-90"
            :aria-label="t('adminStudio.panels.tenant.inheritHq')"
            @update:checked="() => tenant.toggleBranchInherit(b.officeCode)"
          />
          <span class="text-[11px] text-muted-foreground">
            {{ b.inheritCountry ? t('adminStudio.panels.tenant.inheritHq') : t('adminStudio.panels.tenant.override') }}
          </span>
        </div>
      </CardContent>
    </Card>

    <Accordion type="single" collapsible class="rounded-[10px] border border-border bg-card">
      <AccordionItem value="locale" class="border-0">
        <AccordionTrigger class="px-4 py-3 text-[13px] font-semibold hover:no-underline">
          <span class="flex items-center gap-2">
            <Languages :size="14" class="text-primary" aria-hidden="true" />
            {{ t('adminStudio.panels.tenant.localeTitle') }}
          </span>
          <Badge variant="secondary" class="ml-2 rounded-full font-mono text-[10px]">
            {{ tenant.defaultLocale }}
          </Badge>
        </AccordionTrigger>
        <AccordionContent class="border-t border-border px-4 pb-4 pt-3">
          <p class="mb-3 text-[11px] text-muted-foreground">
            {{ t('adminStudio.panels.tenant.localeHint') }}
          </p>
          <label class="mb-3 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {{ t('adminStudio.panels.tenant.defaultLocale') }}
            <Select
              :model-value="tenant.defaultLocale"
              @update:model-value="(v) => tenant.setDefaultLocale(v as 'en_US' | 'zh_CN')"
            >
              <SelectTrigger class="mt-1 h-8 max-w-xs text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="o in TENANT_LOCALE_OPTIONS"
                  :key="o.code"
                  :value="o.code"
                >
                  {{ o.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </label>
          <div class="space-y-2">
            <span class="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {{ t('adminStudio.panels.tenant.enabledLocales') }}
            </span>
            <div
              v-for="o in TENANT_LOCALE_OPTIONS"
              :key="o.code"
              class="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2"
            >
              <span class="text-[12px] font-medium">{{ o.label }}</span>
              <Switch
                :checked="tenant.isLocaleEnabled(o.code)"
                :disabled="o.code === tenant.defaultLocale"
                class="scale-90"
                @update:checked="() => tenant.toggleEnabledLocale(o.code)"
              />
            </div>
          </div>
          <p class="mt-3 text-[11px] text-muted-foreground">
            {{ t('adminStudio.panels.tenant.localePersonalHint') }}
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>

    <!-- Field standards chunked -->
    <Accordion type="single" collapsible class="rounded-[10px] border border-border bg-card">
      <AccordionItem value="fields" class="border-0">
        <AccordionTrigger class="px-4 py-3 text-[13px] font-semibold hover:no-underline">
          {{ t('adminStudio.panels.tenant.fieldsTitle') }}
          <Badge variant="secondary" class="ml-2 rounded-full font-mono text-[10px]">
            {{ tenant.hqCountryCode }} · {{ tenant.hqCountryCode === 'AU' ? 'AUD' : 'USD' }}
          </Badge>
        </AccordionTrigger>
        <AccordionContent class="border-t border-border px-4 pb-4">
          <p class="mb-3 text-[11px] text-muted-foreground">
            {{ t('adminStudio.panels.tenant.fieldsHint') }}
          </p>
          <div v-if="tenant.hqCountryCode === 'AU'" class="grid gap-3 sm:grid-cols-2">
            <label class="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              ABN
              <input
                class="mt-1 h-8 w-full rounded-lg border border-border bg-card px-2 text-[12px] font-medium normal-case tracking-normal"
                placeholder="XX XXX XXX XXX"
              />
            </label>
            <label class="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              GST registered
              <input
                class="mt-1 h-8 w-full rounded-lg border border-border bg-card px-2 text-[12px] font-medium normal-case tracking-normal"
                value="Yes"
              />
            </label>
            <label class="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              ICS client ID
              <input
                class="mt-1 h-8 w-full rounded-lg border border-border bg-card px-2 font-mono text-[12px] font-medium normal-case tracking-normal"
                placeholder="—"
              />
            </label>
            <label class="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              BSB
              <input
                class="mt-1 h-8 w-full rounded-lg border border-border bg-card px-2 font-mono text-[12px] font-medium normal-case tracking-normal"
                placeholder="XXX-XXX"
              />
            </label>
          </div>
          <div v-else class="grid gap-3 sm:grid-cols-2">
            <label class="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              EIN
              <input
                class="mt-1 h-8 w-full rounded-lg border border-border bg-card px-2 text-[12px] font-medium normal-case tracking-normal"
                placeholder="XX-XXXXXXX"
              />
            </label>
            <label class="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              AES filer
              <input
                class="mt-1 h-8 w-full rounded-lg border border-border bg-card px-2 text-[12px] font-medium normal-case tracking-normal"
                placeholder="—"
              />
            </label>
          </div>
          <Button size="sm" class="mt-3">{{ t('adminStudio.panels.tenant.saveFields') }}</Button>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </div>
</template>
