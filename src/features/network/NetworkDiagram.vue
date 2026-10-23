<script setup lang="ts">
import { computed } from 'vue';
import type { Network, Forward } from '@/domain/network/model';
import { useI18n } from '@/app/i18n';
import { formatData } from '@/shared/utils/data-format';
const props = defineProps<{
  model: Network;
  cache?: Forward;
  layer: number;
  neuron: number;
  phase?: number;
  playing?: boolean;
  speed?: number;
}>();
const { t } = useI18n();
const nodes = computed(() =>
  [props.model.spec.inputs, ...props.model.layers.map((l) => l.outputs)].map((n, l) =>
    Array.from({ length: Math.min(n, 12) }, (_, i) => ({
      i: n > 12 && i === 11 ? n - 1 : i,
      x: 50 + (l * 800) / props.model.layers.length,
      y: 35 + (i * 250) / Math.max(1, Math.min(n, 12) - 1),
      l,
    })),
  ),
);
const edges = computed(() =>
  nodes.value.slice(1).flatMap((layer, i) =>
    layer.flatMap((to) =>
      nodes.value[i]!.map((from) => ({
        from,
        to,
        w: props.model.layers[i]!.weights[to.i * props.model.layers[i]!.inputs + from.i]!,
      })),
    ),
  ),
);
</script>
<template>
  <div
    class="network-diagram"
    :class="{ flowing: playing }"
    :data-flow="phase !== undefined && phase >= 4 && phase <= 6 ? 'backward' : 'forward'"
    :style="{ '--trace-duration': `${1.1 / (speed ?? 1)}s` }"
  >
    <svg viewBox="0 0 900 330" role="img" :aria-label="t('net.diagram')">
      <g v-for="(edge, i) in edges" :key="i">
        <path
          :d="`M${edge.from.x} ${edge.from.y}L${edge.to.x} ${edge.to.y}`"
          :class="[
            'network-edge',
            {
              negative: edge.w < 0,
              'edge-selected': edge.to.l === layer + 1 && edge.to.i === neuron,
            },
          ]"
          :stroke-width="Math.min(3, 0.5 + Math.abs(edge.w))"
        />
        <path
          v-if="phase !== undefined && [1, 2, 4, 5, 6].includes(phase)"
          :d="`M${edge.from.x} ${edge.from.y}L${edge.to.x} ${edge.to.y}`"
          class="network-trace"
        />
      </g>
      <g v-for="(column, l) in nodes" :key="l">
        <g v-for="node in column" :key="node.i">
          <circle
            :cx="node.x"
            :cy="node.y"
            r="17"
            :class="['network-node', { 'node-selected': l === layer + 1 && node.i === neuron }]"
          />
          <text :x="node.x" :y="node.y + 4" text-anchor="middle">
            {{ cache ? formatData(cache.activations[l]![node.i]!) : `#${node.i + 1}` }}
          </text>
        </g>
        <text :x="column[0]!.x" y="319" text-anchor="middle">
          {{ l === 0 ? 'x' : `a${l}` }} [{{
            l === 0 ? model.spec.inputs : model.layers[l - 1]!.outputs
          }}]
        </text>
      </g>
    </svg>
    <p class="small muted">{{ t('net.grouped') }}</p>
    <p class="small muted">W ≥ 0 ━ · W &lt; 0 ┄</p>
  </div>
</template>
