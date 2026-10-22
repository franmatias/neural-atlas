<script setup lang="ts">
import { useI18n } from '@/app/i18n';
import { useNeuronStore } from '@/stores/neuron';
import { usePreferencesStore } from '@/stores/preferences';
import { formatNumber as f } from '@/shared/utils/decimal';
const { t } = useI18n();
const neuron = useNeuronStore();
const prefs = usePreferencesStore();
const levels = ['intuition', 'steps', 'formal'] as const;
</script>
<template>
  <aside class="panel inspector-panel" aria-labelledby="inspector-title">
    <h2 id="inspector-title">{{ t('neuron.inspector') }}</h2>
    <div class="level-switch" role="group" :aria-label="t('neuron.level')">
      <button
        v-for="level in levels"
        :key="level"
        :aria-pressed="prefs.value.level === level"
        @click="prefs.update({ level })"
      >
        {{ t(`level.${level}`) }}
      </button>
    </div>
    <div class="result-block">
      <span>{{ t('neuron.sum') }}</span
      ><output data-testid="sum" class="numeric">{{ f(neuron.result.z) }}</output
      ><small>z = w₁x₁ + w₂x₂ + b</small>
    </div>
    <div class="result-block main-result">
      <span>{{ t('neuron.output') }}</span
      ><output data-testid="output" class="numeric">{{ f(neuron.result.a) }}</output
      ><small>a = {{ t(`activation.${neuron.config.activation}`) }}(z)</small>
    </div>
    <p class="inspector-explanation">{{ t(`neuron.${prefs.value.level}`) }}</p>
    <table v-if="prefs.value.level !== 'intuition'" class="calculation-table">
      <caption>
        {{
          t('neuron.table')
        }}
      </caption>
      <thead>
        <tr>
          <th scope="col">{{ t('neuron.productLabel') }}</th>
          <th scope="col">{{ t('neuron.contribution') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">w₁x₁</th>
          <td>{{ f(neuron.result.products[0]) }}</td>
        </tr>
        <tr>
          <th scope="row">w₂x₂</th>
          <td>{{ f(neuron.result.products[1]) }}</td>
        </tr>
        <tr>
          <th scope="row">b</th>
          <td>{{ f(neuron.config.b) }}</td>
        </tr>
      </tbody>
    </table>
    <div v-if="prefs.value.level === 'formal'" class="derivative">
      <span>{{ t('neuron.derivative') }}</span
      ><strong>{{
        neuron.result.derivative === null
          ? t('neuron.noDerivative')
          : f(neuron.result.derivative, 6)
      }}</strong>
      <p v-if="neuron.config.activation === 'relu'" class="small muted">
        {{ t('neuron.zeroConvention') }}
      </p>
    </div>
    <p v-if="neuron.config.activation === 'step'" class="chart-status">
      {{ t('neuron.stepNote') }}
    </p>
    <div class="challenge">
      <p class="eyebrow">{{ t('neuron.challenge') }}</p>
      <p>{{ t('neuron.challengeText') }}</p>
    </div>
    <RouterLink class="text-link" to="/glosario">{{ t('neuron.readMore') }} →</RouterLink>
  </aside>
</template>
