/**
 * End-to-End-Tests für die App — echter Browser, gestubbte GitHub-API.
 *
 *   npm install && npm test
 *
 * Die GitHub Contents API wird auf Netzwerkebene abgefangen und durch ein
 * Mini-Repo im Speicher ersetzt: so lassen sich auch die unbequemen Fälle
 * prüfen (Datei existiert noch nicht, Schreibkonflikt, offline, Inbox-Reste),
 * ohne je ein echtes Token oder Repo zu brauchen.
 */

import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, writeFile, mkdtemp, readFile as rf } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtempSync } from "node:fs";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");
const AUSGABE = mkdtempSync(join(tmpdir(), "lgd-test-"));

const OWNER = "quickksand", REPO = "leon-goes-dancing-data";
const api = pfad => new RegExp(`api\\.github\\.com/repos/${OWNER}/${REPO}/contents/${pfad}`);
const EVENTS = api("events\\.json");
const INBOX_DIR = api("inbox(\\?|$)");
const INBOX_FILE = api("inbox/cap1\\.json");

const b64 = s => Buffer.from(s, "utf8").toString("base64");
const unb64 = s => Buffer.from(s, "base64").toString("utf8");

const ok = [], fail = [];
const check = (name, cond, extra = "") => (cond ? ok : fail).push(name + (cond ? "" : "  →  " + extra));

/* ---------- statischer Server für index.html ---------- */
const server = createServer(async (req, res) => {
  try {
    const html = await readFile(join(WURZEL, "index.html"));
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  } catch (e) {
    res.writeHead(500).end(String(e));
  }
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const APP = `http://127.0.0.1:${server.address().port}/index.html`;

/* ---------- Repo-Attrappe ---------- */
let repoFile = null;             // { content, sha } — null = Datei existiert noch nicht
let shaZaehler = 0;
const commits = [];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
const page = await ctx.newPage();
page.on("pageerror", e => fail.push("pageerror: " + e.message));
page.on("console", m => {
  // Die absichtlich gestubbten 404/409/500 loggt der Browser selbst — kein Testfehler.
  if (m.type() === "error" && !/Failed to load resource/.test(m.text())) fail.push("console.error: " + m.text());
});

const schreibeAntwort = route => {
  const body = JSON.parse(route.request().postData());
  repoFile = { content: body.content, sha: "sha" + (++shaZaehler) };
  commits.push({ message: body.message, json: JSON.parse(unb64(body.content)) });
  return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ content: { sha: repoFile.sha } }) });
};

await ctx.route(EVENTS, route => {
  const req = route.request();
  if (req.method() === "GET") {
    return repoFile
      ? route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(repoFile) })
      : route.fulfill({ status: 404, contentType: "application/json", body: '{"message":"Not Found"}' });
  }
  if (req.method() === "PUT") {
    const body = JSON.parse(req.postData());
    if ((body.sha || null) !== (repoFile?.sha || null)) {
      return route.fulfill({ status: 409, contentType: "application/json", body: '{"message":"conflict"}' });
    }
    return schreibeAntwort(route);
  }
  return route.continue();
});
// Ohne Inbox-Ordner: 404 ist der Normalfall.
await ctx.route(INBOX_DIR, route => route.fulfill({ status: 404, contentType: "application/json", body: '{"message":"Not Found"}' }));

/* ============================================================
   Erststart und Einrichtung
   ============================================================ */
await page.goto(APP);
check("Einstellungen öffnen sich ohne Token von selbst", await page.locator("#dlgSettings").isVisible());

await page.fill("[name=owner]", OWNER);
await page.fill("[name=repo]", REPO);
await page.fill("[name=path]", "events.json");
await page.fill("[name=branch]", "main");
await page.fill("[name=token]", "github_pat_dummy");
await page.click("#formSettings button[type=submit]");
await page.waitForTimeout(300);
check("fehlende events.json ist ein gültiger Startzustand", (await page.textContent("#list")).includes("Noch nichts erfasst"));

/* ============================================================
   Capture — Titel und Stadt genügen
   ============================================================ */
await page.click("#btnNew");
check("Anreichern-Bereich ist beim Erfassen zugeklappt", !(await page.locator("#moreBox").evaluate(el => el.open)));
await page.fill("[name=titel]", "Bilderbuch");
await page.fill("[name=stadt]", "Leipzig");
await page.fill("[name=tags]", "Indie, INDIE, pop ");
await page.click("#btnSave");
await page.waitForTimeout(300);

