import { defineStore } from 'pinia';
import { computed, ref, shallowRef, watch } from 'vue';
import { useTrainingStore } from './training';
import { useDatasetsStore } from './datasets';
import { configSchema } from '@/application/training/experiment';
import { hashValue, canonicalJson } from '@/domain/data/integrity';
import { validateSpec } from '@/domain/network/model';
import { validateOptimizer } from '@/domain/training/optimizer';
import { validateSeed } from '@/domain/random/seeded';
import type { TrainingConfig } from '@/domain/training/session';
interface Entry {
  config: TrainingConfig;
  text: string;
  context: string;
  revision: number;
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
export const useConfigurationHistory = defineStore('configuration-history', () => {
  const session = useTrainingStore(),
    data = useDatasetsStore();
  const entries = shallowRef<readonly Entry[]>([]),
    cursor = ref(-1),
    revision = ref(0),
    notice = ref('');
  let restoring = false;
  const context = computed(() =>
    hashValue({
      data: data.hash,
      split: data.split?.splitHash ?? null,
      pipeline: data.prepared?.pipeline ?? null,
    }),
  );
  function current() {
    const { segments, ...settings } = session.config;
    void segments;
    try {
      return canonicalJson(settings);
    } catch {
      return 'INVALID_DRAFT';
    }
  }
  function record() {
    if (restoring) return;
    try {
      const text = current(),
        config = configSchema.parse(JSON.parse(text));
      validateSpec(config.spec);
      validateOptimizer(config.optimizer);
      validateSeed(config.seed);
      if (
        !Number.isInteger(config.epochs) ||
        config.epochs < 1 ||
        config.epochs > 10000 ||
        !Number.isInteger(config.batchSize) ||
        config.batchSize < 1 ||
        config.batchSize > 10000 ||
        (data.prepared && data.split && !session.source)
      )
        return;
      const previous = entries.value[cursor.value];
      if (previous?.text === text && previous.context === context.value) return;
      revision.value++;
      entries.value = Object.freeze(
        [
          ...entries.value.slice(0, cursor.value + 1),
          freeze({ config, text, context: context.value, revision: revision.value }),
        ].slice(-50),
      );
      cursor.value = entries.value.length - 1;
    } catch {
      /* Incomplete field edits are drafts, not valid configuration states. */
    }
  }
  watch([() => session.config, context], record, { deep: true, flush: 'sync', immediate: true });
  const dirty = computed(() => entries.value[cursor.value]?.text !== current());
  const undoIndex = computed(() => (dirty.value ? cursor.value : cursor.value - 1));
  function available(index: number) {
    return (
      index >= 0 && index < entries.value.length && entries.value[index]!.context === context.value
    );
  }
  const canUndo = computed(() => !session.busy && !data.busy && available(undoIndex.value));
  const canRedo = computed(
    () => !session.busy && !data.busy && !dirty.value && available(cursor.value + 1),
  );
  function restore(index: number) {
    if (session.busy || data.busy || !available(index)) {
      notice.value =
        'Ese estado necesita el dataset, la división y el pipeline originales. No se han cambiado los datos ni la red.';
      return false;
    }
    const config = configSchema.parse(JSON.parse(entries.value[index]!.text));
    restoring = true;
    try {
      session.reset();
      session.config = config;
      cursor.value = index;
      revision.value++;
      notice.value = `Configuración restaurada en revisión ${revision.value}. La red anterior se ha descartado: inicializa otra o recupera un checkpoint explícitamente.`;
    } finally {
      restoring = false;
    }
    return true;
  }
  function undo() {
    return restore(undoIndex.value);
  }
  function redo() {
    return restore(cursor.value + 1);
  }
  return { entries, cursor, revision, notice, canUndo, canRedo, undo, redo, restore, available };
});
