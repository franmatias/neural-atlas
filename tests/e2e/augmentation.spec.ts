import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
async function setup(page: Page) {
  await page.goto('#/lab/entrenamiento');
  await expect(
    page.getByLabel('Activar aumento conservador de train', { exact: true }),
  ).toBeDisabled();
  await page
    .getByRole('combobox', { name: 'Ejemplo de entrenamiento', exact: true })
    .selectOption('circles');
  await page.getByRole('button', { name: 'Cargar ejemplo y sustituir datos', exact: true }).click();
  await expect(
    page.getByText('train 280 / validación 60 / test 60.', { exact: false }),
  ).toBeVisible();
  await page.getByLabel('Activar aumento conservador de train', { exact: true }).check();
  await page.getByLabel('Activar normalización por lotes (BN)', { exact: true }).check();
  await page.getByLabel('Activar dropout invertido', { exact: true }).check();
  await page.getByLabel('Capas ocultas', { exact: false }).fill('3, 2');
  await page.getByLabel('Tamaño de lote', { exact: false }).fill('8');
  await page.getByLabel('Épocas máximas', { exact: true }).fill('3');
  await page.getByRole('button', { name: 'Inicializar modelo', exact: true }).click();
  await page.getByRole('button', { name: 'Un lote', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Actualizaciones 1');
}
async function checkpoint(page: Page) {
  await page.goto('#/biblioteca');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar sesión JSON', exact: true }).click();
  const file = JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
  await page.goto('#/lab/entrenamiento');
  return file;
}
test('aumento v6: reanudación exacta con BN/dropout, disco y métricas de originales', async ({
  page,
}) => {
  await setup(page);
  const first = await checkpoint(page);
  expect(first.schemaVersion).toBe(6);
  expect(first.dataset.dataset.rowIds).toHaveLength(400);
  expect(first.checkpoint.order.length).toBeGreaterThan(280);
  await page.getByRole('button', { name: 'Un lote', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Actualizaciones 2');
  const expected = await checkpoint(page);
  await page.goto('#/biblioteca');
  await page.getByLabel('Importar experimento JSON', { exact: false }).setInputFiles({
    name: 'aug.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(first)),
  });
  await page.getByRole('button', { name: 'Abrir archivo y sustituir sesión', exact: true }).click();
  await page.goto('#/lab/entrenamiento');
  await expect(page.locator('.training-status')).toContainText('Actualizaciones 1');
  await page.getByRole('button', { name: 'Un lote', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Actualizaciones 2');
  expect((await checkpoint(page)).checkpoint).toEqual(expected.checkpoint);
  await expect(page.locator('.recovery-panel li').first()).toContainText('actualización 2');
  await expect(
    page.getByRole('button', { name: 'Revisar puntos guardados', exact: true }),
  ).toBeEnabled();
  await page.reload();
  await page.getByRole('button', { name: 'Recuperar sesión guardada', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar recuperación', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Actualizaciones 2');
  expect((await checkpoint(page)).checkpoint).toEqual(expected.checkpoint);
  await page.goto('#/lab/clasificacion');
  await page.getByRole('button', { name: 'Evaluar entrenamiento', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Resultados: entrenamiento', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('280 muestras · actualización evaluada', { exact: false }),
  ).toBeVisible();
});
test('traza, diagrama ampliado y rechazo son accesibles en móvil y ambos temas', async ({
  page,
}) => {
  await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
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
  await page
    .getByRole('button', { name: 'Alternar posición original y copia', exact: true })
    .click();
  await expect(
    page.getByRole('img', { name: 'Detalle ampliado del desplazamiento de la copia', exact: true }),
  ).toBeVisible();
  expect((await checkpoint(page)).checkpoint).toEqual(before.checkpoint);
});
test('XOR: comparación de aumento declara trabajo adicional y exporta experimento v6', async ({
  page,
}) => {
  await page.goto('#/lab/generalizacion');
  await page
    .getByRole('combobox', { name: 'Intervención', exact: true })
    .selectOption('augmentation');
  await page
    .getByRole('combobox', { name: 'Receta para aumento', exact: true })
    .selectOption('xor');
  await page.getByLabel('Ruido de las muestras', { exact: true }).fill('0');
  await page.getByLabel('Épocas por ensayo', { exact: true }).fill('5');
  await page.getByRole('button', { name: 'Comparar con referencia', exact: true }).click();
  await expect(page.locator('.augmentation-counts')).toContainText('72 aceptadas');
  await expect(page.getByText('Misma inicialización: sí.', { exact: false })).toBeVisible();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar ensayo JSON', exact: true }).click();
  const file = JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
  expect(file.schemaVersion).toBe(6);
  expect(file.config.augmentation.policy).toBe('xor');
  expect(file.checkpoint.order).toHaveLength(144);
  expect(file.testConsulted).toBe(false);
  await expect(
    page.getByText('no es una comparación con presupuesto de actualizaciones igualado', {
      exact: false,
    }),
  ).toBeVisible();
});
