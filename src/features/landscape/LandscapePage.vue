<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { onBeforeRouteLeave } from 'vue-router';
import { useLandscapeStore } from '@/stores/landscape';
import { useTrainingStore } from '@/stores/training';
import { usePreferencesStore } from '@/stores/preferences';
import { useSnapshotPlayback } from '@/features/functions/useSnapshotPlayback';
import { cloneNetwork } from '@/domain/network/model';
import { parameterEntries } from '@/domain/training/landscape';
import ParameterField from '@/shared/ui/ParameterField.vue';
import LandscapePlot from './LandscapePlot.vue';
const Landscape3D = defineAsyncComponent(() => import('./Landscape3D.vue'));
const study = useLandscapeStore(),
  training = useTrainingStore(),
  prefs = usePreferencesStore(),
  view = ref('2d'),
  downloadError = ref('');
const { index, count } = storeToRefs(study),
  playback = useSnapshotPlayback(index, count);
const names = {
  bowl: 'Cuenco',
  saddle: 'Punto de silla',
  wells: 'Doble pozo',
  rosenbrock: 'Rosenbrock',
};
const formulas = {
  bowl: 'x² + 3y²',
  saddle: 'x² − y²',
  wells: '(x² − 1)² + y²',
  rosenbrock: '(1 − x)² + 100(y − x²)²',
};
const statuses = {
  budget: 'Presupuesto agotado',
  stationary: 'Gradiente pequeño; no prueba mínimo',
  outside: 'Salió del dominio: trayectoria detenida',
  nonfinite: 'Cálculo no finito: detenido',
};
const displayed = computed(
  () =>
    study.result?.paths.map((p) => ({
      path: p,
      point: p.points[Math.min(study.index, p.points.length - 1)],
    })) ?? [],
);
const resultAxes = computed(() =>
  study.result?.provenance
    ? study.result.options.axes.map(
        (a) => parameterEntries(study.result!.provenance!.model)[a]!.label,
      )
    : ['x', 'y'],
);
watch([() => study.result, () => study.busy], playback.stop);
function move(delta: number) {
  playback.stop();
  study.index = Math.max(0, Math.min(study.count - 1, study.index + delta));
}
function capture() {
  if (!training.state || !training.input || training.busy || training.running) return;
  const s = training.input.trainEvaluation ?? training.input.train;
  study.capture({
    model: cloneNetwork(training.state.model),
    samples: {
      ids: s.ids.slice(0, 64),
      x: s.x.slice(0, 64).map((r) => [...r]),
      y: s.y.slice(0, 64),
    },
    loss: training.input.config.loss,
    source: `Sesión L06 · primeras ${Math.min(64, s.ids.length)} filas de train · datos ${training.input.dataHash}`,
    update: training.state.updates,
  });
}
function pick(x: number, y: number) {
  study.options.start = [x, y];
}
function download() {
  downloadError.value = '';
  try {
    const url = globalThis.URL.createObjectURL(
        new globalThis.Blob([study.report()], { type: 'application/json' }),
      ),
      a = document.createElement('a');
    a.href = url;
    a.download = 'neural-atlas-landscape.report.json';
    a.click();
    setTimeout(() => globalThis.URL.revokeObjectURL(url), 1000);
  } catch {
    downloadError.value = 'No se pudo descargar. El estudio sigue disponible.';
  }
}
onBeforeRouteLeave(() => {
  playback.stop();
  if (study.busy) study.cancel();
});
</script>
<template>
  <div class="page training-page">
    <p class="eyebrow">L07 / PAISAJES DE PÉRDIDA · D9.1</p>
    <h1>Cuatro caminos, una superficie.</h1>
    <p class="page-intro">
      Compara optimizadores desde el mismo punto. Distingue una función ilustrativa de un corte de
      dos parámetros de una red congelada.
    </p>
    <section class="training-panel">
      <h2>Prepara el estudio</h2>
      <fieldset :disabled="study.busy">
        <legend>Superficie y presupuesto</legend>
        <div class="fields">
          <label
            >Modo de superficie<select v-model="study.options.mode">
              <option value="illustrative">Función ilustrativa</option>
              <option value="frozen">Corte de red congelada</option>
            </select></label
          >
          <label v-if="study.options.mode === 'illustrative'"
            >Paisaje ilustrativo<select v-model="study.options.kind">
              <option v-for="(name, key) in names" :key="key" :value="key">{{ name }}</option>
            </select></label
          >
          <ParameterField
            id="landscape-resolution"
            v-model="study.options.resolution"
            label="Resolución por eje"
            :min="10"
            :max="60"
            :step="1"
          />
          <ParameterField
            id="landscape-steps"
            v-model="study.options.steps"
            label="Pasos de optimización"
            :min="1"
            :max="300"
            :step="1"
          />
          <ParameterField
            id="landscape-rate"
            v-model="study.options.rate"
            label="Tasa común de aprendizaje"
            :min="0.00001"
            :max="1"
            :step="0.00001"
          />
          <ParameterField
            id="landscape-clip"
            v-model="study.options.clip"
            label="Clipping de norma (0 desactiva)"
            :min="0"
            :max="100"
            :step="0.1"
          />
          <ParameterField
            id="landscape-x"
            v-model="study.options.start[0]"
            label="Inicio x"
            :min="-100"
            :max="100"
            :step="0.01"
          />
          <ParameterField
            id="landscape-y"
            v-model="study.options.start[1]"
            label="Inicio y"
            :min="-100"
            :max="100"
            :step="0.01"
          />
        </div>
        <div v-if="study.options.mode === 'frozen'">
          <div class="actions">
            <button class="button secondary" @click="study.example">
              Cargar ejemplo lineal congelado</button
            ><button
              class="button secondary"
              :disabled="!training.state || !training.input || training.busy || training.running"
              @click="capture"
            >
              Congelar copia de sesión L06
            </button>
          </div>
          <p>
            La sesión debe estar pausada. Hasta 64 primeras filas de train, sin validación/test;
            máximo 512 parámetros y 20 M operaciones estimadas. BN usa estadísticas congeladas;
            dropout y penalizaciones no intervienen.
          </p>
          <template v-if="study.frozen">
            <p>
              {{ study.frozen.source }} · actualización {{ study.frozen.update }} ·
              {{ study.frozen.samples.ids.length }} filas.
            </p>
            <div class="fields">
              <label
                >Parámetro x<select v-model="study.options.axes[0]" @change="study.center">
                  <option v-for="(e, i) in study.entries" :key="i" :value="i">
                    {{ e.label }} = {{ e.value.toPrecision(4) }}
                  </option>
                </select></label
              ><label
                >Parámetro y<select v-model="study.options.axes[1]" @change="study.center">
                  <option v-for="(e, i) in study.entries" :key="i" :value="i">
                    {{ e.label }} = {{ e.value.toPrecision(4) }}
                  </option>
                </select></label
              ><ParameterField
                id="landscape-radius"
                v-model="study.options.radius"
                label="Radio del corte"
                :min="0.1"
                :max="5"
                :step="0.1"
              />
            </div>
          </template>
        </div>
      </fieldset>
      <div class="actions">
        <button class="button" :disabled="study.busy" @click="study.run">
          Calcular paisaje y trayectorias</button
        ><button v-if="study.busy" class="button secondary" @click="study.cancel">
          Cancelar paisaje
        </button>
      </div>
      <p v-if="study.notice" role="status">{{ study.notice }}</p>
      <p v-if="study.error" role="alert">{{ study.error }}</p>
    </section>
    <template v-if="study.result">
      <section class="training-panel" data-testid="landscape-result">
        <h2>
          {{
            study.result.options.mode === 'illustrative'
              ? `Ilustración: ${names[study.result.options.kind]}`
              : 'Corte real de dos parámetros'
          }}
        </h2>
        <p v-if="study.result.options.mode === 'illustrative'">
          f(x,y) = {{ formulas[study.result.options.kind] }}. Función matemática ilustrativa; no
          representa la pérdida de la sesión L06.
        </p>
        <p v-else>
          {{ study.result.provenance?.source }}. El resto de parámetros está fijo. Un mínimo del
          corte no prueba mínimo de la red completa. Gradiente aproximado por diferencias centradas,
          h=10⁻⁴.
        </p>
        <p v-if="study.result.provenance">
          Eje x: {{ resultAxes[0] }} · eje y: {{ resultAxes[1] }}. Pérdida de datos:
          {{
            study.result.provenance.model.spec.task === 'binary'
              ? 'BCE'
              : study.result.provenance.model.spec.task === 'multiclass'
                ? 'Entropía cruzada categórica'
                : study.result.provenance.loss.toUpperCase()
          }}.
        </p>
        <p>
          Estudio registrado: {{ study.result.grid.resolution }}×{{
            study.result.grid.resolution
          }}
          puntos · tasa {{ study.result.options.rate }} ·
          {{ study.result.options.steps }} actualizaciones como máximo · clipping
          {{ study.result.options.clip }}. Los controles superiores preparan otro estudio.
        </p>
        <div class="actions">
          <button class="button secondary" :aria-pressed="view === '2d'" @click="view = '2d'">
            Contornos 2D</button
          ><button class="button secondary" :aria-pressed="view === '3d'" @click="view = '3d'">
            Malla 3D
          </button>
        </div>
        <LandscapePlot
          v-if="view === '2d'"
          :result="study.result"
          :index="study.index"
          @start="pick"
        />
        <Landscape3D
          v-else
          :result="study.result"
          :index="study.index"
          @unavailable="
            view = '2d';
            study.notice = 'WebGL no disponible. Se conservan contornos y tabla.';
          "
        />
        <p>
          Próximo inicio preparado: x={{ study.options.start[0].toPrecision(5) }}, y={{
            study.options.start[1].toPrecision(5)
          }}. Pulsa «Calcular paisaje y trayectorias» para registrarlo.
        </p>
        <div class="actions">
          <button class="button secondary" :disabled="study.index === 0" @click="move(-1)">
            Paso anterior</button
          ><button
            class="button"
            :disabled="prefs.reducedMotion || study.count < 2"
            @click="playback.toggle"
          >
            {{ playback.playing.value ? 'Pausar trayectoria' : 'Reproducir trayectoria' }}</button
          ><button
            class="button secondary"
            :disabled="study.index >= study.count - 1"
            @click="move(1)"
          >
            Paso siguiente
          </button>
        </div>
        <label
          >Paso inspeccionado {{ study.index
          }}<input
            v-model.number="study.index"
            type="range"
            min="0"
            :max="study.count - 1"
            step="1"
            aria-label="Paso de trayectoria"
            @input="playback.stop"
        /></label>
        <p>
          La velocidad y el movimiento reducido se controlan en Ajustes. Inspeccionar no vuelve a
          optimizar ni modifica la sesión.
        </p>
        <div class="table-scroll">
          <table aria-label="Trayectorias y gradientes">
            <caption>
              Estado por optimizador · x/y son coordenadas del paisaje
            </caption>
            <thead>
              <tr>
                <th>Método / trazo</th>
                <th>Paso</th>
                <th>x</th>
                <th>y</th>
                <th>Pérdida</th>
                <th>Gradiente original</th>
                <th>Aplicado</th>
                <th>Estado final</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(entry, i) in displayed" :key="entry.path.kind">
                <th>
                  {{ i + 1 }}. {{ entry.path.kind }} ·
                  {{ ['continuo', 'guiones', 'puntos', 'mixto'][i] }}
                </th>
                <template v-if="entry.point"
                  ><td>{{ entry.point.step }}</td>
                  <td>{{ entry.point.x.toPrecision(5) }}</td>
                  <td>{{ entry.point.y.toPrecision(5) }}</td>
                  <td>{{ entry.point.loss.toPrecision(6) }}</td>
                  <td>{{ entry.point.gradient.map((v) => v.toPrecision(4)).join(', ') }}</td>
                  <td>
                    {{ entry.point.applied.map((v) => v.toPrecision(4)).join(', ') }}
                  </td></template
                >
                <td v-else colspan="6">Sin punto finito</td>
                <td>
                  {{ statuses[entry.path.status]
                  }}<span v-if="entry.path.rejected">
                    · intento rechazado:
                    {{ entry.path.rejected.map((v) => v.toPrecision(4)).join(', ') }}</span
                  >
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Gradiente pequeño también ocurre en sillas o máximos. Salir del dominio detiene la
          trayectoria, sin recortar ni teletransportar el punto. Una tasa común no garantiza
          condiciones favorables para todos los métodos.
        </p>
        <button class="button secondary" @click="download">Exportar informe de paisaje</button>
        <p v-if="downloadError" role="alert">{{ downloadError }}</p>
      </section>
      <section class="training-panel">
        <h2>Predice, observa y explica</h2>
        <p>
          En el punto de silla, prueba empezar en (0,0): ¿pararse implica haber encontrado un
          mínimo? En Rosenbrock, compara una tasa alta con otra baja y después activa clipping. ¿Qué
          cambió en el gradiente aplicado?
        </p>
        <details>
          <summary>Rigor matemático</summary>
          <p>
            Momentum acumula v=0,9v+g; RMSprop usa ρ=0,9; Adam β₁=0,9, β₂=0,999 y corrección de
            sesgo; ε=10⁻⁸. Clipping: g·min(1,c/‖g‖₂), si c&gt;0. El coste se evalúa antes de cada
            actualización y los momentos se inicializan a cero.
          </p>
        </details>
      </section>
    </template>
  </div>
</template>
<style scoped>
.fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr));
  gap: 1.3rem;
}
.fields label {
  display: grid;
  gap: 0.5rem;
  min-width: 0;
}
select {
  width: 100%;
  min-width: 0;
}
fieldset {
  min-width: 0;
  padding: 1rem;
}
.actions {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  margin: 1rem 0;
}
.table-scroll {
  overflow-x: auto;
}
table {
  min-width: 850px;
}
th,
td {
  padding: 0.7rem;
  text-align: left;
  border-bottom: 1px solid var(--line);
}
caption {
  text-align: left;
  margin: 1rem 0;
  color: var(--muted);
}
input[type='range'] {
  width: 100%;
}
</style>
