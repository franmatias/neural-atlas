import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
async function neuron(page: Page) {
  await page.goto('#/lab/neurona');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('La neurona, por dentro.');
}
test('cálculos, coma decimal, controles y sesión entre rutas', async ({ page }) => {
  await neuron(page);
  await expect(page.getByTestId('sum')).toHaveText('0,44');
  await expect(page.getByTestId('output')).toHaveText('0,6083');
  await page.getByLabel('Entrada x₁', { exact: true }).fill('1,2');
  await page.getByLabel('Entrada x₁', { exact: true }).press('Enter');
  await expect(page.getByTestId('sum')).toHaveText('0,64');
  await page.getByLabel('Peso w₁', { exact: true }).fill('1.000,5');
  await page.getByLabel('Peso w₁', { exact: true }).press('Enter');
  await expect(page.getByRole('alert')).toContainText('número válido');
  await expect(page.getByTestId('sum')).toHaveText('0,64');
  await page.getByLabel('Peso w₁', { exact: true }).fill('0.5');
  await page.getByLabel('Peso w₁', { exact: true }).press('Enter');
  await page.getByRole('button', { name: 'Formal', exact: true }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByText('Derivada en z')).toBeVisible();
  await page.getByRole('link', { name: 'Conectar con el glosario' }).click();
  await page.getByRole('searchbox').fill('C028');
  await expect(page.locator('.concept-card')).toHaveCount(1);
  await page.getByRole('link', { name: 'Probar en el laboratorio' }).click();
  await expect(page.getByLabel('Entrada x₁', { exact: true })).toHaveValue('1,2');
  await page.getByLabel('Ejemplo práctico').selectOption('constant');
  await expect(page.getByText('Pesos cero:', { exact: false })).toBeVisible();
  await page.getByLabel('Activación', { exact: true }).selectOption('step');
  await expect(page.getByText('No disponible para backprop')).toBeVisible();
  await page.getByRole('button', { name: 'Restaurar ejemplo' }).click();
  await expect(page.getByTestId('output')).toHaveText('0,6083');
});
test('el plano responde al teclado y el sesgo conserva la orientación', async ({ page }) => {
  await neuron(page);
  const plane = page.getByRole('group', { name: /Plano de entradas/ });
  await plane.focus();
  await plane.press('ArrowRight');
  await expect(page.getByLabel('Entrada x₁', { exact: true })).toHaveValue('0,85');
  const coordinates = () =>
    page
      .locator('.decision-line')
      .evaluate((el) => ['x1', 'x2', 'y1', 'y2'].map((key) => Number(el.getAttribute(key))));
  const before = await coordinates();
  await page.getByLabel('Sesgo b', { exact: true }).fill('0,3');
  await page.getByLabel('Sesgo b', { exact: true }).press('Enter');
  const after = await coordinates();
  const slope = (v: number[]) => (v[3]! - v[2]!) / (v[1]! - v[0]!);
  expect(slope(after)).toBeCloseTo(slope(before), 8);
  expect(after).not.toEqual(before);
});
test('reproductor con velocidad visual, pausa y reinicio al editar', async ({ page }) => {
  await neuron(page);
  await page.getByRole('button', { name: 'Ajustes', exact: true }).click();
  await page.getByLabel('Velocidad visual').fill('4');
  await page.getByRole('button', { name: 'Cerrar ajustes' }).click();
  await page.getByRole('button', { name: 'Reproducir recorrido' }).click();
  await expect(page.locator('.playback-status')).toContainText('Fase 5');
  await expect(page.getByTestId('output')).toHaveText('0,6083');
  await page.getByRole('button', { name: 'Reproducir recorrido' }).click();
  await page.getByRole('button', { name: 'Pausar recorrido' }).click();
  await page.getByLabel('Sesgo b', { exact: true }).fill('0,2');
  await page.getByLabel('Sesgo b', { exact: true }).press('Enter');
  await expect(page.locator('.playback-status')).toContainText('Fase 1');
});
test('preferencias persistentes, diálogo y retorno del foco', async ({ page }) => {
  await page.goto('');
  const trigger = page.getByRole('button', { name: 'Ajustes', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Ajustes del laboratorio' });
  await expect(dialog).toBeVisible();
  await page.getByLabel('Tema', { exact: true }).selectOption('dark');
  await page.getByLabel('Modo presentación', { exact: true }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-presentation', 'true');
  await page.getByRole('button', { name: 'Cerrar ajustes' }).focus();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.locator(':focus')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('neural-atlas:v1:preferences') ?? '{}').payload?.theme,
      ),
    )
    .toBe('dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
test('movimiento reducido mantiene el recorrido manual', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await neuron(page);
  await expect(page.getByRole('button', { name: 'Reproducir recorrido' })).toBeDisabled();
  await page.getByRole('button', { name: 'Fase siguiente' }).click();
  await expect(page.locator('.playback-status')).toContainText('Fase 2');
});
test('sin almacenamiento conserva ajustes en memoria', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('denied', 'SecurityError');
      },
    });
  });
  await page.goto('#/ajustes');
  await expect(page.getByText('Almacenamiento no disponible.', { exact: false })).toBeVisible();
  await page.getByLabel('Tema', { exact: true }).selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
