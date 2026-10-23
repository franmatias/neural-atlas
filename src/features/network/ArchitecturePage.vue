<script setup lang="ts">
import { computed, onScopeDispose, ref } from 'vue';
import { useI18n } from '@/app/i18n';
import { useArchitectureStore } from '@/stores/architecture';
import {
  defaultSpec,
  parameterCount,
  forward,
  type NetworkSpec,
  type Initialization,
} from '@/domain/network/model';
import { activations } from '@/domain/network/neuron';
import { xorInputs, xorTargets } from '@/domain/network/learning';
import { formatData } from '@/shared/utils/data-format';
import ParameterField from '@/shared/ui/ParameterField.vue';
import NetworkDiagram from './NetworkDiagram.vue';
import ActivationMap from './ActivationMap.vue';
import NetworkHistogram from './NetworkHistogram.vue';
import PerceptronPlane from './PerceptronPlane.vue';
const { t } = useI18n();
const state = useArchitectureStore();
const draft = ref<NetworkSpec>({ ...defaultSpec, hidden: [4] });
const seed = ref(42),
  rate = ref(0.1),
  epochs = ref(100);
const problem = ref<'and' | 'xor'>('xor');
const initialization = ref<Initialization>('xavier');
const matrixPage = ref(0);
const draftCount = computed(() => {
  try {
    return parameterCount(draft.value);
  } catch {
    return '—';
  }
});
const rows = computed(() =>
  Array.from({ length: state.selected.outputs }, (_, i) => i).slice(
    matrixPage.value * 8,
    matrixPage.value * 8 + 8,
  ),
);
const xorPredictions = computed(() =>
  state.model.spec.inputs === 2
    ? xorInputs.map((x) => forward(state.model, x).activations.at(-1)!)
    : [],
);
function initialize() {
  state.initialize(
    { ...draft.value, hidden: [...draft.value.hidden] },
    seed.value,
    initialization.value,
  );
  matrixPage.value = 0;
}
function tab(mode: 'single' | 'xor' | 'build') {
  state.cancel();
  state.mode = mode;
}
onScopeDispose(state.cancel);
</script>
<template>
  <div class="page network-page">
    <p class="eyebrow">L03 / {{ t('net.hidden') }}</p>
    <h1>{{ t('net.archTitle') }}</h1>
    <p class="muted">{{ t('net.archIntro') }}</p>
    <div class="data-view-switch" role="group" :aria-label="t('net.archTitle')">
      <button
        v-for="item in ['single', 'xor', 'build'] as const"
        :key="item"
        :aria-pressed="state.mode === item"
        @click="tab(item)"
      >
        {{ t(`net.${item}`) }}
      </button>
    </div>
    <p v-if="state.error" role="alert" class="field-error">{{ t('net.error') }}</p>
    <div v-if="state.busy" role="status" class="data-status">
      {{ t('net.busy') }}
      <button class="text-link" @click="state.cancel">{{ t('net.cancel') }}</button>
    </div>
    <section v-if="state.mode === 'single'" class="panel network-section">
      <h2>{{ t('net.single') }}</h2>
      <p>{{ t('net.perceptronRule') }}</p>
      <form class="network-controls" @submit.prevent="state.train(problem, seed, rate, epochs)">
        <label for="perceptron-problem"
          >{{ t('net.problem')
          }}<select
            id="perceptron-problem"
            v-model="problem"
            @change="state.perceptron = undefined"
          >
            <option value="xor">{{ t('net.xorData') }}</option>
            <option value="and">{{ t('net.and') }}</option>
          </select></label
        ><ParameterField
          id="perceptron-seed"
          v-model="seed"
          :label="t('net.seed')"
          :min="0"
          :max="4294967295"
          :step="1"
        /><ParameterField
          id="perceptron-rate"
          v-model="rate"
          :label="t('net.rate')"
          :min="0.001"
          :max="1"
          :step="0.001"
        /><ParameterField
          id="perceptron-epochs"
          v-model="epochs"
          :label="t('net.epochs')"
          :min="1"
          :max="1000"
          :step="1"
        /><button class="button primary" :disabled="state.busy">
          {{ t('net.runPerceptron') }}
        </button>
      </form>
      <div v-if="state.perceptron" class="network-result" role="status">
        <strong data-testid="perceptron-score"
          >{{ state.perceptron.best.correct }} / 4 · {{ t('net.correct') }}</strong
        >
        <p>{{ t(state.perceptron.converged ? 'net.converged' : 'net.budget') }}</p>
        <code
          >w=[{{ state.perceptron.best.weights.map(formatData).join(', ') }}], b={{
            formatData(state.perceptron.best.bias)
          }}</code
        >
        <p>{{ t('net.completed') }}: {{ state.perceptron.epochs }}</p>
        <details>
          <summary>{{ t('net.epochs') }}</summary>
          <div class="data-table-scroll">
            <table class="dataset-table">
              <thead>
                <tr>
                  <th>{{ t('net.epoch') }}</th>
                  <th>y ≠ ŷ</th>
                  <th>{{ t('net.correct') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="h in state.perceptron.history" :key="h.epoch">
                  <td>{{ h.epoch }}</td>
                  <td>{{ h.mistakes }}</td>
                  <td>{{ h.correct }} / 4</td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>
      </div>
      <p class="network-explanation">{{ t('net.xorProof') }}</p>
    </section>
    <PerceptronPlane
      v-if="state.mode === 'single' && state.perceptron"
      :result="state.perceptron"
    />
    <section v-if="state.mode === 'xor'" class="panel network-section">
      <h2>{{ t('net.xor') }}</h2>
      <p>{{ t('net.fixedNote') }}</p>
      <div class="network-actions">
        <button class="button secondary" @click="state.fixed">{{ t('net.fixed') }}</button
        ><ParameterField
          id="xor-seed"
          v-model="seed"
          :label="t('net.seed')"
          :min="0"
          :max="4294967295"
          :step="1"
        /><button class="button primary" :disabled="state.busy" @click="state.solve(seed)">
          {{ t('net.solve') }}
        </button>
      </div>
      <p class="small muted">{{ t('net.solveNote') }}</p>
      <div v-if="state.solution" class="network-metrics" role="status">
        <strong data-testid="xor-score">{{ state.solution.correct }} / 4</strong
        ><span>{{ t('net.completed') }}: {{ state.solution.epochs }}</span
        ><span>BCE: {{ formatData(state.solution.loss) }}</span>
      </div>
      <table v-if="xorPredictions.length" class="dataset-table">
        <thead>
          <tr>
            <th>x₁</th>
            <th>x₂</th>
            <th>y XOR</th>
            <th>ŷ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(x, i) in xorInputs" :key="i">
            <td>{{ x[0] }}</td>
            <td>{{ x[1] }}</td>
            <td>{{ xorTargets[i] }}</td>
            <td>{{ Array.from(xorPredictions[i]!).map(formatData).join(', ') }}</td>
          </tr>
        </tbody>
      </table>
    </section>
    <form v-if="state.mode === 'build'" class="panel network-section" @submit.prevent="initialize">
      <h2>{{ t('net.build') }}</h2>
      <div class="network-controls">
        <label for="net-task"
          >{{ t('net.task')
          }}<select id="net-task" v-model="draft.task">
            <option
              v-for="task in ['binary', 'multiclass', 'regression'] as const"
              :key="task"
              :value="task"
            >
              {{ t(`net.${task}`) }}
            </option>
          </select></label
        ><label for="net-inputs"
          >{{ t('net.inputs')
          }}<input
            id="net-inputs"
            v-model.number="draft.inputs"
            type="number"
            min="1"
            max="32"
            step="1"
            required /></label
        ><label v-if="draft.task === 'multiclass'" for="net-classes"
          >{{ t('net.classes')
          }}<input
            id="net-classes"
            v-model.number="draft.classes"
            type="number"
            min="2"
            max="10"
            step="1"
            required /></label
        ><label for="net-activation"
          >{{ t('net.hiddenActivation')
          }}<select id="net-activation" v-model="draft.activation">
            <option v-for="a in activations.filter((v) => v !== 'step')" :key="a" :value="a">
              {{ t(`activation.${a}`) }}
            </option>
          </select></label
        ><label for="net-init"
          >{{ t('net.initialization')
          }}<select id="net-init" v-model="initialization">
            <option
              v-for="method in ['zero', 'xavier', 'he'] as const"
              :key="method"
              :value="method"
            >
              {{ t(`net.${method}`) }}
            </option>
          </select></label
        ><ParameterField
          id="net-seed"
          v-model="seed"
          :label="t('net.seed')"
          :min="0"
          :max="4294967295"
          :step="1"
        />
      </div>
      <fieldset>
        <legend>{{ t('net.hidden') }} · {{ draft.hidden.length }} / 6</legend>
        <div class="network-controls">
          <label v-for="(_, i) in draft.hidden" :key="i" :for="`net-width-${i}`"
            >{{ t('net.width', { layer: i + 1 })
            }}<input
              :id="`net-width-${i}`"
              v-model.number="draft.hidden[i]"
              type="number"
              min="1"
              max="64"
              step="1"
              required
          /></label>
        </div>
        <div class="network-actions">
          <button
            class="button secondary"
            type="button"
            :disabled="draft.hidden.length === 6"
            @click="draft.hidden.push(4)"
          >
            {{ t('net.addLayer') }}</button
          ><button
            class="button secondary"
            type="button"
            :disabled="!draft.hidden.length"
            @click="draft.hidden.pop()"
          >
            {{ t('net.removeLayer') }}
          </button>
        </div>
      </fieldset>
      <p>
        {{ t('net.parameters') }}: <strong data-testid="draft-parameters">{{ draftCount }}</strong>
      </p>
      <p class="small muted">{{ t('net.countFormula') }}</p>
      <button class="button primary">{{ t('net.initialize') }}</button>
      <p class="small muted">{{ t('net.draft') }}</p>
    </form>
    <section class="panel network-section">
      <div class="panel-heading">
        <h2>{{ t('net.diagram') }}</h2>
        <span class="visual-badge">{{ parameterCount(state.model.spec) }} θ</span>
      </div>
      <p class="data-status">
        {{ t(`net.${state.source}`) }} · {{ t(`net.${state.model.spec.task}`) }}
      </p>
      <NetworkDiagram
        :model="state.model"
        :cache="state.inspection?.cache"
        :layer="state.layer"
        :neuron="state.neuron"
      />
      <div class="network-controls">
        <label for="net-layer"
          >{{ t('net.layer')
          }}<select id="net-layer" v-model.number="state.layer" @change="matrixPage = 0">
            <option v-for="(l, i) in state.model.layers" :key="i" :value="i">
              {{ i + 1 }} · [{{ l.outputs }},{{ l.inputs }}] · {{ l.activation }}
            </option>
          </select></label
        ><label for="net-neuron"
          >{{ t('net.neuron')
          }}<select id="net-neuron" v-model.number="state.neuron">
            <option v-for="n in state.selected.outputs" :key="n" :value="n - 1">{{ n }}</option>
          </select></label
        ><ParameterField
          v-for="(_, i) in state.input"
          :id="`net-x-${i}`"
          :key="i"
          v-model="state.input[i]!"
          :label="t('net.inputValue', { index: i + 1 })"
          :min="-10"
          :max="10"
        /><ParameterField
          id="net-target"
          v-model="state.target"
          :label="t('net.target')"
          :min="state.model.spec.task === 'regression' ? -10 : 0"
          :max="
            state.model.spec.task === 'regression'
              ? 10
              : state.model.spec.task === 'multiclass'
                ? state.model.spec.classes - 1
                : 1
          "
          :step="1"
        />
      </div>
      <button class="button primary" :disabled="state.busy" @click="state.inspect">
        {{ t('net.inspect') }}
      </button>
      <p class="small muted">{{ t('net.snapshot') }}</p>
    </section>
    <p v-if="state.inspection && state.model.spec.inputs === 1" class="data-status">
      {{ t('net.oneInput') }}
    </p>
    <div v-if="state.inspection" class="network-two">
      <ActivationMap :cells="state.inspection.cells" :resolution="state.inspection.resolution" />
      <section class="panel network-section">
        <h2>{{ t('net.initialization') }}</h2>
        <NetworkHistogram
          :data="state.inspection.layers[state.layer]!.weights"
          :label="t('net.histWeights')"
        /><NetworkHistogram
          :data="state.inspection.layers[state.layer]!.activations"
          :label="t('net.histActivations')"
        />
        <p>
          {{ t('net.norm') }}:
          {{ formatData(state.inspection.layers[state.layer]!.weightGradientNorm) }}
        </p>
        <p>
          {{ t('net.biasNorm') }}:
          {{ formatData(state.inspection.layers[state.layer]!.biasGradientNorm) }}
        </p>
      </section>
    </div>
    <section class="panel network-section">
      <h2>{{ t('net.weights') }}</h2>
      <div class="data-table-scroll">
        <table class="dataset-table">
          <thead>
            <tr>
              <th>i</th>
              <th v-for="j in state.selected.inputs" :key="j">W[i,{{ j }}]</th>
              <th>b[i]</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="i in rows" :key="i">
              <th scope="row">{{ i + 1 }}</th>
              <td v-for="j in state.selected.inputs" :key="j">
                {{ formatData(state.selected.weights[i * state.selected.inputs + j - 1]!) }}
              </td>
              <td>{{ formatData(state.selected.biases[i]!) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="network-actions">
        <button class="button secondary" :disabled="matrixPage === 0" @click="matrixPage--">
          ←</button
        ><span>{{ matrixPage + 1 }} / {{ Math.ceil(state.selected.outputs / 8) }}</span
        ><button
          class="button secondary"
          :disabled="(matrixPage + 1) * 8 >= state.selected.outputs"
          @click="matrixPage++"
        >
          →
        </button>
      </div>
    </section>
    <p class="small muted">{{ t('net.memory') }}</p>
  </div>
</template>
