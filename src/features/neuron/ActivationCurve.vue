<script setup lang="ts">
import { computed } from 'vue';
import { scaleLinear } from 'd3-scale';
import { line, curveLinear, curveStepAfter } from 'd3-shape';
import { useNeuronStore } from '@/stores/neuron';
import { activate } from '@/domain/network/neuron';
import { useI18n } from '@/app/i18n';
const { t } = useI18n();
const neuron = useNeuronStore();
const chart = computed(() => {
  const limit = Math.max(6, Math.ceil(Math.abs(neuron.result.z)));
  const x = scaleLinear().domain([-limit, limit]).range([40, 286]);
  const kind = neuron.config.activation;
  const range =
    kind === 'sigmoid' || kind === 'step'
      ? [-0.15, 1.15]
      : kind === 'tanh'
        ? [-1.2, 1.2]
        : [Math.min(-0.5, activate(-limit, kind)), limit];
  const y = scaleLinear().domain(range).range([236, 20]);
  const points = Array.from({ length: 241 }, (_, i): [number, number] => {
    const z = -limit + (i * limit) / 120;
    return [z, activate(z, kind)];
  });
  const path = line<[number, number]>()
    .x((p) => x(p[0]))
    .y((p) => y(p[1]))
    .curve(kind === 'step' ? curveStepAfter : curveLinear)(points);
  return { x, y, path, ticksX: [-limit, 0, limit], ticksY: y.ticks(4) };
});
</script>
<template>
  <section class="chart-panel">
    <h3>{{ t('neuron.curve') }}</h3>
    <p class="chart-hint">{{ t(`activation.${neuron.config.activation}`) }}</p>
    <svg
      class="activation-curve"
      viewBox="0 0 320 270"
      role="img"
      :aria-label="t('neuron.curveLabel')"
    >
      <g v-for="tick in chart.ticksX" :key="`x${tick}`" class="chart-grid">
        <path :d="`M${chart.x(tick)} 20V236`" />
        <text :x="chart.x(tick)" y="253" text-anchor="middle">{{ tick }}</text>
      </g>
      <g v-for="tick in chart.ticksY" :key="`y${tick}`" class="chart-grid">
        <path :d="`M40 ${chart.y(tick)}H286`" />
        <text x="31" :y="chart.y(tick) + 4" text-anchor="end">{{ tick }}</text>
      </g>
      <path :d="`M40 ${chart.y(0)}H286M${chart.x(0)} 20V236`" class="chart-axis" />
      <path :d="chart.path ?? ''" class="activation-path" />
      <path
        :d="`M${chart.x(neuron.result.z)} 236V${chart.y(neuron.result.a)}H40`"
        class="chart-projection"
      />
      <circle
        :cx="chart.x(neuron.result.z)"
        :cy="chart.y(neuron.result.a)"
        r="6"
        class="input-point"
      />
      <text x="300" y="241" class="axis-label">z</text>
      <text x="10" y="16" class="axis-label">a</text>
    </svg>
    <p class="chart-status">
      {{ t(neuron.config.activation === 'sigmoid' ? 'neuron.probability' : 'neuron.scalar') }}
    </p>
  </section>
</template>
