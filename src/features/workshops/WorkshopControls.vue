<script setup lang="ts">
import type { WorkshopEvidence, WorkshopOptions } from '@/application/workshops/contracts';
defineProps<{ caseId: WorkshopEvidence['caseId']; disabled: boolean }>();
const options = defineModel<WorkshopOptions>({ required: true });
</script>
<template>
  <fieldset class="training-controls" :disabled="disabled">
    <legend>Configuración del caso</legend>
    <div class="training-fields">
      <label v-if="caseId !== 'T04'"
        >Semilla del taller<input
          v-model.number="options.seed"
          type="number"
          min="0"
          max="4294967295"
          step="1"
      /></label>
      <label v-if="caseId === 'T01'"
        >Escalado del taller<select v-model="options.scaling">
          <option value="standard">Estandarización</option>
          <option value="minmax">Min-Max</option>
        </select></label
      >
      <label v-if="caseId === 'T02'"
        >Nuevo sesgo<input v-model.number="options.bias" type="number" min="-2" max="2" step="0.1"
      /></label>
      <label v-if="caseId === 'T04'"
        >Tasa para una actualización<input
          v-model.number="options.rate"
          type="number"
          min="0.001"
          max="1"
          step="0.001"
      /></label>
      <template v-if="caseId === 'T05'">
        <label v-for="(_, index) in options.rates" :key="`rate-${index}`"
          >Tasa {{ index + 1
          }}<input
            v-model.number="options.rates[index]"
            type="number"
            min="0.001"
            max="1"
            step="0.001"
        /></label>
        <label v-for="(_, index) in options.batches" :key="`batch-${index}`"
          >Tamaño de lote {{ index + 1
          }}<input v-model.number="options.batches[index]" type="number" min="1" max="64" step="1"
        /></label>
        <label
          >Épocas por ensayo<input
            v-model.number="options.epochs"
            type="number"
            min="5"
            max="20"
            step="1"
        /></label>
      </template>
    </div>
    <template v-if="caseId === 'T05'">
      <p>
        Presupuesto: seis ensayos SGD con 160 filas sintéticas (112 train, 24 validación, 24 test),
        red 2→4→1 y hasta 20 épocas. Test no se evalúa. Cada ensayo comienza con la misma
        inicialización; las comparaciones se hacen con validación.
      </p>
      <label class="training-check"
        ><input v-model="options.budgetAccepted" type="checkbox" />He revisado el presupuesto de
        seis ensayos.</label
      >
    </template>
  </fieldset>
</template>
