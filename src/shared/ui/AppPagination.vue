<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@/app/i18n';
const props = defineProps<{ page: number; pages: number; label: string }>();
const emit = defineEmits<{ change: [page: number] }>();
const { t } = useI18n();
const items = computed(() => {
  const visible = Array.from({ length: props.pages }, (_, index) => index + 1).filter(
    (number) => number === 1 || number === props.pages || Math.abs(number - props.page) <= 1,
  );
  const result: (number | string)[] = [];
  for (const number of visible) {
    const previous = result.at(-1);
    if (typeof previous === 'number' && number - previous > 1) {
      if (number - previous === 2) result.push(previous + 1);
      else result.push(`gap-${number}`);
    }
    result.push(number);
  }
  return result;
});
</script>
<template>
  <nav v-if="pages > 1" class="glossary-pagination" :aria-label="label">
    <div class="pagination-direction">
      <button class="button secondary" :disabled="page === 1" @click="emit('change', 1)">
        {{ t('glossary.first') }}
      </button>
      <button class="button secondary" :disabled="page === 1" @click="emit('change', page - 1)">
        {{ t('glossary.previous') }}
      </button>
    </div>
    <div class="pagination-numbers">
      <template v-for="item in items" :key="item">
        <button
          v-if="typeof item === 'number'"
          class="pagination-number"
          :aria-label="t('glossary.goTo', { page: item })"
          :aria-current="item === page ? 'page' : undefined"
          @click="emit('change', item)"
        >
          {{ item }}
        </button>
        <span v-else class="pagination-gap" aria-hidden="true">…</span>
      </template>
    </div>
    <div class="pagination-direction">
      <button class="button secondary" :disabled="page === pages" @click="emit('change', page + 1)">
        {{ t('glossary.next') }}
      </button>
      <button class="button secondary" :disabled="page === pages" @click="emit('change', pages)">
        {{ t('glossary.last') }}
      </button>
    </div>
  </nav>
</template>
<style scoped>
.glossary-pagination {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: center;
  margin: 24px 0;
}
.pagination-direction,
.pagination-numbers {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  justify-content: center;
}
.pagination-direction .button {
  padding: 10px 12px;
  min-height: 44px;
  font-size: 0.8rem;
}
.pagination-number {
  min-width: 44px;
  min-height: 44px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  color: var(--ink);
  font-weight: 650;
}
.pagination-number[aria-current='page'] {
  background: var(--accent);
  color: var(--accent-ink);
  border-color: var(--accent);
}
.pagination-gap {
  padding: 0 4px;
  color: var(--muted);
}
@media (max-width: 600px) {
  .pagination-numbers {
    order: -1;
    flex-basis: 100%;
  }
}
</style>
