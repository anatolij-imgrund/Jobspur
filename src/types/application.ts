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
  /** Nächstes Gespräch ab heute, falls eins geplant ist (nur beim Lesen der Liste). */
  nextInterview?: { date: string; time: string | null } | null;
};

export type NewApplication = Omit<
  Application,
  'id' | 'status' | 'createdAt' | 'updatedAt' | 'nextInterview'
> & { status?: Status };

export const INTERVIEW_MODES = ['onsite', 'video', 'phone'] as const;
export type InterviewMode = (typeof INTERVIEW_MODES)[number];

export const INTERVIEW_MODE_LABELS: Record<InterviewMode, string> = {
  onsite: 'Vor Ort',
  video: 'Video',
  phone: 'Telefon',
};

export type StatusEvent = {
  id: number;
  applicationId: number;
  status: Status;
  /** ISO-Datum */
  date: string;
  note: string | null;
  /** Uhrzeit "HH:MM", nur bei Gesprächen */
  time: string | null;
  /** Art des Gesprächs, nur bei Gesprächen */
  mode: InterviewMode | null;
  /** Ids der geplanten Erinnerungen auf dem Handy */
  reminderIds: string[];
};

export type NewStatusEvent = {
  status: Status;
  date: string;
  note: string | null;
  time?: string | null;
  mode?: InterviewMode | null;
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

/** Endzustände: Danach lässt sich kein weiterer Status setzen. */
export const FINAL_STATUSES: readonly Status[] = ['offer', 'rejected'];

export function isFinal(status: Status): boolean {
  return FINAL_STATUSES.includes(status);
}

/**
 * Welcher Status nach welchem sinnvoll ist. „Eingang bestätigt“ nach einem
 * Gespräch ergibt keinen Sinn; nach „Keine Antwort“ kann sich die Firma
 * aber doch noch melden.
 */
export const NEXT_STATUSES: Record<Status, readonly Status[]> = {
  applied: ['confirmed', 'interview', 'offer', 'rejected', 'no_response'],
  confirmed: ['interview', 'offer', 'rejected', 'no_response'],
  // Nach dem Gespräch kann ein zweites folgen.
  interview: ['interview', 'offer', 'rejected', 'no_response'],
  no_response: ['confirmed', 'interview', 'offer', 'rejected'],
  offer: [],
  rejected: [],
};
