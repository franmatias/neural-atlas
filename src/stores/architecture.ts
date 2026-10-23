import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { defineStore } from 'pinia';
import {
  createNetwork,
  defaultSpec,
  type Network,
  type NetworkSpec,
  type Initialization,
} from '@/domain/network/model';
import { xorInputs, xorTargets, xorDemonstration } from '@/domain/network/learning';
import { DataClient } from '@/infrastructure/workers/data-client';
import type { JobPayloads, JobResults } from '@/application/data/jobs';
export const useArchitectureStore = defineStore('architecture', () => {
  const model = shallowRef<Network>(createNetwork(defaultSpec, 42));
  const source = ref<'initialized' | 'constructed' | 'learned'>('initialized');
  const input = ref([0.8, 0.2]),
    target = ref(1),
    layer = ref(0),
    neuron = ref(0);
  const inspection = shallowRef<JobResults['inspectNetwork']>(),
    perceptron = shallowRef<JobResults['perceptron']>(),
    solution = shallowRef<JobResults['solveXor']>();
  const busy = ref(false),
    error = ref(false),
    mode = ref<'single' | 'xor' | 'build'>('single');
  const client = new DataClient();
  let sequence = 0;
  function cancel() {
    sequence++;
    client.cancel();
    busy.value = false;
  }
  async function run<K extends keyof JobPayloads>(kind: K, payload: JobPayloads[K]) {
    const id = ++sequence;
    busy.value = true;
    error.value = false;
    try {
      const result = await client.run(kind, payload);
      if (id === sequence) return result;
    } catch {
      if (id === sequence) error.value = true;
    } finally {
      if (id === sequence) busy.value = false;
    }
  }
  function replace(
    next: Network,
    origin: 'initialized' | 'constructed' | 'learned' = 'initialized',
  ) {
    cancel();
    model.value = next;
    source.value = origin;
    input.value = Array.from({ length: next.spec.inputs }, (_, i) =>
      i === 0 ? 0.8 : i === 1 ? 0.2 : 0,
    );
    target.value = next.spec.task === 'multiclass' ? 0 : 1;
    layer.value = 0;
    neuron.value = 0;
    inspection.value = undefined;
    error.value = false;
  }
  function initialize(spec: NetworkSpec, seed: number, method: Initialization) {
    try {
      replace(createNetwork(spec, seed, method));
      solution.value = undefined;
    } catch {
      error.value = true;
    }
  }
  function fixed() {
    replace(xorDemonstration(), 'constructed');
    solution.value = undefined;
  }
  async function solve(seed: number) {
    const result = await run('solveXor', { seed, epochs: 6000 });
    if (result) {
      replace(result.model, 'learned');
      solution.value = result;
    }
  }
  async function train(problem: 'and' | 'xor', seed: number, rate: number, epochs: number) {
    const result = await run('perceptron', {
      inputs: xorInputs.map((x) => [...x]),
      targets: problem === 'xor' ? [...xorTargets] : [0, 0, 0, 1],
      seed,
      rate,
      epochs,
    });
    if (result) perceptron.value = result;
  }
  async function inspect() {
    const result = await run('inspectNetwork', {
      model: model.value,
      input: [...input.value],
      target: target.value,
      layer: layer.value,
      neuron: neuron.value,
    });
    if (result) inspection.value = result;
  }
  watch(
    [input, target, layer, neuron],
    () => {
      inspection.value = undefined;
      cancel();
    },
    { deep: true },
  );
  watch(layer, () => {
    neuron.value = 0;
  });
  const selected = computed(() => model.value.layers[layer.value]!);
  onScopeDispose(cancel);
  return {
    model,
    source,
    input,
    target,
    layer,
    neuron,
    inspection,
    perceptron,
    solution,
    busy,
    error,
    mode,
    selected,
    cancel,
    initialize,
    fixed,
    solve,
    train,
    inspect,
  };
});
