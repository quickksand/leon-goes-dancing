# CONTEXT — Event-Tracking

Glossar der Ubiquitous Language. Keine Implementierungsdetails.

## Event
Etwas Besuchbares mit einem Zeitraum (Start- und Endzeitpunkt, bei eintägigen Events identischer Tag). Kanonischer Oberbegriff — ein *Konzert* ist ein Event, ein *Festival* ist ein Event mit mehrtägigem Zeitraum und Tag `festival`. Es gibt keine Event-Typen im Modell; Unterscheidung erfolgt ausschließlich über Tags.

Ein Event darf **unvollständig** existieren (z.B. nur "Künstler + Stadt" nach schneller Erfassung). Vervollständigung ist ein separater Schritt (→ Anreichern).

## Capture
Das erstmalige Erfassen eines Events im Moment des Entdeckens (Plakat, Tipp, Alert). Muss mobil in unter ~15 Sekunden möglich sein. Capture erzeugt bewusst unvollständige Events.

## Anreichern
Das nachträgliche Vervollständigen eines per Capture erfassten Events (Preis, genaues Datum, VVK-Start, Tags). Findet typischerweise später und am Rechner statt.

## Status (Lebenszyklus)
Jedes Event hat genau einen Status:

| Status | Bedeutung |
|---|---|
| `entdeckt` | Erfasst, noch nicht bewertet |
| `interessiert` | Geparkt — will ich vielleicht; Grund fürs Parken als Freitext-Notiz |
| `geht-fix` | Entschieden hinzugehen, Ticket noch nicht gekauft |
| `ticket-gekauft` | Geld ist ausgegeben — verbindlich |
| `besucht` | War da |
| `verpasst` | Wollte hin, hat nicht geklappt |
| `verworfen` | Bewusst dagegen entschieden |

## Parkgrund
Freitext-Notiz, warum ein Event im Status `interessiert` hängt (zu teuer, Terminkonflikt, gerade nicht drin, …). Nicht strukturiert. Einzige filterbare Ausnahme: die Mitstreiter-Suche wird als Tag `mitstreiter-gesucht` ausgedrückt, damit danach gefiltert werden kann.

## Tag
Freies Schlagwort an einem Event, immer lowercase. Kein festes Schema — das Vokabular wächst organisch, Wildwuchs wird durch Wiederverwendung existierender Tags vermieden. Primärer Zweck: Genre-Clustering (`indie`, `techno`, …) — u.a. um Events an passende Freunde weiterzuleiten — sowie Eigenschaften wie `festival` oder `mitstreiter-gesucht`.

## Preis
Optionales Merkmal eines Events, dient der Entscheidungsgrundlage (lohnt sich das / ist das drin). Kein Budget- oder Ausgaben-Tracking — Summen sind später jederzeit aus den erfassten Preisen ableitbar.

## VVK-Start
Der (ggf. bekannte) Zeitpunkt, ab dem Tickets verkauft werden. Das System betreibt **kein aktives Monitoring** — es merkt sich den Termin und exportiert ihn als Kalendereintrag (ICS), der Kalender erinnert.

## Weiterleiten
Export eines Events an eine andere Person, außerhalb des Systems (Text blitzkopieren oder ICS teilen, z.B. via WhatsApp). Kein Multi-User: Niemand außer Leon schaut in das System oder wirkt darin mit.

## Quelle
Woher ein Event entdeckt wurde (z.B. Reservix-Alert, Plakat, Tipp einer Person). Optionales Merkmal — heute Kontext, später Grundlage der Discovery-Kuratierung („aus welchen Quellen kamen die tatsächlich besuchten Events?").

## Discovery
Ausbaustufe 2 (bewusst zurückgestellt): Automatisiertes Zusammentragen neuer Events aus Quellen (Reservix-Alerts, Lokalquellen) plus geschmacksbasierte Kuratierung. Schreibt in dasselbe Tracking-System.
