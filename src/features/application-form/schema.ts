import { z } from 'zod';

import { toIsoDate } from '@/lib/dates';
import {
  CHANNELS,
  SOURCES,
  type Application,
  type NewApplication,
} from '@/types/application';

/** Freitext, der leer bleiben darf. */
const optionalText = (max: number) =>
  z.string().trim().max(max, `Höchstens ${max} Zeichen`);

export const applicationFormSchema = z.object({
  company: z
    .string()
    .trim()
    .min(1, 'Bitte die Firma eintragen')
    .max(120, 'Höchstens 120 Zeichen'),
  position: z
    .string()
    .trim()
    .min(1, 'Bitte die Stelle eintragen')
    .max(160, 'Höchstens 160 Zeichen'),
  appliedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Bitte ein Datum wählen')
    .refine((iso) => iso <= toIsoDate(new Date()), 'Das Datum liegt in der Zukunft'),
  channel: z.enum(CHANNELS, 'Bitte den Bewerbungsweg wählen'),
  source: z.enum(SOURCES, 'Bitte die Quelle wählen'),
  location: optionalText(120),
  contactName: optionalText(120),
  // Erst Leerzeichen entfernen, dann prüfen: Tastatur-Vorschläge hängen oft eins an.
  contactEmail: z
    .string()
    .trim()
    .pipe(z.union([z.literal(''), z.email('Diese E-Mail-Adresse sieht nicht vollständig aus')])),
  jobUrl: optionalText(500),
  notes: optionalText(2000),
});

export type ApplicationFormValues = z.infer<typeof applicationFormSchema>;

export function emptyFormValues(): ApplicationFormValues {
  return {
    company: '',
    position: '',
    appliedAt: toIsoDate(new Date()),
    channel: 'email',
    source: 'own',
    location: '',
    contactName: '',
    contactEmail: '',
    jobUrl: '',
    notes: '',
  };
}

/** Bestehende Bewerbung → Formularwerte (zum Bearbeiten). */
export function toFormValues(app: Application): ApplicationFormValues {
  return {
    company: app.company,
    position: app.position,
    appliedAt: app.appliedAt,
    channel: app.channel,
    source: app.source,
    location: app.location ?? '',
    contactName: app.contactName ?? '',
    contactEmail: app.contactEmail ?? '',
    jobUrl: app.jobUrl ?? '',
    notes: app.notes ?? '',
  };
}

/** Formularwerte → Datensatz; leere optionale Felder werden zu null. */
export function toNewApplication(values: ApplicationFormValues): NewApplication {
  const orNull = (s: string) => (s.trim() === '' ? null : s.trim());
  return {
    company: values.company.trim(),
    position: values.position.trim(),
    appliedAt: values.appliedAt,
    channel: values.channel,
    source: values.source,
    location: orNull(values.location),
    contactName: orNull(values.contactName),
    contactEmail: orNull(values.contactEmail),
    jobUrl: orNull(values.jobUrl),
    notes: orNull(values.notes),
  };
}
