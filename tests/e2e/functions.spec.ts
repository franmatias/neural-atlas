import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
async function file(page: Page, name: string) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name, exact: true }).click();
  return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
}
async function open(page: Page) {
  await page.goto('#/lab/regresion');
  await page.getByRole('link', { name: 'Construir una función con neuronas', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Una curva, muchas contribuciones.',
  );
  await page.getByLabel('Épocas de aproximación', { exact: true }).fill('5');
}
async function train(page: Page) {
  await page.getByRole('button', { name: 'Entrenar aproximación', exact: true }).click();
  await expect(page.getByTestId('function-grid-mse')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Entrenar aproximación', exact: true }),
  ).toBeEnabled();
}
test('cuatro anchuras reales, términos exactos, archivos independientes y reanudación intermedia', async ({
  page,
}) => {
  await open(page);
  await page
    .getByRole('combobox', { name: 'Función objetivo', exact: true })
    .selectOption('absolute');
  await page
    .getByRole('combobox', { name: 'Activación de aproximación', exact: true })
    .selectOption('relu');
  await page.getByLabel('Comparar 1, 2, 8 y 32 neuronas', { exact: true }).check();
  await page.getByLabel('Ruido σ en el objetivo', { exact: true }).fill('0,1');
  await page.getByLabel('Ruido σ en el objetivo', { exact: true }).press('Enter');
  await page
    .getByLabel('Hipótesis de aproximación', { exact: true })
    .fill('La salida será la suma de términos, no una atribución causal.');
  await train(page);
  const report = await file(page, 'Exportar informe de aproximación');
  expect(report.options).toMatchObject({ kind: 'absolute', noise: 0.1, epochs: 5, compare: true });
  expect(report.testEvaluated).toBe(false);
  expect(report.split.test).toHaveLength(48);
  expect(report.runs.map((r: { width: number }) => r.width)).toEqual([1, 2, 8, 32]);
  for (const run of report.runs) {
    expect(run.snapshots.at(-1).update).toBe(45);
    for (const snap of run.snapshots)
      for (const p of snap.curve) {
        const sum = p.contributions.reduce(
          (s: number, v: number) => s + v,
          snap.model.layers[1].biases[0],
        );
        expect(sum).toBe(p.prediction);
      }
  }
  await page
    .getByRole('combobox', { name: 'Red de aproximación inspeccionada', exact: true })
    .selectOption('3');
  await expect(
    page.getByRole('table', { name: /Contribuciones exactas/ }).locator('tbody tr'),
  ).toHaveCount(32);
  await page.getByRole('slider', { name: 'Instantánea de entrenamiento', exact: true }).fill('1');
  await expect(page.getByTestId('function-snapshot')).toContainText('Época 1');
  const experiment = await file(page, 'Exportar experimento seleccionado');
  expect(experiment.config.spec.inputs).toBe(1);
  expect(experiment.checkpoint.updates).toBe(9);
  const model = await file(page, 'Exportar modelo seleccionado');
  expect(model.task).toBe('regression');
  expect(model).not.toHaveProperty('dataset');
  await page.getByRole('button', { name: 'Abrir ensayo seleccionado', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar apertura del estudio', exact: true }).click();
  await expect(page).toHaveURL(/#\/lab\/entrenamiento$/);
  await expect(page.getByRole('button', { name: 'Un lote', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Un lote', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Actualizaciones 10');
});
test('escalón: cota del salto, rejilla limpia, teclado, animación real y movimiento reducido', async ({
  page,
}) => {
  await open(page);
  await page.getByRole('combobox', { name: 'Función objetivo', exact: true }).selectOption('step');
  await page.getByLabel('Épocas de aproximación', { exact: true }).fill('20');
  await train(page);
  const report = await file(page, 'Exportar informe de aproximación');
  for (const s of report.runs[0].snapshots) {
    expect(s.jumpLowerBound).toBeGreaterThanOrEqual(0.5);
    const p = s.curve[120].prediction;
    expect(s.jumpLowerBound).toBe(Math.max(Math.abs(p), Math.abs(p - 1)));
  }
  await expect(page.getByTestId('function-jump-bound')).toContainText('≥ 0,5');
  const plot = page.getByRole('group', { name: /^Plano de aproximación/ });
  await plot.focus();
  await plot.press('ArrowRight');
  await expect(page.getByLabel('Entrada x de la función', { exact: true })).toHaveValue('0,01');
  await expect(page.locator('.function-plot .target-line')).toHaveAttribute('d', /H.* M.*H/);
  await page
    .getByRole('slider', { name: 'Velocidad de reproducción de funciones', exact: true })
    .fill('4');
  await page.getByRole('button', { name: 'Reproducir instantáneas', exact: true }).click();
  await expect(
    page.getByRole('slider', { name: 'Instantánea de entrenamiento', exact: true }),
  ).not.toHaveValue('0');
  await page.getByRole('button', { name: 'Pausar instantáneas', exact: true }).click();
  const after = await file(page, 'Exportar informe de aproximación');
  expect(after.runs[0].snapshots).toEqual(report.runs[0].snapshots);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(
    page.getByRole('button', { name: 'Reproducir instantáneas', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Instantánea siguiente', exact: true }).click();
});
test('seno lineal, cancelación controlada, conservación, accesibilidad, temas y móvil', async ({
  page,
}, testInfo) => {
  // Keep only the second function job pending; the initial job uses the native
  // Worker and engine. Cancellation does not depend on winning a CPU race.
  await page.addInitScript(() => {
    const original = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (
      message: unknown,
      transfer?: Transferable[] | StructuredSerializeOptions,
    ) {
      if (
        (window as Window & { holdFunctionJobs?: boolean }).holdFunctionJobs &&
        (message as { job?: { kind?: string } })?.job?.kind === 'functionApproximation'
      )
        return;
      original.call(this, message, transfer as StructuredSerializeOptions);
    };
  });
  await open(page);
  await page
    .getByRole('combobox', { name: 'Activación de aproximación', exact: true })
    .selectOption('linear');
  await page.getByRole('combobox', { name: 'Neuronas ocultas', exact: true }).selectOption('32');
  await train(page);
  await expect(
    page.getByText('Con activación lineal y salida lineal', { exact: false }),
  ).toBeVisible();
  await page.evaluate(() => {
    (window as Window & { holdFunctionJobs?: boolean }).holdFunctionJobs = true;
  });
  await page.getByLabel('Épocas de aproximación', { exact: true }).fill('120');
  await page.getByRole('button', { name: 'Entrenar aproximación', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar aproximación', exact: true }).click();
  const retained = await file(page, 'Exportar informe de aproximación');
  expect(retained.options.epochs).toBe(5);
  await page.getByRole('button', { name: 'Entrenar aproximación', exact: true }).click();
  await page.getByRole('link', { name: 'Regresión y residuos', exact: false }).click();
  await expect(page).toHaveURL(/#\/lab\/regresion$/);
  await page.getByRole('link', { name: 'Construir una función con neuronas', exact: true }).click();
  await expect(page.getByTestId('function-grid-mse')).toBeVisible();
  for (const theme of ['light', 'dark']) {
    await page.getByRole('button', { name: 'Ajustes', exact: true }).click();
    await page.getByLabel('Tema', { exact: true }).selectOption(theme);
    await page.getByRole('button', { name: 'Cerrar ajustes', exact: true }).click();
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
  }
  await page
    .locator('.function-plot')
    .screenshot({ path: testInfo.outputPath('function-approximation.png') });
});
