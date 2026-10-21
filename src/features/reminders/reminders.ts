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
 * Legt den Android-Kanal an und fragt nach der Erlaubnis.
 * Auf Android 13+ erscheint die Abfrage erst, wenn ein Kanal existiert.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!Notifications) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Gesprächstermine',
      description: 'Erinnerungen an Vorstellungsgespräche',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
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

/** Plant die Erinnerungen und gibt ihre Ids zurück (zum späteren Absagen). */
export async function scheduleInterviewReminders(
  interview: Interview,
  now = new Date(),
): Promise<string[]> {
  if (!Notifications) return [];
  const ids: string[] = [];
  for (const slot of reminderSlots(interview.date, interview.time, now)) {
    const { title, body } = texts(slot, interview);
    const id = await Notifications.scheduleNotificationAsync({
      content: { title, body, data: { applicationId: interview.applicationId } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: slot.at,
        channelId: CHANNEL_ID,
      },
    });
    ids.push(id);
  }
  return ids;
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
