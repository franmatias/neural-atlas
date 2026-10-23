import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('Rosenblatt distingue AND/XOR; MLP aprende XOR y calcula mapas profundos en Worker', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('#/lab/arquitectura');
  await page.getByRole('button', { name: 'Entrenar perceptrón', exact: true }).click();
  await expect(page.getByText('Presupuesto agotado.', { exact: false })).toBeVisible();
  await page.locator('#perceptron-problem').selectOption('and');
  await page.getByRole('button', { name: 'Entrenar perceptrón', exact: true }).click();
  await expect(page.getByTestId('perceptron-score')).toContainText('4 / 4');
  await page.getByRole('button', { name: '2 · Combinar regiones', exact: true }).click();
  await page.getByRole('button', { name: 'Mostrar solución construida' }).click();
  await page.getByRole('button', { name: 'Aprender XOR con MLP' }).click();
  await expect(page.getByTestId('xor-score')).toHaveText('4 / 4');
  await page.locator('#net-layer').selectOption('1');
  await page.getByRole('button', { name: 'Calcular mapa y estadísticas' }).click();
  await expect(page.locator('.heat-cell')).toHaveCount(400);
  await page.locator('#net-neuron').selectOption('0');
  await page.getByRole('button', { name: '3 · Construir una red', exact: true }).click();
  await page.locator('#net-task').selectOption('multiclass');
  await page.locator('#net-classes').fill('3');
  await page.locator('#net-width-0').fill('16');
  await page.getByRole('button', { name: 'Inicializar red', exact: true }).click();
  await expect(page.locator('.network-node')).toHaveCount(17);
  await page.locator('#net-neuron').selectOption('15');
  await page.getByRole('button', { name: 'Calcular mapa y estadísticas' }).click();
  await expect(page.locator('.heat-cell')).toHaveCount(400);
  expect(errors).toEqual([]);
});
test('activaciones, softmax e inicialización conservan sus significados', async ({ page }) => {
  await page.goto('#/lab/activaciones');
  await page.locator('#activation-main').selectOption('leakyRelu');
  await page.locator('#activation-alpha').fill('0,2');
  await page.locator('#activation-alpha').press('Enter');
  await page.locator('#activation-z').fill('-2');
  await page.locator('#activation-z').press('Enter');
  await expect(page.getByTestId('activation-value')).toHaveText('-0,4');
  await page.locator('#activation-main').selectOption('step');
  await expect(page.getByText('El escalón no aporta', { exact: false })).toBeVisible();
  await page.locator('#activation-main').selectOption('sigmoid');
  await page.locator('#chain-depth').fill('20');
  await page.getByLabel('Mostrar log₁₀ del gradiente absoluto').check();
  await page.locator('.chain-stages button').last().click();
  await expect(page.getByTestId('chain-gradient')).toContainText('-');
  await page.locator('#logit-0').fill('1000');
  await page.locator('#logit-0').press('Enter');
  await expect(page.getByTestId('softmax-sum')).toHaveText('Σp = 1');
  await page.getByText('Avanzado · inicialización, activaciones y normas', { exact: true }).click();
  await page.locator('#init-activation').selectOption('relu');
  await expect(page.locator('.network-initial-card')).toHaveCount(3);
});
test('nueve gradientes coinciden y recorrer la traza no aplica dos veces la actualización', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('#/lab/propagacion');
  const apply = page.getByRole('button', { name: 'Aplicar una actualización', exact: true });
  await expect(apply).toBeDisabled();
  await page.getByRole('button', { name: 'Comprobar todos los gradientes' }).click();
  await expect(page.locator('.gradient-check tbody tr')).toHaveCount(9);
  await expect(
    page.locator('.gradient-check tbody tr').filter({ hasText: 'Correcto' }),
  ).toHaveCount(9);
  await page.locator('.chain-stages').first().getByRole('button').last().click();
  await apply.click();
  await expect(apply).toBeDisabled();
  const loss = await page.getByTestId('loss-change').textContent();
  await page.locator('.chain-stages').first().getByRole('button').first().click();
  await page.locator('.chain-stages').first().getByRole('button').last().click();
  await expect(page.getByTestId('loss-change')).toHaveText(loss!);
  await expect(apply).toBeDisabled();
  await page.getByRole('button', { name: 'Calcular otra pasada' }).click();
  await expect(apply).toBeDisabled();
  await page.locator('.chain-stages').first().getByRole('button').last().click();
  await expect(apply).toBeEnabled();
  await page.locator('#prop-weight').selectOption('1:1');
  await page.locator('#prop-weight-value').fill('0,25');
  await page.locator('#prop-weight-value').press('Enter');
  await expect(page.locator('.gradient-check')).toHaveCount(0);
  await expect(page.locator('.batch-list button')).toHaveCount(4);
  await expect(page.locator('.batch-list button').last()).toContainText('2');
  expect(errors).toEqual([]);
});
test('D3: accesibilidad claro/oscuro, movimiento reducido y responsive', async ({
  page,
}, testInfo) => {
  for (const theme of ['light', 'dark']) {
    await page.goto('#/ajustes');
    await page.locator('#theme').selectOption(theme);
    for (const slug of ['arquitectura', 'activaciones', 'propagacion']) {
      await page.goto(`#/lab/${slug}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(
        (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
          .violations,
      ).toEqual([]);
      if (theme === 'dark')
        await testInfo.attach(slug, {
          body: await page.screenshot({ fullPage: true, animations: 'disabled' }),
          contentType: 'image/png',
        });
      for (const width of [360, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        ).toBe(true);
      }
    }
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('#/lab/propagacion');
  await expect(page.getByRole('button', { name: 'Reproducir fases' }).first()).toBeDisabled();
  await page.getByRole('button', { name: 'Fase siguiente' }).first().click();
  await expect(page.locator('.chain-stages').first().getByRole('button').nth(1)).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
