import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
async function run(page: import('@playwright/test').Page, seed = 42) {
  await page.goto('#/lab/generalizacion');
  await page
    .getByRole('link', { name: 'Explorar capacidad y tamaño de datos', exact: true })
    .click();
  await page.getByLabel('Épocas del estudio', { exact: true }).fill('5');
  await page.getByLabel('Primera semilla de entrenamiento', { exact: true }).fill(String(seed));
  await page.getByRole('button', { name: 'Comparar capacidad y datos', exact: true }).click();
  await expect(
    page
      .getByRole('table', { name: 'Resumen de capacidad y tamaño', exact: true })
      .locator('tbody tr'),
  ).toHaveCount(9);
}
async function file(page: import('@playwright/test').Page, name: string) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name, exact: true }).click();
  return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
}
test('capacidad real: informe, modelo, apertura y recuperación de un prefijo exacto en disco', async ({
  page,
}) => {
  await run(page);
  const report = await file(page, 'Exportar informe de capacidad');
  expect(report.measurements).toHaveLength(27);
  expect(
    report.summary
      .filter((p: { size: number }) => p.size === 24)
      .map((p: { parameters: number }) => p.parameters),
  ).toEqual([3, 9, 337]);
  const trial = await file(page, 'Exportar ensayo de capacidad');
  expect(trial.dataset.schemaVersion).toBe(2);
  expect(trial.dataset.split.selection.count).toBe(24);
  expect(trial.dataset.split.train).toHaveLength(24);
  expect(trial.dataset.split.validation).toHaveLength(24);
  expect(trial.checkpoint.order).toHaveLength(24);
  expect(trial.checkpoint.updates).toBe(10);
  const model = await file(page, 'Exportar modelo de capacidad');
  expect(model.network.spec.hidden).toEqual([]);
  expect(model.hashes.pipelineHash).toBe(trial.pipelineHash);
  await page.getByRole('button', { name: 'Abrir ensayo de capacidad', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar apertura de capacidad', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Actualizaciones 10');
  await expect(page.locator('.recovery-panel li').first()).toContainText('actualización 10');
  await page.reload();
  await page.getByRole('button', { name: 'Recuperar sesión guardada', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar recuperación', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Actualizaciones 10');
  await page.goto('#/lab/clasificacion');
  await page.getByRole('button', { name: 'Evaluar entrenamiento', exact: true }).click();
  await expect(
    page.getByText('24 muestras · actualización evaluada', { exact: false }),
  ).toBeVisible();
  await page.goto('#/lab/datos');
  await page.getByRole('button', { name: 'Dividir', exact: true }).click();
  await expect(
    page.getByText('Subconjunto anidado de train: 24 filas', { exact: false }),
  ).toBeVisible();
});
test('curvas de tamaño accesibles en móvil, temas y movimiento reducido', async ({ page }) => {
  await run(page, 4294967295);
  await page
    .getByRole('combobox', { name: 'Arquitectura en la curva', exact: true })
    .selectOption('linear');
  await expect(
    page.getByRole('img', {
      name: 'Pérdida train y validación según el tamaño de train',
      exact: true,
    }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.getByLabel('Animar conexiones del ensayo', { exact: false })).toBeDisabled();
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (theme) => document.documentElement.setAttribute('data-theme', theme),
      theme,
    );
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
    for (const width of [360, 390]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(
        await page
          .getByRole('combobox', { name: 'Ensayo de capacidad', exact: true })
          .evaluate(
            (el) =>
              el.getBoundingClientRect().width <= el.parentElement!.getBoundingClientRect().width,
          ),
      ).toBe(true);
    }
  }
  // Native select intrinsic widths depend on OS fonts. Exercise wide text metrics explicitly.
  await page.addStyleTag({
    content: '.capacity-page select { font-family: monospace; font-size: 18px; }',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('cancelación y navegación conservan el último estudio y la configuración ejecutada', async ({
  page,
}) => {
  await run(page);
  await page.getByLabel('Ruido del estudio', { exact: true }).fill('0.4');
  const report = await file(page, 'Exportar informe de capacidad');
  expect(report.options.noise).toBe(0.2);
  await page.getByLabel('Épocas del estudio', { exact: true }).fill('120');
  await page
    .getByRole('combobox', { name: 'Semillas por combinación', exact: true })
    .selectOption('5');
  await page.getByRole('button', { name: 'Comparar capacidad y datos', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar estudio', exact: true }).click();
  await expect(page.locator('.capacity-results')).toContainText('5 épocas');
  await page.getByRole('button', { name: 'Comparar capacidad y datos', exact: true }).click();
  await page.getByRole('link', { name: 'Volver a regularización y semillas', exact: true }).click();
  await page
    .getByRole('link', { name: 'Explorar capacidad y tamaño de datos', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Comparar capacidad y datos', exact: true }),
  ).toBeEnabled();
  await expect(page.locator('.capacity-results')).toContainText('5 épocas');
});
