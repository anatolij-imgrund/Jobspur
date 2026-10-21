/**
 * Schmaler Zugang zu expo-notifications, nur für lokale Erinnerungen.
 *
 * Warum nicht einfach `import * as Notifications from 'expo-notifications'`?
 * Der Einstieg des Pakets lädt sofort auch die Push-Funktionen (Topics,
 * Push-Token). Deren native Module fehlen in Expo Go auf Android, und der
 * Import bricht mit „Cannot find native module 'ExpoTopicSubscriptionModule'“
 * die ganze App ab. Deshalb laden wir hier nur die Teile, die wir brauchen.
 *
 * Fehlt trotzdem etwas, läuft die App weiter, nur ohne Erinnerungen
 * (`notificationsAvailable` ist dann false).
 *
 * Mit einem Development Build kann man auf den normalen Import zurückwechseln.
 */
import type * as Cancel from 'expo-notifications/build/cancelScheduledNotificationAsync';
import type * as ChannelTypes from 'expo-notifications/build/NotificationChannelManager.types';
import type * as Permissions from 'expo-notifications/build/NotificationPermissions';
import type * as Types from 'expo-notifications/build/Notifications.types';
import type * as Emitter from 'expo-notifications/build/NotificationsEmitter';
import type * as Handler from 'expo-notifications/build/NotificationsHandler';
import type * as Schedule from 'expo-notifications/build/scheduleNotificationAsync';
import type * as Channel from 'expo-notifications/build/setNotificationChannelAsync';

export type { NotificationResponse } from 'expo-notifications/build/Notifications.types';

type Api = typeof Emitter &
  typeof Handler &
  typeof Permissions &
  typeof Channel &
  typeof Schedule &
  typeof Cancel & {
    AndroidImportance: typeof ChannelTypes.AndroidImportance;
    SchedulableTriggerInputTypes: typeof Types.SchedulableTriggerInputTypes;
  };

function load(): Api | null {
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    return {
      ...require('expo-notifications/build/NotificationsEmitter'),
      ...require('expo-notifications/build/NotificationsHandler'),
      ...require('expo-notifications/build/NotificationPermissions'),
      ...require('expo-notifications/build/setNotificationChannelAsync'),
      ...require('expo-notifications/build/scheduleNotificationAsync'),
      ...require('expo-notifications/build/cancelScheduledNotificationAsync'),
      AndroidImportance: require('expo-notifications/build/NotificationChannelManager.types')
        .AndroidImportance,
      SchedulableTriggerInputTypes: require('expo-notifications/build/Notifications.types')
        .SchedulableTriggerInputTypes,
    };
    /* eslint-enable @typescript-eslint/no-require-imports */
  } catch (error) {
    console.warn('Erinnerungen sind hier nicht verfügbar:', error);
    return null;
  }
}

export const Notifications = load();
export const notificationsAvailable = Notifications !== null;
