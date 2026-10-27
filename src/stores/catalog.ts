import { computed, onScopeDispose, ref, shallowRef } from 'vue';
import { defineStore } from 'pinia';
import { DataClient } from '@/infrastructure/workers/data-client';
import { LearningLibrary } from '@/infrastructure/storage/learning-library';
import {
  validateCatalogState,
  emptyCatalogState,
  buildCatalog,
  type CatalogState,
} from '@/application/content/catalog';
import { previewConceptPack } from '@/application/content/concept-packs';
import { hashValue } from '@/domain/data/integrity';
import type { ConceptPack } from '@/domain/content/concept';
export const useCatalogStore = defineStore('catalog', () => {
  const state = shallowRef<CatalogState>(emptyCatalogState()),
    revision = ref(0),
    loaded = ref(false),
    busy = ref(false),
    saving = ref(false),
    error = ref(''),
    notice = ref(''),
    memory = ref(false);
  const registry = computed(() => buildCatalog(state.value)),
    preview = shallowRef<ReturnType<typeof previewConceptPack>>();
  const library = new LearningLibrary(),
    client = new DataClient();
  let sequence = 0,
    contextHash = '';
  let loading: Promise<void> | undefined;
  async function load() {
    if (loaded.value) return;
    if (loading) return loading;
    loading = (async () => {
      try {
        const records = await library.list<CatalogState>('contentCatalog'),
          record = records.find((r) => r.id === 'active');
        if (record) {
          const parsed = validateCatalogState(record.value);
          buildCatalog(parsed);
          state.value = parsed;
          revision.value = record.revision;
        } else {
          state.value = emptyCatalogState();
          revision.value = 0;
        }
      } catch {
        memory.value = true;
        error.value =
          'No se pudo leer el catálogo local. El contenido incluido sigue disponible; no se ha borrado el guardado.';
      } finally {
        loaded.value = true;
        loading = undefined;
      }
    })();
    return loading;
  }
  function cancel() {
    sequence++;
    client.cancel();
    busy.value = false;
    notice.value = 'Importación cancelada; catálogo confirmado conservado.';
  }
  async function inspect(text: string) {
    if (busy.value || saving.value) return;
    const id = ++sequence;
    busy.value = true;
    error.value = '';
    preview.value = undefined;
    try {
      const context = structuredClone(registry.value.context);
      const done = await client.run('conceptPack', { text, context });
      if (id !== sequence) return;
      preview.value = done;
      contextHash = hashValue(context);
      notice.value = done.unchanged
        ? 'Este paquete ya está instalado sin cambios.'
        : 'Previsualización lista. Revisa cambios y procedencia antes de confirmar.';
    } catch (caught) {
      if (id === sequence)
        error.value =
          'Paquete rechazado: ' +
          (caught instanceof Error && 'detail' in caught
            ? String(caught.detail)
            : 'estructura, relaciones, versión o límites no válidos');
    } finally {
      if (id === sequence) busy.value = false;
    }
  }
  function candidate(pack: ConceptPack) {
    const next: CatalogState = {
      schemaVersion: 1,
      packs: [...state.value.packs.filter((p) => p.packId !== pack.packId), pack],
      identityHistory: [...state.value.identityHistory],
    };
    const identities = new Map(next.identityHistory.map((i) => [i.id, i]));
    for (const c of pack.concepts)
      identities.set(c.id, {
        id: c.id,
        slug: c.slug,
        contentVersion: c.contentVersion,
        hash: hashValue(c),
      });
    next.identityHistory = [...identities.values()];
    buildCatalog(next);
    return next;
  }
  async function commit(next: CatalogState) {
    saving.value = true;
    error.value = '';
    try {
      const saved = await library.save('contentCatalog', 'active', next, revision.value);
      state.value = next;
      revision.value = saved.revision;
      memory.value = false;
      preview.value = undefined;
      notice.value = 'Catálogo guardado en este navegador.';
    } catch {
      error.value =
        'No se guardó: cuota, bloqueo o conflicto con otra pestaña. Se conserva el catálogo confirmado y la previsualización; puedes exportar o usar el paquete en memoria.';
    } finally {
      saving.value = false;
    }
  }
  function checked() {
    if (!preview.value || preview.value.unchanged) return;
    if (contextHash !== hashValue(registry.value.context)) throw Error('STALE_PREVIEW');
    previewConceptPack(JSON.stringify(preview.value.pack), registry.value.context);
    return candidate(preview.value.pack);
  }
  async function confirm() {
    if (saving.value || busy.value) return;
    try {
      const next = checked();
      if (next) await commit(next);
    } catch {
      error.value =
        'La previsualización ya no coincide con el catálogo. Vuelve a validar el archivo.';
    }
  }
  function useMemory() {
    if (saving.value || busy.value) return;
    try {
      const next = checked();
      if (!next) return;
      state.value = next;
      preview.value = undefined;
      memory.value = true;
      notice.value = 'Paquete activo solo en memoria. Exporta una copia antes de cerrar.';
    } catch {
      error.value = 'Vuelve a validar el archivo antes de aplicarlo.';
    }
  }
  async function remove(packId: string) {
    if (saving.value || busy.value) return;
    const next = { ...state.value, packs: state.value.packs.filter((p) => p.packId !== packId) };
    try {
      buildCatalog(next);
      await commit(next);
    } catch {
      error.value =
        'No se puede retirar: otros conceptos conservados necesitan sus IDs o relaciones.';
    }
  }
  async function refresh() {
    if (saving.value || busy.value) return;
    preview.value = undefined;
    loaded.value = false;
    error.value = '';
    await load();
  }
  onScopeDispose(() => client.cancel());
  return {
    state,
    revision,
    loaded,
    busy,
    saving,
    error,
    notice,
    memory,
    registry,
    preview,
    load,
    inspect,
    confirm,
    useMemory,
    remove,
    refresh,
    cancel,
  };
});