check("Capture erzeugt einen Commit", commits.length === 1, JSON.stringify(commits));
const ev1 = commits.at(-1).json.events[0];
check("Status ist per Default entdeckt", ev1.status === "entdeckt", ev1.status);
check("Tags werden lowercase und dedupliziert", JSON.stringify(ev1.tags) === '["indie","pop"]', JSON.stringify(ev1.tags));
check("Event ohne Datum und Preis ist erlaubt", ev1.start === "" && ev1.preis === null);
check("Commit-Message spricht die Domänensprache", /^Erfasst: Bilderbuch/.test(commits.at(-1).message), commits.at(-1).message);
check("undatiertes Event steht in eigener Gruppe", (await page.textContent("#list")).includes("Ohne Datum"));
check("Kopfzeile zählt ein Event", (await page.textContent("#count")).startsWith("1 Event"));

/* ============================================================
   Anreichern
   ============================================================ */
await page.click(".card");
await page.waitForTimeout(100);
await page.fill("[name=startDate]", "2026-09-12");
await page.locator("#moreBox summary").click();
await page.fill("[name=startTime]", "20:00");
await page.fill("[name=venue]", "Conne Island");
await page.fill("[name=preis]", "32.50");
await page.fill("[name=vvkStart]", "2026-06-01T10:00");
await page.click('[data-set-status="geht-fix"]');
await page.click("#btnSave");
await page.waitForTimeout(300);

const ev2 = commits.at(-1).json.events[0];
check("Anreichern überschreibt, statt neu anzulegen", commits.at(-1).json.events.length === 1);
check("Datum und Uhrzeit werden zusammengesetzt", ev2.start === "2026-09-12T20:00", ev2.start);
check("Preis wird als Zahl gespeichert", ev2.preis === 32.5, String(ev2.preis));
check("Status wechselt zu geht-fix", ev2.status === "geht-fix", ev2.status);
check("erfasstAm bleibt beim Anreichern erhalten", ev2.erfasstAm === ev1.erfasstAm);
check("Commit-Message unterscheidet Anreichern von Erfassen", /^Angereichert:/.test(commits.at(-1).message), commits.at(-1).message);
check("Preissumme steht in der Kopfzeile", (await page.textContent("#count")).includes("32,50 €"), await page.textContent("#count"));

await page.click(".card");
await page.waitForTimeout(100);
check("Anreichern-Bereich öffnet sich bei gefülltem Event", await page.locator("#moreBox").evaluate(el => el.open));

/* ============================================================
   ICS-Export
   ============================================================ */
const icsPfad = join(AUSGABE, "out.ics");
const holeIcs = async knopf => {
  const warten = page.waitForEvent("download");
  await page.click(knopf);
  await (await warten).saveAs(icsPfad);
  return rf(icsPfad, "utf8");
};

const ics = await holeIcs("#btnIcs");
check("ICS: Konzert mit Startzeit", ics.includes("DTSTART:20260912T200000"), ics);
check("ICS: Ende ohne Angabe pauschal +3 h", ics.includes("DTEND:20260912T230000"), ics);
check("ICS: VVK-Start ist ein eigener Termin",
  ics.includes("SUMMARY:VVK-Start: Bilderbuch") && ics.includes("DTSTART:20260601T100000"), ics);
check("ICS: VVK-Termin erinnert vorab", ics.includes("BEGIN:VALARM") && ics.includes("TRIGGER:-PT15M"));
check("ICS: CRLF-Zeilenenden wie im Standard", ics.includes("\r\n") && !/[^\r]\n/.test(ics));
check("ICS: Kalender ist geschlossen", ics.trim().endsWith("END:VCALENDAR"));
await page.locator("#dlgEvent [data-close]").click();

/* ============================================================
   Weiterleiten
   ============================================================ */
await ctx.grantPermissions(["clipboard-read", "clipboard-write"]);
await page.click(".card");
await page.click("#btnCopy");
await page.waitForTimeout(200);
const clip = await page.evaluate(() => navigator.clipboard.readText());
check("Weiterleit-Text nennt das Datum ausgeschrieben", clip.includes("Sa, 12. September 2026, 20:00 Uhr"), clip);
check("Weiterleit-Text nennt Ort, Preis und Tags",
  clip.includes("Conne Island, Leipzig") && clip.includes("32,50 €") && clip.includes("#indie"), clip);
