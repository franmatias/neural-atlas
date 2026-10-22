<script setup lang="ts">
import { computed } from 'vue';
import { scaleLinear } from 'd3-scale';
import { useI18n } from '@/app/i18n';
import { useNeuronStore } from '@/stores/neuron';
import { boundaryLine, positiveRegion, type Point } from '@/domain/network/boundary';
const { t } = useI18n();
const neuron = useNeuronStore();
const x = scaleLinear().domain([-2, 2]).range([40, 278]);
const y = scaleLinear().domain([-2, 2]).range([236, 20]);
const ticks = [-2, -1, 0, 1, 2];
const boundary = computed(() => boundaryLine(neuron.config));
const allZero = computed(
  () => neuron.config.w1 === 0 && neuron.config.w2 === 0 && neuron.config.b === 0,
);
const region = computed(() =>
  positiveRegion(neuron.config)
    .map((p: Point) => `${x(p[0])},${y(p[1])}`)
    .join(' '),
);
function select(event: MouseEvent) {
  const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
  const px = ((event.clientX - rect.left) / rect.width) * 320;
  const py = ((event.clientY - rect.top) / rect.height) * 270;
  if (px < 40 || px > 278 || py < 20 || py > 236) return;
  neuron.update({ x1: Number(x.invert(px).toFixed(2)), x2: Number(y.invert(py).toFixed(2)) });
}
function move(event: KeyboardEvent) {
  const delta: Record<string, readonly [number, number]> = {
    ArrowRight: [0.05, 0],
    ArrowLeft: [-0.05, 0],
    ArrowUp: [0, 0.05],
    ArrowDown: [0, -0.05],
  };
  const change = delta[event.key];
  if (!change) return;
  event.preventDefault();
  const clamp = (value: number) => Math.max(-2, Math.min(2, Number(value.toFixed(2))));
  neuron.update({
    x1: clamp(neuron.config.x1 + change[0]),
    x2: clamp(neuron.config.x2 + change[1]),
  });
}
</script>
<template>
  <section class="chart-panel">
    <h3>{{ t('neuron.boundary') }}</h3>
    <p class="chart-hint">{{ t('neuron.boundaryHint') }}</p>
    <svg
      class="input-plane"
      viewBox="0 0 320 270"
      tabindex="0"
      role="group"
      :aria-label="t('neuron.boundaryLabel')"
      @click="select"
      @keydown="move"
    >
      <defs>
        <pattern id="negative-hatch" width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M-2 2L2 -2M0 8L8 0M6 10L10 6" class="hatch-line" />
        </pattern>
      </defs>
      <rect x="40" y="20" width="238" height="216" class="plane-negative" />
      <rect v-if="!allZero" x="40" y="20" width="238" height="216" fill="url(#negative-hatch)" />
      <polygon v-if="region" :points="region" class="plane-positive" />
      <g v-for="tick in ticks" :key="tick" class="chart-grid">
        <path :d="`M${x(tick)} 20V236M40 ${y(tick)}H278`" />
        <text :x="x(tick)" y="253" text-anchor="middle">{{ tick }}</text>
        <text x="29" :y="y(tick) + 4" text-anchor="end">{{ tick }}</text>
      </g>
      <path :d="`M${x(0)} 20V236M40 ${y(0)}H278`" class="chart-axis" />
      <line
        v-if="boundary.kind === 'line'"
        :x1="x(boundary.points[0][0])"
        :y1="y(boundary.points[0][1])"
        :x2="x(boundary.points[1][0])"
        :y2="y(boundary.points[1][1])"
        class="decision-line"
      />
      <circle
        v-if="boundary.kind === 'point'"
        :cx="x(boundary.point[0])"
        :cy="y(boundary.point[1])"
        r="4"
        class="boundary-point"
      />
      <circle :cx="x(neuron.config.x1)" :cy="y(neuron.config.x2)" r="7" class="input-point" />
      <text x="296" y="241" class="axis-label">x₁</text>
      <text x="15" y="16" class="axis-label">x₂</text>
    </svg>
    <div class="chart-legend">
      <span v-if="allZero">{{ t('neuron.zeroPlane') }}</span>
      <template v-else
        ><span class="negative-key">{{ t('neuron.negative') }}</span
        ><span class="positive-key">{{ t('neuron.positive') }}</span
        ><span class="line-key">{{ t('neuron.frontier') }}</span></template
      >
    </div>
    <p v-if="boundary.kind !== 'line'" class="chart-status" role="status">
      {{
        t(
          boundary.kind === 'constant'
            ? 'neuron.constant'
            : boundary.kind === 'point'
              ? 'neuron.tangent'
              : 'neuron.outside',
        )
      }}
    </p>
  </section>
</template>
