# 0002 — Zwei Repos: App public, Daten privat

**Status:** akzeptiert (2026-08-16)

## Kontext

GitHub Pages (kostenlos) hostet nur aus public Repos. Läge `events.json` im selben Repo wie die App, wäre Leons Konzertkalender — und damit ein Bewegungsprofil (wo er an welchen Abenden ist) — öffentlich lesbar.

## Entscheidung

Zwei Repos: Die App (statisches HTML, enthält nichts Persönliches und kein Token) liegt in einem public Repo und wird via GitHub Pages gehostet. `events.json` liegt in einem separaten privaten Repo. Die App lädt und schreibt die Daten zur Laufzeit über die GitHub Contents API; das fine-grained Token ist ausschließlich auf das private Daten-Repo berechtigt.

Fallback: Die App cached den zuletzt geladenen Datenstand lokal, damit ohne Repo-Zugang (offline, Token abgelaufen) zumindest lesend gearbeitet werden kann.

## Verworfene Alternativen

- **Ein public Repo (App + Daten):** Simpelst, aber Privacy-Verletzung by design.
- **Ein privates Repo:** Pages aus privaten Repos erfordert einen bezahlten GitHub-Plan; lokales Öffnen der HTML-Datei würde die Handy-Nutzung verkomplizieren.

## Konsequenzen

- (+) Bewegungsprofil bleibt privat; App-Code ist vorzeigbar (Portfolio).
- (+) Ohne gültiges Token zeigt die public App schlicht nichts — kein Datenleck möglich.
- (−) Daten laden geht nur per API (authentifiziert), nicht als statische Ressource; erster App-Start braucht Token-Setup.
