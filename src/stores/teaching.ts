import { defineStore } from 'pinia';
import { onScopeDispose, ref, shallowRef } from 'vue';
import { LearningLibrary, type LearningRecord } from '@/infrastructure/storage/learning-library';
import { DataClient } from '@/infrastructure/workers/data-client';
import { previewTeachingPack, type TeachingPack } from '@/application/content/teaching-packs';
import { newerVersion } from '@/application/content/concept-packs';
import { hashValue } from '@/domain/data/integrity';
export const useTeachingStore = defineStore('teaching', () => {
  const library = new LearningLibrary(),
    client = new DataClient(),
    records = shallowRef<LearningRecord<TeachingPack>[]>([]),
    preview = shallowRef<ReturnType<typeof previewTeachingPack>>();
  const busy = ref(false),
    saving = ref(false),
    loaded = ref(false),
    error = ref(''),
    notice = ref('');
  let sequence = 0;
  async function load() {
    if (loaded.value) return;
    try {
      const next = await library.list<TeachingPack>('teachingPacks');
      for (const r of next) {
        if (previewTeachingPack(JSON.stringify(r.value)).pack.packId !== r.id)
          throw Error('IDENTITY');
      }
      records.value = next;
    } catch {
      error.value = 'No se pudieron leer los paquetes. No se ha borrado el guardado.';
    } finally {
      loaded.value = true;
    }
  }
  async function inspect(text: string) {
    if (busy.value || saving.value) return;
    const token = ++sequence;
    busy.value = true;
    error.value = '';
    preview.value = undefined;
    try {
      const next = await client.run('teachingPack', { text });
      if (token === sequence) {
        preview.value = next;
        notice.value =
          'Paquete validado. Revisa su guía, contenido y procedencia antes de instalarlo.';
      }
    } catch {
      if (token === sequence)
        error.value =
          'Archivo rechazado: estructura, integridad, referencias o límites no válidos.';
    } finally {
      if (token === sequence) busy.value = false;
    }
  }
  function cancel() {
    sequence++;
    client.cancel();
    busy.value = false;
    notice.value = 'Validación cancelada. Paquetes guardados conservados.';
  }
  async function install() {
    if (!preview.value || busy.value || saving.value) return;
    saving.value = true;
    error.value = '';
    try {
      const pack = previewTeachingPack(JSON.stringify(preview.value.pack)).pack,
        old = records.value.find((r) => r.id === pack.packId);
      if (old) {
        if (hashValue(old.value) === hashValue(pack)) {
          notice.value = 'Esta versión ya está instalada.';
          preview.value = undefined;
          return;
        }
        if (!newerVersion(pack.version, old.value.version)) throw Error('VERSION');
      }
      const row = await library.save('teachingPacks', pack.packId, pack, old?.revision ?? 0);
      records.value = [...records.value.filter((r) => r.id !== row.id), row];
      preview.value = undefined;
      notice.value = 'Paquete instalado. Abrir o aplicar sus recursos requiere una acción aparte.';
    } catch {
      error.value =
        'No se instaló: versión no superior, conflicto o presupuesto compartido de 16 MiB. El paquete validado sigue disponible para usar en esta sesión y exportar.';
    } finally {
      saving.value = false;
    }
  }
  async function remove(id: string) {
    if (saving.value || busy.value) return;
    const old = records.value.find((r) => r.id === id);
    if (!old) return;
    saving.value = true;
    try {
      await library.remove('teachingPacks', id, old.revision);
      records.value = records.value.filter((r) => r.id !== id);
      notice.value = 'Paquete retirado; tus experimentos y cuadernos se conservan.';
    } catch {
      error.value = 'No se retiró por conflicto o almacenamiento no disponible.';
    } finally {
      saving.value = false;
    }
  }
  async function refresh() {
    if (saving.value || busy.value) return;
    loaded.value = false;
    error.value = '';
    await load();
  }
  onScopeDispose(() => client.cancel());
  return {
    records,
    preview,
    busy,
    saving,
    loaded,
    error,
    notice,
    load,
    inspect,
    cancel,
    install,
    remove,
    refresh,
  };
});
