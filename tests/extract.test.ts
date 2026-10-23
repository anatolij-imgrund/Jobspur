import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { extractJobInfo, type OcrLine } from '@/features/photos/extractJobInfo';

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
});
