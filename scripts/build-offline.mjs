import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {Script} from 'node:vm';
const dist=new URL('../dist/',import.meta.url),base='/neural-atlas/';
const {version}=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
async function files(path=''){const result=[];for(const entry of await readdir(new URL(path,dist),{withFileTypes:true})){if(entry.name.startsWith('.'))continue;const name=path+entry.name;if(entry.isDirectory())result.push(...await files(name+'/'));else if(!name.endsWith('.map')&&name!=='sw.js')result.push(name);}return result;}
const resources=[];let gzipBytes=0;
for(const file of (await files()).sort()){const buffer=await readFile(new URL(file,dist));gzipBytes+=gzipSync(buffer).length;resources.push({path:base+file,hash:createHash('sha256').update(buffer).digest('hex')});}
if(gzipBytes>8*1024*1024)throw Error('Offline static payload exceeds 8 MiB gzip');
const runtime=await readFile(new URL('sw-runtime.js',import.meta.url),'utf8');
const revision=createHash('sha256').update(JSON.stringify(resources)).update(runtime).digest('hex').slice(0,20);
const config={base,version,cacheName:'neural-atlas-static-'+version+'-'+revision,resources};
const script='const CONFIG = '+JSON.stringify(config)+';\n'+runtime;
new Script(script);await writeFile(new URL('sw.js',dist),script);
console.log(`Offline build: ${resources.length} resources, ${(gzipBytes/1024).toFixed(1)} KiB gzip, ${config.cacheName}.`);
