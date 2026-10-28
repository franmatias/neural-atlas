import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
async function run(page: import('@playwright/test').Page) {
  await page.goto('#/lab/experimentos/importancia');
  await page.getByLabel('Épocas de la red independiente', { exact: true }).fill('5');
  await page.getByRole('button', { name: 'Calcular importancia', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toContainText('Análisis completo');
}
test('permutaciones reales, inspector, informe y red exportada', async ({ page }) => {
  await run(page);
  await expect(
    page.getByRole('img', { name: 'Importancia media por característica con desviación' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Paso siguiente' }).click();
  await expect(page.getByText('Paso 2 / 12.')).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Característica inspeccionada', exact: true })
    .selectOption('1');
  await page
    .getByRole('combobox', { name: 'Repetición inspeccionada', exact: true })
    .selectOption('1');
  const d = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar informe de importancia' }).click();
  const report = JSON.parse(await readFile((await (await d).path())!, 'utf8'));
  expect(report.format).toBe('neural-atlas.permutation-report');
  expect(report.rows).toBeUndefined();
  expect(report.results[0].trials).toHaveLength(5);
  expect(report.results[0].trials[0].order).toBeUndefined();
  expect(report.testEvaluated).toBe(false);
  const m = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar red congelada' }).click();
  const model = JSON.parse(await readFile((await (await m).path())!, 'utf8'));
  expect(model.hashes.networkHash).toBe(report.provenance.networkHash);
  expect(model.hashes.pipelineHash).toBe(report.provenance.pipelineHash);
});
test('checkpoint detenido usa su red sin nuevas actualizaciones', async ({ page }) => {
  await page.goto('#/lab/entrenamiento');
  await page.getByRole('button', { name: 'Cargar ejemplo y sustituir datos' }).click();
  await page.getByLabel('Épocas máximas', { exact: true }).fill('5');
  await page.getByRole('button', { name: 'Inicializar modelo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Un lote', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Un lote', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Actualizaciones 1');
  await page.goto('#/lab/experimentos/importancia');
  await page
    .getByRole('combobox', { name: 'Fuente del análisis', exact: true })
    .selectOption('checkpoint');
  await page.getByRole('button', { name: 'Calcular importancia', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Análisis completo');
  await expect(page.getByText('Fuente registrada: checkpoint detenido.')).toBeVisible();
  await page.goto('#/lab/entrenamiento');
  await expect(page.locator('.training-status')).toContainText('Actualizaciones 1');
});
test('correlación, accesibilidad, temas y móvil con movimiento reducido', async ({ page }) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await run(page);
  await expect(page.getByRole('button', { name: 'Reproducir recorrido' })).toBeDisabled();
  await page
    .getByRole('combobox', { name: 'Ejemplo de importancia', exact: true })
    .selectOption('correlated');
  await page.getByRole('button', { name: 'Calcular importancia' }).click();
  await expect(page.getByRole('rowheader', { name: 'Ruido independiente', exact: true })).toBeVisible();
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
});
