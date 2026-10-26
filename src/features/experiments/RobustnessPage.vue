<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { useRobustnessStore } from '@/stores/robustness';
import ExperimentConfiguration from './ExperimentConfiguration.vue';
import StudyInspector from './StudyInspector.vue';
import DecisionMap from '@/features/decision/DecisionMap.vue';
import { decisionAt, decisionSurface } from '@/domain/network/decision-surface';
import { formatData } from '@/shared/utils/data-format';
const study = useRobustnessStore(),
  preset = ref<'moons' | 'flowers' | 'sine' | 'xor'>('moons'),
  probe = ref(0),
  probeX = ref(0),
  probeY = ref(0),
  downloadError = ref('');
watch(
  () => study.dispersionResult,
  () => {
    probe.value = 0;
  },
);
watch(
  () => study.shiftResult,
  () => {
    probeX.value = 0;
    probeY.value = 0;
  },
);
const selectedProbe = computed(
  () => study.dispersionResult?.probes[probe.value] ?? study.dispersionResult?.probes[0],
);
const surface = computed(() => {
  const r = study.shiftResult;
  if (!r) return undefined;
  const extent =
    Math.max(
      1.2,
      ...r.pairs.flatMap((p) => [
        Math.abs(Number(p.original.features.x1)),
        Math.abs(Number(p.changed.features.x1)),
        Math.abs(Number(p.changed.features.x2)),
      ]),
    ) * 1.05;
  return decisionSurface(
    r.run.experiment.checkpoint.model,
    r.pipeline,
    30,
    Math.ceil(extent * 10) / 10,
  );
});
const origin = computed(() => {
  const r = study.shiftResult;
  return r
    ? decisionAt(r.run.experiment.checkpoint.model, r.pipeline, probeX.value, probeY.value)
    : undefined;
});
function download() {
  downloadError.value = '';
  try {
    const url = globalThis.URL.createObjectURL(
      new globalThis.Blob([study.report()], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'neural-atlas-robustness.report.json';
    a.click();
    setTimeout(() => globalThis.URL.revokeObjectURL(url), 1000);
  } catch {
    downloadError.value = 'No se pudo exportar; los resultados se conservan.';
  }
}
onBeforeRouteLeave(() => {
  if (study.busy) study.cancel();
});
</script>
<template>
  <div class="page training-page robustness-page">
    <p class="eyebrow">L12 / ROBUSTEZ Y CAMBIOS DE DISTRIBUCIÓN</p>
    <h1>¿Se mantiene tu predicción?</h1>
    <p class="page-intro">
      Separa variabilidad por entrenamiento y cambios en los datos. Los resultados son mediciones de
      modelos reales; el test final permanece reservado.
    </p>
    <p>
      <RouterLink to="/lab/experimentos">Volver a comparación A/B y validación cruzada</RouterLink>
    </p>
    <section class="training-panel">
      <h2>Diseña el contraste</h2>
      <fieldset :disabled="study.busy">
        <legend>Controles del estudio</legend>
        <div class="training-fields">
          <label
            >Estudio de robustez<select v-model="study.mode">
              <option value="dispersion">Dispersión entre semillas</option>
              <option value="shift">Cambio de distribución</option>
            </select></label
          >
        </div>
        <template v-if="study.mode === 'dispersion'"
          ><div class="training-fields">
            <label
              >Ejemplo de robustez<select v-model="preset">
                <option value="moons">Dos lunas</option>
                <option value="xor">XOR</option>
                <option value="flowers">Flores multiclase</option>
                <option value="sine">Seno · regresión</option>
              </select></label
            ><label
              >Número de semillas<select v-model.number="study.count">
                <option :value="3">3</option>
                <option :value="5">5</option>
                <option :value="10">10</option>
              </select></label
            ><label
              >Primera semilla<input
                v-model.number="study.firstSeed"
                type="number"
                min="0"
                max="4294967295"
                step="1" /></label
            ><label
              >Épocas por semilla<input
                v-model.number="study.config.epochs"
                type="number"
                min="1"
                max="120"
                step="1"
            /></label>
          </div>
          <div class="robust-actions">
            <button class="button secondary" @click="study.preset(preset)">
              Cargar ejemplo de robustez</button
            ><button class="button secondary" @click="study.copyWorkspace">
              Copiar datos del laboratorio
            </button>
          </div>
          <p v-if="study.source" class="small">
            {{ study.source.dataset.rows.length }} filas · {{ study.source.dataset.task }} · train
            {{ study.source.split.train.length }}, val {{ study.source.split.validation.length }},
            test {{ study.source.split.test.length }} · consulta previa de test
            {{ study.previousTest ? 'sí' : 'no' }}. Las semillas consecutivas se envuelven en
            uint32; no cambia el split, el pipeline ni los datos.
          </p>
          <ExperimentConfiguration
            v-if="study.source"
            v-model:config="study.config"
            v-model:pipeline="study.pipeline"
            :features="study.source.dataset.features"
            label="Robustez"
            :seed-disabled="true"
          />
          <p class="small muted">
            La primera semilla de arriba sustituye la semilla del configurador para cada ensayo. La
            parada temprana, si está copiada, puede seleccionar épocas diferentes: el informe las
            declara.
          </p></template
        >
        <template v-else
          ><div class="training-fields">
            <label
              >Escenario de deriva<select v-model="study.shift.kind">
                <option value="covariate">Covariate shift · cambia P(x)</option>
                <option value="concept">Concept drift · cambia P(y|x)</option>
                <option value="serving">Train-serving skew · entrada servida incorrecta</option>
              </select></label
            ><label
              >Intensidad de deriva<input
                v-model.number="study.shift.severity"
                type="range"
                min="0"
                max="1"
                step="0.1"
              />{{ study.shift.severity.toFixed(1) }}</label
            ><label
              >Semilla de deriva<input
                v-model.number="study.shift.seed"
                type="number"
                min="0"
                max="4294967295" /></label
            ><label
              >Épocas antes de la deriva<input
                v-model.number="study.shift.epochs"
                type="number"
                min="5"
                max="120" /></label
            ><label
              >Tasa antes de la deriva<input
                v-model.number="study.shift.rate"
                type="number"
                min="0.001"
                max="0.1"
                step="0.001"
            /></label>
          </div>
          <p>
            Dataset sintético controlado de 240 filas, x uniforme en [−1,1]² y regla inicial
            P(y=1|x)=sigmoide(6x₁), con etiquetas Bernoulli reproducibles. Red 2→8→8→1, Tanh, Adam,
            lote 12 y Z-score aprendido en train. La deriva afecta solo a las filas de validación:
            el modelo y su pipeline quedan congelados.
          </p></template
        >
        <label class="study-text"
          >Hipótesis de robustez<textarea
            v-model="study.hypothesis"
            maxlength="2000"
            rows="3"
          /></label
        ><button class="button primary" @click="study.run">Ejecutar estudio de robustez</button>
      </fieldset>
      <button v-if="study.busy" class="button secondary" @click="study.cancel">
        Cancelar estudio de robustez
      </button>
      <p v-if="study.notice" role="status">{{ study.notice }}</p>
      <p v-if="study.error" role="alert" class="field-error">{{ study.error }}</p>
    </section>
    <section v-if="study.mode === 'dispersion' && study.dispersionResult" class="training-panel">
      <h2>Una misma fila, distintas semillas</h2>
      <p>
        Resultado registrado: {{ study.dispersionResult.options.count }} semillas; hipótesis:
        {{ study.dispersionResult.options.hypothesis || 'no escrita' }}. Se estudian todas las
        {{ study.dispersionResult.probes.length }} filas de validación, sin evaluar test.
      </p>
      <label
        >Sonda de dispersión<select v-model.number="probe">
          <option v-for="(p, i) in study.dispersionResult.probes" :key="p.id" :value="i">
            {{ p.id }} · objetivo {{ p.target }}
          </option>
        </select></label
      >
      <template v-if="selectedProbe"
        ><p>
          Datos originales: {{ JSON.stringify(selectedProbe.features) }} · objetivo:
          {{ selectedProbe.target }}
        </p>
        <div
          class="data-table-scroll"
          tabindex="0"
          role="region"
          aria-label="Dispersión por salida"
        >
          <table class="dataset-table" aria-label="Dispersión de predicciones">
            <thead>
              <tr>
                <th>Salida</th>
                <th>Media</th>
                <th>Desviación muestral</th>
                <th>Mínimo</th>
                <th>Máximo</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(o, i) in selectedProbe.outputs" :key="i">
                <th>
                  {{
                    study.dispersionResult.task === 'regression'
                      ? 'Predicción numérica'
                      : 'P(clase ' + study.dispersionResult.classOrder[i] + ')'
                  }}
                </th>
                <td>{{ formatData(o.mean) }}</td>
                <td>{{ formatData(o.sampleDeviation) }}</td>
                <td>{{ formatData(o.minimum) }}</td>
                <td>{{ formatData(o.maximum) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <svg
          :viewBox="`0 0 700 ${Math.max(100, (selectedProbe?.outputs.length ?? 1) * 36 + 20)}`"
          role="img"
          aria-label="Predicciones por semilla, sobre un eje común"
        >
          <g v-for="(o, i) in selectedProbe.outputs" :key="i">
            <text x="5" :y="30 + i * 36">{{ i }}</text>
            <line x1="75" :y1="25 + i * 36" x2="650" :y2="25 + i * 36" class="dispersion-axis" />
            <circle
              v-for="(prediction, j) in selectedProbe.predictions"
              :key="j"
              :cx="
                75 +
                (575 * (prediction[i]! - Math.min(0, o.minimum))) /
                  (Math.max(1, o.maximum) - Math.min(0, o.minimum))
              "
              :cy="25 + i * 36"
              r="4"
              :class="j % 2 ? 'seed-dot-alt' : 'seed-dot'"
            >
              <title>
                Semilla {{ study.dispersionResult.runs[j]!.experiment.config.seed }} ·
                {{ formatData(prediction[i]!) }}
              </title>
            </circle>
            <text x="75" :y="43 + i * 36">{{ formatData(Math.min(0, o.minimum)) }}</text>
            <text x="620" :y="43 + i * 36">{{ formatData(Math.max(1, o.maximum)) }}</text>
          </g>
        </svg>
        <p class="small muted">
          Cada punto es una semilla; las coincidencias pueden superponerse. La tabla y el informe
          conservan todos los valores. Es dispersión descriptiva del entrenamiento con datos fijos,
          no incertidumbre total, intervalo de confianza ni calibración.
        </p></template
      >
      <label
        >Semilla para inspeccionar<select v-model.number="study.selectedSeed">
          <option v-for="(r, i) in study.dispersionResult.runs" :key="i" :value="i">
            {{ r.label }}
          </option>
        </select></label
      >
      <p class="small">
        Coste estimado por ensayo:
        {{ study.dispersionResult.budget.upper.toLocaleString('es-ES') }} operaciones. Consulta
        previa de test: {{ study.dispersionResult.options.testPreviouslyConsulted ? 'sí' : 'no' }}.
      </p>
    </section>
    <section v-if="study.mode === 'shift' && study.shiftResult" class="training-panel">
      <h2>El mismo modelo ante datos distintos</h2>
      <p>
        Escenario registrado: {{ study.shiftResult.options.kind }} · intensidad
        {{ study.shiftResult.options.severity }} · hipótesis
        {{ study.shiftResult.options.hypothesis || 'no escrita' }}. El pipeline no se reajusta y la
        red es la misma en ambos mapas.
      </p>
      <div class="data-table-scroll" tabindex="0" role="region" aria-label="Medidas de deriva">
        <table class="dataset-table" aria-label="Resultados de deriva">
          <thead>
            <tr>
              <th>Validación</th>
              <th>BCE</th>
              <th>Exactitud</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>Antes</th>
              <td>{{ formatData(study.shiftResult.baseline.loss) }}</td>
              <td>{{ (study.shiftResult.baseline.score * 100).toFixed(1) }} %</td>
            </tr>
            <tr>
              <th>Después</th>
              <td>{{ formatData(study.shiftResult.changed.loss) }}</td>
              <td>{{ (study.shiftResult.changed.score * 100).toFixed(1) }} %</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Δ pérdida: {{ formatData(study.shiftResult.delta.loss) }} · Δ exactitud:
        {{ (study.shiftResult.delta.accuracy * 100).toFixed(1) }} puntos porcentuales. Una deriva no
        siempre empeora estas métricas; depende del caso y del modelo.
      </p>
      <div v-if="surface && origin" class="shift-maps">
        <section>
          <h3>Antes de la deriva</h3>
          <DecisionMap
            :surface="surface"
            :dataset="study.shiftResult.dataset"
            :split="study.shiftResult.split"
            :probe="origin"
            :boundary="true"
            subset="validation"
            :adding="false"
            @select="
              (x, y) => {
                probeX = x;
                probeY = y;
              }
            "
          />
        </section>
        <section>
          <h3>Después de la deriva</h3>
          <DecisionMap
            :surface="surface"
            :dataset="study.shiftResult.shifted"
            :split="study.shiftResult.split"
            :probe="origin"
            :boundary="true"
            subset="validation"
            :adding="false"
          />
        </section>
      </div>
      <p v-if="study.shiftResult.options.kind === 'covariate'">
        Se transforma el muestreo: x₁=2u^(1/(1+3s))−1. Cambia P(x), conservando la regla P(y|x). Las
        etiquetas se generan con la misma regla y pueden cambiar al cambiar x. No se fuerza
        artificialmente una proporción por clase.
      </p>
      <p v-else-if="study.shiftResult.options.kind === 'concept'">
        Las coordenadas se mantienen y la regla gira: sigmoide(6(cos(πs)x₁+sin(πs)x₂)). Cambian las
        etiquetas condicionadas a x. La región aprendida permanece fija: observa los puntos que ya
        no coincide con ella.
      </p>
      <p v-else>
        Las etiquetas conservan su significado físico, pero se sirve x₁=(1+4s)x₁ físico+0,5s. Esto
        reproduce una transformación incompatible entre entrenamiento e inferencia; no es una mejora
        del pipeline.
      </p>
      <p class="small muted">
        Simulación conocida, no detector automático de deriva. Con intensidad cero, ambas
        evaluaciones coinciden exactamente. El informe conserva los pares, las probabilidades
        condicionales de generación y la procedencia.
      </p>
    </section>
    <StudyInspector v-if="study.selected" :experiment="study.selected" :disabled="study.busy" />
    <section v-if="study.selected" class="training-panel">
      <h2>Contrasta y conserva</h2>
      <label
        >Reflexión de robustez<textarea
          v-model="study.reflection"
          maxlength="4000"
          rows="3"
        /></label
      ><button class="button secondary" :disabled="study.busy" @click="download">
        Exportar informe de robustez
      </button>
      <p v-if="downloadError" role="alert">{{ downloadError }}</p>
      <p class="small muted">
        El informe registra los controles de la ejecución, no los cambios posteriores. Exporta cada
        experimento por separado si quieres reanudar sus pesos y optimizador.
      </p>
    </section>
  </div>
</template>
<style scoped>
.robustness-page {
  overflow-wrap: anywhere;
}
.robustness-page fieldset {
  min-width: 0;
  border: 0;
  padding: 0;
}
.robustness-page select,
.robustness-page textarea {
  min-width: 0;
  width: 100%;
  min-height: 44px;
  background: var(--surface);
  color: var(--ink);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 8px;
}
.robustness-page button {
  white-space: normal;
}
.study-text {
  display: grid;
  gap: 8px;
  margin: 16px 0;
}
.robust-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.shift-maps {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  margin: 20px 0;
}
.shift-maps section {
  min-width: 0;
}
svg {
  width: 100%;
  max-height: 300px;
}
svg text {
  fill: var(--ink);
  font-size: 12px;
}
.dispersion-axis {
  stroke: var(--muted);
}
.seed-dot {
  fill: var(--accent);
}
.seed-dot-alt {
  fill: var(--orange);
}
@media (max-width: 850px) {
  .shift-maps {
    grid-template-columns: 1fr;
  }
}
</style>
