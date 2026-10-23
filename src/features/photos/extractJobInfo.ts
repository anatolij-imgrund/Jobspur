/**
 * Errät aus dem Text einer fotografierten Stellenanzeige Firma, Stelle, Ort
 * und Kontakt. Das sind Vorschläge: Die App trägt sie nur in leere Felder
 * ein, und man prüft sie vor dem Speichern.
 *
 * Reine Funktionen ohne React Native, damit sie sich in Node testen lassen.
 */

export type OcrLine = { text: string; top: number; height: number; block?: number };

export type JobInfo = {
  company?: string;
  position?: string;
  location?: string;
  contactName?: string;
  contactEmail?: string;
  jobUrl?: string;
};

// Rechtsformen am Ende eines Firmennamens, z. B. „Muster GmbH & Co. KG“
const LEGAL_FORM =
  /\b(gGmbH|GmbH(?:\s*&\s*Co\.?\s*KG(?:aA)?)?|mbH|AG|SE|KGaA|KG|OHG|UG(?:\s*\(haftungsbeschränkt\))?|e\.\s?V\.|eG|AöR|Inc\.?|Ltd\.?|LLC)(?=$|[\s,.;:)])/;

// Geschlechterangabe hinter dem Stellentitel: (m/w/d), (w/m/d), (all genders) …
const GENDER =
  /\(\s*(?:[mwdfx]\s*[/|,]\s*[mwdfx](?:\s*[/|,]\s*[mwdfx])?|all genders?|alle|gn\*?)\s*\)|\b[mwdf]\/[mwdf]\/[mwdfx]\b/i;

const JOB_WORDS =
  /(entwickler|developer|engineer|informatiker|programmierer|administrator|admin\b|architekt|consultant|berater|analyst|manager|leiter|sachbearbeiter|kauf(mann|frau|leute)|techniker|mechatroniker|elektroniker|mitarbeiter|fachkraft|referent|assistenz|support|tester|designer|werkstudent|praktikum|praktikant|ausbildung|azubi|trainee|junior|senior)/i;

// Zeilen, die sicher keine Stelle oder Firma sind
const NOISE =
  /^(wir suchen|wir bieten|deine aufgaben|ihre aufgaben|aufgaben|dein profil|ihr profil|profil|benefits|bewirb dich|jetzt bewerben|kontakt|standort|über uns|stellenangebot|zur verstärkung|ab sofort|in vollzeit|vollzeit|teilzeit)\b/i;

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}/i;
const URL = /\b(?:https?:\/\/|www\.)[^\s,;]+/i;
const CONTACT = /\b(Frau|Herr|Fr\.|Hr\.)\s+(?:Dr\.\s+)?([A-ZÄÖÜ][a-zäöüß-]+(?:\s+[A-ZÄÖÜ][a-zäöüß-]+)?)/;
const ZIP_CITY = /\b\d{5}\s+([A-ZÄÖÜ][a-zäöüß.-]+(?:[\s-](?:am|an der|im|bei|a\.\s?d\.|[A-ZÄÖÜ][a-zäöüß.-]+))*)/;
const LOCATION_LABEL = /\b(?:standort|arbeitsort|einsatzort|dienstort|ort)\s*[:：]\s*(.+)/i;
const REMOTE = /\b(remote|home-?office|mobiles arbeiten)\b/i;

const clean = (s: string) =>
  s
    .replace(/\s+/g, ' ')
    .replace(/^[\s•·\-–—*|:]+|[\s•·\-–—*|:,]+$/g, '')
    .trim();

const isTooLong = (s: string, max: number) => s.length > max;

/** Stellentitel: Zeile mit (m/w/d), sonst die größte Zeile mit einem Berufswort. */
function findPosition(lines: OcrLine[]): string | undefined {
  for (let i = 0; i < lines.length; i++) {
    const text = clean(lines[i].text);
    if (!GENDER.test(text)) continue;
    // „(m/w/d)“ allein in einer Zeile gehört zur Zeile darüber.
    const onlyGender = clean(text.replace(GENDER, '')) === '';
    const title = onlyGender && i > 0 ? `${clean(lines[i - 1].text)} ${text}` : text;
    if (!isTooLong(title, 160)) return clean(title);
  }
  const candidates = lines
    .map((l) => ({ ...l, text: clean(l.text) }))
    .filter((l) => JOB_WORDS.test(l.text) && !NOISE.test(l.text) && !LEGAL_FORM.test(l.text))
    .filter((l) => l.text.split(' ').length <= 8)
    .sort((a, b) => b.height - a.height || a.top - b.top);
  return candidates[0]?.text;
}

/** Firma: erste Zeile mit Rechtsform, ohne Satz drumherum. */
function findCompany(lines: OcrLine[]): string | undefined {
  for (const line of lines) {
    const text = clean(line.text);
    const match = LEGAL_FORM.exec(text);
    if (!match) continue;
    // Bis einschließlich Rechtsform; davor stehende Füllwörter weg.
    let words = clean(text.slice(0, match.index + match[0].length)).split(' ');
    // In einem langen Satz nur die letzten Wörter vor der Rechtsform nehmen,
    // dann führende kleingeschriebene Wörter weg („die“, „sucht“, „bei der“).
    if (words.length > 6) words = words.slice(-5);
    const filler = /^(?:[a-zäöü].*|Die|Der|Das|Bei|Wir)$/;
    while (words.length > 2 && filler.test(words[0])) words = words.slice(1);
    const name = words.join(' ');
    if (name.length >= 3 && !isTooLong(name, 120)) return name;
  }
  return undefined;
}

function findLocation(lines: OcrLine[]): string | undefined {
  for (const line of lines) {
    const label = LOCATION_LABEL.exec(line.text);
    if (label) {
      const value = clean(label[1]);
      if (value && !isTooLong(value, 80)) return value;
    }
  }
  for (const line of lines) {
    const zip = ZIP_CITY.exec(line.text);
    if (zip) return clean(zip[1]);
  }
  const remote = lines.find((l) => REMOTE.test(l.text));
  return remote ? 'Remote' : undefined;
}

/** Zeilen in Lesereihenfolge: Erkennung liefert sie blockweise. */
export function extractJobInfo(input: readonly OcrLine[]): JobInfo {
  const lines = input.filter((l) => clean(l.text) !== '');
  const all = lines.map((l) => l.text).join('\n');

  const info: JobInfo = {
    company: findCompany(lines),
    position: findPosition(lines),
    location: findLocation(lines),
    contactName: CONTACT.exec(all)?.[0].replace(/^Fr\./, 'Frau').replace(/^Hr\./, 'Herr'),
    contactEmail: EMAIL.exec(all)?.[0].toLowerCase(),
    jobUrl: URL.exec(all)?.[0].replace(/[.)]+$/, ''),
  };
  // Nur gefundene Felder zurückgeben
  return Object.fromEntries(Object.entries(info).filter(([, v]) => v)) as JobInfo;
}
