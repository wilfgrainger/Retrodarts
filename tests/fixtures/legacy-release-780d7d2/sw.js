const CACHE="retro-darts-scorer-v61";
const FILES=["./","./manifest.webmanifest","./assets/pub-wall-hero.webp","./icons/icon-192.png","./icons/icon-512.png"];

self.addEventListener("install",event=>event.waitUntil(
  caches.open(CACHE)
    .then(cache=>cache.addAll(FILES.map(url=>new Request(new URL(url,self.registration.scope),{cache:"reload"}))))
    .then(()=>self.skipWaiting())
));

self.addEventListener("activate",event=>event.waitUntil(
  caches.keys()
    .then(keys=>Promise.all(keys.filter(key=>key!==CACHE&&(key.startsWith("wheatsheaf-scorer-")||key.startsWith("digital-darts-scorer-")||key.startsWith("retro-darts-scorer-"))).map(key=>caches.delete(key))))
    .then(()=>self.clients.claim())
));

self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;

  const scope=new URL(self.registration.scope);
  const url=new URL(request.url);
  if(url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;

  if(request.mode==="navigate"){
    event.respondWith(fetch(request).catch(async error=>{
      const appShell=await caches.open(CACHE).then(cache=>cache.match(scope.href));
      if(appShell)return appShell;
      throw error;
    }));
    return;
  }

  event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));
});
