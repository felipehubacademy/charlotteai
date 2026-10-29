// Service worker do /admin (PWA da gestão): recebe os alertas por push e abre a tela certa ao tocar.
// Sem cache offline: o painel sempre lê dados ao vivo.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data && event.data.text() }; }
  const title = data.title || 'Queizy Gestão';
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || '',
    icon: '/admin-pwa/icon-192.png',
    badge: '/admin-pwa/icon-192.png',
    tag: data.tag || undefined,
    data: { url: data.url || '/admin' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/admin';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (c.url.includes('/admin')) { await c.focus(); if ('navigate' in c) await c.navigate(url); return; }
    }
    await self.clients.openWindow(url);
  })());
});
