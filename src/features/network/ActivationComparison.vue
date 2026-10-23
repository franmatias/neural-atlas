<script setup lang="ts">
import { computed } from 'vue';
import { scaleLinear } from 'd3-scale';
import { line, curveStepAfter, curveLinear } from 'd3-shape';
import { activate, activationDerivative, type Activation } from '@/domain/network/neuron';
import { useI18n } from '@/app/i18n';
import { formatData } from '@/shared/utils/data-format';
const props = defineProps<{
  kind: Activation;
  compare: Activation;
  alpha: number;
  z: number;
  limit: number;
}>();
const { t } = useI18n();
const chart = computed(() => {
  const x = scaleLinear().domain([-props.limit, props.limit]).range([50, 590]);
  const series = [props.kind, props.compare].flatMap((kind, k) =>
    [false, true].map((derivative) => ({
      kind,
      k,
      derivative,
      points: Array.from({ length: 401 }, (_, i) => {
        const z = -props.limit + (i * props.limit) / 200;
        return {
          z,
          v: derivative
            ? activationDerivative(z, kind, props.alpha)
            : activate(z, kind, props.alpha),
        };
      }),
    })),
  );
  const values = series.flatMap((s) => s.points.flatMap((p) => (p.v === null ? [] : [p.v])));
  const min = Math.min(-0.1, ...values),
    max = Math.max(1.1, ...values);
  const y = scaleLinear().domain([min, max]).nice().range([270, 20]);
  return {
    x,
    y,
    ticks: y.ticks(5),
    series: series.map((s) => ({
      ...s,
      path: line<{ z: number; v: number | null }>()
        .defined((p) => p.v !== null)
        .x((p) => x(p.z))
        .y((p) => y(p.v!))
        .curve(s.kind === 'step' ? curveStepAfter : curveLinear)(s.points),
    })),
  };
});
</script>
<template>
  <section class="panel network-section">
    <h2>{{ t('net.curve') }}</h2>
    <svg viewBox="0 0 640 310" class="network-curve" role="img" :aria-label="t('net.curve')">
      <g v-for="tick in chart.ticks" :key="tick" class="chart-grid">
        <path :d="`M50 ${chart.y(tick)}H590`" />
        <text x="42" :y="chart.y(tick) + 4" text-anchor="end">{{ formatData(tick) }}</text>
      </g>
      <path :d="`M50 ${chart.y(0)}H590M${chart.x(0)} 20V270`" class="chart-axis" />
      <path
        v-for="(s, i) in chart.series"
        :key="i"
        :d="s.path ?? ''"
        :class="['network-function', { comparison: s.k === 1, derivative: s.derivative }]"
      />
      <path :d="`M${chart.x(z)} 20V270`" class="chart-projection" />
      <text x="50" y="299">{{ -limit }}</text>
      <text x="580" y="299">{{ limit }} · z</text>
    </svg>
    <div class="network-legend">
      <span>━ {{ t(`activation.${kind}`) }} f</span><span>┄ {{ t('net.derivative') }} f′</span
      ><span class="compare-label">━ {{ t(`activation.${compare}`) }} g · ┄ g′</span>
    </div>
    <div class="network-metrics">
      <span
        >f({{ formatData(z) }}) =
        <strong data-testid="activation-value">{{
          formatData(activate(z, kind, alpha))
        }}</strong></span
      ><span
        >f′ =
        {{
          activationDerivative(z, kind, alpha) === null
            ? t('net.notDerivative')
            : formatData(activationDerivative(z, kind, alpha)!)
        }}</span
      >
    </div>
    <p v-if="kind === 'step' || compare === 'step'" class="network-explanation">
      {{ t('net.stepNote') }}
    </p>
    <p
      v-else-if="Math.abs(activationDerivative(z, kind, alpha)!) < 0.001"
      class="network-explanation"
    >
      {{ t('net.saturation') }}
    </p>
    <p class="small muted">{{ t('net.reluNote') }}</p>
  </section>
</template>
