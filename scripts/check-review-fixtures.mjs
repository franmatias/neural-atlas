// Independent documentation oracles; this is not the future training engine.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const get=async name=>JSON.parse(await readFile(new URL(`../docs/fixtures/${name}`,import.meta.url),'utf8'));
const close=(a,b)=>assert(Math.abs(a-b)<1e-12,`${a} != ${b}`);
const fixtures=await get('review-math.json');
for(const c of fixtures.rocCases){
  const positives=c.scores.filter((_,i)=>c.labels[i]===1);
  const negatives=c.scores.filter((_,i)=>c.labels[i]===0);
  const pairs=positives.flatMap(p=>negatives.map(n=>p>n?1:p===n?0.5:0));
  const auc=pairs.length?pairs.reduce((a,b)=>a+b,0)/pairs.length:null;
  let tp=0,fp=0,ap=positives.length?0:null;
  for(const score of [...new Set(c.scores)].sort((a,b)=>b-a)){
    const ids=c.scores.map((s,i)=>s===score?i:-1).filter(i=>i>=0);
    const newTp=ids.filter(i=>c.labels[i]===1).length;
    tp+=newTp;fp+=ids.length-newTp;
    if(ap!==null)ap+=(newTp/positives.length)*(tp/(tp+fp));
  }
  if(c.auc===null)assert.equal(auc,null);else close(auc,c.auc);
  if(c.ap===null)assert.equal(ap,null);else close(ap,c.ap);
}
const a=fixtures.adamFirstStep;
const m=(1-a.beta1)*a.gradient,v=(1-a.beta2)*a.gradient**2;
close(a.theta-a.learningRate*(m/(1-a.beta1))/(Math.sqrt(v/(1-a.beta2))+a.epsilon),a.expected);
const arch=fixtures.maximumArchitecture;
assert.equal(arch.layers.slice(1).reduce((s,n,i)=>s+(arch.layers[i]+1)*n,0),arch.denseParameters);
assert.equal(arch.layers.slice(1,-1).reduce((s,n)=>s+2*n,0),arch.bnParameters);
assert.equal(arch.denseParameters+arch.bnParameters,arch.totalWithBN);
assert.equal(arch.totalWithBN*8*3,arch.adamMainTensorBytes);
const storage=fixtures.storageMiB;
assert.equal(storage.experiments*storage.perExperiment+storage.recoveryReserve+storage.contentPacks+storage.learning+storage.overhead,storage.budget);

function derive(seed,purpose){
  assert(/^[a-z0-9-]+$/.test(purpose));
  let hash=2166136261;
  for(const char of `${seed>>>0}:${purpose}:v1`)hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;
  return hash;
}
const rng=await get('rng-v1.json');
for(const v of rng.vectors){
  let state=derive(v.seed,v.purpose);assert.equal(state,v.derivedState);
  for(const expected of v.firstUint32){
    state=(state+0x6D2B79F5)>>>0;
    let t=Math.imul(state^(state>>>15),state|1);
    t^=t+Math.imul(t^(t>>>7),t|61);
    assert.equal((t^(t>>>14))>>>0,expected);
  }
}
console.log('Oráculos documentales correctos: ROC/AP, Adam con tasa explícita, arquitectura, presupuesto y 4 streams RNG.');
