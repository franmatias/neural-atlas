<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { onBeforeRouteLeave } from 'vue-router';
import { useFunctionsStore } from '@/stores/functions';
import { usePreferencesStore } from '@/stores/preferences';
import { functionWidths } from '@/application/training/function-approximation';
import { functionContributions } from '@/domain/network/function-approximation';
import { formatData } from '@/shared/utils/data-format';
import ParameterField from '@/shared/ui/ParameterField.vue';
import LossChart from '@/features/training/LossChart.vue';
import StudyInspector from '@/features/experiments/StudyInspector.vue';
import FunctionPlot from './FunctionPlot.vue';
import { useSnapshotPlayback } from './useSnapshotPlayback';
const study = useFunctionsStore(),
  prefs = usePreferencesStore(),
  all = ref(true),
  downloadError = ref('');
const { snapshotIndex } = storeToRefs(study);
const count = computed(() => study.selected?.snapshots.length ?? 0);
const playback = useSnapshotPlayback(snapshotIndex, count);
watch([() => study.result, () => study.runIndex, () => study.busy], playback.stop);
const parts = computed(() =>
  study.snapshot ? functionContributions(study.snapshot.checkpoint.model, study.probe) : undefined,
);
const names = { sine: 'sin(πx)', absolute: '|x|', step: 'Escalón 1[x ≥ 0]' };
function move(delta: number) {
  playback.stop();
  study.snapshotIndex = Math.max(0, Math.min(count.value - 1, study.snapshotIndex + delta));
}
function speed(event: Event) {
  prefs.update({ speed: Number((event.target as HTMLInputElement).value) });
}
function download() {
  downloadError.value = '';
  try {
    const url = globalThis.URL.createObjectURL(
      new globalThis.Blob([study.report()], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'neural-atlas-function-approximation.report.json';
    a.click();
    setTimeout(() => globalThis.URL.revokeObjectURL(url), 1000);
  } catch {
    downloadError.value = 'No se pudo exportar el informe. El estudio sigue disponible.';
  }
}
onBeforeRouteLeave(() => {
  playback.stop();
  if (study.busy) study.cancel();
});
</script>
<template>
  <div class="page training-page functions-page">
    <p class="eyebrow">L10 / CONSTRUIR UNA FUNCIÓN · D8.2</p>
    <h1>Una curva, muchas contribuciones.</h1>
    <p class="page-intro">
      Observa cómo cada neurona aporta una pieza a la salida. Entrena una red real, recorre sus
      instantáneas y comprueba qué puede aproximar y qué límites conserva.
    </p>
    <RouterLink class="text-link" to="/lab/regresion">Regresión y residuos →</RouterLink>
    <section class="training-panel">
      <h2>Tu hipótesis y tu experimento</h2>
      <fieldset :disabled="study.busy" class="function-options">
        <legend>Configurar un estudio independiente</legend>
        <label
          >Función objetivo
          <select v-model="study.options.kind" aria-label="Función objetivo">
            <option value="sine">Seno · sin(πx)</option>
            <option value="absolute">Valor absoluto · |x|</option>
            <option value="step">Escalón · 1[x ≥ 0]</option>
          </select></label
        >
        <label
          >Neuronas ocultas
          <select
            v-model.number="study.options.width"
            aria-label="Neuronas ocultas"
            :disabled="study.options.compare"
          >
            <option v-for="width in functionWidths" :key="width" :value="width">{{ width }}</option>
          </select></label
        >
        <label
          >Activación oculta
          <select v-model="study.options.activation" aria-label="Activación de aproximación">
            <option value="tanh">Tanh</option>
            <option value="relu">ReLU</option>
            <option value="sigmoid">Sigmoide</option>
            <option value="linear">Lineal · control sin no linealidad</option>
          </select></label
        >
        <label
          >Épocas por red
          <input
            v-model.number="study.options.epochs"
            type="number"
            min="5"
            max="120"
            step="1"
            aria-label="Épocas de aproximación"
        /></label>
        <label
          >Semilla
          <input
            v-model.number="study.options.seed"
            type="number"
            min="0"
            max="4294967295"
            step="1"
            aria-label="Semilla de aproximación"
        /></label>
        <label class="training-check"
          ><input v-model="study.options.compare" type="checkbox" />Comparar 1, 2, 8 y 32
          neuronas</label
        >
        <ParameterField
          id="function-noise"
          v-model="study.options.noise"
          label="Ruido σ en el objetivo"
          :min="0"
          :max="0.3"
          :step="0.01"
        />
        <ParameterField
          id="function-rate"
          v-model="study.options.rate"
          label="Tasa de aprendizaje de aproximación"
          :min="0.001"
          :max="0.1"
          :step="0.001"
        />
        <label class="hypothesis"
          >Antes de entrenar
          <textarea
            v-model="study.options.hypothesis"
            maxlength="2000"
            rows="3"
            aria-label="Hipótesis de aproximación"
            placeholder="¿Qué cambiará al aumentar la anchura? ¿Se podrá eliminar el error de un salto?"
          />
        </label>
      </fieldset>
      <p class="small muted">
        240 muestras · 144 train / 48 validación / 48 test · Adam, lote 16 · salida lineal. La
        comparación usa los mismos datos, particiones, semilla y épocas; cambia el número de
        parámetros y el coste de cálculo. Los modelos se entrenan secuencialmente en un Worker
        cancelable.
      </p>
      <div class="training-toolbar">
        <button class="button primary" :disabled="study.busy" @click="study.run">
          Entrenar aproximación</button
        ><button class="button secondary" :disabled="!study.busy" @click="study.cancel">
          Cancelar aproximación
        </button>
      </div>
      <p v-if="study.busy" role="status">
        Entrenando en un espacio independiente. Se mostrará el estudio cuando esté completo.
      </p>
      <p v-if="study.notice" role="status">{{ study.notice }}</p>
      <p v-if="study.error" role="alert">{{ study.error }}</p>
    </section>
    <template v-if="study.result && study.selected && study.snapshot && parts">
      <section class="training-panel">
        <p class="eyebrow">RESULTADO REGISTRADO · {{ names[study.result.options.kind] }}</p>
        <h2>Reproduce cómo se construyó la curva</h2>
        <p>
          Semilla {{ study.result.options.seed }} · activación
          {{ study.result.options.activation }} · σ {{ formatData(study.result.options.noise) }} ·
          {{ study.result.options.epochs }} épocas por red. Los controles anteriores preparan el
          próximo ensayo; las medidas pertenecen a este estudio.
        </p>
        <label
          >Red inspeccionada
          <select
            :value="study.runIndex"
            aria-label="Red de aproximación inspeccionada"
            @change="study.selectRun(Number(($event.target as HTMLSelectElement).value))"
          >
            <option v-for="(run, i) in study.result.runs" :key="run.width" :value="i">
              {{ run.width }} neuronas · {{ run.budget.parameters }} parámetros
            </option>
          </select></label
        >
        <p data-testid="function-snapshot">
          Época {{ study.snapshot.checkpoint.epoch }} · actualización
          {{ study.snapshot.checkpoint.updates }} · instantánea {{ study.snapshotIndex + 1 }} de
          {{ count }}.
        </p>
        <div class="training-toolbar">
          <button class="button secondary" :disabled="study.snapshotIndex === 0" @click="move(-1)">
            Instantánea anterior</button
          ><button
            class="button primary"
            :disabled="prefs.reducedMotion || study.busy || count < 2"
            @click="playback.toggle"
          >
            {{ playback.playing.value ? 'Pausar instantáneas' : 'Reproducir instantáneas' }}</button
          ><button
            class="button secondary"
            :disabled="study.snapshotIndex === count - 1"
            @click="move(1)"
          >
            Instantánea siguiente
          </button>
        </div>
        <label class="timeline-control"
          >Instantánea de entrenamiento
          <input
            v-model.number="study.snapshotIndex"
            type="range"
            min="0"
            :max="count - 1"
            step="1"
            aria-label="Instantánea de entrenamiento"
            @input="playback.stop"
        /></label>
        <label class="timeline-control"
          >Velocidad de reproducción {{ prefs.value.speed }}×
          <input
            :value="prefs.value.speed"
            type="range"
            min="0.25"
            max="4"
            step="0.25"
            aria-label="Velocidad de reproducción de funciones"
            @input="speed"
        /></label>
        <p class="small muted">
          La reproducción cambia entre modelos capturados en épocas completas: no interpola pesos,
          no reentrena y no inventa épocas intermedias. Con movimiento reducido utiliza los botones
          o el deslizador.
        </p>
        <FunctionPlot
          :curve="study.snapshot.curve"
          :kind="study.result.options.kind"
          :bound="study.bound"
          :neuron="study.neuron"
          :bias="parts.bias"
          :probe="study.probe"
          :all="all"
          @probe="study.probe = $event"
        />
        <label class="training-check"
          ><input v-model="all" type="checkbox" />Mostrar todos los términos como contexto</label
        >
        <div class="training-metrics">
          <article>
            <span>MSE observado · train</span
            ><strong>{{ formatData(study.snapshot.point.trainLoss) }}</strong>
          </article>
          <article>
            <span>MSE observado · validación</span
            ><strong>{{ formatData(study.snapshot.point.validationLoss) }}</strong>
          </article>
          <article>
            <span>MSE en rejilla limpia</span
            ><strong data-testid="function-grid-mse">{{
              formatData(study.snapshot.gridMse)
            }}</strong>
          </article>
          <article>
            <span>Error máximo muestreado</span
            ><strong>{{ formatData(study.snapshot.gridMax) }}</strong>
          </article>
        </div>
        <p>
          Train y validación usan objetivos observados, incluido el ruido. La rejilla de 241
          posiciones utiliza la función matemática limpia conocida: es una demostración, no el test
          reservado ni una garantía de error entre posiciones. Test no se ha evaluado.
        </p>
      </section>
      <section class="training-panel">
        <h2>Comprueba la suma, neurona a neurona</h2>
        <ParameterField
          id="function-probe"
          v-model="study.probe"
          label="Entrada x de la función"
          :min="-1"
          :max="1"
          :step="0.01"
        />
        <label
          >Contribución destacada
          <select v-model.number="study.neuron" aria-label="Neurona de contribución">
            <option v-for="(_, j) in parts.terms" :key="j" :value="j">Neurona {{ j + 1 }}</option>
          </select></label
        >
        <p class="sum-equation" data-testid="function-sum">
          ŷ({{ formatData(study.probe) }}) = b + Σ wⱼ aⱼ = {{ formatData(parts.sum) }}. Forward:
          {{ formatData(parts.prediction) }}.
        </p>
        <p>
          Sesgo de salida: <strong>{{ formatData(parts.bias) }}</strong
          >. Diferencia suma − forward: <strong>{{ parts.sum - parts.prediction }}</strong
          >. Pueden aparecer términos positivos y negativos que se cancelan: no son efectos causales
          ni importancia de una feature.
        </p>
        <div class="training-table-wrap">
          <table>
            <caption>
              Contribuciones exactas de la instantánea para x={{
                formatData(study.probe)
              }}
            </caption>
            <thead>
              <tr>
                <th>Neurona</th>
                <th>Activación aⱼ</th>
                <th>Peso de salida wⱼ</th>
                <th>Término wⱼ aⱼ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(term, j) in parts.terms" :key="j">
                <th>{{ j + 1 }}</th>
                <td>{{ formatData(term.activation) }}</td>
                <td>{{ formatData(term.weight) }}</td>
                <td>{{ formatData(term.contribution) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <details>
          <summary>Precisión completa de la suma</summary>
          <p>
            Sesgo {{ parts.bias }}; términos
            {{ parts.terms.map((t) => t.contribution).join(' + ') }}; salida {{ parts.prediction }}.
          </p>
        </details>
      </section>
      <section class="training-panel">
        <h2>Capacidad, optimización y límites</h2>
        <p v-if="study.result.options.activation === 'linear'" class="training-alert">
          Con activación lineal y salida lineal, la red completa es afín. Añadir neuronas no crea no
          linealidad.
        </p>
        <template v-if="study.result.options.kind === 'step'"
          ><p data-testid="function-jump-bound">
            Cota inferior del supremo del error por continuidad: max(|ŷ(0)|, |ŷ(0) − 1|) =
            <strong>{{ formatData(study.snapshot.jumpLowerBound!) }}</strong> ≥ 0,5. Es una cota, no
            el máximo medido en la rejilla.
          </p>
          <p>
            Error máximo muestreado cerca del salto (|x| ≤ 0,1):
            <strong>{{ formatData(study.snapshot.nearZeroError) }}</strong
            >. Aumentar anchura puede concentrar el error en una región estrecha, pero una red
            continua no aproxima uniformemente un salto con error arbitrariamente pequeño en todo el
            intervalo.
          </p></template
        >
        <p>
          Con sesgos y una activación continua no polinómica como Tanh, ReLU o sigmoide, una capa
          oculta suficientemente ancha puede aproximar funciones continuas sobre compactos. El
          teorema no fija 32 neuronas como solución ni garantiza que Adam encuentre la mejor
          aproximación. Más anchura o épocas no prometen menor error de validación; compara también
          el ruido y las semillas.
        </p>
        <p class="small muted">
          <a
            href="https://www.sciencedirect.com/science/article/pii/S0893608005801315"
            target="_blank"
            rel="noopener noreferrer"
            >Fundamento: Leshno y colaboradores (1993)</a
          >.
        </p>
        <div class="training-table-wrap">
          <table>
            <caption>
              Comparación final con los mismos datos y épocas
            </caption>
            <thead>
              <tr>
                <th>Neuronas</th>
                <th>Parámetros</th>
                <th>Actualizaciones</th>
                <th>MSE train</th>
                <th>MSE validación</th>
                <th>MSE rejilla limpia</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="run in study.result.runs" :key="run.width">
                <th>{{ run.width }}</th>
                <td>{{ run.budget.parameters }}</td>
                <td>{{ run.snapshots.at(-1)!.checkpoint.updates }}</td>
                <td>{{ formatData(run.snapshots.at(-1)!.point.trainLoss) }}</td>
                <td>{{ formatData(run.snapshots.at(-1)!.point.validationLoss) }}</td>
                <td>{{ formatData(run.snapshots.at(-1)!.gridMse) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="small muted">
          Cota de operaciones estimada:
          {{ study.result.estimatedOperations.toLocaleString('es-ES') }}. Memoria numérica estimada:
          {{ formatData(study.result.estimatedNumericBytes / 1024 / 1024) }} MiB; excluye objetos y
          memoria del navegador. La misma semilla no genera tensores idénticos entre tamaños
          distintos.
        </p>
        <label class="reflection"
          >Tu explicación y sus límites
          <textarea
            v-model="study.reflection"
            maxlength="4000"
            rows="3"
            aria-label="Reflexión de aproximación"
            placeholder="Contrasta tu hipótesis: ¿qué cambió en la curva, los términos y el error?"
          />
        </label>
        <button class="button secondary" :disabled="study.busy" @click="download">
          Exportar informe de aproximación
        </button>
        <p v-if="downloadError" role="alert">{{ downloadError }}</p>
      </section>
      <section class="training-panel">
        <h2>Curvas del modelo seleccionado</h2>
        <LossChart
          :history="study.snapshot.checkpoint.history"
          :horizon="study.result.options.epochs"
        />
        <p>
          El inspector exporta o abre la instantánea seleccionada. Una instantánea intermedia
          permite reanudar su siguiente lote; abrirla requiere confirmación para sustituir la sesión
          de entrenamiento.
        </p>
      </section>
      <StudyInspector
        v-if="study.experiment"
        :experiment="study.experiment"
        :disabled="study.busy"
      />
    </template>
  </div>
</template>
<style scoped>
.functions-page {
  overflow-wrap: anywhere;
}
.function-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  margin: 20px 0;
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: 12px;
}
.function-options label,
.reflection,
.timeline-control {
  display: grid;
  gap: 8px;
}
.function-options .training-check {
  display: flex;
}
.hypothesis {
  grid-column: 1 / -1;
}
select,
input[type='number'],
textarea {
  min-height: 44px;
  padding: 10px;
  border: 1px solid var(--muted);
  border-radius: 8px;
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  max-width: 100%;
}
textarea {
  width: 100%;
  resize: vertical;
}
.timeline-control {
  margin: 20px 0;
}
.sum-equation {
  font-weight: 700;
  font-family: var(--font-mono);
}
@media (max-width: 700px) {
  .function-options {
    grid-template-columns: minmax(0, 1fr);
    padding: 12px;
  }
}
</style>
