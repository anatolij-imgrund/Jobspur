import type { ReportData } from '@/db/report';
import { formatDate } from '@/lib/dates';
import {
  CHANNEL_LABELS,
  STATUS_LABELS,
  type StatusEvent,
} from '@/types/application';
import { hasPostalAddress, type Profile, type Recipient } from '@/types/profile';

/** A4 bei 72 dpi, so erwartet es expo-print auf Android. */
export const A4 = { width: 595, height: 842 } as const;

type Options = {
  data: ReportData;
  profile: Profile;
  /** null = „Für mich“: ohne Empfänger und Nummern */
  recipient: Recipient | null;
  /** ISO-Datum der Erstellung */
  createdAt: string;
};

/** Jeder Text aus der Datenbank geht hier durch, bevor er ins HTML kommt. */
export function escapeHtml(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** "2026-10-05" → "05.10." */
function shortDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}.${m}.`;
}

/** Ein Eintrag, z. B. „Gespräch 12.10.“ oder „Gespräch 05.11. (geplant)“ */
function eventText(e: StatusEvent, createdAt: string): string {
  const planned = e.status === 'interview' && e.date > createdAt;
  return `${escapeHtml(STATUS_LABELS[e.status])} ${shortDate(e.date)}${planned ? ' (geplant)' : ''}`;
}

/** Alle Rückmeldungen nach „Beworben“, z. B. „Gespräch 12.10., Absage 20.10.“ */
function responseText(events: StatusEvent[], createdAt: string): string {
  const replies = events.filter((e) => e.status !== 'applied');
  if (replies.length === 0) return '<span class="muted">noch offen</span>';
  return replies.map((e) => eventText(e, createdAt)).join('<br>');
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function reportTitle(recipient: Recipient | null): string {
  return recipient ? 'Nachweis der Eigenbemühungen' : 'Bewerbungsübersicht';
}

/** Dateiname ohne Umlaute und Leerzeichen, z. B. Nachweis_Eigenbemuehungen_2026-10-01_2026-10-31.pdf */
export function reportFileName(recipient: Recipient | null, from: string, to: string): string {
  const base = recipient ? 'Nachweis_Eigenbemuehungen' : 'Bewerbungsuebersicht';
  return `${base}_${from}_${to}.pdf`;
}

export type ReportStats = {
  applications: number;
  referrals: number;
  /** Gespräche, die im Zeitraum stattfanden (auch zu früheren Bewerbungen) */
  interviews: number;
  followUps: number;
};

/** Die Zahlen, die oben im Nachweis und in der Vorschau der App stehen. */
export function reportStats({ entries, followUps, from, to }: ReportData): ReportStats {
  const interviewsInEntries = entries.reduce(
    (n, e) =>
      n + e.events.filter((ev) => ev.status === 'interview' && ev.date >= from && ev.date <= to).length,
    0,
  );
  return {
    applications: entries.length,
    referrals: entries.filter((e) => e.application.source === 'referral').length,
    interviews: interviewsInEntries + followUps.filter((f) => f.event.status === 'interview').length,
    followUps: followUps.length,
  };
}

export function renderReport({ data, profile, recipient, createdAt }: Options): string {
  const { entries, followUps, from, to } = data;
  const { referrals, interviews } = reportStats(data);

  const period = `${formatDate(from)} bis ${formatDate(to)}`;
  const title = reportTitle(recipient);
  const asLetter = recipient !== null && hasPostalAddress(recipient);

  const summaryParts = [
    entries.length === 0
      ? 'Im Zeitraum sind keine Bewerbungen eingetragen'
      : `Im Zeitraum ${plural(entries.length, 'Bewerbung', 'Bewerbungen')}`,
  ];
  if (referrals > 0) summaryParts.push(`davon ${referrals} auf Vermittlungsvorschläge`);
  if (interviews > 0) summaryParts.push(plural(interviews, 'Vorstellungsgespräch', 'Vorstellungsgespräche'));
  const summary = `${summaryParts.join(', ')}.`;

  // ── Kopf ──────────────────────────────────────────────────────────
  const senderLines = [profile.name, profile.street, [profile.zip, profile.city].filter(Boolean).join(' ')]
    .filter(Boolean)
    .map(escapeHtml);
  const contactLines = [profile.phone && `Tel. ${profile.phone}`, profile.email]
    .filter(Boolean)
    .map((s) => escapeHtml(s as string));

  const refRows: [string, string][] = [];
  if (recipient?.customerNumber) refRows.push(['Kundennummer', recipient.customerNumber]);
  if (recipient?.bgNumber) refRows.push(['BG-Nummer', recipient.bgNumber]);
  if (recipient?.contactPerson) refRows.push(['Ansprechperson', recipient.contactPerson]);
  refRows.push(['Datum', formatDate(createdAt)]);
  const refBlock = `<table class="ref">${refRows
    .map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`)
    .join('')}</table>`;

  let head: string;
  if (asLetter && recipient) {
    // DIN 5008 Form B: Anschriftfeld 45 mm von oben, 20 mm von links,
    // passt in Fensterumschläge DL und C6/5.
    const returnLine = [profile.name, profile.street, [profile.zip, profile.city].filter(Boolean).join(' ')]
      .filter(Boolean)
      .map(escapeHtml)
      .join(', ');
    const addressLines = [
      recipient.name,
      recipient.contactPerson,
      recipient.street,
      `${recipient.zip ?? ''} ${recipient.city ?? ''}`.trim(),
    ]
      .filter(Boolean)
      .map((s) => escapeHtml(s as string));

    head = `
      <div class="letter-head">
        <div class="sender">${senderLines.join('<br>')}${
          contactLines.length ? `<br><span class="muted">${contactLines.join(' · ')}</span>` : ''
        }</div>
        <div class="window">
          <div class="return">${returnLine}</div>
          <div class="address">${addressLines.join('<br>')}</div>
        </div>
        <div class="info">${refBlock}</div>
      </div>
      <h1 class="subject">${escapeHtml(title)} vom ${period}</h1>
      <p>Sehr geehrte Damen und Herren,</p>
      <p>anbei erhalten Sie meinen Nachweis der Eigenbemühungen für den Zeitraum vom ${period}. ${escapeHtml(summary)}</p>`;
  } else {
    head = `
      <div class="plain-head">
        <div>
          <h1>${escapeHtml(title)}</h1>
          <p class="period">${period}</p>
          ${senderLines.length ? `<p class="who">${senderLines.join('<br>')}</p>` : ''}
          ${recipient ? `<p class="to">An: ${escapeHtml(recipient.name)}</p>` : ''}
        </div>
        ${recipient ? `<div class="info">${refBlock}</div>` : `<p class="created">Stand ${formatDate(createdAt)}</p>`}
      </div>
      <p class="summary">${escapeHtml(summary)}</p>`;
  }

  // ── Tabelle der Bewerbungen ───────────────────────────────────────
  const rows = entries
    .map(({ application: a, events }, i) => {
      const company = [
        `<strong>${escapeHtml(a.company)}</strong>`,
        a.location && escapeHtml(a.location),
        a.contactName && `Ansprechperson: ${escapeHtml(a.contactName)}`,
      ]
        .filter(Boolean)
        .join('<br>');
      const channel = [
        escapeHtml(CHANNEL_LABELS[a.channel]),
        a.source === 'referral' ? '<span class="tag">Vermittlungs&shy;vorschlag</span>' : '',
      ]
        .filter(Boolean)
        .join('<br>');
      return `<tr>
        <td class="num">${i + 1}</td>
        <td class="date">${formatDate(a.appliedAt)}</td>
        <td>${company}</td>
        <td>${escapeHtml(a.position)}</td>
        <td>${channel}</td>
        <td>${responseText(events, createdAt)}</td>
      </tr>`;
    })
    .join('');

  const table =
    entries.length === 0
      ? ''
      : `<table class="list">
          <colgroup>
            <col style="width:5%"><col style="width:12%"><col style="width:25%">
            <col style="width:23%"><col style="width:16%"><col style="width:19%">
          </colgroup>
          <thead><tr>
            <th>Nr.</th><th>Datum</th><th>Unternehmen</th><th>Stelle</th>
            <th>Bewerbungs&shy;weg</th><th>Rückmeldung</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>`;

  // ── Rückmeldungen zu älteren Bewerbungen ──────────────────────────
  const followUpTable =
    followUps.length === 0
      ? ''
      : `<h2>Rückmeldungen im Zeitraum zu früheren Bewerbungen</h2>
         <table class="list">
          <colgroup>
            <col style="width:12%"><col style="width:29%"><col style="width:27%">
            <col style="width:16%"><col style="width:16%">
          </colgroup>
          <thead><tr>
            <th>Datum</th><th>Unternehmen</th><th>Stelle</th><th>Rückmeldung</th><th>Beworben am</th>
          </tr></thead>
          <tbody>${followUps
            .map(
              ({ application: a, event }) => `<tr>
                <td class="date">${formatDate(event.date)}</td>
                <td><strong>${escapeHtml(a.company)}</strong>${a.location ? `<br>${escapeHtml(a.location)}` : ''}</td>
                <td>${escapeHtml(a.position)}</td>
                <td>${eventText(event, createdAt)}</td>
                <td class="date">${formatDate(a.appliedAt)}</td>
              </tr>`,
            )
            .join('')}</tbody>
         </table>`;

  // ── Abschluss ─────────────────────────────────────────────────────
  const place = profile.city ? `${escapeHtml(profile.city)}, ` : '';
  const closing = recipient
    ? `${asLetter ? '<p class="regards">Mit freundlichen Grüßen</p>' : ''}
       <div class="signature">
         <div><span class="line">${place}${formatDate(createdAt)}</span><span class="caption">Ort, Datum</span></div>
         <div><span class="line">&nbsp;</span><span class="caption">Unterschrift${profile.name ? ` ${escapeHtml(profile.name)}` : ''}</span></div>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 20mm 20mm 18mm 25mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: "Helvetica Neue", Helvetica, Arial, "Roboto", sans-serif;
    font-size: 9.5pt; line-height: 1.38; color: #16211E;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  p { margin: 0 0 3mm; }
  .muted { color: #5F6F6A; }
  h1 { font-size: 15pt; line-height: 1.2; margin: 0; font-weight: 700; }
  h2 { font-size: 10.5pt; margin: 8mm 0 2.5mm; }

  /* Brief nach DIN 5008 Form B. Ursprung = obere linke Ecke des Satzspiegels
     (25 mm von links, 20 mm von oben). */
  .letter-head { position: relative; height: 80mm; }
  .sender { position: absolute; top: 0; right: 0; text-align: right; font-size: 8.5pt; line-height: 1.4; }
  .window { position: absolute; top: 25mm; left: -5mm; width: 85mm; height: 45mm; }
  .return { position: absolute; top: 12.7mm; left: 5mm; right: 5mm; font-size: 6.5pt; color: #5F6F6A;
            border-bottom: 0.3pt solid #9AA8A3; padding-bottom: 0.6mm; white-space: nowrap; overflow: hidden; }
  .address { position: absolute; top: 17.7mm; left: 5mm; right: 5mm; font-size: 10pt; line-height: 1.35; }
  .info { position: absolute; top: 30mm; left: 100mm; right: 0; }
  .plain-head .info { position: static; }
  .subject { font-size: 11pt; margin: 0 0 6mm; }

  .plain-head { display: flex; justify-content: space-between; gap: 10mm; margin-bottom: 6mm; }
  .period { font-size: 11pt; margin: 1.5mm 0 4mm; }
  .who, .to { font-size: 9pt; margin: 0 0 1.5mm; }
  .created { font-size: 8.5pt; color: #5F6F6A; white-space: nowrap; }
  .summary { margin-bottom: 4mm; }

  table.ref { border-collapse: collapse; font-size: 8.5pt; }
  table.ref th { text-align: left; font-weight: 400; color: #5F6F6A; padding: 0 4mm 0.8mm 0; white-space: nowrap; vertical-align: top; }
  table.ref td { padding: 0 0 0.8mm; font-weight: 600; }

  table.list { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 8.5pt; }
  table.list thead { display: table-header-group; }
  table.list th { text-align: left; font-weight: 600; padding: 1.6mm 1.8mm; border-bottom: 0.8pt solid #16211E; vertical-align: bottom; hyphens: manual; }
  table.list th:last-child, table.list td:last-child { padding-right: 0; }
  table.list th:first-child, table.list td:first-child { padding-left: 0; }
  table.list td { padding: 1.8mm; border-bottom: 0.4pt solid #C9D3CF; vertical-align: top; overflow-wrap: break-word; hyphens: auto; -webkit-hyphens: auto; }
  table.list tr { page-break-inside: avoid; break-inside: avoid; }
  td.num { color: #5F6F6A; }
  td.date { white-space: nowrap; }
  .tag { display: inline-block; margin-top: 0.6mm; padding: 0.2mm 1.4mm; border-radius: 1mm;
         background: #E1EEE9; color: #1F6B57; font-size: 7.5pt; font-weight: 600; }

  .regards { margin-top: 8mm; }
  .signature { display: flex; gap: 12mm; margin-top: 14mm; page-break-inside: avoid; break-inside: avoid; }
  .signature > div { flex: 1; display: flex; flex-direction: column; }
  .signature .line { border-bottom: 0.5pt solid #16211E; padding-bottom: 1mm; min-height: 6mm; }
  .signature .caption { font-size: 7.5pt; color: #5F6F6A; margin-top: 1mm; }
  .footer { margin-top: 10mm; font-size: 7pt; color: #9AA8A3; }
</style>
</head>
<body>
  ${head}
  ${table}
  ${followUpTable}
  ${closing}
  <p class="footer">Erstellt am ${formatDate(createdAt)} mit der App Bewerbungstracker.</p>
</body>
</html>`;
}
