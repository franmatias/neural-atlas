import { learningBytes } from './learning-library';
import {
  definitionSchema,
  definitionHash,
  type WorkshopDefinition,
} from '@/application/workshops/contracts';
import { validateProgress, type WorkshopProgress } from '@/application/workshops/progress';
import { hashValue, utf8Length } from '@/domain/data/integrity';
import { openNeuralDatabase, LibraryError, storageError } from './database';
export interface WorkshopRecord {
  id: string;
  definition: WorkshopDefinition;
  progress: WorkshopProgress;
  revision: number;
  bytes: number;
  integrity: string;
}
export const evidenceBudget = 8 * 1024 * 1024;
export class WorkshopLibrary {
  constructor(private readonly factory: () => IDBFactory = () => indexedDB) {}
  private async transaction<T>(
    mode: IDBTransactionMode,
    action: (
      store: IDBObjectStore,
      result: (value: T) => void,
      abort: (error: unknown) => void,
      reviewStore: IDBObjectStore,
    ) => void,
  ): Promise<T> {
    const db = await openNeuralDatabase(this.factory);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['learningEvidence', 'learningReview'], mode);
      let value: T, error: unknown;
      tx.oncomplete = () => {
        db.close();
        resolve(value);
      };
      tx.onabort = () => {
        db.close();
        reject(storageError(error ?? tx.error));
      };
      const abort = (failure: unknown) => {
        error = failure;
        tx.abort();
      };
      try {
        action(
          tx.objectStore('learningEvidence'),
          (result) => {
            value = result;
          },
          abort,
          tx.objectStore('learningReview'),
        );
      } catch (failure) {
        abort(failure);
      }
    });
  }
  async list(): Promise<WorkshopRecord[]> {
    const records = await this.transaction<WorkshopRecord[]>('readonly', (store, result) => {
      const request = store.getAll();
      request.onsuccess = () => result(request.result as WorkshopRecord[]);
    });
    return records.map((record) => {
      try {
        definitionSchema.parse(record.definition);
        validateProgress(record.definition, record.progress);
        if (
          record.id !== definitionHash(record.definition) ||
          record.integrity !==
            hashValue({
              definition: record.definition,
              progress: record.progress,
              revision: record.revision,
            })
        )
          throw new Error('INTEGRITY');
        return record;
      } catch {
        throw new LibraryError('CORRUPT');
      }
    });
  }
  async save(
    definition: WorkshopDefinition,
    progress: WorkshopProgress,
    expectedRevision: number,
  ): Promise<WorkshopRecord> {
    const def = definitionSchema.parse(definition),
      next = validateProgress(def, progress);
    const payload = { definition: def, progress: next, revision: expectedRevision + 1 };
    const record: WorkshopRecord = {
      ...payload,
      id: definitionHash(def),
      integrity: hashValue(payload),
      bytes: utf8Length(JSON.stringify(payload)) + 1024,
    };
    if (record.bytes > evidenceBudget) throw new LibraryError('LIMIT');
    return this.transaction('readwrite', (store, result, abort, reviewStore) => {
      const request = store.getAll();
      request.onsuccess = () => {
        try {
          const records = request.result as WorkshopRecord[];
          const prior = records.find((old) => old.id === record.id);
          if ((prior?.revision ?? 0) !== expectedRevision) throw new LibraryError('CONFLICT');
          if (
            records
              .filter((old) => old.id !== record.id)
              .reduce((sum, old) => sum + learningBytes(old), record.bytes) > evidenceBudget
          )
            throw new LibraryError('LIMIT');
          const reviews = reviewStore.getAll();
          reviews.onsuccess = () => {
            try {
              const reviewBytes = (reviews.result as { bytes: number }[]).reduce(
                (sum, r) => sum + learningBytes(r),
                0,
              );
              const existingBytes = records
                .filter((old) => old.id !== record.id)
                .reduce((sum, r) => sum + learningBytes(r), record.bytes);
              if (!Number.isFinite(reviewBytes) || reviewBytes + existingBytes > evidenceBudget)
                throw new LibraryError('LIMIT');
              store.put(record);
              result(record);
            } catch (error) {
              abort(error);
            }
          };
        } catch (error) {
          abort(error);
        }
      };
    });
  }
  remove(id: string, expectedRevision: number): Promise<void> {
    return this.transaction('readwrite', (store, result, abort) => {
      const request = store.get(id);
      request.onsuccess = () => {
        try {
          if ((request.result as WorkshopRecord | undefined)?.revision !== expectedRevision)
            throw new LibraryError('CONFLICT');
          store.delete(id);
          result(undefined);
        } catch (error) {
          abort(error);
        }
      };
    });
  }
}
