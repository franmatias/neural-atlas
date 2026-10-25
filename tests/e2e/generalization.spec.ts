import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
async function compare(page: Page, mode: 'l1' | 'l2' | 'clip') {
  await page.goto('#/lab/generalizacion');
  await page.getByRole('combobox', { name: 'Intervención', exact: true }).selectOption(mode);
  await page.getByLabel('Épocas por ensayo', { exact: true }).fill('5');
  await page.getByRole('button', { name: 'Comparar con referencia', exact: true }).click();
  await expect(
    page
      .getByRole('table', { name: 'Comparación de generalización', exact: true })
      .locator('tbody tr'),
  ).toHaveCount(2);
  await expect(page.getByText('Misma inicialización: sí.', { exact: false })).toBeVisible();
}
async function exportRun(page: Page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar ensayo JSON', exact: true }).click();
  return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
}
for (const mode of ['l1', 'l2'] as const)
  test(`${mode}: comparación real, archivo completo y apertura explícita`, async ({ page }) => {
    await compare(page, mode);
    const file = await exportRun(page);
    expect(file.format).toBe('neural-atlas.experiment');
    expect(file.config.regularization[mode]).toBe(0.01);
    expect(file.checkpoint.history).toHaveLength(6);
    const point = file.checkpoint.history.at(-1);
    expect(point.trainObjective).toBeCloseTo(point.trainLoss + point.regularizationPenalty, 12);
    expect(file.testConsulted).toBe(false);
    await page.getByRole('button', { name: 'Abrir ensayo en entrenamiento', exact: true }).click();
    await expect(
      page.getByRole('group', { name: 'Confirmar apertura del ensayo', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Confirmar apertura', exact: true }).click();
    await expect(page.locator('.training-status')).toContainText('Época 5');
    await expect(
      page.getByRole('table', { name: 'Normas por capa antes y después del recorte' }),
    ).toBeVisible();
  });
test('recorte incluye sesgos y su telemetría se conserva al exportar', async ({ page }) => {
  await compare(page, 'clip');
  const file = await exportRun(page),
    control = file.checkpoint.gradientControl;
  expect(file.config.regularization.clipNorm).toBe(0.1);
  expect(control.clippedUpdates).toBeGreaterThan(0);
  expect(control.appliedNorm).toBeLessThanOrEqual(0.1 + 1e-12);
  expect(control.rawBiases).toHaveLength(3);
  await page
    .getByRole('combobox', { name: 'Ensayo para inspeccionar', exact: true })
    .selectOption('0');
  const baseline = await exportRun(page);
  expect(baseline.config.regularization).toEqual({ l1: 0, l2: 0, clipNorm: 0 });
  expect(baseline.checkpoint.gradientControl.clippedUpdates).toBe(0);
});
test('parada temprana se compara con un presupuesto común y exporta la selección v3', async ({
  page,
}) => {
  await page.goto('#/lab/generalizacion');
  await page.getByRole('combobox', { name: 'Intervención', exact: true }).selectOption('early');
  await page.getByLabel('Épocas por ensayo', { exact: true }).fill('5');
  await page.getByRole('button', { name: 'Comparar con referencia', exact: true }).click();
  await expect(page.locator('.early-result')).toContainText('Presupuesto de épocas agotado');
  const file = await exportRun(page);
  expect(file.schemaVersion).toBe(3);
  expect(file.checkpoint.earlyStopping.stoppedAt).toBe(5);
  expect(file.checkpoint.epoch).toBeLessThanOrEqual(5);
  expect(file.testConsulted).toBe(false);
});
test('entrenamiento regularizado se recupera en disco y conserva inferencia independiente', async ({
  page,
}) => {
  await page.goto('#/lab/entrenamiento');
  await page.getByRole('button', { name: 'Cargar ejemplo y sustituir datos', exact: true }).click();
  await page.getByLabel('Épocas máximas', { exact: true }).fill('3');
  await page.getByText('Regularización y control del gradiente', { exact: true }).click();
  await page.getByLabel('Coeficiente L1', { exact: true }).fill('0.002');
  await page.getByLabel('Coeficiente L2', { exact: true }).fill('0.01');
  await page.getByLabel('Norma máxima del gradiente', { exact: false }).fill('0.1');
  await page.getByRole('button', { name: 'Inicializar modelo', exact: true }).click();
  await page.getByRole('button', { name: 'Un lote', exact: true }).click();
  await expect(page.locator('.recovery-panel')).toContainText('actualización 1');
  await page.reload();
  await page.getByRole('button', { name: 'Recuperar sesión guardada', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar recuperación', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Actualizaciones 1');
  await page.getByRole('button', { name: 'Un lote', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Actualizaciones 2');
  await page.goto('#/modelos');
  await page.getByRole('button', { name: 'Copiar modelo de la sesión', exact: true }).click();
  await page.getByRole('button', { name: 'Predecir con este modelo', exact: true }).click();
  await expect(page.locator('.prediction-result')).toBeVisible();
});
test('comparación accesible en ambos temas, móvil y movimiento reducido', async ({ page }) => {
  await compare(page, 'l2');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.getByLabel('Animar el esquema de conexiones', { exact: false })).toBeDisabled();
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (theme) => document.documentElement.setAttribute('data-theme', theme),
      theme,
    );
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});
