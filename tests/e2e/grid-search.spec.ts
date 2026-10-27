import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
async function plan(page: import('@playwright/test').Page) {
  await page.goto('#/lab/experimentos/rejilla');
  await page.getByLabel('Anchuras separadas por comas', { exact: true }).fill('2, 4');
  await page.getByLabel('Tasas separadas por comas', { exact: true }).fill('.01');
  await page.getByLabel('Épocas comunes de rejilla', { exact: true }).fill('5');
  await page.getByRole('button', { name: 'Preparar plan y presupuesto', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toContainText('Plan preparado');
}
async function launch(page: import('@playwright/test').Page) {
  await page.getByLabel('He revisado el presupuesto').check();
  await page.getByRole('button', { name: 'Ejecutar plan confirmado', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Búsqueda finalizada');
}
test('plan revisado, clasificación, matriz, registro e informe sin datos y modelo independiente', async ({
  page,
}) => {
  await plan(page);
  await expect(
    page.getByRole('button', { name: 'Ejecutar plan confirmado', exact: true }),
  ).toBeDisabled();
  await launch(page);
  await expect(page.getByRole('cell', { name: 'Completo', exact: true })).toHaveCount(2);
  await expect(
    page.getByRole('img', { name: 'Matriz de pérdida por anchura y tasa' }),
  ).toBeVisible();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar informe de rejilla', exact: true }).click();
  const report = JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
  expect(report.format).toBe('neural-atlas.grid-report');
  expect(report.summary.complete).toBe(true);
  expect(report.attempts).toHaveLength(2);
  expect(report.plan.settings.datasetJson).toBeUndefined();
  expect(report.attempts[0].measurement.model).toBeUndefined();
  expect(report.testEvaluated).toBe(false);
  const modelPending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar modelo del intento 1', exact: true }).click();
  const model = JSON.parse(await readFile((await (await modelPending).path())!, 'utf8'));
  expect(model.format).toBe('neural-atlas.model');
  expect(model.training.epoch).toBe(5);
  expect(model.training.testConsulted).toBe(false);
  expect(model.dataset).toBeUndefined();
});
test('tres folds y tres semillas de regresión, límite global y plan anterior conservado', async ({
  page,
}) => {
  await plan(page);
  await page
    .getByRole('combobox', { name: 'Ejemplo de rejilla', exact: true })
    .selectOption('sine');
  await page.getByLabel('Anchuras separadas por comas', { exact: true }).fill('2');
  await page
    .getByRole('combobox', { name: 'Semillas por configuración', exact: true })
    .selectOption('3');
  await page
    .getByRole('combobox', { name: 'Particiones de validación', exact: true })
    .selectOption('3');
  await page.getByRole('button', { name: 'Preparar plan y presupuesto', exact: true }).click();
  await expect(
    page.getByText('1 configuraciones × 3 particiones × 3 semillas = 9 ejecuciones.'),
  ).toBeVisible();
  await launch(page);
  await expect(page.getByRole('cell', { name: 'Completo', exact: true })).toHaveCount(9);
  await expect(page.getByText('MSE en unidades²', { exact: false })).toBeVisible();
  await page.getByLabel('Anchuras separadas por comas', { exact: true }).fill('2,4,8');
  await page.getByLabel('Tasas separadas por comas', { exact: true }).fill('.001,.01,.05');
  await page.getByRole('button', { name: 'Preparar plan y presupuesto', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Plan rechazado');
  await expect(page.getByRole('cell', { name: 'Completo', exact: true })).toHaveCount(9);
});
test('cancelar identifica intentos pendientes y copiar datos conserva la sesión', async ({
  page,
}) => {
  await page.goto('#/lab/entrenamiento');
  await page.getByRole('button', { name: 'Cargar ejemplo y sustituir datos' }).click();
  await page.getByLabel('Épocas máximas', { exact: true }).fill('5');
  await page.getByRole('button', { name: 'Inicializar modelo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Un lote', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Un lote', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Actualizaciones 1');
  await plan(page);
  await page
    .getByRole('combobox', { name: 'Origen de la rejilla', exact: true })
    .selectOption('workspace');
  await page.getByLabel('Anchuras separadas por comas', { exact: true }).fill('2,4,8');
  await page.getByLabel('Tasas separadas por comas', { exact: true }).fill('.01,.05');
  await page
    .getByRole('combobox', { name: 'Semillas por configuración', exact: true })
    .selectOption('3');
  await page.getByRole('button', { name: 'Preparar plan y presupuesto', exact: true }).click();
  await expect(
    page.getByText('6 configuraciones × 1 particiones × 3 semillas = 18 ejecuciones.'),
  ).toBeVisible();
  await page.getByLabel('He revisado el presupuesto').check();
  await page.getByRole('button', { name: 'Ejecutar plan confirmado', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar rejilla', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Cálculo cancelado');
  await expect(page.getByRole('cell', { name: 'No intentado', exact: true }).first()).toBeVisible();
  await page.goto('#/lab/entrenamiento');
  await expect(page.locator('.training-status')).toContainText('Actualizaciones 1');
});
test('temas, teclado, movimiento reducido y móvil sin desbordamiento', async ({ page }) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await plan(page);
  await launch(page);
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
  await page.setViewportSize({ width: 360, height: 1000 });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
