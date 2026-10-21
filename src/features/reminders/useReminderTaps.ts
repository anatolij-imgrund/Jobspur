import { router } from 'expo-router';
import { useEffect } from 'react';

import { type NotificationResponse, Notifications } from '@/lib/notifications';

import { applicationIdFrom } from './reminders';

/**
 * Öffnet die passende Bewerbung, wenn eine Erinnerung angetippt wird:
 * sowohl bei laufender App als auch, wenn die App erst dadurch startet.
 */
export function useReminderTaps() {
  useEffect(() => {
    const api = Notifications;
    if (!api) return;

    const open = (response: NotificationResponse | null) => {
      const id = applicationIdFrom(response);
      if (id !== null) {
        router.push({ pathname: '/bewerbung/[id]', params: { id: String(id) } });
      }
    };

    // App wurde durch das Antippen gestartet
    open(api.getLastNotificationResponse());
    api.clearLastNotificationResponse();

    const subscription = api.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, []);
}
