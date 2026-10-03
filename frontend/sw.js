// Keep updates predictable: network handles application files, push handles notices.
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('push', event => {
  let notice={};
  try { notice=event.data?.json() || {}; } catch {}
  event.waitUntil(self.registration.showNotification(notice.title || 'SonoMarzi', {
    body: notice.body || 'You have a new staff notice. Open the app to review it.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'staff-notice-' + Date.now(),
    data: {url: '/#/shared/notices'},
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const existing=windows.find(client=>new URL(client.url).origin===self.location.origin);
    if(existing){await existing.focus();existing.navigate('/#/shared/notices');}
    else await self.clients.openWindow('/#/shared/notices');
  })());
});
