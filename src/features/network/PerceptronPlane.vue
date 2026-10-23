<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { scaleLinear } from 'd3-scale';
import { boundaryLine, positiveRegion } from '@/domain/network/boundary';
import { xorInputs } from '@/domain/network/learning';
import { useI18n } from '@/app/i18n';
import type { JobResults } from '@/application/data/jobs';
const props = defineProps<{ result: JobResults['perceptron'] }>();
const { t } = useI18n();
const epoch = ref(-1);
watch(
  () => props.result,
  () => (epoch.value = -1),
);
const snapshot = computed(() =>
  epoch.value < 0 ? props.result.best : props.result.history[epoch.value]!,
);
const x = scaleLinear().domain([-0.2, 1.2]).range([45, 355]),
  y = scaleLinear().domain([-0.2, 1.2]).range([300, 20]);
const plane = computed(() => ({
  w1: snapshot.value.weights[0]!,
  w2: snapshot.value.weights[1]!,
  b: snapshot.value.bias,
}));
const boundary = computed(() => boundaryLine(plane.value));
const region = computed(() =>
  positiveRegion(plane.value)
    .map((p) => `${x(p[0])},${y(p[1])}`)
    .join(' '),
);
const targets = computed(() => props.result.targets);
const predictions = computed(() =>
  xorInputs.map((p) =>
    Number(plane.value.w1 * p[0]! + plane.value.w2 * p[1]! + plane.value.b >= 0),
  ),
);
</script>
<template>
  <section class="perceptron-plane">
    <h3>{{ t('net.plane') }}</h3>
    <label for="perceptron-frame"
      >{{ t('net.epoch') }} · {{ epoch < 0 ? t('net.best') : epoch + 1
      }}<input
        id="perceptron-frame"
        v-model.number="epoch"
        type="range"
        min="-1"
        :max="result.history.length - 1"
        step="1" /></label
    ><svg viewBox="0 0 410 345" role="img" :aria-label="t('net.plane')">
      <defs>
        <clipPath id="perceptron-plot"><rect x="45" y="20" width="310" height="280" /></clipPath>
      </defs>
      <g clip-path="url(#perceptron-plot)">
        <rect x="45" y="20" width="310" height="280" class="plane-background" />
        <rect
          v-if="boundary.kind === 'constant' && plane.b >= 0"
          x="45"
          y="20"
          width="310"
          height="280"
          class="plane-region"
        />
        <polygon v-else :points="region" class="plane-region" />
        <path
          v-if="boundary.kind === 'line'"
          :d="`M${x(boundary.points[0][0])} ${y(boundary.points[0][1])}L${x(boundary.points[1][0])} ${y(boundary.points[1][1])}`"
          class="plane-boundary"
        />
      </g>
      <g v-for="(p, i) in xorInputs" :key="i">
        <circle
          :cx="x(p[0]!)"
          :cy="y(p[1]!)"
          r="8"
          :class="['plane-point', { misclassified: targets[i] !== predictions[i] }]"
        />
        <text :x="x(p[0]!) + 12" :y="y(p[1]!) - 12">{{ targets[i] }} → {{ predictions[i] }}</text>
      </g>
      <text :x="x(0)" y="322">0</text>
      <text :x="x(1)" y="322">1 · x₁</text>
      <text x="15" :y="y(0)">0</text>
      <text x="15" :y="y(1)">1</text>
      <text x="10" y="15">x₂</text>
    </svg>
    <p class="small muted">{{ t('net.planeNote') }}</p>
  </section>
</template>
