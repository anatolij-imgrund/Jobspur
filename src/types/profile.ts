/** Deine eigenen Angaben für den Kopf des Nachweises. */
export type Profile = {
  name: string;
  street: string;
  zip: string;
  city: string;
  email: string;
  phone: string;
};

export const EMPTY_PROFILE: Profile = {
  name: '',
  street: '',
  zip: '',
  city: '',
  email: '',
  phone: '',
};

export const RECIPIENT_KINDS = ['agentur', 'jobcenter', 'other'] as const;
export type RecipientKind = (typeof RECIPIENT_KINDS)[number];

export const RECIPIENT_KIND_LABELS: Record<RecipientKind, string> = {
  agentur: 'Agentur für Arbeit',
  jobcenter: 'Jobcenter',
  other: 'Andere Stelle',
};

/** Eine Stelle, an die du Nachweise schickst. */
export type Recipient = {
  id: number;
  kind: RecipientKind;
  /** z. B. „Jobcenter Köln“ */
  name: string;
  customerNumber: string | null;
  /** Nummer der Bedarfsgemeinschaft, nur beim Jobcenter */
  bgNumber: string | null;
  /** Vermittler oder Ansprechperson dort */
  contactPerson: string | null;
  street: string | null;
  zip: string | null;
  city: string | null;
};

export type NewRecipient = Omit<Recipient, 'id'>;

/** Mit Anschrift wird der Nachweis als Brief für einen Fensterumschlag gesetzt. */
export function hasPostalAddress(r: Recipient): boolean {
  return !!(r.street && r.zip && r.city);
}
