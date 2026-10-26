<script setup lang="ts">
import { computed } from 'vue';
import type { FeatureSpec } from '@/domain/data/types';
import type { DerivedFeature } from '@/domain/data/derived';
const props = defineProps<{ features: FeatureSpec[]; label: string }>();
const definitions = defineModel<DerivedFeature[]>();
const numeric = computed(() => props.features.filter((f) => f.kind === 'numeric'));
function add() {
  if (!numeric.value.length || (definitions.value?.length ?? 0) >= 8) return;
  let n = 1;
  while (definitions.value?.some((d) => d.id === `d${n}`)) n++;
  definitions.value = [
    ...(definitions.value ?? []),
    { id: `d${n}`, operation: 'square', sources: [numeric.value[0]!.id] },
  ];
}
function change(index: number, field: 'operation' | 'first' | 'second', event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  definitions.value = definitions.value!.map((d, i) => {
    if (i !== index) return d;
    const operation = field === 'operation' ? (value as DerivedFeature['operation']) : d.operation;
    const sources = [...d.sources];
    if (field === 'first') sources[0] = value;
    if (field === 'second') sources[1] = value;
    return {
      ...d,
      operation,
      sources:
        operation === 'product' ? [sources[0]!, sources[1] ?? numeric.value[0]!.id] : [sources[0]!],
    };
  });
}
function remove(index: number) {
  const next = definitions.value!.filter((_, i) => i !== index);
  definitions.value = next.length ? next : undefined;
}
</script>
<template>
  <fieldset class="derived-editor">
    <legend>Características derivadas {{ label }}</legend>
    <p class="small muted">
      Cuadrado, producto o log1p sobre numéricas seleccionadas, después de imputar y antes de
      escalar. Sin expresiones libres ni target. log1p exige x &gt; −1 en todas las filas que se
      transformen. Máximo 8 derivadas y 32 entradas totales.
    </p>
    <div v-for="(d, i) in definitions" :key="d.id" class="derived-row">
      <strong>{{ d.id }}</strong
      ><label
        >Operación {{ label }} {{ d.id
        }}<select :value="d.operation" @change="change(i, 'operation', $event)">
          <option value="square">Cuadrado</option>
          <option value="product">Producto</option>
          <option value="log1p">log1p</option>
        </select></label
      >
      <label
        >Origen {{ label }} {{ d.id
        }}<select :value="d.sources[0]" @change="change(i, 'first', $event)">
          <option v-for="f in numeric" :key="f.id" :value="f.id">{{ f.name }}</option>
        </select></label
      >
      <label v-if="d.operation === 'product'"
        >Segundo origen {{ label }} {{ d.id
        }}<select :value="d.sources[1]" @change="change(i, 'second', $event)">
          <option v-for="f in numeric" :key="f.id" :value="f.id">{{ f.name }}</option>
        </select></label
      >
      <button class="button secondary" type="button" @click="remove(i)">
        Eliminar {{ label }} {{ d.id }}
      </button>
    </div>
    <button
      class="button secondary"
      type="button"
      :disabled="!numeric.length || (definitions?.length ?? 0) >= 8"
      @click="add"
    >
      Añadir derivada {{ label }}
    </button>
  </fieldset>
</template>
<style scoped>
.derived-editor {
  min-width: 0;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 14px;
  margin: 14px 0;
}
.derived-row {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 10px;
  margin-bottom: 12px;
}
.derived-row label {
  display: grid;
  gap: 5px;
  min-width: 0;
  flex: 1 1 140px;
}
select {
  min-width: 0;
  width: 100%;
  min-height: 44px;
  background: var(--surface);
  color: var(--ink);
  padding: 6px;
  border: 1px solid var(--line);
  border-radius: 7px;
}
button {
  white-space: normal;
}
</style>
