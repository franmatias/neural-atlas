import {
  exportExperiment,
  experimentWire,
  prepareExperiment,
  type Experiment,
} from '@/application/training/experiment';
import { hashValue, utf8Length } from '@/domain/data/integrity';
import { LibraryError, storageError, openNeuralDatabase } from './database';
export { LibraryError } from './database';

export interface LibraryEntry {
  id: string;
  revision: number;
  name: string;
  updatedAt: string;
  bytes: number;
  epoch: number;
  updates: number;
  frozen: boolean;
  task: string;
}
export const libraryLimits = { count: 5, perExperiment: 40 * 1024 * 1024 };
/** Charge native tensor bytes as well: JSON represents a zero using fewer than eight bytes. */
export function experimentStorageBytes(snapshot: Experiment, jsonBytes: number) {
  const state = snapshot.checkpoint;
  const states = [state, ...(state.earlyStopping?.best ? [state.earlyStopping.best] : [])];
  const vectors = states.flatMap((s) => [
    ...s.model.layers.flatMap((layer) => [layer.weights, layer.biases]),
    ...s.model.layers.flatMap((layer) =>
      layer.normalization ? [layer.normalization.gamma, layer.normalization.beta] : [],
    ),
    ...s.optimizer.first,
    ...s.optimizer.second,
  ]);
  const strip = (s: typeof state) => ({
    ...s,
    model: {
      ...s.model,
      layers: s.model.layers.map((layer) => ({
        ...layer,
        weights: [],
        biases: [],
        ...(layer.normalization
          ? { normalization: { ...layer.normalization, gamma: [], beta: [] } }
          : {}),
      })),
    },
    optimizer: { ...s.optimizer, first: [], second: [] },
  });
  const metadata = {
    ...snapshot,
    checkpoint: {
      ...state,
      ...strip(state),
      ...(state.earlyStopping
        ? {
            earlyStopping: {
              ...state.earlyStopping,
              ...(state.earlyStopping.best ? { best: strip(state.earlyStopping.best) } : {}),
            },
          }
        : {}),
    },
  };
  return Math.max(
    jsonBytes,
    utf8Length(JSON.stringify(metadata)) +
      vectors.reduce((sum, vector) => sum + vector.byteLength, 0),
  );
}
/** One transaction owns both the manifest revision and its native Float64 checkpoint. */
export class ExperimentLibrary {
  constructor(private readonly factory: () => IDBFactory = () => indexedDB) {}
  private open(): Promise<IDBDatabase> {
    return openNeuralDatabase(this.factory);
  }
  private async transaction<T>(
    mode: IDBTransactionMode,
    operation: (
      tx: IDBTransaction,
      result: (value: T) => void,
      fail: (error: LibraryError) => void,
    ) => void,
  ): Promise<T> {
    const db = await this.open();
    return new Promise<T>((resolve, reject) => {
      let value: T, failure: unknown;
      const tx = db.transaction(['experiments', 'libraryIndex'], mode);
      tx.oncomplete = () => {
        db.close();
        resolve(value);
      };
      tx.onabort = () => {
        db.close();
        reject(storageError(failure ?? tx.error));
      };
      try {
        operation(
          tx,
          (next) => {
            value = next;
          },
          (error) => {
            failure = error;
            tx.abort();
          },
        );
      } catch (error) {
        failure = error;
        tx.abort();
      }
    });
  }
  list(): Promise<LibraryEntry[]> {
    return this.transaction('readonly', (tx, result) => {
      const request = tx.objectStore('libraryIndex').index('updatedAt').getAll();
      request.onsuccess = () => result((request.result as LibraryEntry[]).reverse());
    });
  }
  async read(id: string): Promise<Experiment> {
    const record = await this.transaction<{ snapshot: Experiment; integrity: string }>(
      'readonly',
      (tx, result, fail) => {
        const request = tx.objectStore('experiments').get(id);
        request.onsuccess = () => {
          if (!request.result) fail(new LibraryError('MISSING'));
          else result(request.result as { snapshot: Experiment; integrity: string });
        };
      },
    );
    try {
      const { snapshot, integrity } = record;
      if (integrity !== hashValue(experimentWire(snapshot))) throw new LibraryError('CORRUPT');
      prepareExperiment(snapshot);
      return snapshot;
    } catch {
      throw new LibraryError('CORRUPT');
    }
  }
  async save(
    snapshot: Experiment,
    name: string,
    id: string = crypto.randomUUID(),
    expectedRevision = 0,
  ): Promise<LibraryEntry> {
    // Validation, hashing and allocation finish before opening a readwrite transaction.
    const bytes = experimentStorageBytes(snapshot, utf8Length(exportExperiment(snapshot)));
    if (bytes > libraryLimits.perExperiment || !name.trim() || name.length > 120)
      throw new LibraryError('LIMIT');
    const copy = structuredClone(snapshot);
    const integrity = hashValue(experimentWire(copy));
    return this.transaction('readwrite', (tx, result, fail) => {
      const index = tx.objectStore('libraryIndex');
      const request = index.getAll();
      request.onsuccess = () => {
        try {
          const entries = request.result as LibraryEntry[];
          const previous = entries.find((entry) => entry.id === id);
          if ((previous?.revision ?? 0) !== expectedRevision) {
            fail(new LibraryError('CONFLICT'));
            return;
          }
          if (!previous && entries.length >= libraryLimits.count) {
            fail(new LibraryError('LIMIT'));
            return;
          }
          const entry: LibraryEntry = {
            id,
            name: name.trim(),
            revision: expectedRevision + 1,
            updatedAt: new Date().toISOString(),
            bytes,
            epoch: copy.checkpoint.epoch,
            updates: copy.checkpoint.updates,
            frozen: copy.checkpoint.frozen,
            task: copy.config.spec.task,
          };
          tx.objectStore('experiments').put({ id, snapshot: copy, integrity });
          index.put(entry);
          result(entry);
        } catch (error) {
          fail(storageError(error));
        }
      };
    });
  }
  remove(id: string, expectedRevision: number): Promise<void> {
    return this.transaction('readwrite', (tx, result, fail) => {
      const index = tx.objectStore('libraryIndex');
      const request = index.get(id);
      request.onsuccess = () => {
        try {
          if ((request.result as LibraryEntry | undefined)?.revision !== expectedRevision) {
            fail(new LibraryError('CONFLICT'));
            return;
          }
          tx.objectStore('experiments').delete(id);
          index.delete(id);
          result(undefined);
        } catch (error) {
          fail(storageError(error));
        }
      };
    });
  }
}
