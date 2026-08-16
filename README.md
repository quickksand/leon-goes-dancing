# leon goes dancing

Event-Tracking für Konzerte und Festivals: unterwegs in Sekunden erfassen, später in Ruhe
anreichern, entscheiden, in den Kalender schieben und an die richtigen Leute weiterreichen.

Eine einzelne HTML-Datei ohne Build und ohne Abhängigkeiten. Die Daten liegen als
`events.json` in einem **separaten privaten Repo** und werden zur Laufzeit über die
GitHub Contents API gelesen und geschrieben.

- Begriffe und Datenmodell: [`CONTEXT.md`](CONTEXT.md)
- Warum so gebaut: [`docs/adr/0001`](docs/adr/0001-eigenbau-mit-github-datenhaltung.md),
  [`docs/adr/0002`](docs/adr/0002-zwei-repos-app-public-daten-privat.md)


## Bedienen

| | |
|---|---|
| **Erfassen** | Knopf unten rechts. Titel genügt, Stadt hilft. Alles Weitere ist „Anreichern" und kann warten. |
| **Anreichern** | Event antippen, Bereich *Anreichern* aufklappen: Uhrzeit, Venue, Preis, VVK-Start, Quelle, Parkgrund. |
| **Status** | Sieben Zustände von `entdeckt` bis `verworfen`, im Detail-Dialog eine Reihe von Knöpfen. |
| **Filtern** | Status-Chips, Tag-Chips, Volltextsuche, Umschalter *kommend / vergangen / alle*. Die Auswahl merkt sich die App. |
| **ICS** | Im Detail für ein Event, oben im Kopf für alles gerade Gefilterte. Ein VVK-Start wird ein eigener Termin mit Erinnerung. |
| **Weiterleiten** | *Text kopieren* legt eine fertige Nachricht in die Zwischenablage — ab damit in WhatsApp. |
| **Tastatur** | `n` neues Event, `/` Suche. |

Ohne Netz oder mit abgelaufenem Token zeigt die App den zuletzt geladenen Stand aus dem
lokalen Cache, dann nur lesend.

## Capture per iOS-Kurzbefehl

Der schnellste Weg vor einem Plakat: ein Kurzbefehl, der eine Datei nach `inbox/` schreibt.
Das ist ein einziger Request ohne vorheriges Lesen — kein `sha`, kein Konflikt, keine
Wartezeit. Die App saugt den Ordner beim nächsten Laden auf und räumt ihn leer.

1. **Text abfragen** → „Was?" → Variable `Titel`
2. **Text abfragen** → „Wo?" → Variable `Stadt`
3. **UUID abrufen** → Variable `Dateiname`
4. **Text** mit dem Inhalt:
   ```json
   {"titel":"[Titel]","stadt":"[Stadt]","quelle":"Kurzbefehl"}
   ```
5. **Base64 codieren** — *Zeilenumbrüche: keine*
6. **Inhalte von URL abrufen**
   - URL: `https://api.github.com/repos/<OWNER>/<DATEN-REPO>/contents/inbox/[Dateiname].json`
   - Methode: `PUT`
   - Header: `Authorization: Bearer <TOKEN>`, `Accept: application/vnd.github+json`
   - Anfragetext *JSON*: `message` = „Capture: [Titel]", `content` = Ergebnis aus Schritt 5,
     `branch` = `main`

Der Kurzbefehl trägt das Token in sich — er gehört auf das eigene Gerät und nicht in einen
geteilten iCloud-Link. Jede weitere Angabe aus `events.json` (`tags`, `start`, `preis`, …)
darf in der JSON aus Schritt 4 mitgegeben werden; fehlt sie, ist das Event eben unvollständig,
genau dafür gibt es das Anreichern.

## Datenformat

```json
{
  "schema": 1,
  "aktualisiert": "2026-08-16T20:11:04.881Z",
  "events": [
    {
      "id": "ev_m4x2p1_a9f3k",
      "titel": "Bilderbuch",
      "start": "2026-09-12T20:00",
      "ende": "",
      "stadt": "Leipzig",
      "venue": "Conne Island",
      "status": "geht-fix",
      "tags": ["indie", "pop"],
      "preis": 32.5,
      "vvkStart": "2026-06-01T10:00",
      "parkgrund": "",
      "quelle": "Reservix-Alert",
      "notiz": "",
      "erfasstAm": "2026-08-16T19:52:11.204Z"
    }
  ]
}
```

`start` und `ende` sind `YYYY-MM-DD` oder `YYYY-MM-DDTHH:MM` — lokale Wandzeit, bewusst ohne
Zeitzone: ein Konzert um 20 Uhr ist um 20 Uhr. Fehlende Angaben sind leer (`""` bzw. `null`),
nie erfunden. Wer per Skript oder Workflow schreibt (→ Ausbaustufe Discovery), hält sich an
dieses Format; die App normalisiert beim Laden und kommt mit fehlenden Feldern zurecht.

Schreibt jemand parallel — Handy, Discovery-Workflow —, erkennt die App den Konflikt am `sha`,
lädt neu und wendet die eigene Änderung auf den frischen Stand an, statt fremde Arbeit zu
überschreiben.

## Tests

Echter Browser, gestubbte GitHub-API — es braucht weder Token noch Repo:

```bash
npm install
npx playwright install chromium   # einmalig
npm test
```

Abgedeckt sind Capture und Anreichern, der Status-Lebenszyklus, Filter, ICS-Erzeugung
(Uhrzeit, ganztägig, mehrtägig, VVK mit Alarm), Weiterleit-Text, Schreibkonflikte, der
Offline-Fallback, UTF-8 über den base64-Rundlauf und die Inbox samt gescheitertem Aufräumen.

`npm start` serviert die App lokal unter `http://127.0.0.1:8080`.
