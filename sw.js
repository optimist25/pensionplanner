/* 노후플랜B PWA 서비스워커
   - HTML 문서: 네트워크 우선(온라인이면 항상 최신), 오프라인이면 캐시 폴백
   - 그 외 동일 출처 자원: 캐시 우선
   index.html을 새로 올려도 온라인 사용자는 자동으로 최신본을 받습니다.
   캐시를 강제로 비우려면 아래 CACHE 버전(v1)을 올리세요. */
const CACHE = 'nohuplan-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => {})
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 외부 요청은 그대로 통과

  // HTML 문서 요청: 네트워크 우선
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(req).then((r) => r || caches.match('./index.html') || caches.match('./'))
        )
    );
    return;
  }

  // 그 외 자원: 캐시 우선, 없으면 네트워크 후 캐시에 저장
  e.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req)
          .then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached)
    )
  );
});
