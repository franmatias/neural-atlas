import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
test('robusto en L01: parámetros aprendidos y transformación visibles con Worker nativo', async ({
  page,
}) => {
  await page.goto('#/lab/datos');
  await page.getByRole('button', { name: 'Dividir', exact: true }).click();
  await page.getByRole('button', { name: 'Crear partición' }).click();
  await page.getByRole('button', { name: 'Preparar', exact: true }).click();
  await page.locator('#pipeline-scaling').selectOption('robust');
  await page.getByRole('button', { name: 'Ajustar con train y transformar' }).click();
  await expect(page.locator('.pipeline-result')).toBeVisible();
  await expect(page.locator('.pipeline-columns article').first()).toContainText('Mediana');
  await expect(page.locator('.pipeline-columns article').first()).toContainText('IQR');
  await page.setViewportSize({ width: 360, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('A/B de escaladores: una decisión, experimento v7 recuperable y modelo v3 independiente', async ({
  page,
}) => {
  await page.goto('#/lab/experimentos');
  await page.getByLabel('Épocas comunes', { exact: true }).fill('5');
  await page.getByLabel('Capas ocultas B', { exact: true }).fill('4');
  await page.getByRole('combobox', { name: 'Escalado B', exact: true }).selectOption('robust');
  await page.getByRole('button', { name: 'Ejecutar estudio', exact: true }).click();
  await expect(
    page.getByRole('table', { name: 'Resultados de experimentos A/B', exact: true }),
  ).toBeVisible();
  async function download(name: string) {
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name, exact: true }).click();
    return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
  }
  const report = await download('Exportar informe del estudio');
  expect(report.differences.map((d: { field: string }) => d.field)).toEqual(['pipeline.scaling']);
  expect(report.testEvaluatedInStudy).toBe(false);
  const trial = await download('Exportar experimento seleccionado');
  expect(trial.schemaVersion).toBe(7);
  expect(trial.engineVersion).toBe(7);
  const model = await download('Exportar modelo seleccionado');
  expect(model.schemaVersion).toBe(3);
  expect(model.pipeline.version).toBe(2);
  expect(model.pipeline.columns[0].robust.iqr).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Abrir ensayo seleccionado', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar apertura del estudio', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Época 5');
  await expect(page.locator('.recovery-panel li').first()).toContainText(
    `actualización ${trial.checkpoint.updates}`,
  );
  await page.reload();
  await page.getByRole('button', { name: 'Recuperar sesión guardada', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar recuperación', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Época 5');
  await page.goto('#/modelos');
  await page.getByLabel('Importar modelo JSON', { exact: false }).setInputFiles({
    name: 'robust.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(model)),
  });
  await expect(page.locator('.model-preparation')).toBeVisible();
  await page.locator('.model-preparation summary').click();
  await expect(page.locator('.model-preparation')).toContainText('robusto (mediana / IQR)');
});
