<script setup lang="ts">
import { useId } from 'vue'

withDefaults(
  defineProps<{
    modelValue: string
    label: string
    hint?: string
    required?: boolean
    mono?: boolean
    disabled?: boolean
    fieldKey?: string
    options: { value: string; label: string }[]
  }>(),
  {
    hint: 'Select…',
    required: false,
    mono: false,
    disabled: false,
    fieldKey: undefined,
  },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const id = useId()
</script>

<template>
  <div class="os-field-wrap" :data-field-key="fieldKey">
    <label class="os-micro-label os-field-label" :for="id">
      {{ label }}
      <span v-if="required" class="text-rose-600">*</span>
    </label>
    <select
      :id="id"
      class="os-input os-input--select os-field-control"
      :class="mono ? 'os-input--mono' : ''"
      :value="modelValue"
      :required="required"
      :disabled="disabled"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option value="">{{ hint }}</option>
      <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
    </select>
  </div>
</template>
