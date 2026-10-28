import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
async function download(page: Page, name: string) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name, exact: true }).click();
  return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
}
async function next(page: Page) {
  await page.getByRole('button', { name: 'Continuar ejemplo', exact: true }).click();
}
async function execute(page: Page) {
  await page.getByRole('button', { name: 'Ejecutar mi ejemplo con el motor', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Caso ejecutado' })).toBeVisible();
  await next(page);
}

test('un ejemplo completo y cinco fases propias sin sustituir el taller real', async ({ page }) => {
  await page.goto('#/taller');
  await page.getByRole('button', { name: /^T02 ·/ }).click();
  await page
    .getByLabel('Tu hipótesis antes de observar', { exact: true })
    .fill('Conservo mi hipótesis del taller real antes de probar el ejemplo introductorio.');
  await page.getByRole('button', { name: 'Validar paso y continuar', exact: true }).click();
  const before = await download(page, 'Exportar cuaderno de evidencias');
  await page
    .getByRole('link', { name: 'Ver ejemplo resuelto y guía paso a paso', exact: true })
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tu primer taller, acompañado.');
  await expect(page.getByRole('button', { name: 'Continuar ejemplo', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Ver ejemplo completo resuelto', exact: true }).click();
  await expect(page.locator('.worked-list li')).toHaveCount(5);
  await expect(page.locator('.workshop-evidence')).toBeVisible();
  const solved = await download(page, 'Descargar cuaderno del ejemplo');
  expect(solved.format).toBe('neural-atlas.workshop-demo');
  expect(solved.completed).toBe(false);
  expect(solved.workedExample).toHaveLength(5);
  expect(solved.evidence.metrics.distance).toBeCloseTo(1 / Math.sqrt(5), 12);
  await page.getByRole('button', { name: 'Probarlo con ayuda paso a paso', exact: true }).click();
  await page.getByRole('radio', { name: 'La recta girará', exact: true }).check();
  await page
    .getByLabel('Mi hipótesis, con mis palabras (opcional)', { exact: true })
    .fill('Mi predicción inicial es que puede girar.');
  await next(page);
  await next(page);
  await execute(page);
  await expect(
    page.getByText('equivocarse aquí no bloquea el recorrido.', { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole('img', {
      name: 'Frontera antes y después de cambiar solo el sesgo',
      exact: true,
    }),
  ).toBeVisible();
  await next(page);
  await page
    .getByLabel('Mi conclusión (opcional, sin calificación automática)', { exact: true })
    .fill('Con pesos fijos la recta se desplaza sin girar; no demuestra una mejora de accuracy.');
  await page.getByRole('button', { name: 'Terminar recorrido de ejemplo', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Recorrido de ejemplo terminado', exact: true }),
  ).toBeVisible();
  const own = await download(page, 'Descargar cuaderno del ejemplo');
  expect(own.completed).toBe(true);
  expect(own.mode).toBe('guided');
  expect(own.learner.prediction).toBe('rotate');
  expect(own.learner.reflection).toContain('pesos fijos');
  await page.getByRole('link', { name: 'Abrir catálogo de talleres', exact: true }).click();
  await page.getByRole('button', { name: /^T02 ·/ }).click();
  const after = await download(page, 'Exportar cuaderno de evidencias');
  expect(after.progress.step).toBe(before.progress.step);
  expect(after.progress.answers).toEqual(before.progress.answers);
  expect(after.progress.options).toEqual(before.progress.options);
  expect(after.progress.attempts).toEqual(before.progress.attempts);
});
test('sesgo cero y negativo, evidencia invalidada y referencia separada de notas propias', async ({
  page,
}) => {
  await page.goto('#/taller/ejemplo');
  const keys = await page.evaluate(() => Object.keys(localStorage).sort());
  await page.getByRole('radio', { name: 'La frontera no cambiará', exact: true }).check();
  await page
    .getByLabel('Mi hipótesis, con mis palabras (opcional)', { exact: true })
    .fill('Una nota propia que debe conservarse.');
  await next(page);
  const slider = page.getByRole('slider', { name: 'Sesgo del experimento', exact: true });
  await slider.press('Home');
  for (let i = 0; i < 10; i++) await slider.press('ArrowRight');
  await expect(slider).toHaveValue('0');
  await next(page);
  await execute(page);
  expect((await download(page, 'Descargar cuaderno del ejemplo')).evidence.metrics.distance).toBe(
    0,
  );
  await page.getByRole('button', { name: '2. Configurar', exact: true }).click();
  await slider.press('Home');
  await expect(
    page.getByRole('button', { name: 'Descargar cuaderno del ejemplo', exact: true }),
  ).toBeDisabled();
  await next(page);
  await execute(page);
  const own = await download(page, 'Descargar cuaderno del ejemplo');
  expect(own.evidence.options.bias).toBe(-1);
  expect(own.evidence.metrics.distance).toBeCloseTo(2 / Math.sqrt(5), 12);
  await page.getByRole('button', { name: 'Ver ejemplo completo resuelto', exact: true }).click();
  await expect(page.locator('.workshop-evidence')).toBeVisible();
  expect((await download(page, 'Descargar cuaderno del ejemplo')).evidence.options.bias).toBe(0.5);
  await page.getByRole('button', { name: 'Probarlo con ayuda paso a paso', exact: true }).click();
  expect((await download(page, 'Descargar cuaderno del ejemplo')).evidence.options.bias).toBe(-1);
  await page.getByRole('button', { name: '1. Predecir', exact: true }).click();
  await expect(
    page.getByLabel('Mi hipótesis, con mis palabras (opcional)', { exact: true }),
  ).toHaveValue('Una nota propia que debe conservarse.');
  expect(await page.evaluate(() => Object.keys(localStorage).sort())).toEqual(keys);
  await page.reload();
  await expect(
    page.getByLabel('Mi hipótesis, con mis palabras (opcional)', { exact: true }),
  ).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Continuar ejemplo', exact: true })).toBeDisabled();
});
test('teclado, foco de fase, accesibilidad y móvil en ambos modos', async ({ page }) => {
  await page.goto('#/taller/ejemplo');
  await page
    .getByRole('radio', { name: 'La recta se desplazará sin girar', exact: true })
    .press('Space');
  await page.getByRole('button', { name: 'Continuar ejemplo', exact: true }).press('Enter');
  await expect(page.getByRole('heading', { name: /^Configurar:/ })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('slider', { name: 'Sesgo del experimento', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(
    page.getByRole('slider', { name: 'Sesgo del experimento', exact: true }),
  ).toHaveValue('0.4');
  await next(page);
  await execute(page);
  for (const theme of ['light', 'dark']) {
    await page.evaluate((t) => (document.documentElement.dataset.theme = t), theme);
    for (const width of [329, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
  await page.getByRole('button', { name: 'Ver ejemplo completo resuelto', exact: true }).click();
  await expect(page.locator('.workshop-evidence')).toBeVisible();
  await page.setViewportSize({ width: 329, height: 950 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
