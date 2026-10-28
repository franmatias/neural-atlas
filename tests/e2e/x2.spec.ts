import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('descenso simultáneo, cálculo explicado, guías y diseño adaptable', async ({ page }) => {
  await page.goto('#/lab/optimizacion');
  await page
    .getByRole('combobox', { name: 'Ejemplo guiado de descenso', exact: true })
    .selectOption('first-step');
  await page.getByRole('button', { name: 'Preparar ejemplo guiado', exact: true }).click();
  await page.getByRole('button', { name: 'Calcular paisaje y trayectorias', exact: true }).click();
  const result = page.getByTestId('landscape-result');
  await expect(result).toBeVisible();
  await expect(page.getByTestId('gradient-next')).toContainText('1,12');
  const plot = page.locator('svg[data-step]'),
    canvas = page.locator('.gpu-surface canvas');
  await expect(plot).toHaveAttribute('data-step', '0');
  await expect(
    canvas.or(page.getByRole('status').filter({ hasText: 'WebGL no disponible' })),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Paso siguiente', exact: true }).click();
  await expect(plot).toHaveAttribute('data-step', '1');
  if (await canvas.count()) await expect(canvas).toHaveAttribute('data-step', '1');
  await page.getByText('Guía del laboratorio ·', { exact: false }).click();
  for (const theme of ['light', 'dark']) {
    await page.evaluate((t) => (document.documentElement.dataset.theme = t), theme);
    for (const width of [360, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
});
test('Iris y Wine opcionales, explicación y sonido apagado por defecto', async ({ page }) => {
  await page.goto('#/lab/datos');
  await page.getByText('Datasets reales opcionales · Iris y Wine', { exact: true }).click();
  await page.getByRole('button', { name: 'Cargar Iris y sustituir datos', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Iris cargado sin división' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cargar Wine y sustituir datos', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Wine cargado sin división' }),
  ).toBeVisible();
  await page.goto('#/lab/neurona');
  await page.getByText('Sonificación opcional · salida de la neurona', { exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Silenciar inmediatamente', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Activar sonido de este proceso', exact: true }).click();
  await expect(
    page
      .getByText('Sonido activo.', { exact: false })
      .or(page.getByRole('alert').filter({ hasText: 'Audio no disponible' })),
  ).toBeVisible();
  const mute = page.getByRole('button', { name: 'Silenciar inmediatamente', exact: true });
  if (await mute.isEnabled()) await mute.click();
  await expect(mute).toBeDisabled();
  await page.goto('#/lab/entrenamiento');
  await expect(
    page.getByRole('region', { name: 'Historial de configuración', exact: true }),
  ).toBeVisible();
});
test('datos UCI, pipeline train y entrenamiento Worker con deshacer seguro', async ({ page }) => {
  for (const title of ['Iris', 'Wine']) {
    await page.goto('#/lab/datos');
    await page.getByText('Datasets reales opcionales · Iris y Wine', { exact: true }).click();
    await page
      .getByRole('button', { name: `Cargar ${title} y sustituir datos`, exact: true })
      .click();
    await page.getByRole('button', { name: 'Dividir', exact: true }).click();
    await page.getByRole('button', { name: 'Crear partición', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Proporciones logradas/ })).toBeVisible();
    await page.getByRole('button', { name: 'Preparar', exact: true }).click();
    await page
      .getByRole('button', { name: 'Ajustar con train y transformar', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Estado aprendido exclusivamente con train', exact: true }),
    ).toBeVisible();
    await page.goto('#/lab/entrenamiento');
    const epochs = page.getByLabel('Épocas máximas', { exact: true });
    await epochs.fill('5');
    await epochs.press('Enter');
    const seed = page.getByLabel('Semilla del modelo', { exact: true });
    const original = await seed.inputValue();
    const changed = String(Number(original) + 1);
    await seed.fill(changed);
    await seed.press('Enter');
    await page.getByRole('button', { name: 'Inicializar modelo', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Un lote', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Un lote', exact: true }).click();
    await expect(page.locator('.training-status')).toContainText('Actualizaciones 1');
    await page.getByRole('button', { name: 'Deshacer configuración', exact: true }).click();
    await expect(seed).toHaveValue(original);
    await expect(page.getByRole('button', { name: 'Un lote', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Rehacer configuración', exact: true }).click();
    await expect(seed).toHaveValue(changed);
    await page.getByRole('button', { name: 'Inicializar modelo', exact: true }).click();
    await page.getByRole('button', { name: 'Entrenar', exact: true }).click();
    await expect(page.locator('.training-status')).toContainText('Épocas completadas');
  }
});
