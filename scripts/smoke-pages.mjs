import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const url = process.env.PAGES_URL ?? 'https://franmatias.github.io/neural-atlas/';
const parsed = new URL(url);
assert.equal(parsed.protocol, 'https:');
assert.equal(parsed.hostname, 'franmatias.github.io');
assert.equal(parsed.pathname, '/neural-atlas/');
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PAGES_BROWSER_CHANNEL ? { channel: process.env.PAGES_BROWSER_CHANNEL } : {}),
});
try {
  let failure;
  for (let attempt = 0; attempt < 10; attempt++) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    try {
      const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
      assert.equal(response?.status(), 200);
      await page
        .getByRole('heading', { level: 1 })
        .filter({ hasText: 'Entiende lo que ocurre' })
        .waitFor({ timeout: 10000 });
      await page.goto(new URL('#/lab/neurona', url).href);
      await page.getByTestId('output').waitFor();
      assert.equal(await page.getByTestId('output').textContent(), '0,6083');
      await page.getByRole('button', { name: 'Oscuro', exact: true }).click();
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
      await page.getByRole('link', { name: 'Conectar con el glosario' }).click();
      await page.getByRole('searchbox').fill('C028');
      await page.locator('.concept-card').filter({ hasText: 'Sesgo' }).waitFor();
      assert.equal(await page.locator('.concept-card').count(), 1);
      await page.getByRole('searchbox').fill('C652');
      await page.locator('.concept-card').filter({hasText:'Paridad demográfica'}).waitFor();
      assert.equal(await page.locator('.concept-card').count(),1);
      await page.goto(new URL('#/lab/datos', url).href);
      await page
        .getByRole('heading', { level: 1 })
        .filter({ hasText: 'Todo empieza en los datos.' })
        .waitFor();
      await page.getByLabel('Ejemplo práctico', { exact: true }).selectOption('copies');
      await page.getByRole('button', { name: 'Generar y sustituir datos' }).click();
      await page.getByText('Dataset generado.', { exact: false }).waitFor();
      await page.getByRole('button', { name: 'Dividir', exact: true }).click();
      await page.getByRole('button', { name: 'Crear partición' }).click();
      await page.getByRole('heading', { name: /Proporciones logradas/ }).waitFor();
      await page.getByRole('button', { name: 'Preparar', exact: true }).click();
      await page.getByRole('button', { name: 'Ajustar con train y transformar' }).click();
      await page
        .getByRole('heading', { name: 'Estado aprendido exclusivamente con train' })
        .waitFor();
      await page.goto(new URL('#/lab/arquitectura', url).href);
      await page.getByRole('button', { name: '2 · Combinar regiones', exact: true }).click();
      await page.getByRole('button', { name: 'Aprender XOR con MLP' }).click();
      await page.getByTestId('xor-score').waitFor();
      assert.equal(await page.getByTestId('xor-score').textContent(), '4 / 4');
      await page.goto(new URL('#/lab/activaciones', url).href);
      await page.getByTestId('softmax-sum').waitFor();
      assert.equal(await page.getByTestId('softmax-sum').textContent(), 'Σp = 1');
      await page.goto(new URL('#/lab/propagacion', url).href);
      await page.getByRole('button', { name: 'Comprobar todos los gradientes' }).click();
      await page.locator('.gradient-check').waitFor();
      assert.equal(await page.locator('.gradient-check tbody tr').count(), 9);
      assert.equal(
        await page.locator('.gradient-check tbody tr').filter({ hasText: 'Correcto' }).count(),
        9,
      );
      assert.deepEqual(errors, []);
      await page.goto(new URL('#/lab/entrenamiento', url).href);
      await page.getByRole('button', { name: 'Cargar ejemplo y sustituir datos' }).click();
      await page.getByText('train 280 / validación 60 / test 60.', { exact: false }).waitFor();
      await page.getByLabel('Épocas máximas', { exact: true }).fill('2');
      await page.getByRole('button', { name: 'Inicializar modelo', exact: true }).click();
      await page.getByRole('button', { name: 'Entrenar', exact: true }).click();
      await page.locator('.training-status').filter({ hasText: 'Épocas completadas' }).waitFor();
      await page.getByRole('link', { name: 'Evaluar este modelo' }).click();
      await page.getByRole('button', { name: 'Evaluar validación', exact: true }).click();
      await page.getByRole('heading', { name: 'Resultados: validación' }).waitFor();
      await page.getByRole('button', { name: 'Predecir muestra', exact: true }).click();
      await page.locator('.prediction-result').waitFor();
      assert.deepEqual(errors, []);
      console.log(
        `Pages smoke passed: HTTP 200, assets/CSP, neuron, theme, glossary, data pipeline, learned XOR, softmax and nine gradients at ${url}`,
      );
      failure = undefined;
      break;
    } catch (error) {
      failure = error;
      console.log(`Pages propagation/check attempt ${attempt + 1} pending.`);
    } finally {
      await page.close();
    }
    if (attempt < 9) await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  if (failure) throw failure;
} finally {
  await browser.close();
}
