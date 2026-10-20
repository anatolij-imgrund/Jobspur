import type { SQLiteDatabase } from 'expo-sqlite';

import { toIsoDate } from '@/lib/dates';
import type { NewApplication } from '@/types/application';

import { createApplication } from './applications';

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toIsoDate(d);
}

/** Nur für die Entwicklung: füllt die Liste mit erfundenen Beispielen. */
export async function insertSampleData(db: SQLiteDatabase): Promise<void> {
  const samples: NewApplication[] = [
    {
      company: 'Nordlicht Software GmbH',
      position: 'Junior Frontend-Entwickler (React)',
      appliedAt: daysAgo(1),
      channel: 'portal',
      source: 'own',
      status: 'applied',
      location: 'Köln',
      contactName: null,
      contactEmail: null,
      jobUrl: null,
      notes: null,
    },
    {
      company: 'Stadtwerke Beispielstadt',
      position: 'Anwendungsentwickler (m/w/d)',
      appliedAt: daysAgo(4),
      channel: 'email',
      source: 'referral',
      status: 'interview',
      location: 'Beispielstadt',
      contactName: 'Frau Berger',
      contactEmail: null,
      jobUrl: null,
      notes: 'Gespräch per Video',
    },
    {
      company: 'Fahrwerk Logistik AG',
      position: 'Softwareentwickler C# / .NET',
      appliedAt: daysAgo(9),
      channel: 'email',
      source: 'own',
      status: 'confirmed',
      location: 'Nürnberg',
      contactName: null,
      contactEmail: null,
      jobUrl: null,
      notes: null,
    },
    {
      company: 'Pixelwerk Agentur',
      position: 'Web-Entwickler Next.js',
      appliedAt: daysAgo(15),
      channel: 'portal',
      source: 'own',
      status: 'rejected',
      location: 'Remote',
      contactName: null,
      contactEmail: null,
      jobUrl: null,
      notes: null,
    },
    {
      company: 'Brückner Maschinenbau',
      position: 'IT-Fachkraft Anwendungsbetreuung',
      appliedAt: daysAgo(38),
      channel: 'post',
      source: 'referral',
      status: 'no_response',
      location: 'Augsburg',
      contactName: null,
      contactEmail: null,
      jobUrl: null,
      notes: null,
    },
  ];

  for (const sample of samples) {
    await createApplication(db, sample);
  }
}
