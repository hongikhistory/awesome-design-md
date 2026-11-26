// App-shell service worker.
// - HTML: network first, so a new version reaches teachers on the next visit; cached copy when offline.
// - Hashed build files (assets/*): cache first. All of them are precached on install from precache.json,
//   so 문서 변환·슬라이드·통신문·학생 기록 keep working on an unstable school network.
// No user data passes through here; encrypted data lives in IndexedDB/localStorage.
const CACHE = "kyosil-itda-v4";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(SHELL);
    try {
      const list = await (await fetch("./precache.json", { cache: "no-store" })).json();
      await c.addAll(list.map((f) => `./${f}`));
    } catch { /* precache is best effort; files are cached on first use anyway */ }
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  const put = (res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; };
  if (req.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("/")) {
    e.respondWith(fetch(req).then(put).catch(async () => (await caches.match(req, { ignoreVary: true })) || caches.match("./index.html", { ignoreVary: true })));
    return;
  }
  // ignoreVary: some hosts send "Vary: Origin", and module scripts carry an Origin header the precache fetch did not,
  // so a strict match misses and the lazy screens fail offline. Build files are content-hashed, so this is safe.
  e.respondWith(caches.match(req, { ignoreVary: true }).then((hit) => hit || fetch(req).then(put)));
});
