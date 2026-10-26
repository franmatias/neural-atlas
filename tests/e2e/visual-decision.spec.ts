import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
async function exportFile(page: import('@playwright/test').Page, name: string) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name, exact: true }).click();
  return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
}
for (const mode of ['binary', 'multiclass'] as const) {
  test(`${mode}: aprendizaje real, mapa, probabilidades, teclado y archivos coherentes`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(
      mode === 'binary' ? '#/lab/arquitectura/frontera' : '#/lab/clasificacion/visual',
    );
    await expect(page.getByTestId('visual-epoch')).toHaveText('0');
    await page
      .getByRole('combobox', { name: 'Conjunto de datos', exact: true })
      .selectOption(mode === 'binary' ? 'clouds' : 'blobs');
    await page.getByLabel('Épocas máximas', { exact: true }).fill('15');
    await page.getByRole('button', { name: 'Aplicar y reiniciar red', exact: true }).click();
    await expect(page.getByTestId('visual-epoch')).toHaveText('0');
    const initial = await exportFile(page, 'Exportar experimento visual');
    await page.getByRole('slider', { name: /^Ritmo/ }).fill('0');
    await page.getByRole('button', { name: 'Entrenar simulación', exact: true }).click();
    await expect(page.getByTestId('visual-epoch')).toHaveText('15');
    const trained = await exportFile(page, 'Exportar experimento visual');
    expect(trained.checkpoint.history.at(-1).trainLoss).toBeLessThan(
      initial.checkpoint.history[0].trainLoss * 0.4,
    );
    expect(trained.checkpoint.history.at(-1).validationScore).toBeGreaterThan(0.9);
    expect(trained.testConsulted).toBe(false);
    expect(trained.config.spec.task).toBe(mode);
    const map = page.getByRole('group', { name: /^Mapa de decisión interactivo/ });
    await map.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowUp');
    await expect(page.getByLabel('x₁ de prueba', { exact: true })).toHaveValue('0.05');
    await expect(page.getByLabel('x₂ de prueba', { exact: true })).toHaveValue('0.05');
    await page.getByLabel('x₁ de prueba', { exact: true }).fill('0.85');
    await page.getByLabel('x₂ de prueba', { exact: true }).fill('0');
    const model = await exportFile(page, 'Exportar modelo visual');
    expect(model.network.layers.at(-1).outputs).toBe(mode === 'binary' ? 1 : 4);
    expect(model.hashes.networkHash).toBeTruthy();
    const probabilities = await page
      .locator('.probability-row meter')
      .evaluateAll((nodes) => nodes.map((n) => (n as HTMLMeterElement).value));
    expect(probabilities.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    await expect(page.locator('.decision-prediction h3')).toContainText(
      mode === 'binary' ? '1' : '0',
    );
    await page.getByLabel('x₁ de prueba', { exact: true }).fill('');
    await expect(page.getByText('Introduce coordenadas válidas entre −1,8 y 1,8.')).toBeVisible();
    await page.getByLabel('x₁ de prueba', { exact: true }).fill('0.5');
    await expect(page.locator('.decision-map')).toBeVisible();
    expect(errors).toEqual([]);
  });
}
test('añadir puntos reinicia explícitamente; cambiar de laboratorio crea la tarea adecuada', async ({
  page,
}) => {
  await page.goto('#/lab/arquitectura/frontera');
  await expect(page.getByTestId('visual-epoch')).toHaveText('0');
  await page.getByRole('button', { name: 'Un lote', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Un lote', exact: true })).toBeEnabled();
  await page
    .getByRole('combobox', { name: 'Modo del mapa', exact: true })
    .selectOption({ label: 'Preparar punto etiquetado' });
  await page.getByRole('button', { name: 'Añadir punto y reiniciar', exact: true }).click();
  await expect(page.getByText('1/40 puntos añadidos.', { exact: false })).toBeVisible();
  await expect(page.getByTestId('visual-epoch')).toHaveText('0');
  const dataset = await exportFile(page, 'Exportar datos visuales');
  expect(dataset.dataset.rowIds).toHaveLength(241);
  await page.getByRole('link', { name: 'Clasificador multiclase', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cada región, una clase.');
  await expect(page.locator('.probability-row')).toHaveCount(4);
  await page.getByRole('combobox', { name: 'Número de clases', exact: true }).selectOption('3');
  await page.getByRole('button', { name: 'Regenerar sin puntos añadidos', exact: true }).click();
  await expect(page.locator('.probability-row')).toHaveCount(3);
});
test('accesibilidad, temas y móvil en ambos laboratorios; movimiento reducido', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const route of ['#/lab/arquitectura/frontera', '#/lab/clasificacion/visual']) {
    await page.goto(route);
    await expect(page.getByTestId('visual-epoch')).toHaveText('0');
    for (const theme of ['light', 'dark']) {
      await page.getByRole('button', { name: 'Ajustes', exact: true }).click();
      await page.getByRole('dialog').getByLabel('Tema', { exact: true }).selectOption(theme);
      await page.getByRole('button', { name: 'Cerrar ajustes' }).click();
      expect(
        (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
          .violations,
      ).toEqual([]);
      for (const width of [360, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
      }
    }
    await expect(page.locator('.network-diagram')).not.toHaveClass(/flowing/);
  }
});
