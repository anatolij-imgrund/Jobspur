/**
 * Errät aus dem Text einer fotografierten Stellenanzeige Firma, Stelle, Ort
 * und Kontakt. Das sind Vorschläge: Die App trägt sie nur in leere Felder
 * ein, und man prüft sie vor dem Speichern.
 *
 * Reine Funktionen ohne React Native, damit sie sich in Node testen lassen.
 */

export type OcrLine = {
  text: string;
  top: number;
  height: number;
  /** Linke Kante; fehlt sie, gilt jede Zeile als bündig */
  left?: number;
  block?: number;
};

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

/**
 * Symbole vor einer Zeile (Pin beim Ort, Haus bei der Firma) liest die
 * Erkennung oft als Zeichen: „9 Regensburg“, „H Ferchau GmbH“, „Hi Hallo …“.
 * Ein einzelnes Zeichen vorn fällt immer weg, zwei Zeichen nur, wenn das
 * Wort danach auch anderswo auf der Anzeige steht.
 */
function stripIcon(text: string, everything: string): string {
  let words = clean(text).split(' ');
  while (words.length > 1) {
    const [first, next] = words;
    const symbol = !/[\p{L}\p{N}]/u.test(first);
    const single = first.length === 1;
    const short = first.length === 2 && /^[A-ZÄÖÜ]/.test(next) &&
      everything.toLowerCase().split(next.toLowerCase()).length > 2;
    if (!(symbol || single || short)) break;
    words = words.slice(1);
  }
  return words.join(' ');
}

/**
 * Kann `other` eine weitere Zeile derselben Überschrift sein wie `line`?
 * Ähnlich groß, links bündig (sonst z. B. die Nachbarkarte auf dem Foto)
 * und kein Satz, keine Rubrik, keine Firma.
 */
function sameHeading(line: OcrLine, other: OcrLine): boolean {
  if (other.height < line.height * 0.7 || other.height > line.height * 1.4) return false;
  if (line.left !== undefined && other.left !== undefined) {
    if (Math.abs(line.left - other.left) > line.height * 1.5) return false;
  }
  const text = clean(other.text);
  if (GENDER.test(text) || NOISE.test(text) || LEGAL_FORM.test(text)) return false;
  // Einleitende Sätze („… suchen wir:“) und Satzenden gehören nicht zum Titel.
  return !/\b(suchen|sucht|wir)\b\W*$/i.test(other.text) && !/[.:!?]\s*$/.test(other.text);
}

/** Abstand zur nächsten Zeile: mindestens eine halbe, höchstens knapp zwei Zeilen. */
const lineGap = (upper: OcrLine, lower: OcrLine) =>
  lower.top - upper.top >= lower.height * 0.5 && lower.top - upper.top <= lower.height * 1.8;

function lineAbove(line: OcrLine, lines: readonly OcrLine[]): OcrLine | undefined {
  return lines
    .filter((l) => l !== line && lineGap(l, line) && sameHeading(line, l))
    .sort((a, b) => b.top - a.top)[0];
}

/** Deutlich größer als der übliche Text auf dem Foto? */
function isHeading(line: OcrLine, lines: readonly OcrLine[]): boolean {
  const heights = lines.map((l) => l.height).sort((a, b) => a - b);
  const median = heights[Math.floor(heights.length / 2)] ?? line.height;
  return line.height >= median * 1.3;
}

function lineBelow(line: OcrLine, lines: readonly OcrLine[]): OcrLine | undefined {
  return lines
    .filter((l) => l !== line && lineGap(line, l) && sameHeading(line, l))
    .sort((a, b) => a.top - b.top)[0];
}

/** Zwei Zeilen eines Titels zusammenfügen, auch mit Silbentrennung. */
function joinTitle(upper: string, lower: string): string {
  if (/\s[-–]$/.test(upper)) return `${upper} ${lower}`;
  if (/\p{L}-$/u.test(upper)) {
    return /^[a-zäöüß]/.test(lower) ? upper.slice(0, -1) + lower : upper + lower;
  }
  return `${upper} ${lower}`;
}

/** Der Titel und seine unterste Zeile; darunter steht oft der Ort. */
type Position = { text: string; line: OcrLine };

