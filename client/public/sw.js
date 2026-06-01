self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'RoyaleMY', body: 'You have a new notification!' };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'RoyaleMY', {
      body: data.body || '',
      icon: '/royalemy.png',
      badge: '/royalemy.png',
      tag: data.tag || 'default',
      requireInteraction: false,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/tournaments')
  );
});
