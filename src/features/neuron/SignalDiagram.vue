<script setup lang="ts">
import { useI18n } from '@/app/i18n';
import { useNeuronStore } from '@/stores/neuron';
import { formatNumber as f } from '@/shared/utils/decimal';
defineProps<{ phase: number }>();
const { t } = useI18n();
const neuron = useNeuronStore();
</script>
<template>
  <svg
    class="signal-diagram"
    viewBox="0 0 620 270"
    role="img"
    :aria-label="t('neuron.diagramLabel')"
  >
    <title>{{ t('neuron.diagramLabel') }}</title>
    <g class="signal-links" :class="{ highlighted: phase >= 1 }">
      <path d="M90 75L270 135M90 205L270 135M320 135H390M440 135H530" />
    </g>
    <g class="signal-node" :class="{ highlighted: phase === 0 }">
      <circle cx="65" cy="75" r="28" />
      <circle cx="65" cy="205" r="28" />
      <text x="65" y="81">x₁</text>
      <text x="65" y="211">x₂</text>
    </g>
    <g class="signal-values">
      <text x="65" y="29">{{ f(neuron.config.x1) }}</text>
      <text x="65" y="257">{{ f(neuron.config.x2) }}</text>
      <text x="168" y="71">w₁ = {{ f(neuron.config.w1) }}</text>
      <text x="168" y="215">w₂ = {{ f(neuron.config.w2) }}</text>
    </g>
    <g v-if="phase >= 1" class="signal-products">
      <text x="178" y="102">{{ f(neuron.result.products[0]) }}</text>
      <text x="178" y="183">{{ f(neuron.result.products[1]) }}</text>
    </g>
    <g class="signal-node" :class="{ highlighted: phase === 2 }">
      <circle cx="295" cy="135" r="29" />
      <text x="295" y="143">Σ</text>
    </g>
    <g class="signal-values">
      <text x="295" y="75">b = {{ f(neuron.config.b) }}</text>
      <text x="295" y="200">z = {{ f(neuron.result.z) }}</text>
    </g>
    <g class="signal-node" :class="{ highlighted: phase === 3 }">
      <rect x="390" y="110" width="50" height="50" rx="13" />
      <text x="415" y="143">f</text>
    </g>
    <g class="signal-node output-node" :class="{ highlighted: phase === 4 }">
      <circle cx="558" cy="135" r="33" />
      <text x="558" y="143">a</text>
    </g>
    <text class="signal-result" x="558" y="200">{{ f(neuron.result.a) }}</text>
    <g class="signal-captions">
      <text x="295" y="238">{{ t('neuron.sum') }}</text>
      <text x="415" y="95">{{ t('neuron.activation') }}</text>
      <text x="558" y="238">{{ t('phase.output') }}</text>
    </g>
  </svg>
</template>