/** Stellentitel: Zeile mit (m/w/d) samt Zeilen darüber, sonst größte Zeile mit Berufswort. */
function findPosition(lines: OcrLine[]): Position | undefined {
  for (const line of lines) {
    if (!GENDER.test(line.text)) continue;
    let title = clean(line.text);
    let current = line;
    // Überschriften über zwei oder drei Zeilen; ein Logo darüber ist weiter weg.
    for (let i = 0; i < 2; i++) {
      const above = lineAbove(current, lines);
      if (!above) break;
      // Bindestrich am Ende behalten: Er entscheidet, wie die Zeilen zusammengehören.
      const upper = above.text.replace(/\s+/g, ' ').replace(/^[\s•·*|:]+/, '').trim();
      title = joinTitle(upper, title);
      current = above;
    }
    // … und selten eine Zeile darunter: „C# Softwareentwickler (m/w/x)“ / „Maschinensoftware“.
    // Nur bei echten Überschriften, sonst landet z. B. „Köln, unbefristet“ im Titel.
    const below = isHeading(line, lines) ? lineBelow(line, lines) : undefined;
    if (below) title = `${title} ${clean(below.text)}`;
    if (!isTooLong(title, 160)) return { text: clean(title), line: below ?? line };
  }
  const candidate = lines
    .map((l) => ({ line: l, text: clean(l.text) }))
    .filter(({ text }) => JOB_WORDS.test(text) && !NOISE.test(text) && !LEGAL_FORM.test(text))
    .filter(({ text }) => text.split(' ').length <= 8)
    .sort((a, b) => b.line.height - a.line.height || a.line.top - b.line.top)[0];
  return candidate;
}

/** Firma: erste Zeile mit Rechtsform, ohne Satz drumherum und ohne Symbol davor. */
function findCompany(lines: OcrLine[], everything: string): string | undefined {
  for (const line of lines) {
    const text = stripIcon(line.text, everything);
    const match = LEGAL_FORM.exec(text);
    if (!match) continue;
    let words = clean(text.slice(0, match.index + match[0].length)).split(' ');
    // In einem langen Satz nur die letzten Wörter vor der Rechtsform nehmen,
    // dann führende kleingeschriebene Wörter weg („die“, „sucht“, „bei der“).
    if (words.length > 6) words = words.slice(-5);
    const filler = /^(?:[a-zäöü].*|Die|Der|Das|Bei|Wir)$/;
    while (words.length > 2 && filler.test(words[0])) words = words.slice(1);
    // Nur „GmbH“ (z. B. aus dem Logo) ist kein Firmenname.
    if (words.length < 2) continue;
    const name = words.join(' ');
    if (name.length >= 3 && !isTooLong(name, 120)) return name;
  }
  return undefined;
}

// Wörter, die neben dem Ort stehen, aber keiner sind
const NOT_PLACE =
  /\b(direkteinstieg|berufseinstieg|einstieg|vollzeit|teilzeit|karriere|benefits|festanstellung|unbefristet|befristet|minijob|ab sofort)\b/i;
const PLACE_CONNECTOR = /^(oder|und|bei|am|an|der|im|in|nähe|a\.|d\.|\/|&|\+|-|–|hybrid|remote)$/i;

/** Sieht aus wie „Regensburg, Deggendorf“ oder „Köln oder Remote“. */
function looksLikePlace(text: string): boolean {
  if (!text || text.length > 70 || NOT_PLACE.test(text) || JOB_WORDS.test(text)) return false;
  if (LEGAL_FORM.test(text) || NOISE.test(text) || GENDER.test(text) || /\d/.test(text)) return false;
  // „Inn/Schärding“ zählt als zwei Wörter, Klammern und Kommas trennen nur.
  const words = text.replace(/[,()/]/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 9 || !/^[A-ZÄÖÜ]/.test(words[0])) return false;
  return words.every((w) => /^[A-ZÄÖÜ][\p{L}.-]*$/u.test(w) || PLACE_CONNECTOR.test(w));
}

function findLocation(
  lines: OcrLine[],
  position: Position | undefined,
  everything: string,
): string | undefined {
  for (const line of lines) {
    const label = LOCATION_LABEL.exec(line.text);
    if (label) {
      const value = clean(label[1]);
      if (value && !isTooLong(value, 80)) return value;
    }
  }
  // Messe-Karten und Portale: Ort mit Pin-Symbol direkt unter dem Titel.
  if (position) {
    const below = [...lines]
      .filter((l) => l.top > position.line.top)
      .sort((a, b) => a.top - b.top)
      .slice(0, 4);
    for (const line of below) {
      const text = stripIcon(line.text, everything);
      if (looksLikePlace(text)) return text;
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

  const position = findPosition(lines);
  const info: JobInfo = {
    company: findCompany(lines, all),
    position: position?.text,
    location: findLocation(lines, position, all),
    contactName: CONTACT.exec(all)?.[0].replace(/^Fr\./, 'Frau').replace(/^Hr\./, 'Herr'),
    contactEmail: EMAIL.exec(all)?.[0].toLowerCase(),
    jobUrl: URL.exec(all)?.[0].replace(/[.)]+$/, ''),
  };
  // Nur gefundene Felder zurückgeben
  return Object.fromEntries(Object.entries(info).filter(([, v]) => v)) as JobInfo;
}
