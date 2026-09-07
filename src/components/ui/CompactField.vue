<script setup lang="ts">
import { useId } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string | number
    label: string
    hint?: string
    type?: string
    required?: boolean
    mono?: boolean
    disabled?: boolean
    fieldKey?: string
    /** Sync-locked inheritance caption, e.g. "Inherited from MAWB 160-…" */
    inheritHint?: string
  }>(),
  {
    hint: '',
    type: 'text',
    required: false,
    mono: false,
    disabled: false,
    fieldKey: undefined,
    inheritHint: '',
  },
)

const emit = defineEmits<{ 'update:modelValue': [value: string | number] }>()
const id = useId()

function onInput(e: Event) {
  const el = e.target as HTMLInputElement
  if (props.type === 'number') {
    emit('update:modelValue', el.value === '' ? '' : Number(el.value))
    return
  }
  emit('update:modelValue', el.value)
}
</script>

<template>
  <div class="os-field-wrap" :data-field-key="fieldKey" :class="{ 'os-field-wrap--inherited': !!inheritHint }">
    <label class="os-micro-label os-field-label" :for="id">
      {{ label }}
      <span v-if="required" class="text-rose-600">*</span>
    </label>
    <input
      :id="id"
      class="os-input os-field-control"
      :class="[mono ? 'os-input--mono' : '', inheritHint ? 'os-input--inherited' : '']"
      :type="type"
      :value="modelValue"
      :placeholder="hint"
      :required="required"
      :disabled="disabled || !!inheritHint"
      @input="onInput"
    />
    <p v-if="inheritHint" class="os-inherit-hint" :title="inheritHint">
      <span aria-hidden="true">🔗</span> {{ inheritHint }}
    </p>
  </div>
</template>
