import {chromium,expect} from '@playwright/test';
const browser=await chromium.launch();
try {
  const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:4173/neural-atlas/#/lab/generalizacion');
  await page.getByRole('combobox',{name:'Intervención',exact:true}).selectOption('bn');await page.getByLabel('Épocas por ensayo',{exact:true}).fill('5');await page.getByRole('button',{name:'Comparar con referencia',exact:true}).click();await expect(page.locator('.normalization-panel')).toBeVisible();
  await page.locator('.normalization-panel').screenshot({path:'docs/implementation/d6-normalization.png'});
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.documentElement.setAttribute('data-theme','dark'));
  await page.getByRole('button',{name:'Usar memoria de inferencia',exact:true}).click();await page.getByLabel('Valor previo z para explorar',{exact:true}).fill('2');
  await page.getByRole('heading',{name:'Explora una transformación',exact:true}).evaluate(el=>window.scrollTo({top:el.getBoundingClientRect().top+scrollY-88,behavior:'instant'}));await page.screenshot({path:'docs/implementation/d6-normalization-mobile.png'});
}finally{await browser.close();}
