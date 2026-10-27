import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
async function run(page: import('@playwright/test').Page, recipe = 'moons') {
  await page.goto('#/lab/experimentos/clasicos');
  await page.getByRole('combobox', { name: 'Ejemplo', exact: true }).selectOption(recipe);
  await page.getByLabel('Épocas MLP', { exact: true }).fill('5');
  await page.getByRole('button', { name: 'Comparar tres modelos' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toContainText('Comparación completa');
}
test('tres familias, vecinos/ruta, sonda y roundtrip del estimador sin incluir holdout', async ({
  page,
}) => {
  await run(page);
  await expect(page.getByRole('img', { name: /Corte de predicción/ })).toHaveCount(3);
  await expect(page.getByText('168 train · 36 validación')).toBeVisible();
  await page.getByRole('button', { name: 'Predecir con los tres modelos' }).click();
  await expect(page.getByRole('button', { name: 'Predecir con los tres modelos' })).toBeEnabled();
  await expect(
    page.getByRole('region', { name: 'Vecinos de la sonda' }).locator('tbody tr'),
  ).toHaveCount(5);
  await page.getByRole('button', { name: 'Paso siguiente' }).click();
  await expect(page.getByText('Paso 2 / 5')).toBeVisible();
  await page.getByRole('combobox', { name: 'Recorrido', exact: true }).selectOption('cart');
  await expect(
    page.getByRole('img', { name: 'Árbol de decisiones y ruta de la sonda' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Exportar modelo KNN' })).toBeDisabled();
  await page.getByLabel('Entiendo que exportar kNN/CART').check();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar modelo KNN' }).click();
  const file = await download;
  const model = JSON.parse(await readFile((await file.path())!, 'utf8'));
  expect(model.format).toBe('neural-atlas.estimator');
  expect(model.spec.family).toBe('knn');
  expect(model.trainingDataset.dataset.rowIds).toHaveLength(168);
  expect(model.trainingDataset.split).toBeUndefined();
  expect(model.learnedHash).toHaveLength(64);
  expect(model.provenance.testPreviouslyConsulted).toBe(false);
  await page.getByLabel('Archivo de estimador kNN/CART').setInputFiles((await file.path())!);
  await expect(page.getByRole('heading', { name: 'Archivo válido · KNN' })).toBeVisible();
  await page.getByRole('button', { name: 'Predecir con el archivo' }).click();
  await expect(page.getByRole('button', { name: 'Predecir con el archivo' })).toBeEnabled();
  await page
    .getByLabel('Archivo de estimador kNN/CART')
    .setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
  await expect(page.getByRole('alert')).toContainText('Archivo rechazado');
  await expect(page.getByRole('heading', { name: 'Archivo válido · KNN' })).toBeVisible();
});
test('regresión y multiclase calculan métricas de su tarea', async ({ page }) => {
  await run(page, 'sine');
  await expect(page.getByRole('columnheader', { name: 'MSE · unidades²' })).toBeVisible();
  await expect(page.getByText('R²:')).toBeVisible();
  await page
    .getByRole('group', { name: 'Sonda', exact: true })
    .getByRole('spinbutton')
    .first()
    .fill('0.2');
  await page.getByRole('button', { name: 'Predecir con los tres modelos' }).click();
  await expect(page.getByRole('button', { name: 'Predecir con los tres modelos' })).toBeEnabled();
  await page.getByRole('combobox', { name: 'Ejemplo', exact: true }).selectOption('flowers');
  await page.getByRole('button', { name: 'Comparar tres modelos' }).click();
  await expect(page.getByRole('columnheader', { name: 'F1 macro' })).toBeVisible();
  await expect(page.locator('.class-legend').first().locator('li')).toHaveCount(3);
});
test('copiar el laboratorio conserva su sesión y sus contadores', async ({ page }) => {
  await page.goto('#/lab/entrenamiento');
  await page.getByRole('button', { name: 'Cargar ejemplo y sustituir datos' }).click();
  await page.getByLabel('Épocas máximas', { exact: true }).fill('5');
  await page.getByRole('button', { name: 'Inicializar modelo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Un lote', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Un lote', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Actualizaciones 1');
  await page.goto('#/lab/experimentos/clasicos');
  await page
    .getByRole('combobox', { name: 'Origen de datos', exact: true })
    .selectOption('workspace');
  await page.getByLabel('Épocas MLP', { exact: true }).fill('5');
  await page.getByRole('button', { name: 'Comparar tres modelos' }).click();
  await expect(page.getByRole('status')).toContainText('Comparación completa');
  await expect(page.getByText('280 train · 60 validación')).toBeVisible();
  await page.goto('#/lab/entrenamiento');
  await expect(page.locator('.training-status')).toContainText('Actualizaciones 1');
});
test('comparador adaptable, teclado, movimiento reducido y contraste en ambos temas', async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await run(page);
  await expect(page.getByRole('button', { name: 'Reproducir recorrido' })).toBeDisabled();
  for (const theme of ['light', 'dark']) {
    await page.getByRole('button', { name: 'Ajustes', exact: true }).click();
    await page.getByLabel('Tema', { exact: true }).selectOption(theme);
    await page.getByRole('button', { name: 'Cerrar ajustes' }).click();
    for (const width of [360, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
  await page.getByRole('combobox', { name: 'Recorrido', exact: true }).selectOption('cart');
  await page.setViewportSize({ width: 360, height: 1000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
