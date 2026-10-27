import { chromium, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
const base=process.env.NEURAL_ATLAS_URL??'http://127.0.0.1:4173/neural-atlas/';
const output=name=>fileURLToPath(new URL(`../docs/implementation/${name}`,import.meta.url));
const browser=await chromium.launch();
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto(new URL('#/lab/optimizacion',base).href);
  await page.getByRole('button',{name:'Calcular paisaje y trayectorias',exact:true}).click();
  await expect(page.getByTestId('landscape-result')).toBeVisible();
  await page.getByRole('slider',{name:'Paso de trayectoria',exact:true}).fill('80');
  await page.locator('.landscape-plot').screenshot({path:output('d9-landscape-contours.png')});
  await page.getByRole('button',{name:'Malla 3D',exact:true}).click();
  await expect(page.locator('.gpu-surface canvas')).toBeVisible();
  await expect(page.getByText(/triángulos ·/)).toBeVisible();
  await page.locator('.surface-3d').screenshot({path:output('d9-landscape-3d.png')});
  await page.getByRole('button',{name:'Contornos 2D',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  await page.locator('.landscape-plot').screenshot({path:output('d9-landscape-mobile.png')});
} finally { await browser.close(); }
