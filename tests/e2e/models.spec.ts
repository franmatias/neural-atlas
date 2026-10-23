import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
async function prepare(page: Page, recipe = 'moons') {
  await page.goto('#/lab/entrenamiento');
  await page.getByLabel('Ejemplo de entrenamiento', { exact: true }).selectOption(recipe);
  await page.getByRole('button', { name: 'Cargar ejemplo y sustituir datos' }).click();
  await expect(
    page.getByText('train 280 / validación 60 / test 60.', { exact: false }),
  ).toBeVisible();
  await page.getByLabel('Épocas máximas', { exact: true }).fill('3');
  await page.getByRole('button', { name: 'Inicializar modelo', exact: true }).click();
  await page.getByRole('button', { name: 'Un lote', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Actualizaciones 1');
  await page.goto('#/biblioteca');
  await page.getByRole('link', { name: 'Modelos para predecir sin dataset' }).click();
  await page.getByRole('button', { name: 'Copiar modelo de la sesión' }).click();
  await expect(page.getByRole('heading', { name: 'Modelo listo para inferencia' })).toBeVisible();
}
async function exportFile(page: Page) {
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar modelo sin dataset' }).click();
  return readFile((await (await downloaded).path())!, 'utf8');
}
async function importFile(page: Page, text: string) {
  await page
    .getByLabel('Importar modelo JSON', { exact: false })
    .setInputFiles({ name: 'model.json', mimeType: 'application/json', buffer: Buffer.from(text) });
}
test('modelo nativo: exporta sin filas y predice idéntico en una pestaña sin sesión entrenada', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await prepare(page);
  await page.getByRole('button', { name: 'Predecir con este modelo' }).click();
  await expect(page.locator('.prediction-result')).toBeVisible();
  const expected = await page.locator('.prediction-result > p').allTextContents();
  const text = await exportFile(page),
    raw = JSON.parse(text) as Record<string, unknown>;
  expect(raw.format).toBe('neural-atlas.model');
  expect(raw).not.toHaveProperty('dataset');
  expect(raw).not.toHaveProperty('checkpoint');
  expect(raw).not.toHaveProperty('optimizer');
  const other = await context.newPage();
  await other.goto('#/modelos');
  await expect(other.getByRole('button', { name: 'Copiar modelo de la sesión' })).toBeDisabled();
  await importFile(other, text);
  await expect(other.getByRole('heading', { name: 'Modelo listo para inferencia' })).toBeVisible();
  await other.getByRole('button', { name: 'Predecir con este modelo' }).click();
  await expect(other.locator('.prediction-result > p')).toHaveText(expected);
  await other.getByRole('link', { name: 'Ir al entrenamiento', exact: true }).click();
  await expect(
    other.getByRole('button', { name: 'Inicializar modelo', exact: true }),
  ).toBeEnabled();
  await page.getByRole('link', { name: 'Ir al entrenamiento', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Actualizaciones 1');
  expect(errors).toEqual([]);
});
for (const recipe of ['flowers', 'sine']) {
  test(`modelo ${recipe}: descarga, recarga e importa con su tarea y preparación`, async ({
    page,
  }) => {
    await prepare(page, recipe);
    const text = await exportFile(page);
    await page.reload();
    await expect(page.getByText('No hay un modelo de inferencia abierto.')).toBeVisible();
    await importFile(page, text);
    await page.getByRole('button', { name: 'Predecir con este modelo' }).click();
    await expect(page.locator('.prediction-result')).toContainText(
      recipe === 'sine' ? 'Predicción numérica:' : 'Decisión:',
    );
    if (recipe === 'flowers')
      expect((await page.locator('.prediction-result').innerText()).match(/Clase /g)).toHaveLength(
        3,
      );
    await page.locator('input[type=checkbox]').first().check();
    await expect(page.locator('.prediction-result')).toHaveCount(0);
    await page.getByRole('button', { name: 'Predecir con este modelo' }).click();
    await expect(page.locator('.prediction-result')).toBeVisible();
    await page.getByText('Vector transformado enviado a la red', { exact: true }).click();
    await expect(page.locator('.prediction-result ol li').first()).toBeVisible();
  });
}
test('archivo inválido conserva el modelo, copia persistente entre rutas y accesibilidad móvil', async ({
  page,
}) => {
  await prepare(page);
  await importFile(page, '{"format":"neural-atlas.model","engineVersion":900}');
  await expect(page.getByRole('alert')).toContainText('integridad');
  await expect(page.getByRole('heading', { name: 'Modelo listo para inferencia' })).toBeVisible();
  await page.getByRole('link', { name: 'Volver a la biblioteca', exact: true }).click();
  await page.getByRole('link', { name: 'Modelos para predecir sin dataset' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute('data-theme', value),
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
  await page.getByRole('button', { name: 'Cerrar copia de inferencia' }).click();
  await page.getByRole('button', { name: 'Confirmar cierre', exact: true }).click();
  await expect(page.getByText('No hay un modelo de inferencia abierto.')).toBeVisible();
});
