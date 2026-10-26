<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useDecisionSession } from './useDecisionSession';
import type { DecisionMode } from '@/application/training/decision-study';
import { forward, parameterCount } from '@/domain/network/model';
import { transformRow } from '@/domain/data/pipeline';
import { usePreferencesStore } from '@/stores/preferences';
import { formatData } from '@/shared/utils/data-format';
import DecisionControls from './DecisionControls.vue';
import DecisionMap from './DecisionMap.vue';
import NetworkDiagram from '@/features/network/NetworkDiagram.vue';
import LossChart from '@/features/training/LossChart.vue';
const props = defineProps<{ mode: DecisionMode }>();
const lab = useDecisionSession(props.mode),
  prefs = usePreferencesStore();
const boundary = ref(true),
  pulses = ref(true),
  adding = ref(false),
  subset = ref<'train' | 'validation'>('train');
const layer = ref(0),
  neuron = ref(0),
  explanation = ref('intuition'),
  hypothesis = ref('');
const point = computed(() => lab.state?.history.at(-1));
const statusNames: Record<string, string> = {
  initializing: 'Preparando',
  ready: 'Listo',
  running: 'Entrenando',
  paused: 'Pausado',
  completed: 'Completado',
  cancelled: 'Cancelado',
  error: 'Revisa la configuración',
};
watch(
  () => lab.study,
  () => {
    layer.value = 0;
    neuron.value = 0;
  },
);
const cache = computed(() =>
  lab.state && lab.study && lab.prediction
    ? forward(
        lab.state.model,
        transformRow(
          { id: 'probe', features: { x1: lab.x, x2: lab.y }, target: null, origin: 'manual' },
          lab.study.prepared.pipeline,
        ),
      )
    : undefined,
);
const ready = computed(() => !!lab.state && !lab.running && lab.status !== 'completed');
const actualLayer = computed(() =>
  Math.min(layer.value, (lab.state?.model.layers.length ?? 1) - 1),
);
const actualNeuron = computed(() =>
  Math.min(neuron.value, (lab.state?.model.layers[actualLayer.value]?.outputs ?? 1) - 1),
);
function select(x: number, y: number) {
  lab.x = Number(x.toFixed(3));
  lab.y = Number(y.toFixed(3));
}
</script>
<template>
  <div class="page visual-decision-page">
    <p class="eyebrow">
      {{
        mode === 'binary' ? 'L13 / SANDBOX DE DOS CLASES' : 'L14 / CLASIFICADOR VISUAL MULTICLASE'
      }}
    </p>
    <h1>{{ mode === 'binary' ? 'Mira cómo aprende una frontera.' : 'Cada región, una clase.' }}</h1>
    <p class="page-intro">
      {{
        mode === 'binary'
          ? 'Dos clases, una red y una frontera que cambia con cada época. Prueba qué patrones puede separar y cuáles se le resisten.'
          : 'Explora cómo compiten las clases. Coloca una entrada y sigue su recorrido por la red hasta las probabilidades Softmax.'
      }}
    </p>
    <nav class="decision-links" aria-label="Laboratorios visuales">
      <RouterLink to="/laboratorios">Todos los laboratorios</RouterLink
      ><RouterLink to="/lab/arquitectura/frontera">Sandbox de dos clases</RouterLink
      ><RouterLink to="/lab/clasificacion/visual">Clasificador visual multiclase</RouterLink
      ><RouterLink :to="mode === 'binary' ? '/lab/arquitectura' : '/lab/clasificacion'">{{
        mode === 'binary' ? 'Arquitectura y XOR' : 'Clasificar y evaluar'
      }}</RouterLink>
    </nav>
    <p v-if="lab.error" class="field-error" role="alert">{{ lab.error }}</p>
    <p v-if="lab.notice" class="small muted" role="status">{{ lab.notice }}</p>
    <div class="decision-layout">
      <aside class="panel decision-sidebar">
        <DecisionControls
          v-model="lab.draft"
          :mode="mode"
          :disabled="lab.running"
          @reset="(clear) => lab.reset(clear)"
        />
      </aside>
      <div class="decision-main">
        <section class="panel decision-stage" aria-label="Escenario de clasificación">
          <div class="decision-toolbar">
            <button
              class="button primary"
              :disabled="!lab.state || lab.status === 'initializing' || lab.status === 'completed'"
              @click="lab.command(lab.running ? 'PAUSE' : 'RUN')"
            >
              {{
                lab.running && lab.status !== 'initializing'
                  ? 'Pausar simulación'
                  : 'Entrenar simulación'
              }}
            </button>
            <button class="button secondary" :disabled="!ready" @click="lab.command('STEP_BATCH')">
              Un lote
            </button>
            <button class="button secondary" :disabled="!ready" @click="lab.command('STEP_EPOCH')">
              Una época
            </button>
            <label
              >Ritmo · {{ lab.pace === 0 ? 'máximo' : `${lab.pace} actualizaciones/s`
              }}<input v-model.number="lab.pace" type="range" min="0" max="60" step="1"
            /></label>
          </div>
          <p v-if="lab.dirty" class="data-status">
            Hay controles pendientes. El mapa conserva la configuración aplicada; pulsa «Aplicar y
            reiniciar red» para cambiarlos.
          </p>
          <p class="small muted">
            Estado: {{ statusNames[lab.status] ?? lab.status }} ·
            {{
              lab.status === 'completed'
                ? 'Horizonte alcanzado. Reinicia para una nueva ejecución.'
                : 'La velocidad se aplica al iniciar el siguiente paso o tramo.'
            }}
          </p>
          <div
            v-if="lab.state && lab.study && lab.surface && lab.prediction"
            class="decision-canvases"
          >
            <div>
              <DecisionMap
                :surface="lab.surface"
                :dataset="lab.study.dataset"
                :split="lab.study.split"
                :probe="lab.prediction"
                :boundary="boundary"
                :subset="subset"
                :adding="adding"
                @select="select"
              />
              <div class="decision-map-options">
                <label><input v-model="boundary" type="checkbox" />Frontera aproximada</label
                ><label
                  >Puntos visibles<select v-model="subset">
                    <option value="train">Entrenamiento</option>
                    <option value="validation">Validación</option>
                  </select></label
                >
              </div>
            </div>
            <section class="decision-network">
              <h2>La red por dentro</h2>
              <p class="small">
                Arquitectura
                {{
                  [
                    lab.state.model.spec.inputs,
                    ...lab.state.model.layers.map((l) => l.outputs),
                  ].join(' → ')
                }}
                · {{ parameterCount(lab.state.model.spec) }} parámetros ·
                {{ lab.state.model.spec.activation }}
              </p>
              <NetworkDiagram
                :model="lab.state.model"
                :cache="cache"
                :layer="actualLayer"
                :neuron="actualNeuron"
                :phase="1"
                :playing="pulses && !prefs.reducedMotion"
                :speed="prefs.value.speed"
              />
              <label class="check-row"
                ><input v-model="pulses" type="checkbox" />Pulsos didácticos</label
              >
              <div class="decision-neuron-fields">
                <label
                  >Capa inspeccionada<select v-model.number="layer" @change="neuron = 0">
                    <option v-for="(_, i) in lab.state.model.layers" :key="i" :value="i">
                      {{ i === lab.state.model.layers.length - 1 ? 'Salida' : `Oculta ${i + 1}` }}
                    </option>
                  </select></label
                ><label
                  >Neurona inspeccionada<select v-model.number="neuron">
                    <option
                      v-for="i in lab.state.model.layers[actualLayer]!.outputs"
                      :key="i"
                      :value="i - 1"
                    >
                      {{ i }}
                    </option>
                  </select></label
                >
              </div>
              <p class="small">
                Suma ponderada z = {{ formatData(cache!.logits[actualLayer]![actualNeuron]!) }} ·
                Activación de la neurona:
                <strong>{{
                  formatData(cache!.activations[actualLayer + 1]![actualNeuron]!)
                }}</strong
                >. Valores calculados para la cruz del mapa. Los pulsos ilustran el recorrido; no
                miden tiempo de cálculo.
              </p>
              <section class="decision-prediction" aria-label="Predicción de la entrada">
                <h3>Predicción · clase {{ lab.prediction.predicted }}</h3>
                <div
                  v-for="(p, i) in lab.prediction.probabilities"
                  :key="i"
                  class="probability-row"
                >
                  <span>Clase {{ i }}</span
                  ><meter
                    min="0"
                    max="1"
                    :value="p"
                    :aria-label="`Probabilidad clase ${i}`"
                  /><strong>{{ (p * 100).toFixed(1) }} %</strong>
                </div>
                <p class="small">
                  Σ p = {{ lab.prediction.probabilities.reduce((a, b) => a + b, 0).toFixed(4) }} ·
                  {{
                    mode === 'binary'
                      ? 'Sigmoide; clase 1 si p ≥ 0,5.'
                      : 'Softmax; gana argmax. En empate, primera clase.'
                  }}
                  Probabilidades sin calibrar.
                </p>
              </section>
            </section>
          </div>
          <p v-else role="status">
            {{
              lab.state
                ? 'Introduce coordenadas válidas entre −1,8 y 1,8.'
                : 'Preparando la red en un Web Worker…'
            }}
          </p>
        </section>
        <section class="panel decision-inputs">
          <h2>Prueba una entrada</h2>
          <p class="small muted">
            Pulsa el mapa o usa sus flechas y estos campos. Probar conserva los pesos. Añadir
            requiere una etiqueta y reinicia el aprendizaje.
          </p>
          <div class="training-fields">
            <label
              >x₁ de prueba<input
                v-model.number="lab.x"
                type="number"
                min="-1.8"
                max="1.8"
                step="0.05" /></label
            ><label
              >x₂ de prueba<input
                v-model.number="lab.y"
                type="number"
                min="-1.8"
                max="1.8"
                step="0.05" /></label
            ><label
              >Modo del mapa<select v-model="adding">
                <option :value="false">Probar entrada</option>
                <option :value="true">Preparar punto etiquetado</option>
              </select></label
            ><label
              >Etiqueta del punto<select v-model.number="lab.label">
                <option
                  v-for="i in lab.study?.dataset.classOrder?.length ?? (mode === 'binary' ? 2 : 4)"
                  :key="i"
                  :value="i - 1"
                >
                  Clase {{ i - 1 }}
                </option>
              </select></label
            >
          </div>
          <button
            v-if="adding"
            class="button secondary"
            :disabled="lab.running || lab.manual.length >= 40 || lab.dirty"
            @click="lab.addPoint"
          >
            Añadir punto y reiniciar
          </button>
          <p class="small muted">
            {{ lab.manual.length }}/40 puntos añadidos. Al reiniciar se vuelven a dividir todos los
            datos: 60 % train, 20 % validación, 20 % test. Un punto añadido puede pertenecer a
            cualquiera de las particiones. El test no se dibuja ni se evalúa aquí.
          </p>
        </section>
        <section
          v-if="lab.state && point"
          class="panel decision-telemetry"
          aria-label="Telemetría del entrenamiento"
        >
          <h2>Medidas reales</h2>
          <div class="decision-metrics">
            <div>
              <span>Época del modelo</span
              ><strong data-testid="visual-epoch">{{ lab.state.epoch }}</strong>
            </div>
            <div>
              <span>Actualizaciones</span><strong>{{ lab.state.updates }}</strong>
            </div>
            <div>
              <span>{{ mode === 'binary' ? 'BCE' : 'Entropía cruzada' }} · train</span
              ><strong data-testid="visual-loss">{{ formatData(point.trainLoss) }}</strong>
            </div>
            <div>
              <span>Exactitud · train</span
              ><strong>{{ (point.trainScore * 100).toFixed(1) }} %</strong>
            </div>
            <div>
              <span>Exactitud · validación</span
              ><strong>{{ (point.validationScore * 100).toFixed(1) }} %</strong>
            </div>
          </div>
          <p class="small muted">
            Métricas de la última época evaluada: {{ point.epoch }}. Entre lotes, el modelo puede
            haber avanzado desde esa evaluación. La pérdida de datos se muestra separada de la
            penalización L2. Penalización de la última época:
            {{ formatData(point.regularizationPenalty ?? 0) }}.
          </p>
          <LossChart :history="lab.state.history" />
          <div class="decision-toolbar">
            <button
              class="button secondary"
              :disabled="lab.running"
              @click="lab.exportFile('dataset')"
            >
              Exportar datos visuales</button
            ><button
              class="button secondary"
              :disabled="lab.running"
              @click="lab.exportFile('experiment')"
            >
              Exportar experimento visual</button
            ><button
              class="button secondary"
              :disabled="lab.running"
              @click="lab.exportFile('model')"
            >
              Exportar modelo visual
            </button>
          </div>
          <p class="small muted">
            La sesión es independiente de L06. Exporta el experimento para conservar datos y
            optimizador; puedes importarlo desde Biblioteca para reanudar. Salir cierra este Worker.
          </p>
        </section>
        <section class="panel decision-pedagogy">
          <h2>Observa, predice, explica</h2>
          <div class="data-view-switch" role="group" aria-label="Explicación del laboratorio">
            <button
              v-for="e in ['intuition', 'math', 'challenge']"
              :key="e"
              :aria-pressed="explanation === e"
              @click="explanation = e"
            >
              {{
                e === 'intuition'
                  ? 'Intuición'
                  : e === 'math'
                    ? 'Rigor matemático'
                    : 'Reto práctico'
              }}
            </button>
          </div>
          <p v-if="explanation === 'intuition'">
            {{
              mode === 'binary'
                ? 'Una red sin capas ocultas dibuja una separación lineal. Las capas con activación no lineal pueden construir regiones curvas y desconectadas. Los datos no se mueven: cambia la función que asigna una clase a cada coordenada.'
                : 'Cada salida representa una clase. Las neuronas ocultas combinan x₁ y x₂; Softmax transforma sus puntuaciones en probabilidades que suman uno. La región del mapa toma el color de la salida con mayor probabilidad.'
            }}
          </p>
          <p v-else-if="explanation === 'math'">
            Cada capa calcula z = W·a + b y a = f(z).
            {{
              mode === 'binary'
                ? 'La salida usa p = 1/(1+exp(−z)); BCE = −[y·log(p)+(1−y)·log(1−p)].'
                : 'Softmax usa pₖ = exp(zₖ−m)/Σⱼ exp(zⱼ−m), con m = max(z). La pérdida es −log(p de la clase real).'
            }}
            Backpropagation calcula gradientes y Adam actualiza pesos. El pipeline Z-score aprende
            media y desviación solo de train. L2 penaliza pesos grandes; no elimina ruido ni
            garantiza una frontera simple.
          </p>
          <p v-else>
            {{
              mode === 'binary'
                ? 'Compara XOR sin capas ocultas y con dos capas Tanh. Mantén semilla y ruido. Después sube el ruido y L2: ¿qué ocurre en validación? No confundas memorizar train con separar nuevos ejemplos.'
                : 'Compara nubes y anillos con cuatro clases. Después prueba entradas entre dos regiones: ¿reparten las salidas su probabilidad? Repite con distintas semillas y evita concluir que una sola ejecución demuestra superioridad.'
            }}
          </p>
          <label
            >Mi hipótesis y observación<textarea
              v-model="hypothesis"
              maxlength="4000"
              rows="3"
              placeholder="Antes de entrenar espero… Después he observado…"
            />
          </label>
          <p class="small muted">
            Nota temporal de esta visita. Copia tu explicación antes de salir; los archivos del
            modelo no incluyen este texto.
          </p>
        </section>
      </div>
    </div>
  </div>
</template>
<style src="./decision.css"></style>
