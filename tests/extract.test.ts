import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { extractJobInfo, type OcrLine } from '@/features/photos/extractJobInfo';
import { suggestionRows } from '@/features/photos/suggestions';

/** Text wie von der Erkennung: eine Zeile pro Zeile, Überschriften größer. */
function ocr(text: string, big: string[] = []): OcrLine[] {
  return text
    .trim()
    .split('\n')
    .map((t, i) => ({ text: t.trim(), top: i * 40, height: big.includes(t.trim()) ? 60 : 24 }));
}

describe('Angaben aus dem Foto einer Stellenanzeige', () => {
  test('klassische Anzeige mit (m/w/d), PLZ und Kontakt', () => {
    const info = extractJobInfo(
      ocr(
        `
Rheinblick Versicherung AG
Wir suchen ab sofort
Junior Softwareentwickler Java (m/w/d)
in Vollzeit
Ihre Aufgaben
Weiterentwicklung unserer Kundenportale
Ihr Kontakt: Herr Yilmaz
bewerbung@rheinblick-versicherung.de
Rheinallee 12, 40213 Düsseldorf
www.rheinblick-versicherung.de/karriere`,
        ['Junior Softwareentwickler Java (m/w/d)'],
      ),
    );
    assert.deepEqual(info, {
      company: 'Rheinblick Versicherung AG',
      position: 'Junior Softwareentwickler Java (m/w/d)',
      location: 'Düsseldorf',
      contactName: 'Herr Yilmaz',
      contactEmail: 'bewerbung@rheinblick-versicherung.de',
      jobUrl: 'www.rheinblick-versicherung.de/karriere',
    });
  });

  test('(m/w/d) in eigener Zeile gehört zum Titel darüber', () => {
    const info = extractJobInfo(ocr('Fachinformatiker Anwendungsentwicklung\n(w/m/d)\nMuster GmbH & Co. KG'));
    assert.equal(info.position, 'Fachinformatiker Anwendungsentwicklung (w/m/d)');
    assert.equal(info.company, 'Muster GmbH & Co. KG');
  });

  test('Artikel vor dem Firmennamen fällt weg, kurze Namen bleiben ganz', () => {
    assert.equal(extractJobInfo(ocr('Die Pixelwerk Agentur GmbH sucht')).company, 'Pixelwerk Agentur GmbH');
    assert.equal(extractJobInfo(ocr('Bei der Brückner AG')).company, 'Brückner AG');
    assert.equal(extractJobInfo(ocr('IBM SE')).company, 'IBM SE');
  });

  test('ohne Geschlechterangabe: größte Zeile mit Berufswort', () => {
    const info = extractJobInfo(
      ocr('Karriere bei uns\nIT-Administrator Netzwerk\nDeine Aufgaben\nSupport für Anwender', [
        'IT-Administrator Netzwerk',
      ]),
    );
    assert.equal(info.position, 'IT-Administrator Netzwerk');
  });

  test('Firma mitten im Satz und Standort mit Bezeichnung', () => {
    const info = extractJobInfo(
      ocr('Zur Verstärkung unseres Teams sucht die Stadtwerke Beispielstadt GmbH\nStandort: Köln oder Remote'),
    );
    assert.equal(info.company, 'Stadtwerke Beispielstadt GmbH');
    assert.equal(info.location, 'Köln oder Remote');
  });

  test('nur Remote, Frau mit Doktortitel, abgekürzte Anrede', () => {
    assert.equal(extractJobInfo(ocr('Web-Entwickler (m/w/d)\n100 % Homeoffice')).location, 'Remote');
    assert.equal(extractJobInfo(ocr('Ansprechpartnerin: Frau Dr. Berger')).contactName, 'Frau Dr. Berger');
    assert.equal(extractJobInfo(ocr('Fragen? Fr. Neumann')).contactName, 'Frau Neumann');
  });

  test('nichts Brauchbares ergibt nichts, statt etwas zu raten', () => {
    assert.deepEqual(extractJobInfo(ocr('Wir bieten\nflexible Arbeitszeiten\nObstkorb')), {});
    assert.deepEqual(extractJobInfo([]), {});
  });

  test('Satzzeichen am Rand und Aufzählungspunkte verschwinden', () => {
    const info = extractJobInfo(ocr('• Kaufmann für Büromanagement (m/w/d) –\nMehr: https://example.org/job/42.'));
    assert.equal(info.position, 'Kaufmann für Büromanagement (m/w/d)');
    assert.equal(info.jobUrl, 'https://example.org/job/42');
  });

  // Nachbau echter Messe-Anzeigen, wie ML Kit sie liefert: Symbole vor Ort
  // und Firma werden zu Störzeichen, Überschriften sind größer.
  const card = (rows: [string, number, number, number?][]): OcrLine[] =>
    rows.map(([text, top, height, left = 140], i) => ({ text, top, height, left, block: i }));

  test('Messe-Karte: Titel einzeilig, Ort mit Pin, Firma mit Haus-Symbol', () => {
    const info = extractJobInfo(
      card([
        ['MIN', 90, 30],
        ['FERCHAU', 380, 90],
        ['Softwareentwickler (m/w/d)', 575, 60],
        ['9 Regensburg, Deggendorf', 695, 32],
        ['Direkteinstieg', 695, 22],
        ['H Ferchau GmbH', 745, 32],
        ['Bei FERCHAU verbinden wir Menschen und Technologien und realisieren innova-', 820, 26],
        ['Deine Aufgaben', 930, 28],
        ['Entwicklung und Implementierung von Softwarelösungen', 980, 28],
        ['Dein Profil', 1155, 28],
        ['Studium der Informatik oder ähnliche Qualifikation', 1200, 28],
      ]),
    );
    assert.equal(info.company, 'Ferchau GmbH');
    assert.equal(info.position, 'Softwareentwickler (m/w/d)');
    assert.equal(info.location, 'Regensburg, Deggendorf');
  });

  test('Messe-Karte: Titel über zwei Zeilen, Ort „oder Hybrid“', () => {
    const info = extractJobInfo(
      card([
        ['Hallo Welt!', 280, 70],
        ['GmbH', 380, 40],
        ['Frontend Software Developer -', 525, 60],
        ['Webstack (m/w/d)', 615, 60],
        ['O Regensburg oder Hybrid', 700, 32],
        ['Direkteinstieg', 700, 22],
        ['Hi Hallo Welt! GmbH', 750, 32],
        ['Die Hallo Welt! GmbH gehört zu den führenden Spezialisten für die Wikipedia-Soft-', 820, 26],
        ['Deine Aufgaben', 985, 28],
      ]),
    );
    assert.equal(info.position, 'Frontend Software Developer - Webstack (m/w/d)');
    assert.equal(info.location, 'Regensburg oder Hybrid');
    assert.equal(info.company, 'Hallo Welt! GmbH');
  });

  test('Einleitungssatz in gleicher Schrift wird nicht Teil der Stelle', () => {
    const info = extractJobInfo(ocr('Für unseren Standort in Köln suchen wir\nSystemadministrator (m/w/d)'));
    assert.equal(info.position, 'Systemadministrator (m/w/d)');
  });

  test('Logo über dem Titel wird nicht Teil der Stelle', () => {
    const info = extractJobInfo(
      card([
        ['FERCHAU', 380, 90],
        ['Softwareentwickler (m/w/d)', 575, 60],
      ]),
    );
    assert.equal(info.position, 'Softwareentwickler (m/w/d)');
  });

  test('Silbentrennung im Titel: „Software-“ und „entwickler“ werden ein Wort', () => {
    const info = extractJobInfo(
      card([
        ['Junior Software-', 500, 60],
        ['entwickler (m/w/d)', 580, 60],
      ]),
    );
    assert.equal(info.position, 'Junior Softwareentwickler (m/w/d)');
  });

  test('Nachbarkarte auf gleicher Höhe wird nicht an den Titel gehängt', () => {
    const info = extractJobInfo(
      card([
        ['Frontend Software Developer -', 525, 60, 165],
        ['Ju', 520, 60, 1430],
        ['Webstack (m/w/d)', 615, 60, 165],
        ['O Regensburg oder Hybrid', 700, 32, 180],
      ]),
    );
    assert.equal(info.position, 'Frontend Software Developer - Webstack (m/w/d)');
  });

  test('Titel geht unter (m/w/x) weiter, Ort mit Schrägstrich und Klammer', () => {
    const info = extractJobInfo(
      card([
        ['EVG', 380, 50, 150],
        ['C# Softwareentwickler (m/w/x)', 495, 62, 110],
        ['Maschinensoftware', 590, 62, 110],
        ['9 St. Florian am Inn/Schärding (OÖ, Nähe Passau)', 700, 32, 125],
        ['Direkteinstieg', 705, 22, 1100],
        ['H EV Group GmbH', 750, 32, 125],
        ['Nur Coden ist dir nicht genug? Du willst unsere Maschinen zum Leben erwecken,', 830, 26, 125],
        ['Deine Aufgaben', 965, 28, 130],
      ]),
    );
    assert.equal(info.position, 'C# Softwareentwickler (m/w/x) Maschinensoftware');
    assert.equal(info.location, 'St. Florian am Inn/Schärding (OÖ, Nähe Passau)');
    assert.equal(info.company, 'EV Group GmbH');
  });

  test('ohne größere Überschrift wandert die nächste Zeile nicht in den Titel', () => {
    const info = extractJobInfo(ocr('Systemadministrator (m/w/d)\nKöln, unbefristet\nDeine Aufgaben'));
    assert.equal(info.position, 'Systemadministrator (m/w/d)');
  });
});

describe('Vorschläge zum Bestätigen', () => {
  const empty = { company: '', position: '', location: '', contactName: '', contactEmail: '', jobUrl: '' };

  test('leere Felder sind vorausgewählt, in Reihenfolge des Formulars', () => {
    const rows = suggestionRows({ location: 'Köln', company: 'Muster GmbH' }, empty);
    assert.deepEqual(
      rows.map((r) => [r.label, r.value, r.checked, r.replaces]),
      [
        ['Firma', 'Muster GmbH', true, null],
        ['Ort', 'Köln', true, null],
      ],
    );
  });

  test('Getipptes wird nicht vorausgewählt ersetzt, Gleiches nicht angeboten', () => {
    const rows = suggestionRows(
      { company: 'Muster GmbH', position: 'Entwickler (m/w/d)' },
      { ...empty, company: 'Muster GmbH ', position: 'Dev' },
    );
    assert.deepEqual(
      rows.map((r) => [r.key, r.checked, r.replaces]),
      [['position', false, 'Dev']],
    );
  });

  test('nichts gefunden, nichts anzuzeigen', () => {
    assert.deepEqual(suggestionRows({}, empty), []);
  });
});
