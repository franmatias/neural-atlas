import assert from 'node:assert/strict';
import { readdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = fileURLToPath(new URL('../',import.meta.url));
const dom = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window=dom.window;
globalThis.document=dom.window.document;
const { default:mermaid } = await import('mermaid');
mermaid.initialize({ startOnLoad:false, securityLevel:'strict' });
const read=relative=>readFile(path.join(root,relative),'utf8');
const diagramFiles=(await readdir(path.join(root,'docs','diagrams'))).filter(f=>f.endsWith('.mmd')).sort();
assert(diagramFiles.length>=20,'Faltan diagramas de diseño');
for(const file of diagramFiles){
  const source=await read(`docs/diagrams/${file}`);
  await mermaid.parse(source);
}
console.log(`${diagramFiles.length} fuentes Mermaid con sintaxis válida.`);

async function walk(dir){
  const result=[];
  for(const item of await readdir(path.join(root,dir),{withFileTypes:true})){
    const relative=path.join(dir,item.name);
    if(item.isDirectory())result.push(...await walk(relative));
    else if(item.name.endsWith('.md'))result.push(relative);
  }
  return result;
}
const markdown=['README.md',...await walk('docs')];
let linkCount=0;
for(const file of markdown){
  const source=(await read(file)).replace(/```[^\n]*\n[\s\S]*?```/g,'');
  for(const match of source.matchAll(/!?\[[^\]]*\]\(([^\s)]+)\)/g)){
    const href=match[1];
    if(/^(https?:|mailto:|data:|#)/.test(href))continue;
    const clean=decodeURIComponent(href.split('#')[0]);
    await access(path.resolve(root,path.dirname(file),clean)).catch(()=>{
      throw new Error(`Enlace local roto en ${file}: ${href}`);
    });
    linkCount++;
  }
}
console.log(`${markdown.length} documentos y ${linkCount} enlaces locales correctos.`);

function tableIds(source,prefix){
  return [...source.matchAll(new RegExp(`^\\| (${prefix}\\d{3,}) \\|`,'gm'))].map(m=>m[1]);
}
function unique(list,label){assert.equal(new Set(list).size,list.length,`${label}: ID duplicado`)}
const rf=tableIds(await read('docs/03-requisitos-funcionales.md'),'RF-');
const rnf=tableIds(await read('docs/04-requisitos-no-funcionales.md'),'RNF-');
const concepts=tableIds(await read('docs/06-matriz-conceptos.md'),'C');
const storiesSource=await read('docs/14-historias-y-plan-git.md');
const stories=tableIds(storiesSource,'US-');
for(const [ids,label] of [[rf,'RF'],[rnf,'RNF'],[concepts,'conceptos'],[stories,'historias']])unique(ids,label);
assert.equal(rf.length,68);assert.equal(rnf.length,24);assert.equal(stories.length,44);
assert(concepts.length>=140,'Se requieren los conceptos originales y al menos 40 añadidos');
for(let i=1;i<=140;i++)assert(concepts.includes(`C${String(i).padStart(3,'0')}`),`Falta C${i}`);
for(const id of rf)assert(storiesSource.includes(id),`Requisito sin historia: ${id}`);
const plan=await read('docs/13-pruebas-y-aceptacion.md');
const coveredRnf=new Set();
for(const m of plan.matchAll(/RNF-(\d{3})((?:\/\d{3})*)/g)){
  for(const n of [m[1],...m[2].split('/').filter(Boolean)])coveredRnf.add(`RNF-${n}`);
}
for(const id of rnf)assert(coveredRnf.has(id),`RNF sin evidencia: ${id}`);
const matrix=await read('docs/06-matriz-conceptos.md');
for(const line of matrix.split('\n').filter(l=>/^\| C\d+ \|/.test(l))){
  const cells=line.split('|').map(s=>s.trim());
  const labs=cells[3].split(',');
  for(const lab of labs){
    assert(/^L(0[1-9]|1[0-2])$/.test(lab),`Laboratorio desconocido: ${lab}`);
    assert((await read('docs/05-laboratorios.md')).includes(`## ${lab} ·`),`Falta ${lab}`);
  }
  assert(plan.includes(cells[5]),`Prueba de concepto inexistente: ${cells[5]}`);
}
console.log(`${rf.length} RF trazados a ${stories.length} historias, ${rnf.length} RNF a evidencias y ${concepts.length} conceptos a laboratorios/pruebas.`);

for(const file of ['desktop-light.svg','desktop-dark.svg','mobile.svg']){
  const xml=await read(`docs/design/${file}`);
  const parsed=new dom.window.DOMParser().parseFromString(xml,'image/svg+xml');
  assert(!parsed.querySelector('parsererror'),`SVG inválido: ${file}`);
  assert.equal(parsed.documentElement.localName,'svg');
  assert(parsed.querySelector('title')&&parsed.querySelector('desc'));
}
function luminance(hex){
  const c=hex.match(/[0-9a-f]{2}/gi).map(n=>parseInt(n,16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
  return c[0]*0.2126+c[1]*0.7152+c[2]*0.0722;
}
function contrast(a,b){const l=[luminance(a),luminance(b)].sort((x,y)=>y-x);return(l[0]+0.05)/(l[1]+0.05)}
const pairs=[
 ['#152A30','#F6F5F0'],['#4E6267','#FFFFFF'],['#006B58','#FFFFFF'],
 ['#E9F1F3','#101820'],['#AFBEC4','#182530'],['#102720','#64E5C2'],
 ['#A3293D','#FFFFFF'],['#FF9BAA','#182530'],['#805100','#FFFFFF'],['#FFD27A','#182530'],
];
for(const [fg,bg]of pairs)assert(contrast(fg,bg)>=4.5,`Contraste de texto insuficiente: ${fg}/${bg}`);
console.log('3 SVG bien formados y 10 pares de contraste de texto ≥4,5:1. No equivale a una auditoría completa de UI.');
dom.window.close();
