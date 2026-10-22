<script setup lang="ts">
import { onScopeDispose, ref, shallowRef, watch } from 'vue';
import { useI18n } from '@/app/i18n';
import { DataError, type Dataset, type DataSplit, type Task } from '@/domain/data/types';
import type { ColumnMapping, ColumnRole, CsvIssue, CsvPreview } from '@/application/data/csv-files';
import { useDatasetsStore } from '@/stores/datasets';
import { downloadDataset, readDatasetFile } from '@/infrastructure/files/download';
const emit = defineEmits<{ imported: [] }>();
const data = useDatasetsStore();
const { t } = useI18n();
const delimiter = ref(';');
const decimal = ref<'.' | ','>('.');
const task = ref<Task>('binary');
const exclude = ref(false);
const preview = shallowRef<CsvPreview>();
const mapping = ref<ColumnMapping[]>([]);
const issues = ref<CsvIssue[]>([]);
const excluded = ref(0);
const candidate = shallowRef<{ dataset: Dataset; split?: DataSplit }>();
const message = ref('');
const rawCsv = ref('');
let sequence = 0;
const roles: ColumnRole[] = [
  'ignore',
  'numeric',
  'categorical',
  'target',
  'id',
  'group',
  'timestamp',
];
onScopeDispose(() => {
  sequence++;
  data.cancel();
});
async function parseCsv() {
  candidate.value = undefined;
  issues.value = [];
  const result = await data.run('previewCsv', { text: rawCsv.value, delimiter: delimiter.value });
  if (!result) return;
  preview.value = result;
  mapping.value = result.headers.map((header, i) => ({
    name: header.replace(/^(feature|target):/, ''),
    role:
      header === 'row:id'
        ? 'id'
        : header === 'row:group'
          ? 'group'
          : header === 'row:time'
            ? 'timestamp'
            : header.startsWith('target:') || i === result.headers.length - 1
              ? 'target'
              : 'numeric',
  }));
}
async function load(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  (event.target as HTMLInputElement).value = '';
  if (!file) return;
  const token = ++sequence;
  data.cancel();
  candidate.value = undefined;
  preview.value = undefined;
  issues.value = [];
  message.value = '';
  rawCsv.value = '';
  try {
    const loaded = await readDatasetFile(file);
    if (token !== sequence) return;
    if (loaded.format === 'csv') {
      rawCsv.value = loaded.text;
      await parseCsv();
    } else candidate.value = await data.run('importJson', { text: loaded.text });
  } catch (error) {
    if (token === sequence)
      data.error = error instanceof DataError ? error : new DataError('INTERNAL');
  }
}
watch(delimiter, () => {
  if (rawCsv.value) void parseCsv();
});
watch(
  [mapping, task, decimal, exclude],
  () => {
    if (preview.value) candidate.value = undefined;
  },
  { deep: true },
);
async function validate() {
  if (!preview.value) return;
  const result = await data.run('mapCsv', {
    preview: preview.value,
    mapping: mapping.value.map((m) => ({ ...m })),
    task: task.value,
    decimal: decimal.value,
    excludeInvalid: exclude.value,
  });
  if (result) {
    issues.value = result.issues;
    excluded.value = result.excluded;
    candidate.value = result.dataset ? { dataset: result.dataset } : undefined;
  }
}
function discard() {
  sequence++;
  data.cancel();
  preview.value = undefined;
  candidate.value = undefined;
  rawCsv.value = '';
  issues.value = [];
}
function confirm() {
  if (!candidate.value) return;
  data.importData(candidate.value.dataset, candidate.value.split);
  discard();
  emit('imported');
}
async function download(format: 'csv' | 'json') {
  const result = await data.run('export', {
    dataset: data.dataset,
    ...(data.split ? { split: data.split } : {}),
    format,
    delimiter: delimiter.value,
  });
  if (result) {
    try {
      downloadDataset(result.text, format);
      message.value =
        format === 'csv'
          ? t('data.protected', { count: result.protectedCount })
          : t('data.exported');
    } catch {
      data.error = new DataError('INTERNAL');
    }
  }
}
</script>
<template>
  <section class="data-stage">
    <h2>{{ t('data.filesTitle') }}</h2>
    <div class="panel data-options">
      <h3>{{ t('data.import') }}</h3>
      <p class="small muted">{{ t('data.fileHelp') }}</p>
      <div class="data-field-pair">
        <label for="csv-delimiter"
          >{{ t('data.delimiter')
          }}<select id="csv-delimiter" v-model="delimiter">
            <option value=",">{{ t('data.comma') }}</option>
            <option value=";">{{ t('data.semicolon') }}</option>
            <option :value="'\t'">{{ t('data.tab') }}</option>
          </select></label
        ><label for="csv-decimal"
          >{{ t('data.decimal')
          }}<select id="csv-decimal" v-model="decimal">
            <option value=".">{{ t('data.dotDecimal') }}</option>
            <option value=",">{{ t('data.commaDecimal') }}</option>
          </select></label
        >
      </div>
      <label for="dataset-file"
        >{{ t('data.file')
        }}<input
          id="dataset-file"
          type="file"
          accept=".csv,.json,text/csv,application/json"
          @change="load"
      /></label>
    </div>
    <div v-if="preview" class="panel data-options">
      <h3>{{ t('data.mapping') }}</h3>
      <label for="csv-task"
        >{{ t('data.target')
        }}<select id="csv-task" v-model="task">
          <option
            v-for="item in ['binary', 'multiclass', 'regression'] as const"
            :key="item"
            :value="item"
          >
            {{ t(`data.${item}`) }}
          </option>
        </select></label
      >
      <div class="mapping-grid">
        <div v-for="(column, index) in mapping" :key="index">
          <label :for="`column-name-${index}`"
            >{{ t('data.columnName') }} {{ index + 1
            }}<input
              :id="`column-name-${index}`"
              v-model="column.name"
              type="text"
              maxlength="4096" /></label
          ><label :for="`column-role-${index}`"
            >{{ t('data.columnRole') }} {{ index + 1
            }}<select :id="`column-role-${index}`" v-model="column.role">
              <option v-for="role in roles" :key="role" :value="role">
                {{ t(`data.role.${role}`) }}
              </option>
            </select></label
          >
        </div>
      </div>
      <div class="data-table-scroll" tabindex="0" :aria-label="t('data.preview')">
        <table class="dataset-table">
          <caption>
            {{
              t('data.preview')
            }}
          </caption>
          <thead>
            <tr>
              <th v-for="(header, index) in preview.headers" :key="index" scope="col">
                {{ header }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in preview.rows.slice(0, 5)" :key="index">
              <td v-for="(cell, col) in row" :key="col">{{ cell }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <label class="check-row"
        ><input v-model="exclude" type="checkbox" />{{ t('data.exclude') }}</label
      ><button class="button primary" :disabled="data.busy" @click="validate">
        {{ t('data.validate') }}
      </button>
    </div>
    <div v-if="issues.length" class="data-status warning" role="alert">
      <p>{{ t('data.issues', { count: issues.length, excluded }) }}</p>
      <ul class="import-issues">
        <li v-for="(issue, index) in issues.slice(0, 50)" :key="index">
          {{ t('data.issueAt', { row: issue.row, column: issue.column }) }}:
          {{ t(`data.issue.${issue.code}`) }}
        </li>
      </ul>
    </div>
    <div v-if="candidate" class="data-status">
      <p>{{ t('data.pending', { count: candidate.dataset.rows.length }) }}</p>
      <p v-if="candidate.dataset.classOrder" class="small">
        {{ t('data.classes') }}: {{ candidate.dataset.classOrder.join(', ') }}
      </p>
      <button class="button primary" :disabled="data.busy" @click="confirm">
        {{ t('data.confirm') }}
      </button>
    </div>
    <button v-if="preview || candidate" class="button secondary" @click="discard">
      {{ t('data.discard') }}
    </button>
    <div class="panel data-options">
      <h3>{{ t('data.export') }}</h3>
      <p class="small muted">{{ t('data.exportHint') }}</p>
      <div class="file-actions">
        <button class="button primary" :disabled="data.busy" @click="download('json')">
          {{ t('data.exportJson') }}</button
        ><button class="button secondary" :disabled="data.busy" @click="download('csv')">
          {{ t('data.exportCsv') }}
        </button>
      </div>
      <p v-if="message" role="status" class="small muted">{{ message }}</p>
    </div>
  </section>
</template>
