import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
async function setup(page: Page) {
  await page.goto('#/lab/entrenamiento');
  await page.getByRole('button', { name: 'Cargar ejemplo y sustituir datos', exact: true }).click();
  await page.getByLabel('Capas ocultas', { exact: false }).fill('3, 2');
  await page.getByLabel('Tamaño de lote', { exact: false }).fill('31');
  await page.getByLabel('Épocas máximas', { exact: true }).fill('3');
  await page.getByLabel('Activar normalización por lotes (BN)', { exact: true }).check();
  await page.getByLabel('Activar dropout invertido', { exact: true }).check();
  await page.getByLabel('Probabilidad de abandono p', { exact: true }).fill('0.25');
  await page.getByRole('button', { name: 'Inicializar modelo', exact: true }).click();
  await page.getByRole('button', { name: 'Una época', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Época 1');
  await expect(page.locator('.bn-batch-size')).toContainText('32 muestras');
  await expect(page.locator('.recovery-panel')).toContainText('actualización 9');
}
async function checkpoint(page: Page) {
  await page.goto('#/biblioteca');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar sesión JSON', exact: true }).click();
  const file = JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
  await page.goto('#/lab/entrenamiento');
  return file;
}
test('BN/dropout nativos: cola combinada, recuperación exacta y modelo de inferencia v2', async ({
  page,
}) => {
  await setup(page);
  const first = await checkpoint(page);
  expect(first.schemaVersion).toBe(5);
  expect(first.checkpoint.updates).toBe(9);
  await page.getByRole('button', { name: 'Un lote', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Actualizaciones 10');
  const expected = await checkpoint(page);
  await page.goto('#/biblioteca');
  await page.getByLabel('Importar experimento JSON', { exact: false }).setInputFiles({
    name: 'bn.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(first)),
  });
  await page.getByRole('button', { name: 'Abrir archivo y sustituir sesión', exact: true }).click();
  await page.goto('#/lab/entrenamiento');
  await page.getByRole('button', { name: 'Un lote', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Actualizaciones 10');
  expect((await checkpoint(page)).checkpoint).toEqual(expected.checkpoint);
  await expect(page.locator('.recovery-panel li').first()).toContainText('actualización 10');
  await expect(
    page.getByRole('button', { name: 'Revisar puntos guardados', exact: true }),
  ).toBeEnabled();
  await page.reload();
  await page.getByRole('button', { name: 'Recuperar sesión guardada', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar recuperación', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Actualizaciones 10');
  expect((await checkpoint(page)).checkpoint).toEqual(expected.checkpoint);
  await page.goto('#/modelos');
  await page.getByRole('button', { name: 'Copiar modelo de la sesión', exact: true }).click();
  await page.getByRole('button', { name: 'Predecir con este modelo', exact: true }).click();
  await expect(page.locator('.prediction-result')).toBeVisible();
  const prediction = await page.locator('.prediction-result > p').allTextContents();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar modelo sin dataset', exact: true }).click();
  const text = await readFile((await (await pending).path())!, 'utf8');
  expect(JSON.parse(text).schemaVersion).toBe(2);
  await page.reload();
  await page
    .getByLabel('Importar modelo JSON', { exact: false })
    .setInputFiles({ name: 'model.json', mimeType: 'application/json', buffer: Buffer.from(text) });
  await page.getByRole('button', { name: 'Predecir con este modelo', exact: true }).click();
  await expect(page.locator('.prediction-result')).toBeVisible();
  expect(await page.locator('.prediction-result > p').allTextContents()).toEqual(prediction);
});
test('BN: tabla y transformación accesibles en móvil, temas y movimiento reducido', async ({
  page,
}) => {
  await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const theme of ['light', 'dark']) {
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  const before = await checkpoint(page);
  await page
    .getByRole('combobox', { name: 'Capa de normalización', exact: true })
    .selectOption('1');
  await page.getByRole('button', { name: 'Usar memoria de inferencia', exact: true }).click();
  await page.getByLabel('Valor previo z para explorar', { exact: true }).fill('2');
  await expect(page.getByLabel('Transformación BN', { exact: true })).toContainText('z = 2');
  expect((await checkpoint(page)).checkpoint).toEqual(before.checkpoint);
  await page.goto('#/lab/clasificacion');
  await page.getByLabel('Entiendo que congelar', { exact: false }).check();
  await page.getByRole('button', { name: 'Congelar modelo y evaluar test' }).click();
  await expect(page.getByRole('heading', { name: 'Resultados: test' })).toBeVisible();
  const frozen = await checkpoint(page);
  expect(frozen.testConsulted).toBe(true);
  expect(frozen.checkpoint.model).toEqual(before.checkpoint.model);
});
test('comparación BN exporta running stats y conserva los pesos densos iniciales', async ({
  page,
}) => {
  await page.goto('#/lab/generalizacion');
  await page.getByRole('combobox', { name: 'Intervención', exact: true }).selectOption('bn');
  await page.getByLabel('Épocas por ensayo', { exact: true }).fill('5');
  await page.getByRole('button', { name: 'Comparar con referencia', exact: true }).click();
  await expect(page.locator('.normalization-panel')).toBeVisible();
  await expect(page.getByText('Misma inicialización: sí.', { exact: false })).toBeVisible();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar ensayo JSON', exact: true }).click();
  const file = JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
  expect(file.schemaVersion).toBe(5);
  expect(file.checkpoint.model.layers[0].normalization.initialized).toBe(true);
  expect(file.checkpoint.model.layers.at(-1).normalization).toBeUndefined();
  expect(file.testConsulted).toBe(false);
});
