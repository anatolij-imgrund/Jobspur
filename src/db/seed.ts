import type { SQLiteDatabase } from 'expo-sqlite';

import { toIsoDate } from '@/lib/dates';
import type { NewApplication, NewStatusEvent, Stage } from '@/types/application';

import { addStatusEvent, createApplication } from './applications';

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toIsoDate(d);
}

type Sample = NewApplication & { stage?: Stage; history?: NewStatusEvent[] };

const base = {
  contactName: null,
  contactEmail: null,
  jobUrl: null,
  notes: null,
} as const;

/**
 * Nur für die Entwicklung: füllt die Liste mit erfundenen Beispielen.
 * Der Verlauf entsteht wie in der echten App: erst „Beworben“ oder
 * „Vorgemerkt“, dann jede Rückmeldung als eigener Eintrag.
 */
export async function insertSampleData(db: SQLiteDatabase): Promise<void> {
  const samples: Sample[] = [
    {
      ...base,
      company: 'Rheinblick Versicherung',
      position: 'Junior Softwareentwickler Java',
      appliedAt: daysAgo(0),
      channel: 'email',
      source: 'own',
      location: 'Düsseldorf',
      contactName: 'Herr Yilmaz',
      notes: 'Auf der Jobmesse am Stand gesprochen. Lebenslauf und Zeugnisse per E-Mail.',
      stage: 'saved',
    },
    {
      ...base,
      company: 'Nordlicht Software GmbH',
      position: 'Junior Frontend-Entwickler (React)',
      appliedAt: daysAgo(1),
      channel: 'portal',
      source: 'own',
      location: 'Köln',
    },
    {
      ...base,
      company: 'Stadtwerke Beispielstadt',
      position: 'Anwendungsentwickler (m/w/d)',
      appliedAt: daysAgo(8),
      channel: 'email',
      source: 'referral',
      location: 'Beispielstadt',
      contactName: 'Frau Berger',
      history: [
        { status: 'confirmed', date: daysAgo(6), note: null },
        { status: 'interview', date: daysAgo(2), note: 'Gespräch per Video', time: '10:00', mode: 'video' },
      ],
    },
    {
      ...base,
      company: 'Fahrwerk Logistik AG',
      position: 'Softwareentwickler C# / .NET',
      appliedAt: daysAgo(9),
      channel: 'email',
      source: 'own',
      location: 'Nürnberg',
      history: [{ status: 'confirmed', date: daysAgo(7), note: null }],
    },
    {
      ...base,
      company: 'Pixelwerk Agentur',
      position: 'Web-Entwickler Next.js',
      appliedAt: daysAgo(15),
      channel: 'portal',
      source: 'own',
      location: 'Remote',
      history: [{ status: 'rejected', date: daysAgo(5), note: 'Absage per E-Mail' }],
    },
    {
      ...base,
      company: 'Brückner Maschinenbau',
      position: 'IT-Fachkraft Anwendungsbetreuung',
      appliedAt: daysAgo(38),
      channel: 'post',
      source: 'referral',
      location: 'Augsburg',
      history: [{ status: 'no_response', date: daysAgo(3), note: null }],
    },
  ];

  for (const { history = [], stage, ...application } of samples) {
    const id = await createApplication(db, application, stage);
    for (const event of history) {
      await addStatusEvent(db, id, event);
    }
  }
}