test('rutas bajo subcarpeta, salto al contenido y CSP sin infracciones', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.addInitScript(() => {
    (window as Window & { cspErrors?: string[] }).cspErrors = [];
    document.addEventListener('securitypolicyviolation', (event) =>
      (window as Window & { cspErrors?: string[] }).cspErrors?.push(event.violatedDirective),
    );
  });
  for (const [path, title] of [
    ['', 'Entiende lo que ocurre'],
    ['#/laboratorios', 'Un recorrido'],
    ['#/lab/datos', 'Todo empieza'],
    ['#/taller', 'Taller de investigación'],
    ['#/biblioteca', 'Tu biblioteca'],
    ['#/desconocida', 'Este lugar'],
    ['#/lab/neurona', 'La neurona'],
  ]) {
    await page.goto(path!);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(title!);
  }
  await page.keyboard.press('Tab');
  const skip = page.getByRole('button', { name: 'Saltar al contenido' });
  await skip.focus();
  const url = page.url();
  await skip.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  expect(page.url()).toBe(url);
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(() => (window as Window & { cspErrors?: string[] }).cspErrors),
  ).toEqual([]);
});
for (const theme of ['light', 'dark'] as const) {
  test(`accesibilidad automatizada y capturas: ${theme}`, async ({ page }, testInfo) => {
    for (const path of ['', '#/laboratorios', '#/lab/neurona', '#/glosario', '#/ajustes']) {
      await page.goto(path);
      await page.getByRole('heading', { level: 1 }).waitFor();
      if (path === '') {
        await page.getByRole('button', { name: 'Ajustes', exact: true }).click();
        await page.getByLabel('Tema', { exact: true }).selectOption(theme);
        await page.getByRole('button', { name: 'Cerrar ajustes' }).click();
      }
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(result.violations).toEqual([]);
      if (path === '#/lab/neurona')
        await testInfo.attach(`neurona-${theme}`, {
          body: await page.screenshot({ fullPage: true }),
          contentType: 'image/png',
        });
    }
    await page.getByRole('button', { name: 'Ajustes', exact: true }).click();
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
  });
}
test('responsive 360–1440 y pestañas móviles con teclado', async ({ page }, testInfo) => {
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['', '#/lab/neurona', '#/glosario', '#/ajustes']) {
      await page.goto(path);
      await page.getByRole('heading', { level: 1 }).waitFor();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      ).toBe(true);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await neuron(page);
  await page.getByRole('tab', { name: 'Explorar' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Tu experimento' })).toBeFocused();
  await expect(page.getByLabel('Entrada x₁', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Explicación' }).click();
  await expect(page.getByTestId('output')).toBeVisible();
  await testInfo.attach('movil-explicacion', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  await page.getByRole('button', { name: 'Abrir navegación' }).click();
  await page
    .getByRole('dialog', { name: 'Navegación principal' })
    .getByRole('link', { name: 'Inicio' })
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Entiende');
  await page.setViewportSize({ width: 720, height: 500 });
  await page.goto('#/lab/neurona');
  await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
});
