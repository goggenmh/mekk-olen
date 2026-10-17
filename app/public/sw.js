// Service worker for push-varsel. Ingen offline-mellomlagring: appen treng
// uansett kontakt med Supabase, og mellomlagra sider kunne vist gamle data.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = { title: 'MEKK Ølen', body: '', url: '/' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    if (event.data) data.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/assets/icon-192.png',
      badge: '/assets/icon-192.png',
      data: { url: data.url || '/' },
    })
  );
});

// Trykk på varselet: opne appen på sida varselet gjeld (url: '/?vis=vaktplan').
// Er appen open frå før, hentar vi ho fram og ber ho byte side.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  const vis = new URL(url, self.location.origin).searchParams.get('vis');
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((vindauge) => {
      const ope = vindauge.find((c) => c.url.startsWith(self.location.origin));
      if (ope) {
        if (vis) ope.postMessage({ type: 'naviger', vis });
        return ope.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
