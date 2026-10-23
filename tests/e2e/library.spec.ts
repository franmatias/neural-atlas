import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
async function train(page: Page) {
  await page.goto('#/lab/entrenamiento');
  await page.getByRole('button', { name: 'Cargar ejemplo y sustituir datos' }).click();
  await expect(
    page.getByText('train 280 / validación 60 / test 60.', { exact: false }),
  ).toBeVisible();
  await page.getByLabel('Épocas máximas', { exact: true }).fill('3');
  await page.getByRole('button', { name: 'Inicializar modelo', exact: true }).click();
  await page.getByRole('button', { name: 'Un lote', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Actualizaciones 1');
  await page.getByRole('link', { name: 'Guardar o recuperar experimento' }).click();
  await expect(page.getByRole('button', { name: 'Exportar sesión JSON' })).toBeEnabled();
}
async function save(page: Page, name = 'Lunas de clase') {
  await page.getByLabel('Nombre del experimento', { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Guardar como nuevo' }).click();
  await expect(page.getByText('Experimento guardado.', { exact: false })).toBeVisible();
}
test('biblioteca nativa: recarga y reanuda en el siguiente lote sin perder Adam', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Preferences denied', 'SecurityError'); } }));
  await train(page);
  await save(page);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar sesión JSON', exact: true }).click();
  const file = await download;
  const text = await readFile((await file.path())!, 'utf8');
  const snapshot = JSON.parse(text) as {
    checkpoint: { updates: number; optimizer: { step: number } };
  };
  expect(snapshot.checkpoint.updates).toBe(1);
  expect(snapshot.checkpoint.optimizer.step).toBe(1);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Lunas de clase', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Abrir Lunas de clase', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar cambio', exact: true }).click();
  await expect(
    page.getByText('Experimento abierto en una sesión nueva.', { exact: false }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Ir al entrenamiento', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Actualizaciones 1');
  await page.getByRole('button', { name: 'Un lote', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Actualizaciones 2');
  await page.getByRole('link', { name: 'Guardar o recuperar experimento' }).click();
  await page
    .getByLabel('Importar experimento JSON', { exact: false })
    .setInputFiles({
      name: 'experiment.json',
      mimeType: 'application/json',
      buffer: Buffer.from(text),
    });
  await expect(page.getByText('Archivo validado · época', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Abrir archivo y sustituir sesión' }).click();
  await expect(page.getByText('Archivo abierto.', { exact: false })).toBeVisible();
  await page.getByRole('link', { name: 'Ir al entrenamiento', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Actualizaciones 1');
  expect(errors).toEqual([]);
});
test('dos pestañas: una revisión obsoleta no sobrescribe ni elimina otra versión', async ({
  page,
  context,
}) => {
  await train(page);
  await save(page);
  const other = await context.newPage();
  await other.goto('#/biblioteca');
  await expect(other.getByRole('heading', { name: 'Lunas de clase', exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Actualizar Lunas de clase con sesión actual', exact: true })
    .click();
  await page.getByRole('button', { name: 'Confirmar cambio', exact: true }).click();
  await expect(page.getByText('Revisión 2', { exact: false })).toBeVisible();
  await other.getByRole('button', { name: 'Eliminar Lunas de clase', exact: true }).click();
  await other.getByRole('button', { name: 'Confirmar cambio', exact: true }).click();
  await expect(other.getByRole('alert')).toContainText('Otra pestaña modificó');
  await expect(other.getByText('Revisión 2', { exact: false })).toBeVisible();
  await other.getByRole('button', { name: 'Eliminar Lunas de clase', exact: true }).click();
  await other.getByRole('button', { name: 'Confirmar cambio', exact: true }).click();
  await expect(other.locator('.library-list li')).toHaveCount(0);
});
test('acceso denegado conserva exportación; archivos inválidos no sustituyen la sesión', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, 'indexedDB', {
      get() {
        throw new DOMException('Denied', 'SecurityError');
      },
    }),
  );
  await train(page);
  await expect(page.getByRole('alert')).toContainText('El navegador no permite guardar');
  await expect(page.getByRole('button', { name: 'Guardar como nuevo' })).toBeDisabled();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar sesión JSON', exact: true }).click();
  await download;
  await page
    .getByLabel('Importar experimento JSON', { exact: false })
    .setInputFiles({
      name: 'bad.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"engineVersion":999}'),
    });
  await expect(page.getByRole('alert')).toContainText('experimento válido');
  await page.getByRole('link', { name: 'Ir al entrenamiento', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Actualizaciones 1');
});
test('biblioteca accesible en móvil y ambos temas', async ({ page }) => {
  await train(page);
  await save(page, 'x'.repeat(120));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute('data-theme', value),
      theme,
    );
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
});
test('modelo congelado y consulta de test sobreviven a una recarga de la biblioteca', async ({ page }) => {
  await train(page);
  await page.goto('#/lab/clasificacion');
  await page.getByLabel('Entiendo que congelar', { exact: false }).check();
  await page.getByRole('button', { name: 'Congelar modelo y evaluar test' }).click();
  await expect(page.getByRole('heading', { name: 'Resultados: test' })).toBeVisible();
  await page.goto('#/biblioteca');
  await save(page, 'Modelo final');
  await page.reload();
  await page.getByRole('button', { name: 'Abrir Modelo final', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Confirmar cambio en biblioteca' })).toBeFocused();
  await page.getByRole('button', { name: 'Confirmar cambio', exact: true }).click();
  await page.getByRole('link', { name: 'Ir al entrenamiento', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Modelo congelado');
  await expect(page.getByRole('button', { name: 'Entrenar', exact: true })).toBeDisabled();
  await page.goto('#/lab/clasificacion');
  await expect(page.getByText('Test ya ha sido consultado', { exact: false })).toBeVisible();
});
test('transacción real: una cuota fallida al escribir el índice revierte el checkpoint', async ({ page }) => {
  await train(page); await save(page);
  await page.getByRole('link', { name: 'Ir al entrenamiento', exact: true }).click();
  await page.getByRole('button', { name: 'Un lote', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Actualizaciones 2');
  await page.getByRole('link', { name: 'Guardar o recuperar experimento' }).click();
  await expect(page.getByRole('heading', { name: 'Lunas de clase', exact: true })).toBeVisible();
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
      if (this.name === 'libraryIndex') {
        IDBObjectStore.prototype.put = original;
        throw new DOMException('Injected quota after checkpoint put', 'QuotaExceededError');
      }
      return key === undefined ? original.call(this, value) : original.call(this, value, key);
    };
  });
  await page.getByRole('button', { name: 'Actualizar Lunas de clase con sesión actual', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar cambio', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('No hay espacio disponible');
  await page.reload();
  await page.getByRole('button', { name: 'Abrir Lunas de clase', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar cambio', exact: true }).click();
  await page.getByRole('link', { name: 'Ir al entrenamiento', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Actualizaciones 1');
});
