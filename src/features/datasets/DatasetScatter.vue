<script setup lang="ts">
import { computed } from 'vue';
import { scaleLinear } from 'd3-scale';
import { useI18n } from '@/app/i18n';
import { useDatasetsStore } from '@/stores/datasets';
import { formatData } from '@/shared/utils/data-format';
import type { SplitName } from '@/domain/data/types';
const props = defineProps<{
  xId: string;
  yId: string;
  prepared: boolean;
  filter: SplitName | 'all';
  mode: 'inspect' | 'add' | 'move';
}>();
const emit = defineEmits<{ point: [x: number, y: number] }>();
const { t } = useI18n();
const data = useDatasetsStore();
const values = computed(() => {
  const ids = props.filter !== 'all' ? new Set(data.split?.[props.filter] ?? []) : undefined;
  const xi = data.prepared?.pipeline.outputFeatureIds.indexOf(props.xId) ?? -1;
  const yi = data.prepared?.pipeline.outputFeatureIds.indexOf(props.yId) ?? -1;
  return data.dataset.rows
    .map((row, index) => ({
      row,
      x: props.prepared ? data.prepared?.matrix[index]?.[xi] : row.features[props.xId],
      y: props.prepared ? data.prepared?.matrix[index]?.[yi] : row.features[props.yId],
    }))
    .filter((item) => !ids || ids.has(item.row.id));
});
const valid = computed(() =>
  values.value.filter(
    (p): p is typeof p & { x: number; y: number } =>
      typeof p.x === 'number' &&
      typeof p.y === 'number' &&
      Number.isFinite(p.x) &&
      Number.isFinite(p.y),
  ),
);
const visible = computed(() => {
  const points = valid.value.slice(0, 1500);
  const selected = valid.value.find((p) => p.row.id === data.selectedId);
  if (selected && !points.includes(selected)) points.push(selected);
  return points;
});
function makeScale(numbers: number[], range: number[]) {
  const factor = Math.max(1, ...numbers.map(Math.abs));
  const normalized = numbers.map((n) => n / factor);
  const min = Math.min(...normalized, 0);
  const max = Math.max(...normalized, 0);
  const scale = scaleLinear()
    .domain(min === max ? [-1, 1] : [min, max])
    .nice()
    .range(range);
  return {
    scale,
    factor,
    ticks: scale.ticks(5).filter((n) => Number.isFinite(n * factor)),
    position: (n: number) => scale(n / factor),
    invert: (n: number) => scale.invert(n) * factor,
  };
}
const x = computed(() =>
  makeScale(
    valid.value.map((p) => p.x),
    [58, 654],
  ),
);
const y = computed(() =>
  makeScale(
    valid.value.map((p) => p.y),
    [330, 24],
  ),
);
const splitById = computed(
  () =>
    new Map(
      (['train', 'validation', 'test'] as const).flatMap((name) =>
        (data.split?.[name] ?? []).map((id) => [id, name] as const),
      ),
    ),
);
const colors = [
  'var(--accent)',
  'var(--orange)',
  'var(--class-blue)',
  'var(--class-purple)',
  'var(--class-pink)',
  'var(--class-olive)',
  'var(--class-cyan)',
  'var(--class-red)',
  'var(--class-gray)',
  'var(--class-violet)',
];
function color(target: string | number | null) {
  return target === null
    ? 'var(--muted)'
    : data.dataset.task === 'regression'
      ? 'var(--accent)'
      : colors[Math.max(0, data.dataset.classOrder!.indexOf(String(target)))]!;
}
function click(event: MouseEvent) {
  const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
  const px = ((event.clientX - rect.left) / rect.width) * 700;
  const py = ((event.clientY - rect.top) / rect.height) * 390;
  if (px < 58 || px > 654 || py < 24 || py > 330) return;
  if (props.mode !== 'inspect' && !props.prepared) {
    emit('point', x.value.invert(px), y.value.invert(py));
    return;
  }
  let distance = 18;
  let id = '';
  for (const point of visible.value) {
    const d = Math.hypot(x.value.position(point.x) - px, y.value.position(point.y) - py);
    if (d < distance) {
      distance = d;
      id = point.row.id;
    }
  }
  if (id) data.selectedId = id;
}
function keyboard(event: KeyboardEvent) {
  if (
    !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter'].includes(event.key) ||
    !visible.value.length
  )
    return;
  event.preventDefault();
  const current = visible.value.findIndex((p) => p.row.id === data.selectedId);
  const delta =
    event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : event.key === 'Enter' ? 0 : 1;
  data.selectedId =
    visible.value[
      (Math.max(0, current) + delta + visible.value.length) % visible.value.length
    ]!.row.id;
}
const bins = computed(() => {
  const counts = Array.from({ length: 12 }, () => 0);
  const [min, max] = x.value.scale.domain() as [number, number];
  for (const p of valid.value)
    counts[
      Math.max(0, Math.min(11, Math.floor(((p.x / x.value.factor - min) / (max - min)) * 12)))
    ]!++;
  return counts;
});
</script>
<template>
  <section class="panel dataset-scatter">
    <div class="panel-heading">
      <h2>{{ t('data.scatter') }}</h2>
      <span class="visual-badge">{{ prepared ? t('data.transformed') : t('data.raw') }}</span>
    </div>
    <p class="small muted">{{ t('data.plotHint') }}</p>
    <svg
      class="data-map"
      viewBox="0 0 700 390"
      role="group"
      tabindex="0"
      :aria-label="t('data.plotLabel')"
      @click="click"
      @keydown="keyboard"
    >
      <rect x="58" y="24" width="596" height="306" class="map-area" />
      <g v-for="tick in x.ticks" :key="`x${tick}`" class="chart-grid">
        <path :d="`M${x.scale(tick)} 24V330`" />
        <text :x="x.scale(tick)" y="355" text-anchor="middle">
          {{ formatData(tick * x.factor) }}
        </text>
      </g>
      <g v-for="tick in y.ticks" :key="`y${tick}`" class="chart-grid">
        <path :d="`M58 ${y.scale(tick)}H654`" />
        <text x="48" :y="y.scale(tick) + 4" text-anchor="end">
          {{ formatData(tick * y.factor) }}
        </text>
      </g>
      <g
        v-for="p in visible"
        :key="p.row.id"
        :transform="`translate(${x.position(p.x)},${y.position(p.y)})`"
        class="data-point"
        :class="{ chosen: data.selectedId === p.row.id }"
        :style="{ color: color(p.row.target) }"
      >
        <title>
          {{ p.row.id }} · x={{ formatData(p.x) }}, y={{ formatData(p.y) }} ·
          {{ p.row.target ?? '∅' }}
        </title>
        <circle v-if="!splitById.has(p.row.id) || splitById.get(p.row.id) === 'train'" r="4.5" />
        <rect
          v-else-if="splitById.get(p.row.id) === 'validation'"
          x="-4"
          y="-4"
          width="8"
          height="8"
        />
        <path v-else d="M0 -6L6 0L0 6L-6 0Z" />
        <circle v-if="data.selectedId === p.row.id" r="9" class="selection-ring" />
      </g>
      <text x="356" y="382" class="map-axis-title" text-anchor="middle">
        {{
          prepared
            ? data.prepared?.pipeline.outputLabels[
                data.prepared.pipeline.outputFeatureIds.indexOf(xId)
              ]
            : data.dataset.features.find((f) => f.id === xId)?.name
        }}
      </text>
      <text x="10" y="16" class="map-axis-title">
        {{ prepared ? 'X' : data.dataset.features.find((f) => f.id === yId)?.name }}
      </text>
    </svg>
    <div class="data-map-legend">
      <span v-for="(c, index) in data.dataset.classOrder" :key="c"
        ><i :style="{ background: colors[index] }" />{{
          t('data.class', { name: formatData(c) })
        }}</span
      ><span v-if="data.dataset.task === 'regression'">{{ t('data.regression') }}</span>
    </div>
    <p v-if="values.length > valid.length" class="chart-status">
      {{ t('data.plotOmitted', { count: values.length - valid.length }) }}
    </p>
    <p v-if="valid.length > 1500" class="chart-status">
      {{ t('data.plotLimited', { shown: visible.length, total: valid.length }) }}
    </p>
    <div class="data-histogram">
      <h3>{{ t('data.histogram') }}</h3>
      <svg viewBox="0 0 700 90" role="img" :aria-label="t('data.histogram')">
        <rect
          v-for="(count, index) in bins"
          :key="index"
          :x="58 + index * 49.66"
          :y="70 - (count / Math.max(1, ...bins)) * 56"
          width="44"
          :height="(count / Math.max(1, ...bins)) * 56"
        />
        <text x="58" y="88">{{ valid.length }} {{ t('data.rows') }}</text>
      </svg>
    </div>
  </section>
</template>
