import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { applicationIdFrom } from './reminders';

/**
 * Öffnet die passende Bewerbung, wenn eine Erinnerung angetippt wird:
 * sowohl bei laufender App als auch, wenn die App erst dadurch startet.
 */
export function useReminderTaps() {
  useEffect(() => {
    const open = (response: Notifications.NotificationResponse | null) => {
      const id = applicationIdFrom(response);
      if (id !== null) {
        router.push({ pathname: '/bewerbung/[id]', params: { id: String(id) } });
      }
    };

    // App wurde durch das Antippen gestartet
    open(Notifications.getLastNotificationResponse());
    Notifications.clearLastNotificationResponse();

    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, []);
}
