import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
async function checkpoint(page: Page) {
  await page.goto('#/biblioteca');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar sesión JSON', exact: true }).click();
  const text = await readFile((await (await download).path())!, 'utf8');
  await page.goto('#/lab/entrenamiento');
  return (JSON.parse(text) as { checkpoint: unknown }).checkpoint;
}
async function train(page: Page) {
  await page.goto('#/lab/entrenamiento');
  await page.getByRole('button', { name: 'Cargar ejemplo y sustituir datos', exact: true }).click();
  await expect(
    page.getByText('train 280 / validación 60 / test 60.', { exact: false }),
  ).toBeVisible();
  await page.getByLabel('Épocas máximas', { exact: true }).fill('3');
  await page.getByRole('button', { name: 'Inicializar modelo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Una época', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Una época', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Época 1');
  await expect(page.locator('.recovery-panel')).toContainText('Recuperación guardada · época 1');
}
async function restore(page: Page) {
  await page.getByRole('button', { name: 'Recuperar sesión guardada', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar recuperación', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Época 1');
}
test('recarga reanuda Adam exactamente en el siguiente lote y permite borrar las copias', async ({
  page,
}) => {
  await train(page);
  const state = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('neural-atlas');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return await new Promise<{ weights: number[]; step: number; updates: number; cursor: number }>(
      (resolve, reject) => {
        const tx = db.transaction('trainingRecovery');
        const req = tx.objectStore('trainingRecovery').get('active');
        req.onsuccess = () => {
          const s = req.result.slots[0].snapshot.checkpoint;
          resolve({
            weights: Array.from(s.model.layers[0].weights),
            step: s.optimizer.step,
            updates: s.updates,
            cursor: s.cursor,
          });
        };
        tx.oncomplete = () => db.close();
        tx.onabort = () => reject(tx.error);
      },
    );
  });
  expect(state.step).toBe(18);
  expect(state.updates).toBe(18);
  await page
    .getByLabel('Guardar puntos de recuperación en este navegador', { exact: true })
    .uncheck();
  await page.getByRole('button', { name: 'Un lote', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('19');
  const uninterrupted = await checkpoint(page);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Inicializar modelo', exact: true })).toBeEnabled();
  await restore(page);
  await expect(page.getByRole('button', { name: 'Un lote', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Un lote', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('19');
  await expect(page.locator('.recovery-panel')).toContainText('actualización 19');
  expect(await checkpoint(page)).toEqual(uninterrupted);
  await page.getByRole('button', { name: 'Eliminar puntos de recuperación', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar recuperación', exact: true }).click();
  await expect(page.locator('.recovery-panel')).toContainText('Puntos de recuperación eliminados.');
  await expect(
    page.getByRole('button', { name: 'Recuperar sesión guardada', exact: true }),
  ).toHaveCount(0);
});
test('fallback de copia corrupta y dos pestañas sin sobrescritura silenciosa', async ({
  page,
  context,
}) => {
  await train(page);
  const other = await context.newPage();
  await other.goto('#/lab/entrenamiento');
  await expect(other.locator('.recovery-panel')).toContainText('Hay un punto guardado');
  await other
    .getByRole('button', { name: 'Cargar ejemplo y sustituir datos', exact: true })
    .click();
  await other.getByLabel('Épocas máximas', { exact: true }).fill('3');
  await other.getByRole('button', { name: 'Inicializar modelo', exact: true }).click();
  await expect(other.getByRole('button', { name: 'Una época', exact: true })).toBeEnabled();
  await expect(other.locator('.recovery-panel')).toContainText('Hay un punto guardado');
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const req = indexedDB.open('neural-atlas');
      req.onsuccess = () => resolve(req.result);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('trainingRecovery', 'readwrite'),
        store = tx.objectStore('trainingRecovery'),
        req = store.get('active');
      req.onsuccess = () => {
        const record = req.result;
        record.slots[0].integrity = 'corrupt';
        store.put(record);
      };
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onabort = () => reject(tx.error);
    });
  });
  await page.reload();
  await page.getByRole('button', { name: 'Recuperar sesión guardada', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar recuperación', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Época');
  await expect(page.getByRole('button', { name: 'Entrenar', exact: true })).toBeEnabled();
});
test('IndexedDB denegado conserva entrenamiento y exportación manual', async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(globalThis, 'indexedDB', {
      get() {
        throw new DOMException('denied', 'SecurityError');
      },
      configurable: true,
    }),
  );
  await page.goto('#/lab/entrenamiento');
  await expect(page.locator('.recovery-panel')).toContainText('no disponible');
  await page.getByRole('button', { name: 'Cargar ejemplo y sustituir datos', exact: true }).click();
  await page.getByRole('button', { name: 'Inicializar modelo', exact: true }).click();
  await page.getByRole('button', { name: 'Un lote', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('1');
  await page.goto('#/biblioteca');
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar sesión JSON', exact: true }).click();
  expect((await downloaded).suggestedFilename()).toContain('.json');
});
test('congelación y consulta de test sobreviven a recuperación automática', async ({ page }) => {
  await train(page);
  await page.goto('#/lab/clasificacion');
  await page.getByLabel('Entiendo que congelar', { exact: false }).check();
  await page.getByRole('button', { name: 'Congelar modelo y evaluar test' }).click();
  await expect(page.getByRole('heading', { name: 'Resultados: test' })).toBeVisible();
  await page.goto('#/lab/entrenamiento');
  await expect(page.locator('.recovery-panel')).toContainText('modelo congelado');
  await expect(
    page.getByRole('button', { name: 'Revisar puntos guardados', exact: true }),
  ).toBeEnabled();
  await page.reload();
  await restore(page);
  await expect(page.locator('.training-status')).toContainText('Modelo congelado');
  await expect(page.getByRole('button', { name: 'Entrenar', exact: true })).toBeDisabled();
  await page.goto('#/lab/clasificacion');
  await expect(page.getByText('Test ya ha sido consultado', { exact: false })).toBeVisible();
});