await page.locator("#dlgEvent [data-close]").click();

/* ============================================================
   Mehrtägiges, ganztägiges Event (Festival)
   ============================================================ */
await page.click("#btnNew");
await page.fill("[name=titel]", "Fusion");
await page.fill("[name=stadt]", "Lärz");
await page.fill("[name=startDate]", "2027-06-24");
await page.fill("[name=tags]", "festival");
await page.locator("#moreBox summary").click();
await page.fill("[name=endDate]", "2027-06-28");
await page.click("#btnSave");
await page.waitForTimeout(300);
check("zweites Event angelegt", commits.at(-1).json.events.length === 2);
check("events.json ist nach Datum sortiert",
  commits.at(-1).json.events.map(e => e.titel).join(",") === "Bilderbuch,Fusion",
  commits.at(-1).json.events.map(e => e.titel).join(","));

const icsAll = await holeIcs("#btnIcsAll");
check("ICS ganztägig: VALUE=DATE statt Uhrzeit", icsAll.includes("DTSTART;VALUE=DATE:20270624"), icsAll);
check("ICS ganztägig: DTEND ist exklusiv (+1 Tag)", icsAll.includes("DTEND;VALUE=DATE:20270629"), icsAll);
check("ICS: Sammel-Export enthält alle Termine", (icsAll.match(/BEGIN:VEVENT/g) || []).length === 3, icsAll);

/* ============================================================
   Filter
   ============================================================ */
await page.click('[data-tag="festival"]');
await page.waitForTimeout(100);
check("Tag-Filter grenzt ein", (await page.locator(".card").count()) === 1);
check("Tag-Filter zeigt das richtige Event", (await page.textContent(".card")).includes("Fusion"));
await page.click('[data-tag="festival"]');

await page.fill("#q", "conne");
await page.waitForTimeout(100);
check("Volltextsuche findet auch über das Venue",
  (await page.locator(".card").count()) === 1 && (await page.textContent(".card")).includes("Bilderbuch"));
await page.fill("#q", "");

await page.click('[data-status="geht-fix"]');
await page.waitForTimeout(100);
check("Status-Filter blendet aus", (await page.locator(".card").count()) === 1);
await page.click('[data-status="geht-fix"]');

await page.selectOption("#zeit", "vergangen");
await page.waitForTimeout(100);
check("kommende Events tauchen nicht unter „vergangen\" auf", (await page.textContent("#list")).includes("Nichts im Filter"));
await page.selectOption("#zeit", "alle");
await page.waitForTimeout(100);
check("„alle\" zeigt auch undatierte Events", (await page.locator(".card").count()) === 2);
await page.selectOption("#zeit", "kommend");

/* ============================================================
   Schreibkonflikt — jemand anderes (Discovery-Workflow, Handy) war schneller
   ============================================================ */
repoFile = {
  sha: "fremd-sha",
  content: b64(JSON.stringify({ schema: 1, events: [
    ...commits.at(-1).json.events,
    { id: "ev_discovery", titel: "Von Discovery eingetragen", start: "2026-10-05", status: "entdeckt", tags: ["techno"] },
  ]}, null, 2)),
};

await page.click(".card");
await page.waitForTimeout(100);
await page.click('[data-set-status="ticket-gekauft"]');
await page.click("#btnSave");
await page.waitForTimeout(600);
const nachKonflikt = commits.at(-1).json.events;
check("Konflikt: fremde Änderung überlebt", nachKonflikt.some(e => e.id === "ev_discovery"),
  JSON.stringify(nachKonflikt.map(e => e.titel)));
check("Konflikt: eigene Änderung überlebt", nachKonflikt.some(e => e.status === "ticket-gekauft"),
  JSON.stringify(nachKonflikt.map(e => [e.titel, e.status])));
check("Konflikt: nichts wird dupliziert", nachKonflikt.length === 3, String(nachKonflikt.length));

/* ============================================================
   Offline — lesender Fallback aus dem Cache (ADR 0002)
   ============================================================ */
await ctx.route(EVENTS, route => route.abort("failed"));
const page2 = await ctx.newPage();
page2.on("pageerror", e => fail.push("pageerror (offline): " + e.message));
await page2.goto(APP);
await page2.waitForTimeout(500);
check("offline: der letzte Stand ist weiter lesbar", (await page2.locator(".card").count()) >= 2, await page2.textContent("#list"));
check("offline: die Kopfzeile sagt es", (await page2.textContent("#sync")).toLowerCase().includes("offline"), await page2.textContent("#sync"));
await page2.close();

