import { z } from 'zod';

import {
  type NewRecipient,
  type Profile,
  type Recipient,
  RECIPIENT_KIND_LABELS,
  RECIPIENT_KINDS,
} from '@/types/profile';

const text = (max: number) => z.string().trim().max(max, `Höchstens ${max} Zeichen`);

const zip = z
  .string()
  .trim()
  .refine((v) => v === '' || /^\d{5}$/.test(v), 'Die Postleitzahl hat fünf Ziffern');

const email = z
  .string()
  .trim()
  .pipe(z.union([z.literal(''), z.email('Diese E-Mail-Adresse sieht nicht vollständig aus')]));

// ── Deine Angaben ───────────────────────────────────────────────────

export const profileSchema = z.object({
  name: text(120),
  street: text(120),
  zip,
  city: text(80),
  email,
  phone: text(40),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

export function toProfile(values: ProfileFormValues): Profile {
  return { ...values };
}

// ── Empfänger ───────────────────────────────────────────────────────

export const recipientSchema = z
  .object({
    kind: z.enum(RECIPIENT_KINDS, 'Bitte die Art der Stelle wählen'),
    name: text(120).min(1, 'Bitte einen Namen eintragen, z. B. Jobcenter Köln'),
    customerNumber: text(40),
    bgNumber: text(40),
    contactPerson: text(120),
    street: text(120),
    zip,
    city: text(80),
  })
  .superRefine((v, ctx) => {
    // Eine halbe Anschrift hilft niemandem: entweder ganz oder gar nicht.
    const parts = { street: v.street, zip: v.zip, city: v.city };
    const filled = Object.values(parts).filter((p) => p !== '').length;
    if (filled > 0 && filled < 3) {
      const labels = { street: 'die Straße', zip: 'die PLZ', city: 'den Ort' };
      for (const [key, value] of Object.entries(parts)) {
        if (value === '') {
          ctx.addIssue({
            code: 'custom',
            path: [key],
            message: `Für den Brief fehlt noch ${labels[key as keyof typeof labels]}`,
          });
        }
      }
    }
  });

export type RecipientFormValues = z.infer<typeof recipientSchema>;

export function emptyRecipientValues(): RecipientFormValues {
  return {
    kind: 'agentur',
    name: RECIPIENT_KIND_LABELS.agentur,
    customerNumber: '',
    bgNumber: '',
    contactPerson: '',
    street: '',
    zip: '',
    city: '',
  };
}

export function toRecipientValues(r: Recipient): RecipientFormValues {
  return {
    kind: r.kind,
    name: r.name,
    customerNumber: r.customerNumber ?? '',
    bgNumber: r.bgNumber ?? '',
    contactPerson: r.contactPerson ?? '',
    street: r.street ?? '',
    zip: r.zip ?? '',
    city: r.city ?? '',
  };
}

export function toNewRecipient(v: RecipientFormValues): NewRecipient {
  const orNull = (s: string) => (s.trim() === '' ? null : s.trim());
  return {
    kind: v.kind,
    name: v.name.trim(),
    customerNumber: orNull(v.customerNumber),
    bgNumber: v.kind === 'jobcenter' ? orNull(v.bgNumber) : null,
    contactPerson: orNull(v.contactPerson),
    street: orNull(v.street),
    zip: orNull(v.zip),
    city: orNull(v.city),
  };
}
