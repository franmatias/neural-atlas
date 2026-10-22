// Optional visual QA. Supply an installed Playwright module through
// NEURAL_ATLAS_PLAYWRIGHT, or install Playwright in the review environment.
import { createServer } from 'node:http';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const modulePath=process.env.NEURAL_ATLAS_PLAYWRIGHT;
const {chromium}=await import(modulePath?pathToFileURL(modulePath).href:'playwright');
const server=createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    if(pathname==='/__review__'){
      res.setHeader('Content-Type','text/html; charset=utf-8');
      res.end('<!doctype html><html lang="es"><meta charset="utf-8"><title>Revisión documental local</title><body></body></html>');return;
    }
    const file=path.resolve(root,`.${pathname}`),relative=path.relative(root,file);
    if(relative.startsWith('..')||path.isAbsolute(relative)||relative.split(path.sep).some(s=>s.startsWith('.'))){res.writeHead(403);res.end();return;}
    const types={'.svg':'image/svg+xml','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json'};
    res.setHeader('Content-Type',`${types[path.extname(file)]??'text/plain'}; charset=utf-8`);
    res.end(await readFile(file));
  }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
let browser;
try{
  browser=await chromium.launch({headless:true,channel:'chrome'});
  const page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1});
  await mkdir(path.join(root,'docs','design','previews'),{recursive:true});
  for(const [file,width,height]of [['desktop-light',1440,960],['desktop-dark',1440,960],['mobile',390,844]]){
    await page.setViewportSize({width,height});
    await page.goto(`${origin}/docs/design/${file}.svg`);
    await page.screenshot({path:path.join(root,'docs','design','previews',`${file}.png`)});
  }
  await page.goto(`${origin}/__review__`);
  await page.setViewportSize({width:1440,height:1000});
  await page.evaluate(async()=>{
    const {default:mermaid}=await import('/node_modules/mermaid/dist/mermaid.esm.min.mjs');
    mermaid.initialize({startOnLoad:false,securityLevel:'strict',theme:'neutral'});
    window.reviewMermaid=mermaid;
  });
  const files=(await readdir(path.join(root,'docs','diagrams'))).filter(f=>f.endsWith('.mmd')).sort();
  await mkdir(path.join(root,'docs','diagrams','rendered'),{recursive:true});
  await mkdir(path.join(root,'docs','diagrams','previews'),{recursive:true});
  for(const [index,file]of files.entries()){
    const source=await readFile(path.join(root,'docs','diagrams',file),'utf8');
    const result=await page.evaluate(async({source,index})=>{
      const {svg}=await window.reviewMermaid.render(`diagram${index}`,source);
      document.body.innerHTML=svg;
      const el=document.querySelector('svg');
      const b=el.getBoundingClientRect();
      return {svg,width:b.width,height:b.height,error:document.body.textContent.includes('Syntax error in text')};
    },{source,index});
    if(result.error||result.width<=0||result.height<=0)throw new Error(`Diagrama no renderizable: ${file}`);
    await writeFile(path.join(root,'docs','diagrams','rendered',file.replace(/\.mmd$/,'.svg')),result.svg);
    if(['21','22','26'].includes(file.slice(0,2)))await page.screenshot({path:path.join(root,'docs','diagrams','previews',file.replace(/\.mmd$/,'.png')),fullPage:true});
  }
  console.log(`${files.length} diagramas renderizados en Chrome y 3 PNG de wireframes capturados.`);
  await writeFile(path.join(root,'docs','design','previews','README.md'),'# Previsualizaciones\n\nPNG de los SVG de referencia, capturados en Chrome a escala 1. Son wireframes estáticos de especificación, no una aplicación implementada. Se regeneran con el script opcional `visual-review.mjs` en un entorno con Playwright y Chrome instalados.\n');
}finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
