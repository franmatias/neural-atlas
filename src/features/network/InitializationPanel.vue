<script setup lang="ts">
import { computed, ref } from 'vue';
import { createNetwork, defaultSpec } from '@/domain/network/model';
import { backward } from '@/domain/network/backprop';
import { histogram } from '@/domain/network/inspection';
import { useI18n } from '@/app/i18n';
import { formatData } from '@/shared/utils/data-format';
import NetworkHistogram from './NetworkHistogram.vue';
import ParameterField from '@/shared/ui/ParameterField.vue';
const { t } = useI18n();
const seed = ref(42),
  layer = ref(0),
  activation = ref<'tanh' | 'relu'>('tanh');
const comparisons = computed(() =>
  (['zero', 'xavier', 'he'] as const).map((method) => {
    const model = createNetwork(
      { ...defaultSpec, hidden: [8, 8], activation: activation.value },
      seed.value,
      method,
    );
    const result = backward(model, [0.8, 0.2], 1);
    return {
      method,
      weights: histogram([...model.layers[layer.value]!.weights]),
      activations: histogram([...result.cache.activations[layer.value + 1]!]),
      gradient: result.gradient[layer.value]!,
    };
  }),
);
</script>
<template>
  <details class="panel network-section initialization-panel">
    <summary>{{ t('net.initialAdvanced') }}</summary>
    <p>{{ t('net.initialNote') }}</p>
    <div class="network-controls">
      <ParameterField
        id="init-seed"
        v-model="seed"
        :label="t('net.seed')"
        :min="0"
        :max="4294967295"
        :step="1"
      /><label for="init-layer"
        >{{ t('net.layer')
        }}<select id="init-layer" v-model.number="layer">
          <option v-for="n in 3" :key="n" :value="n - 1">{{ n }}</option>
        </select></label
      ><label for="init-activation"
        >{{ t('net.hiddenActivation')
        }}<select id="init-activation" v-model="activation">
          <option value="tanh">Tanh</option>
          <option value="relu">ReLU</option>
        </select></label
      >
    </div>
    <div class="network-three">
      <article v-for="c in comparisons" :key="c.method" class="network-initial-card">
        <h3>{{ t(`net.${c.method}`) }}</h3>
        <NetworkHistogram :data="c.weights" :label="t('net.histWeights')" /><NetworkHistogram
          :data="c.activations"
          :label="t('net.histActivations')"
        />
        <p>{{ t('net.norm') }}: {{ formatData(c.gradient.weightNorm) }}</p>
        <p>{{ t('net.biasNorm') }}: {{ formatData(c.gradient.biasNorm) }}</p>
      </article>
    </div>
    <p class="small muted">{{ t('net.initWarning') }}</p>
  </details>
</template>
