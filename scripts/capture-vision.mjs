import {chromium,expect} from '@playwright/test';
import {fileURLToPath} from 'node:url';
const base=process.env.NEURAL_ATLAS_URL??'http://127.0.0.1:4173/neural-atlas/';
const output=name=>fileURLToPath(new URL(`../docs/implementation/${name}`,import.meta.url));
const browser=await chromium.launch();
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto(new URL('#/lab/vision',base).href);
  await page.getByRole('button',{name:'Aplicar filtro y registrar mapas',exact:true}).click();
  await expect(page.getByTestId('vision-result')).toBeVisible();
  await page.getByLabel('Índice de salida inspeccionada',{exact:true}).fill('55');
  await page.getByLabel('Índice de salida inspeccionada',{exact:true}).press('Enter');
  await page.locator('.maps').screenshot({path:output('d9-vision-maps.png')});
  await page.locator('.inspection').screenshot({path:output('d9-vision-window.png')});
  await page.setViewportSize({width:390,height:844});
  await page.locator('.maps').screenshot({path:output('d9-vision-mobile.png')});
}finally{await browser.close();}
