<script setup lang="ts">
import type { Cell, FeatureSpec } from '@/domain/data/types';
defineProps<{ features: FeatureSpec[]; label: string; disabled: boolean }>();
const values = defineModel<Record<string, Cell>>({ required: true });
function edit(f: FeatureSpec, event: Event) {
  const text = (event.target as HTMLInputElement).value;
  values.value = {
    ...values.value,
    [f.id]: text === '' ? null : f.kind === 'numeric' ? Number(text) : text,
  };
}
</script>
<template>
  <fieldset :disabled="disabled">
    <legend>{{ label }}</legend>
    <p>
      Vacío: usa la imputación aprendida con train. Las demás entradas mantienen los valores
      indicados.
    </p>
    <label v-for="f in features" :key="f.id"
      >{{ label }} · {{ f.name
      }}<input
        :type="f.kind === 'numeric' ? 'number' : 'text'"
        :step="f.kind === 'numeric' ? 'any' : undefined"
        :value="values[f.id] ?? ''"
        @input="edit(f, $event)"
    /></label>
  </fieldset>
</template>
