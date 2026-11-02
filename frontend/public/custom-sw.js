importScripts('./ngsw-worker.js');
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data?.text?.() ?? '' }; }
  event.waitUntil(self.registration.showNotification(data.title || 'Expenses Tracker', { body: data.body || '', icon: '/assets/expenses-tracker-social-card.svg', data: { url: data.url || '/' } }));
});
self.addEventListener('notificationclick', event => { event.notification.close(); event.waitUntil(clients.openWindow(event.notification.data.url)); });
