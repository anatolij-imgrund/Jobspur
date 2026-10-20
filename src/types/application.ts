export const STATUSES = [
  'applied',
  'confirmed',
  'interview',
  'offer',
  'rejected',
  'no_response',
] as const;
export type Status = (typeof STATUSES)[number];

export const CHANNELS = ['email', 'portal', 'post', 'person', 'phone'] as const;
export type Channel = (typeof CHANNELS)[number];

export const SOURCES = ['own', 'referral'] as const;
export type Source = (typeof SOURCES)[number];

export type Application = {
  id: number;
  company: string;
  position: string;
  /** ISO-Datum, z. B. 2026-10-20 */
  appliedAt: string;
  channel: Channel;
  source: Source;
  status: Status;
  location: string | null;
  contactName: string | null;
  contactEmail: string | null;
  jobUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NewApplication = Omit<
  Application,
  'id' | 'status' | 'createdAt' | 'updatedAt'
> & { status?: Status };

export type StatusEvent = {
  id: number;
  applicationId: number;
  status: Status;
  /** ISO-Datum */
  date: string;
  note: string | null;
};

export const STATUS_LABELS: Record<Status, string> = {
  applied: 'Beworben',
  confirmed: 'Eingang bestätigt',
  interview: 'Gespräch',
  offer: 'Zusage',
  rejected: 'Absage',
  no_response: 'Keine Antwort',
};

export const CHANNEL_LABELS: Record<Channel, string> = {
  email: 'E-Mail',
  portal: 'Online-Portal',
  post: 'Post',
  person: 'Persönlich',
  phone: 'Telefon',
};

export const SOURCE_LABELS: Record<Source, string> = {
  own: 'Eigene Suche',
  referral: 'Vermittlungsvorschlag',
};

/** Status, bei denen die Bewerbung noch läuft. */
export const OPEN_STATUSES: readonly Status[] = ['applied', 'confirmed', 'interview'];
