import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
async function file(page: Page, name: string) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name, exact: true }).click();
  return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
}
test('derivadas: A/B aislado, experimento v8 y modelo v4 con estadísticas propias', async ({
  page,
}) => {
  await page.goto('#/lab/experimentos');
  await page.getByLabel('Épocas comunes', { exact: true }).fill('5');
  await page.getByLabel('Capas ocultas B', { exact: true }).fill('4');
  await page.getByRole('button', { name: 'Añadir derivada B', exact: true }).click();
  await page.getByRole('combobox', { name: 'Operación B d1', exact: true }).selectOption('product');
  await page.getByRole('combobox', { name: 'Segundo origen B d1', exact: true }).selectOption('x2');
  await page.getByRole('button', { name: 'Ejecutar estudio', exact: true }).click();
  await expect(
    page.getByRole('table', { name: 'Resultados de experimentos A/B', exact: true }),
  ).toBeVisible();
  const report = await file(page, 'Exportar informe del estudio');
  expect(report.differences.map((d: { field: string }) => d.field)).toEqual(['pipeline.derived']);
  const trial = await file(page, 'Exportar experimento seleccionado');
  expect(trial.schemaVersion).toBe(8);
  expect(trial.config.spec.inputs).toBe(3);
  const model = await file(page, 'Exportar modelo seleccionado');
  expect(model.schemaVersion).toBe(4);
  expect(model.pipeline.version).toBe(3);
  expect(model.pipeline.derived).toHaveLength(1);
  expect(model.pipeline.options.derived[0].sources).toEqual(['x1', 'x2']);
});
test('presupuesto de updates y proyección: checkpoint parcial y controles comunes bloqueados', async ({
  page,
}) => {
  await page.goto('#/lab/experimentos');
  await page.getByLabel('Épocas comunes', { exact: true }).fill('5');
  await page
    .getByRole('combobox', { name: 'Presupuesto A/B', exact: true })
    .selectOption('updates');
  await page.getByLabel('Límite del presupuesto', { exact: false }).fill('9');
  await page.getByRole('button', { name: 'Ejecutar estudio', exact: true }).click();
  await expect(
    page.getByRole('table', { name: 'Resultados de experimentos A/B', exact: true }),
  ).toBeVisible();
  const report = await file(page, 'Exportar informe del estudio');
  expect(
    report.runs.every((r: { stop: { point: { update: number } } }) => r.stop.point.update === 9),
  ).toBe(true);
  const trial = await file(page, 'Exportar experimento seleccionado');
  expect(trial.checkpoint.updates).toBe(9);
  expect(trial.checkpoint.cursor).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Activar vista de proyección A/B', exact: true }).click();
  await expect(page.getByLabel('Épocas comunes', { exact: true })).toBeDisabled();
  await expect(
    page.getByRole('region', { name: 'Comparador A/B para proyección', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Sonda sincronizada del proyector', exact: true })
    .selectOption('1');
  await expect(page.locator('.projection-grid article')).toHaveCount(2);
  await page.getByRole('button', { name: 'Salir de la vista de proyección', exact: true }).click();
  await expect(page.getByLabel('Épocas comunes', { exact: true })).toBeEnabled();
});
test('presupuesto temporal y proyector: tiempos observados, temas y móvil', async ({ page }) => {
  await page.goto('#/lab/experimentos');
  await page.getByLabel('Épocas comunes', { exact: true }).fill('120');
  await page.getByRole('combobox', { name: 'Presupuesto A/B', exact: true }).selectOption('time');
  await page.getByLabel('Límite del presupuesto', { exact: false }).fill('50');
  await page.getByRole('button', { name: 'Ejecutar estudio', exact: true }).click();
  await expect(
    page.getByRole('table', { name: 'Resultados de experimentos A/B', exact: true }),
  ).toBeVisible();
  const report = await file(page, 'Exportar informe del estudio');
  expect(
    report.runs.every(
      (r: { stop: { kind: string; elapsedMs: number } }) =>
        r.stop.kind === 'time' && r.stop.elapsedMs >= 0,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Activar vista de proyección A/B', exact: true }).click();
  for (const theme of ['light', 'dark']) {
    await page.getByRole('button', { name: 'Ajustes', exact: true }).click();
    await page.getByRole('dialog').getByLabel('Tema', { exact: true }).selectOption(theme);
    await page.getByRole('button', { name: 'Cerrar ajustes', exact: true }).click();
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
    for (const width of [360, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  }
});
test('L01: derivadas visibles y bloqueo de log1p fuera de dominio', async ({ page }) => {
  await page.goto('#/lab/datos');
  await page.getByRole('button', { name: 'Dividir', exact: true }).click();
  await page.getByRole('button', { name: 'Crear partición', exact: true }).click();
  await page.getByRole('button', { name: 'Preparar', exact: true }).click();
  await page.getByRole('button', { name: 'Añadir derivada Datos', exact: true }).click();
  await page.getByRole('button', { name: 'Ajustar con train y transformar', exact: true }).click();
  await expect(page.locator('.dimension-flow')).toContainText('3 Dimensión resultante');
  await page.getByText('Estadísticas aprendidas de las derivadas', { exact: true }).click();
  await expect(page.getByRole('rowheader', { name: 'd1 = x₁²', exact: true })).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Operación Datos d1', exact: true })
    .selectOption('log1p');
  await page.getByRole('combobox', { name: 'Origen Datos d1', exact: true }).selectOption('x2');
  // Editing the raw data intentionally invalidates the previous split and pipeline.
  await page.getByRole('button', { name: 'Explorar', exact: true }).click();
  await page.getByLabel('x₂', { exact: true }).fill('-2');
  await page.getByRole('button', { name: 'Aplicar cambios de la muestra', exact: true }).click();
  await page.getByRole('button', { name: 'Dividir', exact: true }).click();
  await page.getByRole('button', { name: 'Crear partición', exact: true }).click();
  await page.getByRole('button', { name: 'Preparar', exact: true }).click();
  if ((await page.getByRole('combobox', { name: 'Operación Datos d1', exact: true }).count()) === 0)
    await page.getByRole('button', { name: 'Añadir derivada Datos', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Operación Datos d1', exact: true })
    .selectOption('log1p');
  await page.getByRole('combobox', { name: 'Origen Datos d1', exact: true }).selectOption('x2');
  await page.getByRole('button', { name: 'Ajustar con train y transformar', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
});
for (const [recipe, task] of [
  ['flowers', 'multiclass'],
  ['sine', 'regression'],
] as const)
  test(`dispersión nativa ${recipe}: todas las filas de validación y semillas con wrap`, async ({
    page,
  }) => {
    await page.goto('#/lab/experimentos/robustez');
    await page
      .getByRole('combobox', { name: 'Ejemplo de robustez', exact: true })
      .selectOption(recipe);
    await page.getByRole('button', { name: 'Cargar ejemplo de robustez', exact: true }).click();
    await page.getByLabel('Épocas por semilla', { exact: true }).fill('5');
    await page.getByLabel('Primera semilla', { exact: true }).fill('4294967295');
    await page.getByRole('button', { name: 'Ejecutar estudio de robustez', exact: true }).click();
    await expect(
      page.getByRole('table', { name: 'Dispersión de predicciones', exact: true }),
    ).toBeVisible();
    const report = await file(page, 'Exportar informe de robustez');
    expect(report.task).toBe(task);
    expect(report.probes).toHaveLength(24);
    expect(report.runs.map((r: { config: { seed: number } }) => r.config.seed)).toEqual([
      4294967295, 0, 1,
    ]);
    expect(report.testEvaluatedInStudy).toBe(false);
  });
test('derivas: cero equivalente y tres escenarios sin reajustar pipeline ni evaluar test', async ({
  page,
}) => {
  await page.goto('#/lab/experimentos/robustez');
  await page
    .getByRole('combobox', { name: 'Estudio de robustez', exact: true })
    .selectOption('shift');
  await page.getByLabel('Épocas antes de la deriva', { exact: true }).fill('5');
  await page.getByRole('slider', { name: /Intensidad de deriva/ }).fill('0');
  await page.getByRole('button', { name: 'Ejecutar estudio de robustez', exact: true }).click();
  await expect(
    page.getByRole('table', { name: 'Resultados de deriva', exact: true }),
  ).toBeVisible();
  let report = await file(page, 'Exportar informe de robustez');
  expect(report.delta).toEqual({ loss: 0, accuracy: 0 });
  for (const kind of ['covariate', 'concept', 'serving']) {
    await page
      .getByRole('combobox', { name: 'Escenario de deriva', exact: true })
      .selectOption(kind);
    await page.getByRole('slider', { name: /Intensidad de deriva/ }).fill('0.8');
    await page.getByRole('button', { name: 'Ejecutar estudio de robustez', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Ejecutar estudio de robustez', exact: true }),
    ).toBeEnabled();
    report = await file(page, 'Exportar informe de robustez');
    expect(report.options.kind).toBe(kind);
    expect(report.pipelineRefitted).toBe(false);
    expect(report.pairs).toHaveLength(48);
    expect(report.testEvaluatedInStudy).toBe(false);
  }
});
test('segmentos nativos: cambio de optimizador, reinicio y recuperación automática v9', async ({
  page,
}) => {
  await page.goto('#/lab/entrenamiento');
  await page
    .getByRole('combobox', { name: 'Ejemplo de entrenamiento', exact: true })
    .selectOption('moons');
  await page.getByRole('button', { name: 'Cargar ejemplo y sustituir datos', exact: true }).click();
  await page.getByLabel('Épocas máximas', { exact: true }).fill('8');
  await page.getByRole('button', { name: 'Inicializar modelo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Un lote', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Un lote', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Actualizaciones 1');
  await page
    .getByRole('combobox', { name: 'Optimizador del segmento', exact: true })
    .selectOption('momentum');
  await page.getByLabel('Tasa del segmento', { exact: true }).fill('0.02');
  await page.getByRole('button', { name: 'Registrar segmento', exact: true }).click();
  await expect(
    page.getByRole('table', { name: 'Segmentos registrados', exact: true }).locator('tbody tr'),
  ).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Un lote', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Un lote', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Actualizaciones 2');
  await page
    .getByRole('combobox', { name: 'Optimizador del segmento', exact: true })
    .selectOption('adam');
  await page.getByLabel('Reiniciar también los pesos', { exact: false }).check();
  await page.getByRole('button', { name: 'Registrar segmento', exact: true }).click();
  await expect(
    page.getByRole('table', { name: 'Segmentos registrados', exact: true }).locator('tbody tr'),
  ).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Un lote', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Un lote', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Actualizaciones 3');
  await expect(page.locator('.recovery-panel li').first()).toContainText('actualización 3');
  await page.reload();
  await page.getByRole('button', { name: 'Recuperar sesión guardada', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar recuperación', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Actualizaciones 3');
  await expect(
    page.getByRole('table', { name: 'Segmentos registrados', exact: true }).locator('tbody tr'),
  ).toHaveCount(3);
  await page.getByRole('button', { name: 'Un lote', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Actualizaciones 4');
  await page.goto('#/biblioteca');
  const report = await file(page, 'Exportar sesión JSON');
  expect(report.schemaVersion).toBe(9);
  expect(report.config.segments).toHaveLength(2);
  expect(report.timeline).toHaveLength(3);
  expect(report.timeline.every((s: { configHash: string }) => s.configHash.length === 64)).toBe(
    true,
  );
});
test('D7: accesibilidad de resultados, proyector y móvil en ambos temas', async ({ page }) => {
  await page.goto('#/lab/experimentos/robustez');
  await page.getByLabel('Épocas por semilla', { exact: true }).fill('5');
  await page.getByRole('button', { name: 'Ejecutar estudio de robustez', exact: true }).click();
  await expect(
    page.getByRole('table', { name: 'Dispersión de predicciones', exact: true }),
  ).toBeVisible();
  for (const theme of ['light', 'dark']) {
    await page.getByRole('button', { name: 'Ajustes', exact: true }).click();
    await page.getByRole('dialog').getByLabel('Tema', { exact: true }).selectOption(theme);
    await page.getByRole('button', { name: 'Cerrar ajustes', exact: true }).click();
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
    for (const width of [360, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  }
});
