<script setup lang="ts">
import { useId } from 'vue'

withDefaults(
  defineProps<{
    modelValue: string
    label: string
    hint?: string
    rows?: number
    required?: boolean
    disabled?: boolean
    fieldKey?: string
  }>(),
  {
    hint: '',
    rows: 3,
    required: false,
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
    <textarea
      :id="id"
      class="os-input os-input--area os-field-control"
      :rows="rows"
      :value="modelValue"
      :placeholder="hint"
      :required="required"
      :disabled="disabled"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
  </div>
</template>
