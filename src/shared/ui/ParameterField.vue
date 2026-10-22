<script setup lang="ts">
import { ref, watch } from 'vue';
import { formatNumber, parseDecimal } from '@/shared/utils/decimal';
import { useI18n } from '@/app/i18n';
const props = defineProps<{
  id: string;
  label: string;
  modelValue: number;
  min: number;
  max: number;
  step?: number;
}>();
const emit = defineEmits<{ 'update:modelValue': [value: number] }>();
const { t } = useI18n();
const draft = ref(formatNumber(props.modelValue));
const error = ref('');
watch(
  () => props.modelValue,
  (value) => {
    draft.value = formatNumber(value);
    error.value = '';
  },
);
function commit() {
  const result = parseDecimal(draft.value, props.min, props.max);
  if (!result.ok) {
    error.value =
      result.reason === 'range'
        ? t('field.range', { min: formatNumber(props.min), max: formatNumber(props.max) })
        : t('field.invalid');
    return;
  }
  error.value = '';
  draft.value = formatNumber(result.value);
  emit('update:modelValue', result.value);
}
function slide(event: Event) {
  emit('update:modelValue', Number((event.target as HTMLInputElement).value));
}
</script>
<template>
  <div class="parameter-field">
    <div class="parameter-heading">
      <label :for="id">{{ label }}</label
      ><input
        :id="id"
        v-model="draft"
        type="text"
        inputmode="decimal"
        autocomplete="off"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="`${id}-help`"
        @blur="commit"
        @keydown.enter.prevent="commit"
      />
    </div>
    <input
      class="parameter-slider"
      type="range"
      :min="min"
      :max="max"
      :step="step ?? 0.05"
      :value="modelValue"
      :aria-label="t('field.slider', { label })"
      @input="slide"
    />
    <p v-if="error" :id="`${id}-help`" class="field-error" role="alert">{{ error }}</p>
    <span v-else :id="`${id}-help`" class="sr-only">{{ t('field.help') }}</span>
  </div>
</template>
