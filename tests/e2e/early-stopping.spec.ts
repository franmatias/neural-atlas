import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
async function stop(page: Page, epochs = 20) {
  await page.goto('#/lab/entrenamiento');
  await page.getByRole('button', { name: 'Cargar ejemplo y sustituir datos', exact: true }).click();
  await expect(
    page.getByText('train 280 / validación 60 / test 60.', { exact: false }),
  ).toBeVisible();
  await page.getByLabel('Capas ocultas', { exact: false }).fill('2');
  await page.getByRole('combobox', { name: /^Inicialización/ }).selectOption('zero');
  await page.getByLabel('Tasa de aprendizaje', { exact: true }).fill('0.00001');
  await page.getByLabel('Tamaño de lote', { exact: false }).fill('280');
  await page.getByLabel('Épocas máximas', { exact: true }).fill(String(epochs));
  await page.getByLabel('Activar parada temprana con validación', { exact: true }).check();
  await page.getByLabel('Paciencia en épocas', { exact: true }).fill('5');
  await page.getByLabel('Mejora mínima de validación', { exact: true }).fill('0.01');
  await page.getByRole('button', { name: 'Inicializar modelo', exact: true }).click();
  await page.getByRole('button', { name: 'Entrenar', exact: true }).click();
  await expect(page.locator('.early-result')).toContainText(
    `en la época ${epochs < 6 ? epochs : 6}`,
  );
  await expect(page.locator('.training-status')).toContainText('Época 1');
  await expect(
    page.getByRole('button', { name: 'Revisar puntos guardados', exact: true }),
  ).toBeEnabled();
}
async function checkpoint(page: Page) {
  await page.goto('#/biblioteca');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar sesión JSON', exact: true }).click();
  const text = await readFile((await (await pending).path())!, 'utf8');
  await page.goto('#/lab/entrenamiento');
  return JSON.parse(text);
}
test('parada real, recuperación completa y continuación explícita conservan el optimizador', async ({
  page,
}) => {
  await stop(page);
  const file = await checkpoint(page);
  expect(file.schemaVersion).toBe(3);
  expect(file.checkpoint.optimizer.step).toBe(1);
  expect(file.checkpoint.earlyStopping.stoppedAt).toBe(6);
  expect(file.checkpoint.earlyStopping.best.epoch).toBe(1);
  await page.reload();
  await page.getByRole('button', { name: 'Recuperar sesión guardada', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar recuperación', exact: true }).click();
  await expect(page.locator('.early-result')).toContainText('en la época 6');
  expect((await checkpoint(page)).checkpoint).toEqual(file.checkpoint);
  await expect(page.getByRole('button', { name: 'Entrenar', exact: true })).toBeDisabled();
  await page
    .getByRole('button', { name: 'Preparar continuación desde el mejor estado', exact: true })
    .click();
  await expect(
    page.getByRole('group', { name: 'Confirmar continuación del mejor estado', exact: true }),
  ).toBeFocused();
  await page.getByRole('button', { name: 'Confirmar continuación', exact: true }).click();
  await page.getByRole('button', { name: 'Un lote', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Época 2');
  const next = await checkpoint(page);
  expect(next.checkpoint.optimizer.step).toBe(2);
  expect(next.checkpoint.earlyStopping.lastReport.stoppedAt).toBe(6);
});
test('horizonte restaura el mejor y consultar test mantiene el modelo congelado', async ({
  page,
}) => {
  await stop(page, 3);
  await expect(page.locator('.early-result')).toContainText('Presupuesto de épocas agotado');
  await page.goto('#/lab/clasificacion');
  await page.getByLabel('Entiendo que congelar', { exact: false }).check();
  await page.getByRole('button', { name: 'Congelar modelo y evaluar test' }).click();
  await expect(page.getByRole('heading', { name: 'Resultados: test' })).toBeVisible();
  await page.goto('#/lab/entrenamiento');
  await expect(
    page.getByRole('button', { name: 'Preparar continuación desde el mejor estado', exact: true }),
  ).toBeDisabled();
  const file = await checkpoint(page);
  expect(file.testConsulted).toBe(true);
  expect(file.checkpoint.frozen).toBe(true);
  expect(file.checkpoint.earlyStopping.reason).toBe('horizon');
});
test('traza, confirmación y gráficos accesibles en móvil y ambos temas', async ({ page }) => {
  await stop(page);
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
  await page
    .getByRole('button', { name: 'Preparar continuación desde el mejor estado', exact: true })
    .click();
  await page.getByRole('button', { name: 'Volver sin cambiar', exact: true }).click();
  await expect(page.locator('.early-result')).toContainText('en la época 6');
});
