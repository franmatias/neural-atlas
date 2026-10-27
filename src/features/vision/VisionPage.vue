<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { onBeforeRouteLeave } from 'vue-router';
import { useVisionStore } from '@/stores/vision';
import { usePreferencesStore } from '@/stores/preferences';
import { useSnapshotPlayback } from '@/features/functions/useSnapshotPlayback';
import { parseDecimal } from '@/shared/utils/decimal';
import ParameterField from '@/shared/ui/ParameterField.vue';
import MatrixMap from './MatrixMap.vue';
import ImageEditor from './ImageEditor.vue';
const study = useVisionStore(),
  prefs = usePreferencesStore(),
  kernelError = ref(''),
  downloadError = ref('');
const { index, count } = storeToRefs(study),
  playback = useSnapshotPlayback(index, count);
watch([() => study.result, () => study.busy], playback.stop);
const pool = computed(() => study.result?.pool.windows[study.poolIndex]);
const highlighted = computed(
  () =>
    study.inspector?.products
      .filter((p) => !p.padding)
      .map((p) => p.row * study.result!.input.size + p.column) ?? [],
);
function weight(event: Event, index: number) {
  const input = event.target as HTMLInputElement,
    p = parseDecimal(input.value, -5, 5);
  if (!p.ok) {
    kernelError.value = 'Cada peso debe estar entre −5 y 5; se conserva el anterior.';
    return;
  }
  study.options.kernel[index] = p.value;
  kernelError.value = '';
}
function select(index: number) {
  playback.stop();
  study.index = index;
}
function move(delta: number) {
  select(Math.max(0, Math.min(study.count - 1, study.index + delta)));
}
function download() {
  downloadError.value = '';
  try {
    const url = globalThis.URL.createObjectURL(
        new globalThis.Blob([study.report()], { type: 'application/json' }),
      ),
      a = document.createElement('a');
    a.href = url;
    a.download = 'neural-atlas-vision.report.json';
    a.click();
    setTimeout(() => globalThis.URL.revokeObjectURL(url), 1000);
  } catch {
    downloadError.value = 'No se pudo descargar. El mapa sigue disponible.';
  }
}
onBeforeRouteLeave(() => {
  playback.stop();
  if (study.busy) study.cancel();
});
</script>
<template>
  <div class="page training-page">
    <p class="eyebrow">L11 / VISIÓN · D9.2</p>
    <h1>Del píxel al mapa.</h1>
    <p class="page-intro">
      Desliza un filtro sobre una imagen y comprueba cada producto. Correlación cruzada, activación
      y agrupación: tres operaciones distintas. Este laboratorio no entrena una CNN ni reconoce
      dígitos.
    </p>
    <section class="training-panel">
      <h2>Prepara una imagen y un filtro</h2>
      <fieldset :disabled="study.busy">
        <legend>Imagen local y configuración</legend>
        <div class="actions">
          <label
            >Tamaño de imagen<select
              :value="study.options.size"
              @change="study.resize(Number(($event.target as HTMLSelectElement).value))"
            >
              <option v-for="n in [10, 14, 20, 28]" :key="n" :value="n">{{ n }}×{{ n }}</option>
            </select></label
          ><button
            v-for="(name, key) in {
              seven: 'Siete',
              cross: 'Cruz',
              diagonal: 'Diagonal',
              border: 'Contorno',
            }"
            :key="key"
            class="button secondary"
            @click="study.pattern(key)"
          >
            {{ name }}</button
          ><button class="button secondary" @click="study.rotate">Rotar imagen 90°</button
          ><button class="button secondary" @click="study.clear">Borrar imagen</button>
        </div>
        <ImageEditor />
        <div class="fields">
          <label
            >Tamaño de kernel<select
              :value="study.options.kernelSize"
              @change="study.kernel(Number(($event.target as HTMLSelectElement).value), 'edge')"
            >
              <option :value="3">3×3</option>
              <option :value="5">5×5</option>
            </select></label
          ><ParameterField
            id="vision-stride"
            v-model="study.options.stride"
            label="Desplazamiento (stride)"
            :min="1"
            :max="3"
            :step="1"
          /><label
            >Padding<select v-model="study.options.padding">
              <option value="valid">Valid · sin padding</option>
              <option value="same">Same · ceros en bordes</option>
            </select></label
          ><label class="check"
            ><input v-model="study.options.relu" type="checkbox" />Aplicar ReLU</label
          >
        </div>
        <div class="actions">
          <button
            v-for="(name, key) in {
              identity: 'Filtro identidad',
              mean: 'Filtro media',
              edge: 'Filtro de bordes',
            }"
            :key="key"
            class="button secondary"
            @click="study.kernel(study.options.kernelSize, key)"
          >
            {{ name }}
          </button>
        </div>
        <div
          class="kernel"
          :style="{ gridTemplateColumns: `repeat(${study.options.kernelSize},minmax(0,1fr))` }"
        >
          <label
            v-for="(value, i) in study.options.kernel"
            :key="`${study.options.kernelSize}-${i}`"
            ><span
              >{{ Math.floor(i / study.options.kernelSize) }},{{
                i % study.options.kernelSize
              }}</span
            ><input
              :value="value"
              inputmode="decimal"
              :aria-label="`Peso del kernel ${Math.floor(i / study.options.kernelSize)},${i % study.options.kernelSize}`"
              @change="weight($event, i)"
          /></label>
        </div>
        <p v-if="kernelError" role="alert">{{ kernelError }}</p>
        <p v-if="study.shape" data-testid="vision-shape">
          Dimensiones previstas: {{ study.options.size }}×{{ study.options.size }} →
          {{ study.shape.output }}×{{ study.shape.output }} → {{ study.shape.pooled }}×{{
            study.shape.pooled
          }}. Padding antes: {{ study.shape.before }}, después: {{ study.shape.after }} en cada eje.
        </p>
        <label class="text-field"
          >Predicción antes de aplicar<textarea
            v-model="study.hypothesis"
            maxlength="2000"
            aria-label="Hipótesis de visión"
          />
        </label>
      </fieldset>
      <button class="button" :disabled="study.busy" @click="study.run">
        Aplicar filtro y registrar mapas</button
      ><button v-if="study.busy" class="button secondary" @click="study.cancel">
        Cancelar visión
      </button>
      <p v-if="study.notice" role="status">{{ study.notice }}</p>
      <p v-if="study.error" role="alert">{{ study.error }}</p>
    </section>
    <template v-if="study.result && study.inspector && pool"
      ><section class="training-panel" data-testid="vision-result">
        <h2>Una ventana, una suma.</h2>
        <p>
          Resultado registrado: {{ study.result.input.size }}×{{ study.result.input.size }} · kernel
          {{ study.result.input.kernelSize }}×{{ study.result.input.kernelSize }} · stride
          {{ study.result.input.stride }} · {{ study.result.input.padding }} · ReLU
          {{ study.result.input.relu ? 'activada' : 'desactivada' }}. Los controles superiores
          preparan otro resultado.
        </p>
        <p>Hipótesis registrada: {{ study.recordedHypothesis || 'Sin hipótesis escrita.' }}</p>
        <div class="maps">
          <div>
            <h3>1. Correlación cruzada</h3>
            <MatrixMap
              :values="study.result.raw"
              :size="study.result.shape.output"
              label="Mapa de correlación registrado"
              :selected="study.index"
              @select="select"
            />
          </div>
          <div>
            <h3>2. Activación</h3>
            <MatrixMap
              :values="study.result.activation"
              :size="study.result.shape.output"
              label="Mapa de activación registrado"
              :selected="study.index"
              :highlight="pool.indices"
              @select="select"
            />
          </div>
          <div>
            <h3>3. Max-pooling 2×2</h3>
            <MatrixMap
              :values="study.result.pool.values"
              :size="study.result.pool.size"
              label="Mapa de pooling registrado"
              :selected="study.poolIndex"
              @select="study.poolIndex = $event"
            />
          </div>
        </div>
        <div class="actions">
          <button class="button secondary" :disabled="study.index === 0" @click="move(-1)">
            Ventana anterior</button
          ><button class="button" :disabled="prefs.reducedMotion" @click="playback.toggle">
            {{ playback.playing.value ? 'Pausar ventanas' : 'Animar ventanas' }}</button
          ><button
            class="button secondary"
            :disabled="study.index === study.count - 1"
            @click="move(1)"
          >
            Ventana siguiente
          </button>
        </div>
        <ParameterField
          id="vision-output"
          v-model="study.index"
          label="Índice de salida inspeccionada"
          :min="0"
          :max="study.count - 1"
          :step="1"
          @update:model-value="playback.stop"
        />
        <p>
          Coordenada de salida ({{ study.inspector.row }}, {{ study.inspector.column }}), desde
          cero. Velocidad en Ajustes; movimiento reducido desactiva reproducción.
        </p>
        <div class="inspection">
          <MatrixMap
            :values="study.result.input.pixels"
            :size="study.result.input.size"
            label="Imagen registrada y ventana seleccionada"
            :highlight="highlighted"
          /><MatrixMap
            :values="study.inspector.products.map((p) => p.value)"
            :size="study.result.input.kernelSize"
            label="Ventana extraída; borde discontinuo indica padding"
            :padding="study.inspector.products.map((p) => p.padding)"
          />
        </div>
        <div class="table-scroll">
          <table aria-label="Productos de la ventana">
            <caption>
              Kernel sin invertir · suma de productos =
              {{
                study.inspector.sum
              }}
            </caption>
            <thead>
              <tr>
                <th>Kernel (fila,col)</th>
                <th>Imagen (fila,col)</th>
                <th>Entrada</th>
                <th>Peso</th>
                <th>Producto</th>
                <th>Procedencia</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in study.inspector.products" :key="`${p.kr}-${p.kc}`">
                <th>{{ p.kr }},{{ p.kc }}</th>
                <td>{{ p.row }},{{ p.column }}</td>
                <td>{{ p.value }}</td>
                <td>{{ p.weight }}</td>
                <td>{{ p.product }}</td>
                <td>{{ p.padding ? 'Padding cero' : 'Píxel de imagen' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p data-testid="vision-sum">
          z = {{ study.inspector.sum }} →
          {{ study.result.input.relu ? 'ReLU(z)' : 'Sin activación' }} =
          {{ study.inspector.activation }}.
        </p>
        <h3>¿Quién gana en pooling?</h3>
        <ParameterField
          id="vision-pool"
          v-model="study.poolIndex"
          label="Índice de pooling inspeccionado"
          :min="0"
          :max="study.result.pool.values.length - 1"
          :step="1"
        />
        <p data-testid="vision-pool-winner">
          Candidatos: {{ pool.candidates.join(', ') }}. Máximo: {{ pool.value }} · índice de
          activación ganador {{ pool.winner }}. Empate: primer índice en orden de filas.
        </p>
        <p v-if="study.result.pool.discardedEdge">
          La dimensión de activación es impar: se descartan la última fila y la última columna en
          pooling sin padding.
        </p>
        <p>
          La operación se llama correlación cruzada porque el kernel no se invierte. En muchas
          bibliotecas de CNN se denomina convolución. Same conserva ceil(N/stride), no siempre N.
        </p>
        <label class="text-field"
          >Contrasta y explica<textarea
            v-model="study.reflection"
            maxlength="2000"
            aria-label="Reflexión de visión"
          />
        </label>
        <p>
          Rota una imagen y aplica el mismo filtro: ¿se conservan todas las respuestas? Un único
          ejemplo no demuestra invariancia universal.
        </p>
        <button class="button secondary" @click="download">Exportar informe de visión</button>
        <p v-if="downloadError" role="alert">{{ downloadError }}</p>
        <details>
          <summary>Dimensiones y fórmulas</summary>
          <p>
            Valid: O=⌊(N−K)/s⌋+1. Same: O=⌈N/s⌉; P=max((O−1)s+K−N,0); antes=⌊P/2⌋ y después=P−antes.
            Pooling 2×2, stride 2 y sin padding: ⌊O/2⌋. Cada salida suma K² productos.
            ReLU(z)=max(0,z).
          </p>
        </details>
      </section></template
    >
  </div>
</template>
<style scoped>
.actions {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  align-items: end;
  margin: 1rem 0;
}
.fields,
.maps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 230px), 1fr));
  gap: 1.5rem;
  margin: 1.5rem 0;
}
.fields label,
.actions label,
.text-field {
  display: grid;
  gap: 0.5rem;
  min-width: 0;
}
.fields .check {
  display: flex;
  align-items: center;
}
.inspection {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}
.kernel {
  display: grid;
  gap: 0.5rem;
  max-width: 500px;
  margin: 1rem 0;
}
.kernel label {
  min-width: 0;
  display: grid;
}
.kernel span {
  font-size: 0.75rem;
  color: var(--muted);
}
.kernel input,
select {
  width: 100%;
  min-width: 0;
}
.kernel input {
  padding: 0.5rem;
}
fieldset {
  min-width: 0;
  padding: 1rem;
}
.table-scroll {
  overflow: auto;
}
table {
  min-width: 620px;
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  padding: 0.6rem;
  text-align: left;
  border-bottom: 1px solid var(--line);
}
caption {
  text-align: left;
  color: var(--muted);
  margin: 1rem 0;
}
textarea {
  width: 100%;
  min-height: 90px;
  resize: vertical;
  margin-bottom: 1rem;
}
@media (max-width: 650px) {
  .inspection {
    grid-template-columns: 1fr;
  }
}
</style>
