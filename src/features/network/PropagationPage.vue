<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '@/app/i18n';
import { usePropagationStore } from '@/stores/propagation';
import { usePreferencesStore } from '@/stores/preferences';
import { formatData } from '@/shared/utils/data-format';
import ParameterField from '@/shared/ui/ParameterField.vue';
import NetworkDiagram from './NetworkDiagram.vue';
import BatchesPanel from './BatchesPanel.vue';
import { usePhasePlayer } from './usePhasePlayer';
const { t } = useI18n();
const state = usePropagationStore(),
  prefs = usePreferencesStore();
const player = usePhasePlayer(8, () => state.trace);
const selected = ref('0:0');
const options = computed(() =>
  state.trace.model.layers.flatMap((l, layer) =>
    Array.from(l.weights, (_, index) => ({
      id: `${layer}:${index}`,
      layer,
      index,
      row: Math.floor(index / l.inputs),
      column: index % l.inputs,
    })),
  ),
);
const edge = computed(() => options.value.find((e) => e.id === selected.value)!);
const gradient = computed(
  () => state.trace.result.gradient[edge.value.layer]!.weights[edge.value.index]!,
);
const weight = computed(
  () => state.trace.model.layers[edge.value.layer]!.weights[edge.value.index]!,
);
const explanation = computed(() =>
  prefs.value.level === 'formal'
    ? 'net.propagationFormal'
    : prefs.value.level === 'steps'
      ? 'net.weightExplanation'
      : 'net.propagationIntuition',
);
const weightedTerms = computed(() =>
  Array.from(
    state.trace.model.layers[edge.value.layer]!.weights.slice(
      edge.value.row * state.trace.model.layers[edge.value.layer]!.inputs,
      (edge.value.row + 1) * state.trace.model.layers[edge.value.layer]!.inputs,
    ),
  )
    .map(
      (w, j) =>
        `${formatData(w)}×${formatData(state.trace.result.cache.activations[edge.value.layer]![j]!)}`,
    )
    .join(' + '),
);
function apply() {
  if (player.index.value === 7) state.apply();
}
</script>
<template>
  <div class="page network-page">
    <p class="eyebrow">L05 / forward → backward → update</p>
    <h1>{{ t('net.propagationTitle') }}</h1>
    <p class="muted">{{ t('net.propagationIntro') }}</p>
    <section class="panel network-section">
      <div class="network-controls">
        <ParameterField
          id="prop-x1"
          v-model="state.input[0]!"
          :label="t('net.inputValue', { index: 1 })"
          :min="-2"
          :max="2"
        /><ParameterField
          id="prop-x2"
          v-model="state.input[1]!"
          :label="t('net.inputValue', { index: 2 })"
          :min="-2"
          :max="2"
        /><label for="prop-target"
          >{{ t('net.target')
          }}<select id="prop-target" v-model.number="state.target">
            <option :value="0">0</option>
            <option :value="1">1</option>
          </select></label
        ><label for="prop-rate"
          >{{ t('net.rate') }} · {{ formatData(state.rate)
          }}<input
            id="prop-rate"
            type="range"
            min="-4"
            max="0"
            step="0.1"
            :value="Math.log10(state.rate)"
            @input="state.rate = 10 ** Number(($event.target as HTMLInputElement).value)"
        /></label>
      </div>
      <NetworkDiagram
        :model="state.trace.model"
        :phase="player.index.value"
        :playing="player.playing.value"
        :speed="prefs.value.speed"
        :cache="state.trace.result.cache"
        :layer="edge.layer"
        :neuron="edge.row"
      />
      <div class="chain-stages" role="group" :aria-label="t('net.propagationTitle')">
        <button
          v-for="i in 8"
          :key="i"
          :aria-pressed="player.index.value === i - 1"
          @click="player.move(i - 1)"
        >
          <span>{{ i }}</span
          >{{ t(`net.phase${i - 1}` as 'net.phase0') }}
        </button>
      </div>
      <div class="network-actions">
        <button
          class="button secondary"
          :disabled="player.index.value === 0"
          @click="player.move(player.index.value - 1)"
        >
          {{ t('net.previous') }}</button
        ><button class="button primary" :disabled="prefs.reducedMotion" @click="player.play">
          {{ t(player.playing.value ? 'net.pause' : 'net.play') }}</button
        ><button
          class="button secondary"
          :disabled="player.index.value === 7"
          @click="player.move(player.index.value + 1)"
        >
          {{ t('net.next') }}</button
        ><span>{{ prefs.value.speed }}×</span>
      </div>
      <p class="small muted">{{ t('net.noAutoUpdate') }}</p>
    </section>
    <div class="network-two">
      <section class="panel network-section trace-inspector">
        <h2>{{ t(`net.phase${player.index.value}` as 'net.phase0') }}</h2>
        <p>{{ t(explanation) }}</p>
        <div class="network-calculation">
          <code
            >x = [{{ state.trace.input.map(formatData).join(', ') }}], y={{
              state.trace.target
            }}</code
          >
          <div v-for="(layer, i) in state.trace.model.layers" :key="i">
            <p>
              W{{ i + 1 }} [{{ layer.outputs }},{{ layer.inputs }}] · b{{ i + 1 }} [{{
                layer.outputs
              }}]
            </p>
            <code v-if="player.index.value >= 1"
              >z{{ i + 1 }} = [{{
                Array.from(state.trace.result.cache.logits[i]!).map(formatData).join(', ')
              }}]</code
            ><code v-if="player.index.value >= 2"
              >a{{ i + 1 }} = {{ layer.activation }}(z{{ i + 1 }}) = [{{
                Array.from(state.trace.result.cache.activations[i + 1]!)
                  .map(formatData)
                  .join(', ')
              }}]</code
            ><code v-if="player.index.value >= 4"
              >δ{{ i + 1 }} = [{{
                Array.from(state.trace.result.gradient[i]!.delta).map(formatData).join(', ')
              }}]</code
            ><code v-if="player.index.value >= 6"
              >||dW{{ i + 1 }}||₂ = {{ formatData(state.trace.result.gradient[i]!.weightNorm) }} ·
              ||db{{ i + 1 }}||₂ = {{ formatData(state.trace.result.gradient[i]!.biasNorm) }}</code
            >
          </div>
          <p v-if="player.index.value >= 3" data-testid="trace-loss">
            BCE(z,y) = {{ formatData(state.trace.result.loss) }}
          </p>
        </div>
      </section>
      <section class="panel network-section">
        <h2>{{ t('net.connection') }}</h2>
        <label for="prop-weight"
          >{{ t('net.weight')
          }}<select id="prop-weight" v-model="selected">
            <option v-for="o in options" :key="o.id" :value="o.id">
              {{
                t('net.weightLayer', { layer: o.layer + 1, row: o.row + 1, column: o.column + 1 })
              }}
            </option>
          </select></label
        ><ParameterField
          id="prop-weight-value"
          :model-value="weight"
          :label="t('net.value')"
          :min="-5"
          :max="5"
          @update:model-value="state.editWeight(edge.layer, edge.index, $event)"
        />
        <p>{{ t('net.weightExplanation') }}</p>
        <code class="network-equation"
          >z[{{ edge.row + 1 }}] = {{ weightedTerms }} +
          {{ formatData(state.trace.model.layers[edge.layer]!.biases[edge.row]!) }}</code
        >
        <p v-if="player.index.value >= 5" class="network-equation" data-testid="selected-gradient">
          ∂L/∂w = {{ formatData(state.trace.result.gradient[edge.layer]!.delta[edge.row]!) }} ×
          {{ formatData(state.trace.result.cache.activations[edge.layer]![edge.column]!) }} =
          <strong>{{ formatData(gradient) }}</strong>
        </p>
        <p v-if="player.index.value === 7" class="network-equation">
          w′ = {{ formatData(weight) }} − {{ formatData(state.rate) }} ×
          {{ formatData(gradient) }} = {{ formatData(weight - state.rate * gradient) }}
        </p>
        <button
          class="button primary"
          :disabled="player.index.value !== 7 || state.applied"
          @click="apply"
        >
          {{ t('net.apply') }}
        </button>
        <p v-if="state.applied" class="data-status" role="status">{{ t('net.applied') }}</p>
        <p v-if="state.applied" data-testid="loss-change">
          {{ t('net.before') }}: {{ formatData(state.trace.result.loss) }} → {{ t('net.after') }}:
          {{ formatData(state.after!) }}
        </p>
        <p v-if="state.error" role="alert">{{ t('net.error') }}</p>
        <div class="network-actions">
          <button class="button secondary" @click="state.refresh">{{ t('net.newPass') }}</button
          ><button class="text-link" @click="state.reset">{{ t('net.reset') }}</button>
        </div>
      </section>
    </div>
    <section class="panel network-section">
      <h2>{{ t('net.checkReport') }}</h2>
      <p>{{ t('net.checkNote') }}</p>
      <button class="button primary" @click="state.check">{{ t('net.check') }}</button>
      <div v-if="state.report" class="data-table-scroll">
        <table class="dataset-table gradient-check">
          <thead>
            <tr>
              <th>θ</th>
              <th>{{ t('net.analytic') }}</th>
              <th>{{ t('net.numeric') }}</th>
              <th>{{ t('net.relative') }}</th>
              <th>{{ t('net.value') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in state.report" :key="i">
              <th scope="row">
                {{ row.layer + 1 }} · {{ row.kind === 'weight' ? 'W' : 'b' }}[{{ row.index + 1 }}]
              </th>
              <td>{{ formatData(row.analytic) }}</td>
              <td>{{ formatData(row.numeric) }}</td>
              <td>{{ row.relativeError.toExponential(2) }}</td>
              <td>
                {{
                  row.atKink
                    ? t('net.kink')
                    : row.relativeError <= 1e-5
                      ? t('net.passed')
                      : t('net.error')
                }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <BatchesPanel />
  </div>
</template>
