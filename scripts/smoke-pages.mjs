import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const url = process.env.PAGES_URL ?? 'https://franmatias.github.io/neural-atlas/';
const parsed = new URL(url);
assert.equal(parsed.protocol, 'https:');
assert.equal(parsed.hostname, 'franmatias.github.io');
assert.equal(parsed.pathname, '/neural-atlas/');
const browser = await chromium.launch({ headless: true });
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
      await page.getByRole('searchbox').fill('bias');
      await page.locator('.concept-card').filter({ hasText: 'Sesgo' }).waitFor();
      assert.equal(await page.locator('.concept-card').count(), 1);
      assert.deepEqual(errors, []);
      console.log(
        `Pages smoke passed: HTTP 200, assets/CSP, neuron fixture, theme and glossary at ${url}`,
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
