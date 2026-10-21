import { Platform } from 'react-native';

import { formatWeekdayDate } from '@/lib/dates';
import { type NotificationResponse, Notifications } from '@/lib/notifications';
import { INTERVIEW_MODE_LABELS, type InterviewMode } from '@/types/application';

import { reminderSlots, type ReminderSlot } from './reminderTimes';

const CHANNEL_ID = 'termine';

// Erinnerungen auch anzeigen, wenn die App gerade offen ist.
Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Legt den eigenen Android-Kanal an. In Expo Go auf Android schlägt das
 * mit einer NullPointerException im nativen Code fehl; dann nutzen wir
 * den Standardkanal, den Android selbst bereitstellt.
 */
async function createChannel(): Promise<string | undefined> {
  if (!Notifications || Platform.OS !== 'android') return undefined;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Gesprächstermine',
      description: 'Erinnerungen an Vorstellungsgespräche',
      importance: Notifications.AndroidImportance.HIGH,
    });
    return CHANNEL_ID;
  } catch (error) {
    console.warn('Eigener Benachrichtigungskanal nicht möglich, nutze Standardkanal:', error);
    return undefined;
  }
}

/**
 * Fragt nach der Erlaubnis. Auf Android 13+ erscheint die Abfrage erst,
 * wenn ein Kanal existiert, deshalb vorher createChannel().
 */
async function ensurePermission(): Promise<boolean> {
  if (!Notifications) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

type Interview = {
  applicationId: number;
  company: string;
  position: string;
  date: string;
  time: string | null;
  mode: InterviewMode | null;
};

function texts(slot: ReminderSlot, i: Interview): { title: string; body: string } {
  const when = [formatWeekdayDate(i.date), i.time && `${i.time} Uhr`].filter(Boolean).join(', ');
  const how = i.mode ? ` (${INTERVIEW_MODE_LABELS[i.mode]})` : '';
  const body = `${i.company}, ${i.position}`;
  switch (slot.kind) {
    case 'eveningBefore':
      return { title: `Morgen Vorstellungsgespräch${how}`, body: `${when}: ${body}` };
    case 'hourBefore':
      return { title: `In einer Stunde: Gespräch${how}`, body: `${i.time} Uhr: ${body}` };
    case 'morningOf':
      return { title: `Heute Vorstellungsgespräch${how}`, body };
  }
}

export type ReminderResult =
  | { ok: true; ids: string[] }
  | { ok: false; reason: 'unavailable' | 'denied' | 'failed'; ids: string[] };

/**
 * Richtet alle Erinnerungen für ein Gespräch ein.
 *
 * Wirft nie: Der Termin ist zu diesem Zeitpunkt schon gespeichert, und ein
 * Problem mit Erinnerungen darf das Speichern nicht rückgängig erscheinen
 * lassen. Stattdessen sagt das Ergebnis, was passiert ist. Bereits
 * geplante Erinnerungen stehen auch im Fehlerfall in `ids`.
 */
export async function setUpInterviewReminders(
  interview: Interview,
  now = new Date(),
): Promise<ReminderResult> {
  if (!Notifications) return { ok: false, reason: 'unavailable', ids: [] };
  const ids: string[] = [];
  try {
    const channelId = await createChannel();
    if (!(await ensurePermission())) return { ok: false, reason: 'denied', ids };

    for (const slot of reminderSlots(interview.date, interview.time, now)) {
      const { title, body } = texts(slot, interview);
      const id = await Notifications.scheduleNotificationAsync({
        content: { title, body, data: { applicationId: interview.applicationId } },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: slot.at,
          ...(channelId ? { channelId } : {}),
        },
      });
      ids.push(id);
    }
    return { ok: true, ids };
  } catch (error) {
    console.warn('Erinnerung konnte nicht eingerichtet werden:', error);
    return { ok: false, reason: 'failed', ids };
  }
}

/** Sagt geplante Erinnerungen ab. Unbekannte oder schon gezeigte Ids sind kein Fehler. */
export async function cancelReminders(ids: string[]): Promise<void> {
  const api = Notifications;
  if (!api) return;
  await Promise.all(
    ids.map((id) => api.cancelScheduledNotificationAsync(id).catch(() => undefined)),
  );
}

/** Id der Bewerbung aus einer angetippten Erinnerung. */
export function applicationIdFrom(response: NotificationResponse | null | undefined): number | null {
  const id = response?.notification.request.content.data?.applicationId;
  return typeof id === 'number' ? id : null;
}
