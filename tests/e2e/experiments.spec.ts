import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
async function setup(page: Page, mode: 'ab' | 'cv' = 'ab', recipe = 'moons') {
  await page.goto('#/lab/experimentos');
  await page
    .getByRole('combobox', { name: 'Ejemplo para experimentos', exact: true })
    .selectOption(recipe);
  await page.getByRole('button', { name: 'Cargar ejemplo en el estudio', exact: true }).click();
  await page.getByRole('combobox', { name: 'Tipo de estudio', exact: true }).selectOption(mode);
  await page.getByLabel('Épocas comunes', { exact: true }).fill('5');
  await page
    .getByLabel('Predicción antes de ejecutar', { exact: true })
    .fill('Espero observar un cambio; lo contrastaré con validación.');
  await page.getByRole('button', { name: 'Ejecutar estudio', exact: true }).click();
  await expect(
    page
      .getByRole('table', {
        name: mode === 'ab' ? 'Resultados de experimentos A/B' : 'Resultados de validación cruzada',
        exact: true,
      })
      .locator('tbody tr'),
  ).toHaveCount(mode === 'ab' ? 2 : 5);
}
async function file(page: Page, name: string) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name, exact: true }).click();
  return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
}
test('A/B nativo: cambios precisos, sondas comunes, informe y apertura del ensayo correcto', async ({
  page,
}) => {
  await setup(page);
  const report = await file(page, 'Exportar informe del estudio');
  expect(report.format).toBe('neural-atlas.comparison-report');
  expect(report.differences.map((d: { field: string }) => d.field)).toEqual(['config.spec.hidden']);
  expect(report.probes).toHaveLength(8);
  expect(report.options.hypothesis).toContain('Espero observar');
  expect(report.testEvaluatedInStudy).toBe(false);
  const trial = await file(page, 'Exportar experimento seleccionado');
  expect(trial.config.spec.hidden).toEqual([8, 8]);
  expect(trial.checkpoint.history.at(-1).validationLoss).toBe(report.runs[1].point.validationLoss);
  await page.getByRole('button', { name: 'Abrir ensayo seleccionado', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar apertura del estudio', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Época 5');
});
test('CV agrupada nativa: desarrollo completo una vez, archivo v3 y recuperación en disco', async ({
  page,
}) => {
  await setup(page, 'cv', 'grouped');
  const report = await file(page, 'Exportar informe del estudio');
  expect(report.format).toBe('neural-atlas.cross-validation-report');
  expect(report.options.strategy).toBe('grouped');
  const validation = report.folds.flatMap((f: { validationIds: string[] }) => f.validationIds);
  expect(new Set(validation).size).toBe(validation.length);
  expect(validation.some((id: string) => report.testIds.includes(id))).toBe(false);
  await page
    .getByRole('combobox', { name: 'Fold para inspeccionar', exact: true })
    .selectOption('2');
  const trial = await file(page, 'Exportar experimento seleccionado');
  expect(trial.dataset.schemaVersion).toBe(3);
  expect(trial.dataset.split.fold.index).toBe(2);
  expect(trial.config.earlyStopping).toBeUndefined();
  expect(trial.dataset.split.validation).toEqual(report.folds[2].validationIds);
  await page.getByRole('button', { name: 'Abrir ensayo seleccionado', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar apertura del estudio', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText(
    `Actualizaciones ${trial.checkpoint.updates}`,
  );
  await expect(page.locator('.recovery-panel li').first()).toContainText(
    `actualización ${trial.checkpoint.updates}`,
  );
  await page.reload();
  await page.getByRole('button', { name: 'Recuperar sesión guardada', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar recuperación', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText(
    `Actualizaciones ${trial.checkpoint.updates}`,
  );
  await page.goto('#/lab/datos');
  await page.getByRole('button', { name: 'Dividir', exact: true }).click();
  await expect(page.getByText('Fold 3 de 5', { exact: false })).toBeVisible();
});
for (const [recipe, task] of [
  ['flowers', 'multiclass'],
  ['sine', 'regression'],
] as const)
  test(`CV ${recipe}: tarea, métricas y modelos independientes del fold`, async ({ page }) => {
    await setup(page, 'cv', recipe);
    const report = await file(page, 'Exportar informe del estudio');
    expect(report.task).toBe(task);
    expect(report.folds).toHaveLength(5);
    const model = await file(page, 'Exportar modelo seleccionado');
    expect(model.task).toBe(task);
    expect(model.training.epoch).toBe(5);
    expect(Number.isFinite(report.summary.pooledLoss)).toBe(true);
    expect(report.testEvaluatedInStudy).toBe(false);
  });
test('L12 accesible en ambos modos, temas y móvil; respeta movimiento reducido', async ({
  page,
}) => {
  await setup(page);
  await page.setViewportSize({ width: 360, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const mode of ['ab', 'cv']) {
    if (mode === 'cv') {
      await page.getByRole('combobox', { name: 'Tipo de estudio', exact: true }).selectOption('cv');
      await page.getByRole('button', { name: 'Ejecutar estudio', exact: true }).click();
      await expect(page.locator('.cv-results')).toBeVisible();
    }
    await expect(
      page.getByLabel('Animar conexiones de la inspección', { exact: false }),
    ).toBeDisabled();
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
  }
});
test('cancelar y abandonar un estudio conserva el informe anterior y su hipótesis', async ({
  page,
}) => {
  await setup(page);
  await page.getByLabel('Épocas comunes', { exact: true }).fill('120');
  await page.getByLabel('Capas ocultas A', { exact: true }).fill('32, 32');
  await page.getByLabel('Capas ocultas B', { exact: true }).fill('32, 32');
  await page.getByRole('button', { name: 'Ejecutar estudio', exact: true }).click();
  const cancel = page.getByRole('button', { name: 'Cancelar experimento', exact: true });
  await cancel.click();
  await page.getByRole('button', { name: 'Ejecutar estudio', exact: true }).click();
  await page.getByRole('link', { name: 'Datos', exact: true }).click();
  await page.goto('#/lab/experimentos');
  await expect(page.getByRole('button', { name: 'Ejecutar estudio', exact: true })).toBeEnabled();
  const report = await file(page, 'Exportar informe del estudio');
  expect(report.options.a.epochs).toBe(5);
});
