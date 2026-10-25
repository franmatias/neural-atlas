import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
async function setup(page: Page) {
  await page.goto('#/lab/entrenamiento');
  await page.getByRole('button', { name: 'Cargar ejemplo y sustituir datos', exact: true }).click();
  await page.getByLabel('Capas ocultas', { exact: false }).fill('4, 3');
  await page.getByLabel('Épocas máximas', { exact: true }).fill('4');
  await page.getByLabel('Tamaño de lote', { exact: false }).fill('8');
  await page.getByLabel('Activar dropout invertido', { exact: true }).check();
  await page.getByLabel('Probabilidad de abandono p', { exact: true }).fill('0.5');
  await page.getByRole('button', { name: 'Inicializar modelo', exact: true }).click();
  await page.getByRole('button', { name: 'Un lote', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Actualizaciones 1');
  await expect(page.locator('.recovery-panel')).toContainText('actualización 1');
}
async function checkpoint(page: Page) {
  await page.goto('#/biblioteca');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar sesión JSON', exact: true }).click();
  const file = JSON.parse(await readFile((await (await download).path())!, 'utf8'));
  await page.goto('#/lab/entrenamiento');
  return file;
}
test('dropout nativo: recuperación y siguiente máscara exactos, modelo independiente sin máscara', async ({
  page,
}) => {
  await setup(page);
  const first = await checkpoint(page);
  expect(first.schemaVersion).toBe(4);
  expect(first.checkpoint.dropout.seenSamples).toBe(8);
  await page.getByRole('button', { name: 'Un lote', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Actualizaciones 2');
  await expect(page.locator('.recovery-panel')).toContainText('actualización 2');
  const second = await checkpoint(page);
  await page.reload();
  await page.getByRole('button', { name: 'Recuperar sesión guardada', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar recuperación', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Actualizaciones 2');
  expect((await checkpoint(page)).checkpoint).toEqual(second.checkpoint);
  await page.goto('#/biblioteca');
  await page.getByLabel('Importar experimento JSON', { exact: false }).setInputFiles({
    name: 'dropout.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(first)),
  });
  // Imported files are validated before the explicit workspace replacement.
  await page.getByRole('button', { name: 'Abrir archivo y sustituir sesión', exact: true }).click();
  await page.goto('#/lab/entrenamiento');
  await expect(page.locator('.training-status')).toContainText('Actualizaciones 1');
  await page.getByRole('button', { name: 'Un lote', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Actualizaciones 2');
  expect((await checkpoint(page)).checkpoint).toEqual(second.checkpoint);
  await page.goto('#/modelos');
  await page.getByRole('button', { name: 'Copiar modelo de la sesión', exact: true }).click();
  await page.getByRole('button', { name: 'Predecir con este modelo', exact: true }).click();
  await expect(page.locator('.prediction-result')).toBeVisible();
});
test('máscaras reales accesibles en móvil, temas y movimiento reducido', async ({ page }) => {
  await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page
    .getByRole('combobox', { name: 'Capa oculta de la máscara', exact: true })
    .selectOption('1');
  await expect(page.locator('.dropout-unit')).toHaveCount(3);
  for (const theme of ['light', 'dark']) {
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  const before = await checkpoint(page);
  await page.getByRole('button', { name: 'Ver inferencia sin máscara', exact: true }).click();
  await expect(page.locator('.dropout-unit.masked')).toHaveCount(0);
  expect((await checkpoint(page)).checkpoint).toEqual(before.checkpoint);
});
test('comparación dropout mantiene inicialización y exporta el RNG v4', async ({ page }) => {
  await page.goto('#/lab/generalizacion');
  await page.getByRole('combobox', { name: 'Intervención', exact: true }).selectOption('dropout');
  await page.getByLabel('Épocas por ensayo', { exact: true }).fill('5');
  await page.getByRole('button', { name: 'Comparar con referencia', exact: true }).click();
  await expect(page.locator('.dropout-panel')).toBeVisible();
  await expect(page.getByText('Misma inicialización: sí.', { exact: false })).toBeVisible();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar ensayo JSON', exact: true }).click();
  const file = JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
  expect(file.schemaVersion).toBe(4);
  expect(file.config.dropout.rate).toBe(0.5);
  expect(file.checkpoint.dropout.seenSamples).toBe(72 * 5);
  expect(file.testConsulted).toBe(false);
});