/* ============================================================
   Umlaute über den base64-Rundlauf
   ============================================================ */
await ctx.unroute(EVENTS);
await ctx.route(EVENTS, route => route.request().method() === "GET"
  ? route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(repoFile) })
  : schreibeAntwort(route));

await page.reload();
await page.waitForTimeout(400);
await page.click("#btnNew");
await page.fill("[name=titel]", "Größenwahn & Käsebrötchen ✳");
await page.fill("[name=stadt]", "Köln");
await page.click("#btnSave");
await page.waitForTimeout(400);
check("UTF-8 übersteht das base64-Schreiben",
  commits.at(-1).json.events.some(e => e.titel === "Größenwahn & Käsebrötchen ✳"),
  JSON.stringify(commits.at(-1).json.events.map(e => e.titel)));
await page.reload();
await page.waitForTimeout(400);
check("UTF-8 wird korrekt zurückgelesen", (await page.textContent("#list")).includes("Größenwahn & Käsebrötchen ✳"));

/* ============================================================
   Inbox — Captures aus dem iOS-Kurzbefehl
   ============================================================ */
let inboxGefuellt = true;
let loeschVersuche = 0;

await ctx.unroute(INBOX_DIR);
await ctx.route(INBOX_DIR, route => route.fulfill({
  status: 200, contentType: "application/json",
  body: JSON.stringify(inboxGefuellt ? [{
    type: "file", name: "cap1.json", path: "inbox/cap1.json", sha: "capsha",
    url: `https://api.github.com/repos/${OWNER}/${REPO}/contents/inbox/cap1.json?ref=main`,
  }] : []),
}));
await ctx.route(INBOX_FILE, route => {
  if (route.request().method() === "DELETE") {
    loeschVersuche++;
    // Der erste Aufräumversuch scheitert — die Datei bleibt liegen.
    if (loeschVersuche === 1) return route.fulfill({ status: 500, contentType: "application/json", body: '{"message":"boom"}' });
    inboxGefuellt = false;
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  }
  return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
    sha: "capsha",
    content: b64(JSON.stringify({ titel: "Nachtdigital", stadt: "Olzig", tags: ["techno"], quelle: "Plakat" })),
  })});
});

await page.reload();
await page.waitForTimeout(900);
const nachInbox = commits.at(-1).json.events;
check("Inbox: Capture landet in events.json", nachInbox.some(e => e.titel === "Nachtdigital"),
  JSON.stringify(nachInbox.map(e => e.titel)));
check("Inbox: id leitet sich aus dem Dateinamen ab", nachInbox.some(e => e.id === "inbox_cap1"),
  JSON.stringify(nachInbox.map(e => e.id)));
check("Inbox: Capture kommt als entdeckt an", nachInbox.find(e => e.id === "inbox_cap1")?.status === "entdeckt");
check("Inbox: Aufräumen wird versucht", loeschVersuche === 1, String(loeschVersuche));

await page.reload();
await page.waitForTimeout(900);
const nachZweitem = commits.at(-1).json.events;
check("Inbox: gescheitertes Aufräumen erzeugt kein Duplikat",
  nachZweitem.filter(e => e.titel === "Nachtdigital").length === 1, JSON.stringify(nachZweitem.map(e => e.titel)));
check("Inbox: Aufräumen wird erneut versucht", loeschVersuche === 2, String(loeschVersuche));

const commitsVorLeerlauf = commits.length;
await page.reload();
await page.waitForTimeout(900);
check("Inbox: leerer Ordner schreibt nichts", commits.length === commitsVorLeerlauf,
  `${commits.length} statt ${commitsVorLeerlauf}`);
check("Inbox: übernommenes Event bleibt sichtbar", (await page.textContent("#list")).includes("Nachtdigital"));

/* ---------- Screenshots (optional) ---------- */
if (process.env.SCREENSHOTS) {
  await page.screenshot({ path: join(AUSGABE, "liste.png"), fullPage: true });
  await page.click(".card");
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(AUSGABE, "detail.png") });
  console.log("Screenshots in " + AUSGABE);
}

await browser.close();
server.close();

console.log(`\n✓ ${ok.length} bestanden`);
if (fail.length) {
  console.log("\n✗ fehlgeschlagen:\n" + fail.map(f => "  - " + f).join("\n"));
  process.exit(1);
}
