const CACHE_NAME = "tracker-v6";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./data/users.js",
  "./data/habits.js",
  "./data/backup.js",
  "./data/stats.js",
  "./ui/dashboard.js",
  "./ui/duel.js",
  "./ui/settings.js",
  "./analytics/monthlyAnalysis.js",
  "./analytics/habitPatterns.js",
  "./analytics/predictions.js",
  "./admin/statsPanel.js",
  "./manifest.webmanifest",
  "./tracker-icon.svg",
  "./tracker-icon-neutral.svg",
  "./tracker-icon-rojo.svg",
  "./tracker-icon-rosa.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : Promise.resolve()))
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
  );
});
