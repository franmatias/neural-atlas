import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
test('multisemilla: Worker real, informe, selección y apertura del ensayo correcto', async ({
  page,
}) => {
  await page.goto('#/lab/generalizacion');
  await page.getByLabel('Épocas por ensayo', { exact: true }).fill('5');
  await page.getByLabel('Primera semilla de entrenamiento', { exact: true }).fill('4294967295');
  await page.getByRole('button', { name: 'Comparar múltiples semillas', exact: true }).click();
  await expect(
    page.getByRole('table', { name: 'Resultados por semilla', exact: true }).locator('tbody tr'),
  ).toHaveCount(3);
  await expect(
    page.getByRole('img', { name: 'Diferencia de pérdida de validación por semilla' }),
  ).toBeVisible();
  const reportDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar informe multisemilla', exact: true }).click();
  const report = JSON.parse(await readFile((await (await reportDownload).path())!, 'utf8'));
  expect(report.format).toBe('neural-atlas.multiseed-report');
  expect(report.measurements.map((m: { seed: number }) => m.seed)).toEqual([4294967295, 0, 1]);
  expect(report.testConsulted).toBe(false);
  await page
    .getByRole('combobox', { name: 'Pareja para inspeccionar', exact: true })
    .selectOption('2');
  const trialDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar ensayo JSON', exact: true }).click();
  const trial = JSON.parse(await readFile((await (await trialDownload).path())!, 'utf8'));
  expect(trial.config.seed).toBe(1);
  expect(trial.config.regularization.l2).toBe(0.01);
  expect(trial.checkpoint.history.at(-1).validationLoss).toBe(
    report.measurements[2].interventionLoss,
  );
  await page.getByRole('button', { name: 'Abrir ensayo en entrenamiento', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar apertura', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Época 5');
});
test('multisemilla: equivalencia con λ cero, móvil, ambos temas y cancelación sin perder resultados', async ({
  page,
}) => {
  await page.goto('#/lab/generalizacion');
  await page.getByLabel('Épocas por ensayo', { exact: true }).fill('5');
  await page.getByLabel('Intensidad λ', { exact: true }).fill('0');
  await page.getByRole('button', { name: 'Comparar múltiples semillas', exact: true }).click();
  await expect(page.locator('.multiseed-panel')).toContainText('equivalente en 3');
  await page.getByLabel('Épocas por ensayo', { exact: true }).fill('120');
  await page
    .getByRole('combobox', { name: 'Repeticiones emparejadas', exact: true })
    .selectOption('10');
  await page.getByRole('button', { name: 'Comparar múltiples semillas', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar comparación', exact: true }).click();
  await expect(
    page.getByRole('table', { name: 'Resultados por semilla', exact: true }).locator('tbody tr'),
  ).toHaveCount(3);
  await expect(
    page.getByRole('button', { name: 'Comparar múltiples semillas', exact: true }),
  ).toBeEnabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
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
