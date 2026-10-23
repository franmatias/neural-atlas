import assert from 'node:assert/strict';
import { readdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = fileURLToPath(new URL('../',import.meta.url));
assert.equal(Number(process.versions.node.split('.')[0]),24,'Usar Node 24 LTS para esta revisión');
const dom = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window=dom.window;
globalThis.document=dom.window.document;
const { default:mermaid } = await import('mermaid');
mermaid.initialize({ startOnLoad:false, securityLevel:'strict' });
const read=relative=>readFile(path.join(root,relative),'utf8');
const diagramFiles=(await readdir(path.join(root,'docs','diagrams'))).filter(f=>f.endsWith('.mmd')).sort();
assert(diagramFiles.length>=26,'Faltan diagramas de diseño de la revisión');
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
let inlineDiagrams=0;
for(const file of markdown){
  const original=await read(file);
  for(const match of original.matchAll(/```mermaid\r?\n([\s\S]*?)```/g)){
    await mermaid.parse(match[1]);
    inlineDiagrams++;
  }
  const source=original.replace(/```[^\n]*\n[\s\S]*?```/g,'');
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
console.log(`${inlineDiagrams} diagramas Mermaid incluidos en Markdown con sintaxis válida.`);

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
assert(rf.length>=88);assert.equal(rnf.length,24);assert(stories.length>=65);
assert(concepts.length>=152,'Faltan conceptos de la revisión');
for(let i=1;i<=152;i++)assert(concepts.includes(`C${String(i).padStart(3,'0')}`),`Falta C${i}`);
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

const modules=JSON.parse(await read('docs/fixtures/rf-modules.json'));
assert.deepEqual(Object.keys(modules).sort(),[...rf].sort(),'Asignación RF/módulo incompleta o sobrante');
const allowed=new Set(['APP','CAT','BIB','AJUSTES','TALLER','POE','DIAG','TRANS',...Array.from({length:12},(_,i)=>`L${String(i+1).padStart(2,'0')}`)]);
for(const [id,values]of Object.entries(modules))assert(values.length&&values.every(v=>allowed.has(v)),`Módulo desconocido en ${id}`);
const storyRows=storiesSource.split('\n').filter(l=>/^\| US-\d+ \|/.test(l)).map(l=>l.split('|').map(s=>s.trim()));
const phaseOf=new Map(storyRows.map(c=>[c[1],c[5]]));
const phaseOrder=['D1','D2','D3','D4','D5','D6','D7','D8','D9','D10','X1','X2'];
for(const c of storyRows){
  assert(phaseOrder.includes(c[5]),`Fase inválida: ${c[5]}`);
  for(const item of c[4].split(',')){
    const match=item.match(/^(P-[A-Z])(\d{2}[ab]?)((?:\/\d{2}[ab]?)*)$/);
    assert(match,`Referencia de prueba inválida: ${item}`);
    for(const suffix of [match[2],...match[3].split('/').filter(Boolean)])assert(plan.includes(match[1]+suffix),`Prueba no documentada: ${match[1]+suffix}`);
  }
}
for(const phase of phaseOrder){
  const count=storyRows.filter(c=>c[5]===phase).length;
  const row=storiesSource.split('\n').find(l=>l.startsWith(`| ${phase} |`));
  if(row)assert.equal(Number(row.split('|')[4].trim()),count,`Recuento de fase ${phase} desactualizado`);
}
const deps=JSON.parse(await read('docs/fixtures/story-dependencies.json'));
for(const [id,requires]of Object.entries(deps)){
  assert(phaseOf.has(id));
  for(const dep of requires){
    assert(phaseOf.has(dep));
    assert(phaseOrder.indexOf(phaseOf.get(dep))<=phaseOrder.indexOf(phaseOf.get(id)),`Dependencia futura: ${id} -> ${dep}`);
  }
}
const visiting=new Set(),done=new Set();
function visit(id){if(done.has(id))return;assert(!visiting.has(id),`Ciclo de historias: ${id}`);visiting.add(id);for(const dep of deps[id]??[])visit(dep);visiting.delete(id);done.add(id);}
for(const id of stories)visit(id);
const concept=JSON.parse(await read('docs/fixtures/concept-example.json'));
for(const field of ['id','slug','contentVersion','title','aliases','category','level','definition','intuition','formal','numericExample','relatedControls','frequentMistake','misconceptionPresetIds','selfAssessment','prerequisiteIds','relatedIds','labIds','activity','evidence','validationRefs','sources','targetRelease','status'])assert(field in concept,`Campo editorial ausente: ${field}`);
assert(concept.title.es&&concept.title.en&&concept.selfAssessment.answer&&concept.selfAssessment.explanation);
assert(concept.selfAssessment.correctOptionIds.every(id=>concept.selfAssessment.options.some(o=>o.id===id)));
console.log('RF→módulo, referencias de pruebas, recuentos/fases, dependencias críticas sin ciclos y ejemplo editorial alineados.');

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
const design=(await read('docs/07-diseno-de-interfaz.md')).replaceAll('**','');
const light=design.match(/Clases en claro: azul (#[0-9A-F]+), naranja (#[0-9A-F]+) y verde (#[0-9A-F]+)/)?.slice(1);
const dark=design.match(/oscuro: (#[0-9A-F]+), (#[0-9A-F]+) y (#[0-9A-F]+)/)?.slice(1);
assert(light?.length===3&&dark?.length===3,'Paleta de clases no identificada');
const graphics=[
 ...light.flatMap(fg=>['#ECEFEA','#FFFFFF'].map(bg=>[fg,bg])),
 ...dark.flatMap(fg=>['#213440','#182530'].map(bg=>[fg,bg])),
 ...['#FFFFFF','#ECEFEA','#F6F5F0'].map(bg=>['#718681',bg]),
 ...['#182530','#213440','#101820'].map(bg=>['#799099',bg]),
 ...['#FFFFFF','#ECEFEA'].map(bg=>['#006B58',bg]),
 ...['#182530','#213440'].map(bg=>['#64E5C2',bg]),
];
for(const [fg,bg]of graphics)assert(contrast(fg,bg)>=3,`Contraste no textual insuficiente: ${fg}/${bg}`);
assert(contrast('#009E73','#ECEFEA')<3,'El oráculo de regresión del verde debe detectar el contraste insuficiente');
console.log(`3 SVG bien formados; 10 pares de texto ≥4,5:1 y ${graphics.length} pares no textuales ≥3:1. No certifica UI completa.`);
dom.window.close();
