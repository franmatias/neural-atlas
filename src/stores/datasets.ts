import { computed, onScopeDispose, ref, shallowRef } from 'vue';
import { defineStore } from 'pinia';
import { DataClient } from '@/infrastructure/workers/data-client';
import { generateDataset } from '@/domain/data/generate';
import { datasetHash } from '@/domain/data/integrity';
import { profileDataset } from '@/domain/data/profile';
import { editDataset, type DatasetEdit } from '@/domain/data/edit';
import {
  DataError,
  defaultGenerator,
  type Dataset,
  type DataSplit,
  type GeneratorOptions,
  type SplitOptions,
} from '@/domain/data/types';
import { validateDataset } from '@/domain/data/validation';
import type { PipelineOptions } from '@/domain/data/pipeline';
import type { JobPayloads, JobResults } from '@/application/data/jobs';
export const useDatasetsStore = defineStore('datasets', () => {
  const client = new DataClient();
  const dataset = shallowRef<Dataset>(generateDataset({ ...defaultGenerator }));
  const split = shallowRef<DataSplit>();
  const prepared = shallowRef<JobResults['fit']>();
  const selectedId = ref(dataset.value.rows[0]!.id);
  const selected = computed(() => dataset.value.rows.find((row) => row.id === selectedId.value));
  const busy = ref(false);
  const error = shallowRef<DataError>();
  const notice = ref<'initial' | 'generated' | 'edited' | 'imported' | 'split' | 'fitted'>(
    'initial',
  );
  const hash = computed(() => datasetHash(dataset.value));
  const profile = computed(() => profileDataset(dataset.value));
  let sequence = 0;
  function cancel() {
    sequence++;
    client.cancel();
    busy.value = false;
  }
  async function run<K extends keyof JobPayloads>(
    kind: K,
    payload: JobPayloads[K],
  ): Promise<JobResults[K] | undefined> {
    const token = ++sequence;
    busy.value = true;
    error.value = undefined;
    try {
      const result = await client.run(kind, payload);
      return token === sequence ? result : undefined;
    } catch (caught) {
      if (token === sequence && (!(caught instanceof DataError) || caught.code !== 'CANCELLED'))
        error.value = caught instanceof DataError ? caught : new DataError('INTERNAL');
    } finally {
      if (token === sequence) busy.value = false;
    }
  }
  function replace(next: Dataset, importedSplit?: DataSplit) {
    validateDataset(next);
    cancel();
    dataset.value = next;
    split.value = importedSplit;
    prepared.value = undefined;
    selectedId.value = next.rows[0]?.id ?? '';
  }
  async function generate(options: GeneratorOptions) {
    const next = await run('generate', options);
    if (next) {
      replace(next);
      notice.value = 'generated';
    }
  }
  function edit(change: DatasetEdit) {
    try {
      const next = editDataset(dataset.value, change);
      const id = change.type === 'remove' ? (next.rows[0]?.id ?? '') : change.row.id;
      replace(next);
      selectedId.value = id;
      notice.value = 'edited';
      error.value = undefined;
    } catch (caught) {
      error.value = caught instanceof DataError ? caught : new DataError('INTERNAL');
    }
  }
  async function divide(options: SplitOptions) {
    const result = await run('split', { dataset: dataset.value, options });
    if (result) {
      split.value = result;
      prepared.value = undefined;
      notice.value = 'split';
    }
  }
  async function fit(options: PipelineOptions) {
    if (!split.value) {
      error.value = new DataError('PIPELINE', 'train');
      return;
    }
    const result = await run('fit', {
      dataset: dataset.value,
      split: split.value,
      options: { ...options, featureIds: [...options.featureIds] },
    });
    if (result) {
      prepared.value = result;
      notice.value = 'fitted';
    }
  }
  function importData(next: Dataset, partition?: DataSplit) {
    replace(next, partition);
    notice.value = 'imported';
  }
  onScopeDispose(cancel);
  return {
    dataset,
    split,
    prepared,
    selectedId,
    selected,
    busy,
    error,
    notice,
    hash,
    profile,
    run,
    cancel,
    replace,
    generate,
    edit,
    divide,
    fit,
    importData,
  };
});
