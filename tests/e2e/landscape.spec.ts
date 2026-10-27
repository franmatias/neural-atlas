import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
async function run(page: Page) {
  await page.getByRole('button', { name: 'Calcular paisaje y trayectorias', exact: true }).click();
  await expect(page.getByTestId('landscape-result')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Calcular paisaje y trayectorias', exact: true }),
  ).toBeEnabled();
}
async function report(page: Page) {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar informe de paisaje', exact: true }).click();
  return JSON.parse(await readFile((await (await download).path())!, 'utf8'));
}
async function field(page: Page, label: string, value: string) {
  await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByLabel(label, { exact: true }).press('Enter');
}
test('Worker real, fórmulas, divergencia sin recorte, silla y corte verificable', async ({
  page,
}) => {
  await page.goto('#/lab/optimizacion');
  await run(page);
  let r = await report(page);
  expect(r.grid.values).toHaveLength(625);
  expect(
    r.paths.map((p: { points: { x: number; y: number }[] }) => [p.points[0]!.x, p.points[0]!.y]),
  ).toEqual(Array(4).fill([-1.2, 1]));
  expect(r.grid.values[0]).toBe(16);
  expect(r.gradientMethod).toBe('analytic');
  await page
    .getByRole('combobox', { name: 'Paisaje ilustrativo', exact: true })
    .selectOption('rosenbrock');
  await field(page, 'Tasa común de aprendizaje', '1');
  await run(page);
  r = await report(page);
  expect(r.paths[0].status).toBe('outside');
  expect(r.paths[0].points).toHaveLength(1);
  expect(r.paths[0].rejected[0]).toBeGreaterThan(2);
  await page
    .getByRole('combobox', { name: 'Paisaje ilustrativo', exact: true })
    .selectOption('saddle');
  await field(page, 'Inicio x', '0');
  await field(page, 'Inicio y', '0');
  await run(page);
  r = await report(page);
  expect(r.paths.every((p: { status: string }) => p.status === 'stationary')).toBe(true);
  await page
    .getByRole('combobox', { name: 'Modo de superficie', exact: true })
    .selectOption('frozen');
  await page.getByRole('button', { name: 'Cargar ejemplo lineal congelado', exact: true }).click();
  await field(page, 'Tasa común de aprendizaje', '0.03');
  await run(page);
  r = await report(page);
  expect(r.sourceHash).toHaveLength(64);
  expect(r.grid.values[312]).toBeCloseTo(11 / 3);
  expect(r.provenance.model.layers[0].weights).toEqual([0]);
  expect(r.provenance.samples.ids).toHaveLength(3);
  expect(r.paths[0].points[0].gradient[0]).toBeCloseTo(-8 / 3, 6);
});
test('reproducción, temas, teclado, móvil y fallback sin WebGL', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      kind: string,
      ...args: unknown[]
    ) {
      if (kind === 'webgl2') return null;
      return Reflect.apply(original, this, [kind, ...args]);
    } as typeof original;
  });
  await page.goto('#/lab/optimizacion');
  await run(page);
  await page.getByRole('button', { name: 'Paso siguiente', exact: true }).click();
  await expect(page.getByRole('slider', { name: 'Paso de trayectoria', exact: true })).toHaveValue(
    '1',
  );
  await page.getByRole('button', { name: 'Reproducir trayectoria', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar trayectoria', exact: true })).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(
    page.getByRole('button', { name: 'Reproducir trayectoria', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Malla 3D', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'WebGL no disponible' })).toBeVisible();
  await expect(
    page.getByRole('img', {
      name: 'Contornos de pérdida y trayectorias de cuatro optimizadores',
      exact: true,
    }),
  ).toBeVisible();
  for (const theme of ['light', 'dark']) {
    await page.evaluate((t) => (document.documentElement.dataset.theme = t), theme);
    for (const width of [360, 390, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
});
test('malla 3D usa mismo estudio, cámara reversible y pérdida de contexto segura', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('#/lab/optimizacion');
  await run(page);
  const before = await report(page);
  const begin = Date.now();
  await page.getByRole('button', { name: 'Malla 3D', exact: true }).click();
  await expect(
    page
      .locator('.gpu-surface canvas')
      .or(page.getByRole('status').filter({ hasText: 'WebGL no disponible' })),
  ).toBeVisible();
  if (await page.locator('.gpu-surface canvas').count()) {
    await expect(page.getByText(/triángulos ·/)).toBeVisible();
    for (const name of [
      'Girar izquierda',
      'Girar derecha',
      'Acercar',
      'Alejar',
      'Reiniciar cámara',
    ])
      await page.getByRole('button', { name, exact: true }).click();
    await page.getByRole('button', { name: 'Paso siguiente', exact: true }).click();
    await expect(
      page.getByRole('slider', { name: 'Paso de trayectoria', exact: true }),
    ).toHaveValue('1');
    console.log(`L07 WebGL primera vista y controles: ${Date.now() - begin} ms`);
    await page
      .locator('.gpu-surface canvas')
      .evaluate((c) => c.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
    await expect(page.getByRole('status').filter({ hasText: 'WebGL no disponible' })).toBeVisible();
  }
  const after = await report(page);
  expect(after).toEqual(before);
  expect(errors).toEqual([]);
});
