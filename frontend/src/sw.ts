// The service worker handles staff notices; application files use the network.
const worker = self as unknown as ServiceWorkerGlobalScope;
const noticesUrl = '/#/shared/notices';

type NoticePayload = { title?: string; body?: string };

function noticePayload(event: PushEvent): NoticePayload {
  try {
    const value: unknown = event.data?.json();
    if (value && typeof value === 'object') {
      const payload = value as Record<string, unknown>;
      return {
        title: typeof payload.title === 'string' ? payload.title : undefined,
        body: typeof payload.body === 'string' ? payload.body : undefined,
      };
    }
  } catch { /* An empty or malformed push still gets a generic notice. */ }
  return {};
}

worker.addEventListener('install', event => event.waitUntil(worker.skipWaiting()));
worker.addEventListener('activate', event => event.waitUntil(worker.clients.claim()));
worker.addEventListener('push', event => {
  const notice = noticePayload(event);
  event.waitUntil(worker.registration.showNotification(notice.title || 'SonoMarzi', {
    body: notice.body || 'You have a new staff notice. Open the app to review it.',
    icon: '/icons/icon.svg',
    badge: '/icons/icon.svg',
    tag: `staff-notice-${Date.now()}`,
    data: { url: noticesUrl },
  }));
});
worker.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await worker.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find(client => new URL(client.url).origin === worker.location.origin);
    if (existing) {
      await existing.focus();
      await existing.navigate(noticesUrl);
    } else {
      await worker.clients.openWindow(noticesUrl);
    }
  })());
});
