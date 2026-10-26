import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
async function evaluate(page: Page, recipe: string) {
  await page.goto('#/lab/entrenamiento');
  await page.getByLabel('Ejemplo de entrenamiento', { exact: true }).selectOption(recipe);
  await page.getByRole('button', { name: 'Cargar ejemplo y sustituir datos' }).click();
  await expect(
    page.getByText('train 280 / validación 60 / test 60.', { exact: false }),
  ).toBeVisible();
  await page.getByLabel('Épocas máximas', { exact: true }).fill('3');
  await page.getByRole('button', { name: 'Inicializar modelo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Un lote', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Entrenar', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Épocas completadas');
  await page.goto('#/lab/clasificacion');
  await page.getByRole('button', { name: 'Evaluar validación', exact: true }).click();
  await expect(page.getByTestId('probability-brier')).toBeVisible();
}
async function report(page: Page) {
  const pending = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Exportar informe de probabilidades y costes', exact: true })
    .click();
  return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
}
test('probabilidades de Worker real, costes asimétricos, umbral exacto y test congelado', async ({
  page,
}) => {
  await evaluate(page, 'moons');
  const initial = await report(page);
  expect(initial.actual).toHaveLength(60);
  expect(initial.predictions).toHaveLength(60);
  const brier = initial.predictions.reduce(
    (s: number, p: number[], i: number) => s + (p[0]! - initial.actual[i]) ** 2 / 60,
    0,
  );
  expect(initial.metrics.brier).toBeCloseTo(brier, 14);
  await page
    .getByLabel(`Coste real ${initial.classOrder[0]}, predicha ${initial.classOrder[1]}`, {
      exact: true,
    })
    .fill('1,5');
  await page
    .getByLabel(`Coste real ${initial.classOrder[1]}, predicha ${initial.classOrder[0]}`, {
      exact: true,
    })
    .fill('5');
  await page
    .getByLabel('Interpretación de probabilidades y costes', { exact: true })
    .fill('Priorizo evitar falsos negativos; comprobaré el coste en test.');
  await page
    .getByRole('button', { name: 'Aplicar umbral de menor coste en validación', exact: true })
    .click();
  const applied = await report(page);
  expect(applied.costs[0][1]).toBe(1.5);
  expect(applied.threshold).toBe(applied.validationCandidate.threshold);
  expect(
    Number(await page.getByRole('slider', { name: /^Umbral de decisión/ }).inputValue()),
  ).toBeCloseTo(applied.threshold, 12);
  expect(applied.meanCost).toBeCloseTo(applied.validationCandidate.cost, 14);
  const before = applied.metrics.brier;
  await page.getByLabel('Clase positiva', { exact: true }).selectOption('0');
  const flipped = await report(page);
  expect(flipped.metrics.brier).toBe(before);
  expect(flipped.positive).toBe(0);
  await page.getByLabel('Entiendo que congelar', { exact: false }).check();
  await page.getByRole('button', { name: 'Congelar modelo y evaluar test', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Resultados: test' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Aplicar umbral de menor coste en validación' }),
  ).toBeDisabled();
  const final = await report(page);
  expect(final.split).toBe('test');
  expect(final.validationCandidate).toBe(null);
  expect(final.threshold).toBe(applied.threshold);
  expect(final.testPreviouslyConsulted).toBe(true);
});
test('Softmax one-vs-rest, bins, inspector, exportación, accesibilidad, temas y móvil', async ({
  page,
}, testInfo) => {
  await evaluate(page, 'flowers');
  await page.getByRole('combobox', { name: 'Clase para curvas one-vs-rest' }).selectOption('2');
  await page.getByRole('slider', { name: 'Intervalos de fiabilidad', exact: true }).fill('20');
  await page.getByRole('slider', { name: 'Recorrer umbrales de ranking', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.ranking-inspector')).not.toContainText('nadie positivo');
  await page.getByText('Datos de fiabilidad y resultados por clase', { exact: true }).click();
  const rows = page.getByRole('table', { name: /Intervalos de fiabilidad de/ }).locator('tbody tr');
  await expect(rows).toHaveCount(20);
  const output = await report(page);
  expect(output.inspectedClass).toBe(2);
  expect(output.bins).toBe(20);
  expect(output.metrics.convention).toBe('multiclass-sum');
  expect(output.metrics.macroAuc.defined).toBe(3);
  expect(output.validationCandidate).toBe(null);
  const expected = output.predictions.reduce(
    (sum: number, p: number[], i: number) =>
      sum +
      p.reduce((s, v, c) => s + (v - Number(output.actual[i] === c)) ** 2, 0) /
        output.actual.length,
    0,
  );
  expect(output.metrics.brier).toBeCloseTo(expected, 14);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const theme of ['dark', 'light']) {
    await page.getByRole('button', { name: 'Ajustes', exact: true }).click();
    await page.getByLabel('Tema', { exact: true }).selectOption(theme);
    await page.getByRole('button', { name: 'Cerrar ajustes', exact: true }).click();
    for (const width of [390, 1440]) {
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
  await page.getByText('Datos de fiabilidad y resultados por clase', { exact: true }).click();
  await page
    .locator('.probability-evaluation')
    .screenshot({ path: testInfo.outputPath('probability-evaluation.png') });
});
