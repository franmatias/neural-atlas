<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { AugmentationReport } from '@/domain/data/augmentation';
import { usePreferencesStore } from '@/stores/preferences';
import { formatData } from '@/shared/utils/data-format';
const props = defineProps<{ report: AugmentationReport }>();
const selected = ref(0),
  showCopy = ref(true),
  prefs = usePreferencesStore();
watch(
  () => props.report,
  () => {
    selected.value = 0;
    showCopy.value = true;
  },
);
const example = computed(() => props.report.preview[selected.value]);
const dx = computed(() =>
  example.value?.original && example.value.transformed
    ? example.value.transformed[0] - example.value.original[0]
    : 0,
);
const dy = computed(() =>
  example.value?.original && example.value.transformed
    ? example.value.transformed[1] - example.value.original[1]
    : 0,
);
const reasons = {
  accepted: 'Copia aceptada',
  'invalid-source': 'Fuente no válida: sin copia',
  'attempts-exhausted': 'Diez intentos agotados: sin copia',
};
</script>
<template>
  <section class="training-panel augmentation-panel">
    <h2>Aumentar sin cambiar la etiqueta</h2>
    <p>
      Política
      {{
        report.policy === 'circles' ? 'círculos: frontera radial 0,5' : 'XOR: signo del producto'
      }}
      · semilla {{ report.seed }} · σ = {{ formatData(report.sigma) }}. Copias fijas, regeneradas de
      forma reproducible al recuperar el experimento.
    </p>
    <p role="status" class="augmentation-counts">
      {{ report.originals }} originales · {{ report.requested }} copias solicitadas ·
      {{ report.accepted }} aceptadas · {{ report.rejected }} rechazadas. Train efectivo:
      {{ report.originals + report.accepted }} filas.
    </p>
    <p>
      {{ report.attempts }} intentos geométricos; {{ report.invalidSources }} solicitudes con fuente
      no válida y {{ report.exhausted }} con intentos agotados. Se conserva la etiqueta limpia del
      generador, que aquí puede comprobarse con un oráculo.
    </p>
    <p>
      Validación, test y los datos originales no cambian. El pipeline se ajustó solo con train
      original y se reutiliza sin reajustarlo. Las copias no son observaciones independientes ni
      aumentan el soporte real de validación.
    </p>
    <p class="small muted">
      Curvas y objetivo mostrado evalúan originales; los gradientes usan el lote efectivo con
      copias.
    </p>
    <template v-if="example">
      <label
        >Solicitud de aumento para inspeccionar<select v-model.number="selected">
          <option v-for="(item, i) in report.preview" :key="i" :value="i">
            {{ i + 1 }} · {{ item.parentId }} · {{ reasons[item.status] }}
          </option>
        </select></label
      >
      <p class="augmentation-example">
        {{ reasons[example.status] }} · padre {{ example.parentId }} · etiqueta
        {{ example.label }} · intentos {{ example.attempts
        }}{{ example.copyId ? ' · ' + example.copyId : '' }}.
      </p>
      <div
        class="data-table-scroll"
        tabindex="0"
        role="region"
        aria-label="Coordenadas del aumento desplazables"
      >
        <table class="dataset-table" aria-label="Original y copia antes del escalado">
          <thead>
            <tr>
              <th scope="col">Coordenada base</th>
              <th scope="col">Original</th>
              <th scope="col">Copia</th>
              <th scope="col">Cambio</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="j in [0, 1]" :key="j">
              <th scope="row">x{{ j + 1 }}</th>
              <td>{{ example.original ? formatData(example.original[j]!) : '—' }}</td>
              <td>{{ example.transformed ? formatData(example.transformed[j]!) : '—' }}</td>
              <td>{{ example.transformed ? formatData(j === 0 ? dx : dy) : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <template v-if="example.transformed">
        <svg
          class="augmentation-detail"
          viewBox="0 0 340 260"
          role="img"
          aria-label="Detalle ampliado del desplazamiento de la copia"
        >
          <title>Desplazamiento en coordenadas base; círculo de radio 0,03</title>
          <line x1="35" y1="130" x2="305" y2="130" />
          <line x1="170" y1="25" x2="170" y2="235" />
          <circle cx="170" cy="130" r="90" class="radius" />
          <line x1="170" y1="130" :x2="170 + dx * 3000" :y2="130 - dy * 3000" />
          <circle cx="170" cy="130" r="7" class="original" />
          <g
            class="copy-marker"
            :style="{
              transform: `translate(${showCopy ? dx * 3000 : 0}px,${showCopy ? -dy * 3000 : 0}px)`,
              transitionDuration: (prefs.reducedMotion ? 0 : 600 / prefs.value.speed) + 'ms',
            }"
          >
            <path d="M 161 130 h 18 M 170 121 v 18" />
          </g>
          <text x="15" y="250">Centro = original · + = copia · radio = 0,03</text>
        </svg>
        <button class="button secondary" :aria-pressed="showCopy" @click="showCopy = !showCopy">
          Alternar posición original y copia
        </button>
        <p class="small muted">
          Posición mostrada: {{ showCopy ? 'copia' : 'original' }}. Detalle ampliado centrado en el
          original; la tabla conserva las coordenadas base. La animación respeta velocidad y
          movimiento reducido de Ajustes.
        </p>
      </template>
    </template>
    <p class="small muted">
      Vista de las primeras {{ report.preview.length }} solicitudes, de {{ report.requested }}. Los
      recuentos superiores incluyen todas. Solo se aceptan fuentes generadas, finitas, dentro de
      [−1,1]², con etiqueta actual y limpia coincidentes y margen suficiente. No se fuerza una copia
      si fallan sus intentos.
    </p>
  </section>
</template>
<style scoped>
.dataset-table td,
.dataset-table th {
  white-space: nowrap;
}
.augmentation-detail {
  width: min(100%, 420px);
  display: block;
  margin-block: 16px;
  color: inherit;
}
.augmentation-detail line,
.augmentation-detail circle,
.augmentation-detail path {
  stroke: currentColor;
  stroke-width: 2;
  fill: none;
}
.augmentation-detail .radius {
  stroke-dasharray: 5 5;
}
.augmentation-detail .copy-marker path {
  stroke-width: 4;
}
.augmentation-detail text {
  fill: currentColor;
  font-size: 13px;
}
.copy-marker {
  transition-property: transform;
}
</style>
