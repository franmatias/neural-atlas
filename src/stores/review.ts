import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';
import { LearningLibrary } from '@/infrastructure/storage/learning-library';
import { localDay } from '@/infrastructure/storage/local-day';
import { reviewSchema, newReview, gradeReview, type Review } from '@/domain/content/review';
import type { ConceptRecord } from '@/domain/content/concept';
export const useReviewStore = defineStore('review', () => {
  const records = shallowRef<Record<string, Review>>({}),
    revisions = new Map<string, number>();
  const pending = shallowRef<Review>();
  const loaded = ref(false),
    saving = ref(false),
    error = ref(''),
    library = new LearningLibrary();
  async function load() {
    if (loaded.value) return;
    error.value = '';
    try {
      const rows = await library.list<Review>('learningReview');
      const next: Record<string, Review> = {};
      const nextRevisions = new Map<string, number>();
      for (const r of rows) {
        const value = reviewSchema.parse(r.value);
        if (value.conceptId !== r.id) throw Error('IDENTITY');
        next[r.id] = value;
        nextRevisions.set(r.id, r.revision);
      }
      records.value = next;
      revisions.clear();
      for (const [id, revision] of nextRevisions) revisions.set(id, revision);
    } catch {
      error.value = 'No se pudo leer el repaso guardado. No se ha borrado ningún registro.';
    } finally {
      loaded.value = true;
    }
  }
  function current(c: ConceptRecord) {
    const old = records.value[c.id];
    return old?.contentVersion === c.contentVersion
      ? old
      : newReview(c.id, c.contentVersion, localDay());
  }
  async function save(value: Review) {
    if (saving.value) return;
    saving.value = true;
    pending.value = value;
    error.value = '';
    try {
      const row = await library.save(
        'learningReview',
        value.conceptId,
        value,
        revisions.get(value.conceptId) ?? 0,
      );
      records.value = { ...records.value, [value.conceptId]: value };
      revisions.set(value.conceptId, row.revision);
      pending.value = undefined;
    } catch {
      error.value =
        'No se guardó el cambio por cuota o conflicto. La respuesta sigue visible; exporta una copia o recarga el repaso guardado.';
    } finally {
      saving.value = false;
    }
  }
  async function grade(c: ConceptRecord, correct: boolean) {
    await save(gradeReview(current(c), correct, localDay()));
  }
  async function mark(c: ConceptRecord, kind: 'visited' | 'explained') {
    await save({ ...current(c), [kind]: true });
  }
  async function reset(c: ConceptRecord) {
    await save(newReview(c.id, c.contentVersion, localDay()));
  }
  async function refresh() {
    loaded.value = false;
    await load();
  }
  return { records, pending, loaded, saving, error, load, current, grade, mark, reset, refresh };
});
