# 0001 — Eigenbau-App mit GitHub-Repo als Datenhaltung

**Status:** akzeptiert (2026-08-16)

## Kontext

Das Event-Tracking braucht zentrale Datenhaltung, nutzbar von Rechner und Handy. Capture muss mobil in <15 s gehen. Bestätigte Ausbaustufe „Discovery" wird später automatisiert Events in das System schreiben (wöchentlicher Workflow mit Kuratierung). Leon arbeitet bevorzugt mit leichtgewichtigen Single-File-HTML-Tools (Muster: nk-akte, TUL-Tracker) und folgt einer Tool-Restraint-Philosophie (keine neuen schweren Abhängigkeiten wie Notion/Airtable).

## Entscheidung

Leichtgewichtige, selbst entwickelte Single-File-Web-App (GitHub Pages). Die Events liegen als JSON in einem GitHub-Repo; die App liest und schreibt über die GitHub Contents API mit einem fine-grained Personal Access Token, das ausschließlich auf das Daten-Repo berechtigt ist. Das Token liegt niemals im ausgelieferten Code oder Repo, sondern wird pro Gerät einmalig eingegeben und lokal (localStorage bzw. im iOS-Kurzbefehl) gespeichert.

## Verworfene Alternativen

- **Apple Reminders (kreativ verbiegen):** Unschlagbares Capture (Siri), Sync gratis — aber Status-Lebenszyklus nur verbogen abbildbar, kein ICS-Export, und vor allem: keine Cloud-API. Die Discovery-Ausbaustufe hätte strukturell keine Andockstelle; späterer Wechsel hieße Datenmigration.
- **Notion/Airtable:** Könnten das Modell abbilden, widersprechen aber der Restraint-Philosophie (neue schwere Abhängigkeit, Vendor-Bindung).
- **Claude-Artifact mit persistent storage:** Funktional möglich, bindet Daten aber an claude.ai und ist mobil beim Capture zu träge; Daten für externe Workflows schlechter erreichbar.
- **localStorage-only (bisheriges App-Muster):** Pro Gerät isoliert — verletzt die Kernanforderung „zentral".

## Konsequenzen

- (+) Exakte Passung auf Datenmodell (Status, Tags, Parkgrund, VVK-Start); ICS-Generierung client-side trivial.
- (+) JSON im Repo ist maschinell beschreibbar → Discovery-Workflow (GitHub Action / Claude-Skill) kann später direkt committen; Versionshistorie gratis.
- (+) Lern- und Bastelwert, kein Vendor-Lock-in.
- (−) Initialaufwand einige Abende; Eigenwartung.
- (−) Token-Lebenszyklus muss verwaltet werden (Ablauf, Hinterlegung auf zwei Geräten).
- (−) Capture via Web-App ist langsamer als Siri; wird durch iOS-Kurzbefehl direkt gegen die GitHub API kompensiert.
