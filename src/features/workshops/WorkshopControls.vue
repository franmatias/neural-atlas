<script setup lang="ts">
import { computed, watch } from 'vue';
import {
  advancedWorkshopDefaults,
  type WorkshopEvidence,
  type WorkshopOptions,
} from '@/application/workshops/contracts';
import ParameterField from '@/shared/ui/ParameterField.vue';
import { failureCases } from '@/content/failure-cases';
const props = defineProps<{ caseId: WorkshopEvidence['caseId']; disabled: boolean }>();
const options = defineModel<WorkshopOptions>({ required: true });
const advanced = computed(() => Number(props.caseId.slice(1)) >= 6);
const failure = computed(() => failureCases.find((c) => c.id === options.value.advanced?.fault));
const safeModes = {
  'training-copy': 'Entrenamientos aislados',
  'validation-only': 'Solo validación de la propuesta inválida',
  'inference-probe': 'Sonda train de inferencia, sin cambiar la sesión',
  'shadow-example': 'Ejemplo deliberadamente incorrecto e independiente',
};
watch(
  [() => props.caseId, () => props.disabled],
  () => {
    if (advanced.value && !props.disabled && !options.value.advanced)
      options.value = { ...options.value, advanced: { ...advancedWorkshopDefaults } };
  },
  { immediate: true },
);
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
      <label v-if="caseId === 'T01' || caseId === 'T09'"
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
      <template v-if="advanced && options.advanced">
        <ParameterField
          v-if="['T06', 'T08', 'T09', 'T12'].includes(caseId)"
          id="workshop-noise"
          v-model="options.advanced.noise"
          label="Ruido del caso"
          :min="0"
          :max="0.4"
          :step="0.01"
        />
        <ParameterField
          v-if="caseId === 'T06'"
          id="workshop-l2"
          v-model="options.advanced.lambda"
          label="L2 del taller"
          :min="0"
          :max="0.1"
          :step="0.001"
        />
        <ParameterField
          v-if="caseId === 'T07' || caseId === 'T11'"
          id="workshop-threshold"
          v-model="options.advanced.threshold"
          label="Umbral alternativo del taller"
          :min="0"
          :max="1"
          :step="0.01"
        />
        <ParameterField
          v-if="caseId === 'T10'"
          id="workshop-clip"
          v-model="options.advanced.clipNorm"
          label="Clipping del taller"
          :min="0.1"
          :max="100"
          :step="0.1"
        />
        <ParameterField
          v-if="caseId === 'T10'"
          id="workshop-landscape-rate"
          v-model="options.rate"
          label="Tasa del paisaje"
          :min="0.001"
          :max="1"
          :step="0.001"
        />
        <ParameterField
          v-if="['T06', 'T08', 'T10', 'T12'].includes(caseId)"
          id="workshop-epochs"
          v-model="options.epochs"
          :label="caseId === 'T10' ? 'Pasos del paisaje' : 'Épocas del proyecto'"
          :min="5"
          :max="20"
          :step="1"
        />
        <label v-if="caseId === 'T12'"
          >Fallo plantado<select v-model="options.advanced.fault">
            <option v-for="entry in failureCases" :key="entry.id" :value="entry.id">
              {{ entry.title }}
            </option>
          </select></label
        >
      </template>
    </div>
    <div v-if="caseId === 'T12' && failure" class="training-alert">
      <p><strong>Síntoma:</strong> {{ failure.symptom }}</p>
      <p>
        Modo: {{ safeModes[failure.safeMode] }}. Intervenciones permitidas:
        {{ failure.allowedInterventions.join(' · ') }}.
      </p>
      <p>Evidencias: {{ failure.evidenceTargets.join(' · ') }}.</p>
      <p>{{ failure.hints[0] }}</p>
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
    <template v-if="['T06', 'T08', 'T09', 'T12'].includes(caseId)">
      <p v-if="caseId === 'T09'">
        Presupuesto: 120 filas sintéticas, split por grupos y pipeline. No hay entrenamiento ni
        eliminación de outliers/etiquetas. Los tamaños efectivos de partición se registran.
      </p>
      <p v-else>
        Presupuesto: 120 filas (72 train, 24 validación, 24 test), red 2→8→8→1 y hasta 20 épocas.
        {{ caseId === 'T08' ? 'Un ensayo.' : 'Hasta dos ensayos controlados.' }} Test no se evalúa.
      </p>
      <label class="training-check"
        ><input v-model="options.budgetAccepted" type="checkbox" />He revisado el presupuesto del
        taller.</label
      >
    </template>
  </fieldset>
</template>
