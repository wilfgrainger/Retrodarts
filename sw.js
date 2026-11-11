const CACHE="retro-darts-scorer-v158";
const FILES=["./","./manifest.webmanifest","./icons/icon-192.png","./icons/icon-512.png"];

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

  // Only the scorer (and its old addresses, which redirect to it online) falls back to the saved copy; the FAQ, privacy and 404 pages need the network.
  if(request.mode==="navigate"){if(!["","index.html","standalone","standalone.html"].some(p=>url.pathname===scope.pathname+p))return;
    // Network first, but Wi-Fi with no real internet can stall for a long time: after 3 seconds the saved copy is used.
    const appShell=()=>caches.open(CACHE).then(cache=>cache.match(scope.href));
    event.respondWith(new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>appShell().then(shell=>{if(shell)resolve(shell);}),3000);
      fetch(request).then(response=>{clearTimeout(timer);resolve(response);},error=>{clearTimeout(timer);appShell().then(shell=>shell?resolve(shell):reject(error),()=>reject(error));});
    }));
    return;
  }

  event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));
});

self.addEventListener("message",event=>{if(event.data==="version" && event.ports[0])event.ports[0].postMessage(CACHE);});
