# Google Play: Eintrag und Antworten

Alles, was die Play Console für Jobspur 1.1 fragt, zum Kopieren.
Bilder liegen in diesem Ordner (`feature-grafik.png`, `screenshots/`),
das Icon unter `assets/store/play-icon-512.png`.

## Store-Eintrag (Deutsch)

**App-Name** (max. 30 Zeichen)

```
Jobspur – Bewerbung & Nachweis
```

**Kurzbeschreibung** (max. 80 Zeichen)

```
Bewerbungen festhalten, Gespräche planen, Nachweis fürs Amt als PDF erstellen.
```

**Vollständige Beschreibung** (max. 4000 Zeichen)

```
Wer arbeitssuchend gemeldet ist, muss seine Bewerbungen nachweisen. Jobspur sammelt alles an einem Ort, während du dich bewirbst, und macht daraus auf Knopfdruck einen ordentlichen Nachweis der Eigenbemühungen für die Agentur für Arbeit oder das Jobcenter.

BEWERBUNGEN UND VERLAUF
• Bewerbung in Sekunden eintragen: Firma, Stelle, Datum, Bewerbungsweg
• Vermittlungsvorschläge werden im Nachweis gesondert ausgewiesen
• Jede Rückmeldung im Verlauf: Eingang bestätigt, Gespräch, Zusage, Absage, keine Antwort
• Hinweis, wenn eine Bewerbung lange ohne Antwort ist
• Monatsübersicht: Wie viele Bewerbungen an wie vielen Tagen?

STELLEN VORMERKEN, Z. B. AUF DER JOBMESSE
• Stelle schnell festhalten und erst später bewerben
• Vorgemerkte Stellen zählen erst, wenn du sie abgeschickt hast

FOTO UND TEXTERKENNUNG
• Stellenanzeige fotografieren oder aus der Galerie wählen
• Die App liest Firma, Stelle, Ort und Kontakt vom Foto und schlägt sie vor
• Du bestätigst mit Häkchen, was übernommen wird
• Die Erkennung läuft offline auf dem Handy

GESPRÄCHSTERMINE
• Termine mit Uhrzeit und Art: vor Ort, Video, Telefon
• Erinnerung am Vorabend und eine Stunde vorher
• Die nächsten Termine stehen oben in der Übersicht

NACHWEIS DER EIGENBEMÜHUNGEN
• Zeitraum und Empfänger wählen, als PDF teilen oder drucken
• Als Brief nach DIN 5008 für den Fensterumschlag
• Mit Kundennummer, beim Jobcenter auch BG-Nummer
• Rückmeldungen zu früheren Bewerbungen in eigenem Abschnitt

DEINE DATEN BLEIBEN BEI DIR
• Kein Konto, keine Werbung, kein Server des Entwicklers
• Alle Einträge liegen nur auf deinem Handy
• Datensicherung in einen Ordner auf dem Handy oder über Google Drive, E-Mail …

Hell oder dunkel, ganz wie du magst.

Hinweis: Jobspur ist ein privates Projekt und keine App der Bundesagentur für Arbeit, eines Jobcenters oder einer anderen Behörde. Ob ein Nachweis den Anforderungen deiner Stelle genügt, entscheidet diese Stelle.
```

**Kategorie:** Produktivität
**Tags:** Produktivität, Organisation, Karriere (soweit angeboten)
**E-Mail für Nutzer:** anatolij.imgrund@gmail.com
**Website:** https://github.com/anatolij-imgrund/Jobspur
**Datenschutzerklärung:** https://anatolij-imgrund.github.io/Jobspur/datenschutz.html

**Versionshinweise 1.1.0** (max. 500 Zeichen)

```
Neu: Stellen vormerken, z. B. auf der Jobmesse, und erst später bewerben. Fotos der Stellenanzeige anhängen. Texterkennung schlägt Firma, Stelle und Ort vom Foto vor, du bestätigst mit Häkchen.
```

## App-Inhalte (Richtlinien)

| Frage | Antwort |
| --- | --- |
| Datenschutzerklärung | URL oben |
| App-Zugriff | Alle Funktionen ohne Anmeldung oder Einschränkung verfügbar |
| Werbung | Nein, die App enthält keine Werbung |
| Einstufung des Inhalts | Fragebogen: Kategorie „Alle anderen App-Typen“ bzw. Dienstprogramm/Produktivität. Gewalt, Sex, Drogen, Glücksspiel: nein. Nutzer interagieren nicht miteinander, keine Inhalte werden zwischen Nutzern geteilt, kein Standort wird geteilt, keine Käufe. |
| Zielgruppe | 18 Jahre und älter. Die App richtet sich nicht an Kinder. |
| Nachrichten-App | Nein |
| Behörden-App | Nein (privates Projekt, siehe Hinweis in der Beschreibung) |
| Finanzfunktionen | Keine |
| Gesundheit | Keine Gesundheitsfunktionen |
| COVID-19 / Kontaktverfolgung | Nein |

## Datensicherheit

Grundlage: [Angaben von Google zu ML Kit](https://developers.google.com/ml-kit/android-data-disclosure).
Die App selbst sendet nichts; die Texterkennung (ML Kit) sendet technische Daten an Google.

| Frage | Antwort |
| --- | --- |
| Erhebt oder teilt die App Nutzerdaten der genannten Typen? | **Ja** |
| Werden alle Daten bei der Übertragung verschlüsselt? | **Ja** |
| Können Nutzer die Löschung ihrer Daten beantragen? | **Nein** (die App hat keinen Server; Einträge löscht man direkt in der App) |

Erhobene Datentypen:

| Datentyp | Erhoben | Geteilt | Verarbeitung | Zweck |
| --- | --- | --- | --- | --- |
| App-Informationen und -Leistung → Diagnosedaten | Ja | Nein | Nicht flüchtig, erforderlich | Analysen |
| Geräte- oder andere IDs | Ja | Nein | Nicht flüchtig, erforderlich | Analysen |

Alles andere (Name, E-Mail, Fotos, Standort, Kontakte, Nachrichten, Dateien …):
**nicht erhoben.** Die Einträge, Fotos und Sicherungen bleiben auf dem Gerät und
gelten bei Google Play nicht als „erhoben“.

## Veröffentlichung Schritt für Schritt

1. **Datenschutzseite online stellen:** Auf GitHub im Repository unter
   *Settings → Pages* „Deploy from a branch“ wählen, Branch `main`, Ordner `/docs`.
   Nach ein, zwei Minuten ist die Seite unter der URL oben erreichbar.
2. **App anlegen:** In der Play Console „App erstellen“: Name wie oben, Sprache
   Deutsch, App (nicht Spiel), kostenlos.
3. **App-Bundle bauen:**
   `npx eas-cli@latest build -p android --profile production`
   Ergebnis ist eine `.aab`-Datei. Das erste Bundle lädt man von Hand hoch.
4. **Geschlossener Test:** *Testen → Geschlossene Tests*: Track anlegen, Bundle
   hochladen, Tester per E-Mail-Liste eintragen (mindestens 12, mit Google-Konto),
   Versionshinweise wie oben. Die Tester bekommen einen Link zum Beitreten.
5. **14 Tage durchhalten:** Mindestens 12 Tester müssen 14 Tage am Stück dabei
   sein. Danach kann man die Produktion beantragen.
6. **Store-Eintrag, App-Inhalte, Datensicherheit** mit den Texten in dieser
   Datei ausfüllen; Grafiken aus diesem Ordner hochladen.
