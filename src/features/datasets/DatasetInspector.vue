<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from '@/app/i18n';
import { useDatasetsStore } from '@/stores/datasets';
import { parseDecimal } from '@/shared/utils/decimal';
import { formatData } from '@/shared/utils/data-format';
const data = useDatasetsStore();
const { t } = useI18n();
const draft = ref<Record<string, string>>({});
const target = ref('');
const invalid = ref(false);
watch(
  () => data.selected,
  (row) => {
    draft.value = Object.fromEntries(
      data.dataset.features.map((f) => [
        f.id,
        row?.features[f.id] === null || row?.features[f.id] === undefined
          ? ''
          : String(row.features[f.id]),
      ]),
    );
    target.value = row?.target === null || row?.target === undefined ? '' : String(row.target);
    invalid.value = false;
  },
  { immediate: true },
);
function save() {
  const row = data.selected;
  if (!row) return;
  const features = { ...row.features };
  invalid.value = false;
  for (const f of data.dataset.features) {
    const raw = draft.value[f.id]!;
    if (raw === '') features[f.id] = null;
    else if (f.kind === 'numeric') {
      const parsed = parseDecimal(raw);
      if (!parsed.ok) {
        invalid.value = true;
        return;
      }
      features[f.id] = parsed.value;
    } else features[f.id] = raw;
  }
  let value: string | number | null = target.value || null;
  if (data.dataset.task === 'regression' && value !== null) {
    const parsed = parseDecimal(String(value));
    if (!parsed.ok) {
      invalid.value = true;
      return;
    }
    value = parsed.value;
  }
  data.edit({ type: 'replace', row: { ...row, features, target: value, origin: 'manual' } });
}
</script>
<template>
  <aside class="panel dataset-inspector">
    <h2>{{ t('data.selected') }}</h2>
    <form v-if="data.selected" @submit.prevent="save">
      <div class="data-selected-id">
        <strong>{{ data.selected.id }}</strong
        ><span>{{ t(`data.${data.selected.origin}`) }}</span>
      </div>
      <p class="small muted">{{ t('data.editHint') }}</p>
      <label v-for="feature in data.dataset.features" :key="feature.id" :for="`edit-${feature.id}`"
        >{{ feature.name }} <small v-if="feature.unit">{{ feature.unit }}</small
        ><input
          :id="`edit-${feature.id}`"
          v-model="draft[feature.id]"
          type="text"
          :inputmode="feature.kind === 'numeric' ? 'decimal' : 'text'"
          maxlength="4096" /></label
      ><label for="edit-target"
        >{{ data.dataset.targetName }} · {{ t('data.target')
        }}<input
          v-if="data.dataset.task === 'regression'"
          id="edit-target"
          v-model="target"
          type="text"
          inputmode="decimal"
        /><select v-else id="edit-target" v-model="target">
          <option value="">{{ t('data.missingValue') }}</option>
          <option v-for="c in data.dataset.classOrder" :key="c" :value="c">{{ c }}</option>
        </select></label
      >
      <p v-if="invalid" role="alert" class="field-error">{{ t('field.invalid') }}</p>
      <dl class="row-metadata">
        <template v-if="data.selected.groupId"
          ><dt>{{ t('data.group') }}</dt>
          <dd>{{ data.selected.groupId }}</dd></template
        ><template v-if="data.selected.timestamp"
          ><dt>{{ t('data.timestamp') }}</dt>
          <dd>{{ data.selected.timestamp }}</dd></template
        ><template v-if="data.selected.annotation"
          ><dt>{{ t('data.cleanTarget') }}</dt>
          <dd>{{ formatData(data.selected.annotation.cleanTarget) }}</dd></template
        >
      </dl>
      <button class="button primary" type="submit" :disabled="data.busy">
        {{ t('data.saveRow') }}</button
      ><button
        class="button secondary danger"
        type="button"
        :disabled="data.busy"
        @click="data.edit({ type: 'remove', id: data.selected!.id })"
      >
        {{ t('data.deleteRow') }}
      </button>
    </form>
    <p v-else class="muted small">{{ t('data.noSelected') }}</p>
  </aside>
</template>
