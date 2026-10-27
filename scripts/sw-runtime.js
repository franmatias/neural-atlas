/* Build prepends immutable CONFIG. No user files or experiments enter this cache. */
const { base, version, cacheName, resources } = CONFIG;
const allowed = new Map(resources.map(r => [new URL(r.path, self.location.origin).href, r]));
async function precache(install) {
  const cache = await caches.open(cacheName);
  try {
    await cache.delete(base+'__offline-ready');
    let index = 0;
    const attempts=await Promise.allSettled(Array.from({length:4}, async () => {
      while(index < resources.length) {
        const resource = resources[index++];
        const response = await fetch(resource.path, {cache:'reload',credentials:'same-origin'});
        if(!response.ok || response.type==='opaque') throw Error('PRECACHE_HTTP');
        const bytes = await response.clone().arrayBuffer();
        const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
        if(digest!==resource.hash) throw Error('PRECACHE_INTEGRITY');
        await cache.put(resource.path,response);
      }
    }));
    if(attempts.some(r=>r.status==='rejected'))throw Error('PRECACHE_INCOMPLETE');
    await cache.put(base+'__offline-ready',new Response(JSON.stringify({version,cacheName,count:resources.length})));
  }catch(error){if(install)await caches.delete(cacheName);throw error;}
}
self.addEventListener('install',event=>event.waitUntil(precache(true)));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith('neural-atlas-static-')&&key!==cacheName)await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin||!url.pathname.startsWith(base))return;
  const key=event.request.mode==='navigate'&&(url.pathname===base||url.pathname===base+'index.html')?new URL(base+'index.html',self.location.origin).href:url.href;
  if(!allowed.has(key))return;
  event.respondWith((async()=>{const cache=await caches.open(cacheName);return await cache.match(key)??fetch(event.request);})());
});
self.addEventListener('message',event=>event.waitUntil((async()=>{
  const reply=value=>event.ports[0]?.postMessage(value);
  if(event.data?.type==='REPAIR'){try{await precache(false);reply({ready:true});}catch{reply({ready:false});}}
  if(event.data?.type==='STATUS'){
    const cache=await caches.open(cacheName),marker=await cache.match(base+'__offline-ready');
    const keys=await cache.keys();
    reply({version,ready:!!marker&&resources.every(r=>keys.some(k=>new URL(k.url).pathname===r.path)),count:resources.length});
  }
  if(event.data?.type==='ACTIVATE'){
    const clients=(await self.clients.matchAll({type:'window',includeUncontrolled:true})).filter(c=>{const u=new URL(c.url);return u.origin===self.location.origin&&u.pathname.startsWith(base);});
    if(clients.length>1){reply({blocked:true});return;}
    reply({accepted:true});await self.skipWaiting();
  }
})()));
