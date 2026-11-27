#!/usr/bin/env node
/**
 * Records a captioned walkthrough of the web app, from a first visit on a fresh database to the end.
 * Frames are captured with Chrome's screencast (sharp JPEGs + timestamps); an encoder turns them into MP4.
 *
 *   node scripts/demo/record-demo.mjs <framesDir>
 *
 * Expects the web app at DEMO_URL (default http://127.0.0.1:3300) backed by an API with a FRESH database
 * and CONTENT_OVERRIDE="" (public-domain texts only).
 */
import { chromium } from "@playwright/test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.DEMO_URL ?? "http://127.0.0.1:3300";
const OUT = process.argv[2];
if (!OUT) throw new Error("usage: record-demo.mjs <framesDir>");
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const W = 1440;
const H = 900;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- overlay: fake cursor, click ripple, captions, title cards (re-installed on every page) ----------
function overlay() {
  const css = `
    #demo-cursor{position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483647;pointer-events:none;
      transform:translate(-100px,-100px);transition:transform 40ms linear;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}
    .demo-ripple{position:fixed;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;z-index:2147483646;
      pointer-events:none;border:3px solid rgba(232,147,42,.95);animation:demo-ripple .55s ease-out forwards}
    @keyframes demo-ripple{from{transform:scale(.3);opacity:1}to{transform:scale(1.4);opacity:0}}
    #demo-caption{position:fixed;left:16px;right:16px;bottom:28px;margin:0 auto;width:fit-content;z-index:2147483645;pointer-events:none;
      max-width:860px;padding:14px 24px;border-radius:18px;background:rgba(24,21,16,.88);
      color:#fff;font:600 19px/1.35 system-ui,-apple-system,sans-serif;text-align:center;
      box-shadow:0 12px 32px -12px rgba(0,0,0,.6);opacity:0;transition:opacity .25s ease}
    #demo-caption.raised{bottom:96px}
    #demo-caption small{display:block;margin-top:3px;font-weight:500;font-size:15px;color:#f2d4a8}
    #demo-caption b{color:#f2a541}
    #demo-card{position:fixed;inset:0;z-index:2147483640;display:grid;place-items:center;background:#15130f;color:#f3ecdf;
      font-family:Georgia,serif;text-align:center;opacity:0;transition:opacity .4s ease}
    #demo-card h1{font-size:56px;margin:0 0 12px}
    #demo-card p{font:500 22px/1.5 system-ui,-apple-system,sans-serif;color:#c2b7a5;margin:6px 0}
    #demo-card ul{list-style:none;padding:0;margin:22px 0 0;font:500 19px/1.7 system-ui,-apple-system,sans-serif;color:#f3ecdf;
      columns:2;column-gap:48px;text-align:left}
    #demo-card .tag{display:inline-block;margin-top:10px;padding:6px 14px;border-radius:999px;background:#f2a541;color:#15130f;
      font:700 15px system-ui,-apple-system,sans-serif}`;
  const install = () => {
    if (document.getElementById("demo-cursor")) return;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
    const cursor = document.createElement("div");
    cursor.id = "demo-cursor";
    cursor.innerHTML =
      '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 2.5l15.5 9.2-6.6 1.6 3.9 7-2.8 1.5-3.9-7-5 4.6z" fill="#fff" stroke="#15130f" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(cursor);
    const saved = sessionStorage.getItem("demo-cursor");
    if (saved) cursor.style.transform = `translate(${saved})`;
    const cap = document.createElement("div");
    cap.id = "demo-caption";
    // The reader has its page controls along the bottom: keep the caption above them
    // (checked continuously, since moving between pages is client-side navigation).
    setInterval(() => cap.classList.toggle("raised", /\/read$/.test(location.pathname)), 200);
    document.documentElement.appendChild(cap);
    const text = sessionStorage.getItem("demo-caption");
    if (text) {
      cap.innerHTML = text;
      cap.style.opacity = "1";
    }
  };
  document.addEventListener(
    "mousemove",
    (e) => {
      const c = document.getElementById("demo-cursor");
      const pos = `${e.clientX - 3}px,${e.clientY - 2}px`;
      if (c) c.style.transform = `translate(${pos})`;
      sessionStorage.setItem("demo-cursor", pos);
    },
    true,
  );
  document.addEventListener(
    "mousedown",
    (e) => {
      const r = document.createElement("div");
      r.className = "demo-ripple";
      r.style.left = `${e.clientX}px`;
      r.style.top = `${e.clientY}px`;
      document.documentElement.appendChild(r);
      setTimeout(() => r.remove(), 600);
    },
    true,
  );
  window.__demoCaption = (html) => {
    install();
    const cap = document.getElementById("demo-caption");
    if (!html) {
      cap.style.opacity = "0";
      sessionStorage.removeItem("demo-caption");
      return;
    }
    cap.innerHTML = html;
    cap.style.opacity = "1";
    sessionStorage.setItem("demo-caption", html);
  };
  window.__demoCard = (html) => {
    install();
    let card = document.getElementById("demo-card");
    if (!html) {
      if (card) {
        card.style.opacity = "0";
        setTimeout(() => card.remove(), 450);
      }
      return;
    }
    if (!card) {
      card = document.createElement("div");
      card.id = "demo-card";
      document.documentElement.appendChild(card);
    }
    card.innerHTML = `<div>${html}</div>`;
    requestAnimationFrame(() => (card.style.opacity = "1"));
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
}

// ---------- browser + screencast ----------
const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: "light", acceptDownloads: true });
await context.addInitScript(overlay);
const page = await context.newPage();
page.setDefaultTimeout(15_000);

const frames = [];
let n = 0;
const cdp = await context.newCDPSession(page);
cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
  const file = `f-${String(++n).padStart(6, "0")}.jpg`;
  writeFileSync(join(OUT, file), Buffer.from(data, "base64"));
  frames.push({ file, t: metadata.timestamp });
  await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
});
const startCast = (w = W, h = H) => cdp.send("Page.startScreencast", { format: "jpeg", quality: 90, maxWidth: w, maxHeight: h, everyNthFrame: 1 });

// ---------- helpers ----------
const caption = async (title, sub) => {
  const html = sub ? `${title}<small>${sub}</small>` : title;
  await page.evaluate((h) => window.__demoCaption(h), html);
};
const card = (html) => page.evaluate((h) => window.__demoCard(h), html);
const center = async (loc) => {
  await loc.scrollIntoViewIfNeeded();
  await sleep(150);
  const b = await loc.boundingBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};
const moveTo = async (loc, steps = 22) => {
  const p = await center(loc);
  await page.mouse.move(p.x, p.y, { steps });
  await sleep(220);
};
const click = async (loc, { pause = 700, force = false } = {}) => {
  await moveTo(loc);
  await loc.click({ force });
  await sleep(pause);
};
const type = async (loc, text) => {
  await click(loc, { pause: 200 });
  await loc.pressSequentially(text, { delay: 85 });
  await sleep(500);
};
const scrollBy = async (dy, steps = 24, ms = 28) => {
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, dy / steps);
    await sleep(ms);
  }
  await sleep(350);
};
const scrollToTop = async () => {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await sleep(900);
};
const scrollIntoCenter = async (loc) => {
  await loc.evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "center" }));
  await sleep(900);
};
const byTest = (id) => page.getByTestId(id);
const count = (list) => byTest(`count-${list}`);

// ================================ the walkthrough ================================
await page.goto(`${BASE}/`);
await startCast();
await card(`<h1>Lantern Lane Library</h1><p>Reading Challenge Tracker — web app walkthrough</p>
  <span class="tag">Next.js · Node API · SQLite</span>
  <p style="margin-top:28px;font-size:18px">A fresh start: no books read yet, first visit</p>`);
await sleep(4200);
await card(null);
await sleep(600);

// 1. First-visit guided tour
const tour = byTest("walkthrough");
await tour.waitFor();
await caption("<b>First visit:</b> a short guided tour", "It explains each part of the page — Next / Back / Skip, or the arrow keys");
await sleep(3200);
for (let i = 0; i < 10; i++) {
  await click(page.getByRole("button", { name: "Next" }), { pause: 2300 });
}
await click(page.getByRole("button", { name: "Finish" }), { pause: 900 });
await scrollToTop();

// 2. Reading lists
await caption("<b>Two reading lists</b> on one page", "Fiction and Nonfiction — three unread books each, with a count per list");
await moveTo(count("fiction"));
await sleep(2200);
await moveTo(count("nonfiction"));
await sleep(2000);

await caption("<b>Mark a book as read</b>", "Each tick is saved to the backend straight away, and the count updates");
await click(byTest("book-the-hobbit").getByText("The Hobbit", { exact: true }), { pause: 1300 });
await click(byTest("book-matilda").getByText("Matilda", { exact: true }), { pause: 1500 });
await caption("<b>Unmark it again</b> — read ↔ unread", "Matilda goes back to unread: 1 of 3");
await click(byTest("book-matilda").getByText("Matilda", { exact: true }), { pause: 1800 });

// 3. Rewards unlock
await caption("<b>Finish a list to unlock a reward</b>", "Fiction 3 of 3 → the Fiction bookmark unlocks and is announced to screen readers");
await click(byTest("book-matilda").getByText("Matilda", { exact: true }), { pause: 900 });
await click(byTest("book-the-secret-garden").getByText("The Secret Garden", { exact: true }), { pause: 1500 });
await scrollIntoCenter(byTest("rewards"));
await moveTo(byTest("reward-fiction-bookmark"));
await sleep(2600);

// 4. Persistence
await caption("<b>Refresh the page</b> — nothing is lost", "Statuses come back from the SQLite database (they also survive a server restart)");
await scrollToTop();
await page.reload();
await count("fiction").waitFor();
await sleep(2800);

// 5. Save failure keeps the last saved value
await caption("<b>If a save fails</b>, the last saved value stays visible", "Simulated server error: the book stays unread, the count doesn't change, and Retry is offered");
let failMatildaNo = true;
await page.route("**/api/books/the-story-of-my-life", async (route) => {
  if (failMatildaNo && route.request().method() === "PATCH") {
    await sleep(500);
    return route.fulfill({ status: 500, json: { error: { code: "INTERNAL_ERROR", message: "Simulated" } } });
  }
  return route.continue();
});
await click(byTest("book-the-story-of-my-life").getByText("The Story of My Life", { exact: true }), { pause: 2800 });
failMatildaNo = false;
await caption("<b>Retry</b> once the server is back", "The save goes through and Nonfiction shows 1 of 3");
await click(page.getByRole("button", { name: "Retry saving The Story of My Life" }), { pause: 2200 });
await page.unroute("**/api/books/the-story-of-my-life");

// 6. Loading and load-error states
await caption("<b>Loading state</b> while the lists are fetched");
await page.route("**/api/books", async (route) => {
  await sleep(2200);
  return route.continue();
});
await page.reload();
await byTest("lists-loading").waitFor();
await sleep(2400);
await page.unroute("**/api/books");
await count("fiction").waitFor();
await sleep(600);
await caption("<b>Clear error message</b> if the lists can't load", "The rest of the page (video, offer) still works — Try again recovers");
let failLoad = true;
await page.route("**/api/books", (route) =>
  failLoad ? route.fulfill({ status: 503, json: { error: { code: "INTERNAL_ERROR", message: "down" } } }) : route.continue(),
);
await page.reload();
await byTest("lists-error").waitFor();
await moveTo(byTest("lists-error"));
await sleep(2600);
failLoad = false;
await click(byTest("lists-error").getByRole("button", { name: "Try again" }), { pause: 1500 });
await page.unroute("**/api/books");
await count("fiction").waitFor();

// 7. Header + offer
await caption("<b>Glass header</b> — full width at the top, a floating pill as you scroll");
await scrollToTop();
await sleep(800);
await scrollBy(420, 30, 40);
await sleep(1000);
await scrollBy(-420, 30, 40);
await caption("<b>Special offer</b> with a live countdown", "Finish both lists by the deadline and late fees are waived");
await scrollIntoCenter(byTest("offer-banner"));
await moveTo(byTest("offer-banner"));
await sleep(2800);

// 8. Welcome video
const video = byTest("video-element");
await caption("<b>Welcome video</b>", "Play, pause and seek — with ±10 s, mute, captions and full screen");
await scrollIntoCenter(byTest("welcome-video"));
await sleep(800);
await click(page.getByRole("button", { name: "Play welcome video" }), { pause: 3800 });
await caption("<b>Seek</b> by dragging the bar — it shows what's buffered", "Keyboard too: K play/pause · J / L skip 10 s · M mute · C captions · F full screen");
{
  const seek = byTest("seek");
  const b = await seek.boundingBox();
  const y = b.y + b.height / 2;
  const cur = await video.evaluate((v) => v.currentTime / v.duration);
  await page.mouse.move(b.x + b.width * cur, y, { steps: 15 });
  await page.mouse.down();
  await page.mouse.move(b.x + b.width * 0.42, y, { steps: 30 });
  await page.mouse.up();
  await sleep(2400);
}
await click(page.getByRole("button", { name: "Forward 10 seconds" }), { pause: 1400 });
await click(page.getByRole("button", { name: "Rewind 10 seconds" }), { pause: 1400 });
await click(page.getByRole("button", { name: "Captions" }), { pause: 2200 });
await click(page.getByRole("button", { name: "Mute" }), { pause: 1000 });
await click(page.getByRole("button", { name: "Mute" }), { pause: 800 });
await caption("<b>Pause</b> — the playback time is saved to the backend");
await click(page.getByRole("button", { name: "Pause welcome video" }), { pause: 400 });
await byTest("video-saved").waitFor();
await moveTo(byTest("video-saved"));
await sleep(2400);
await caption("<b>Refresh</b>, then press Play — it picks up where you paused", "No autoplay: the page tells you where it will resume");
await page.reload();
await scrollIntoCenter(byTest("welcome-video"));
await byTest("resume-hint").waitFor();
await moveTo(byTest("resume-hint"));
await sleep(2600);
await click(page.getByRole("button", { name: "Play welcome video" }), { pause: 3200 });
await click(page.getByRole("button", { name: "Pause welcome video" }), { pause: 1500 });

// 9. Free sample
await caption("<b>Free sample</b> — download the first chapter as a PDF");
await scrollIntoCenter(byTest("sample-pdf"));
await moveTo(byTest("sample-pdf"));
await sleep(2400);

// 10. Theme
await caption("<b>Light or dark</b> — or follow the device", "The choice is remembered");
await scrollToTop();
await click(page.getByRole("radio", { name: "Dark" }), { pause: 1400, force: true });
await scrollBy(900, 30, 30);
await sleep(1200);
await scrollBy(-900, 30, 30);
await click(page.getByRole("radio", { name: "Light" }), { pause: 1400, force: true });

// 11. My Library
await caption("<b>My Library</b> — every book, reading stats, goal and streak");
await click(page.getByRole("link", { name: "My Library" }).first(), { pause: 400 });
await byTest("library-grid").waitFor();
await sleep(2200);
await moveTo(byTest("reading-stats"));
await sleep(2000);
await caption("<b>Reading goal</b> — daily or weekly minutes");
await click(byTest("goal-card").getByRole("button", { name: "Change goal" }), { pause: 900 });
await byTest("goal-card").locator("select").selectOption("daily");
const minutes = byTest("goal-card").locator('input[type="number"]');
await click(minutes, { pause: 200 });
await minutes.fill("");
await minutes.pressSequentially("20", { delay: 120 });
await sleep(600);
await click(byTest("goal-card").getByRole("button", { name: "Save goal" }), { pause: 1800 });

await caption("<b>Search and filter</b> by title, author or reading status");
await scrollIntoCenter(byTest("library-search"));
await type(page.getByRole("searchbox", { name: "Search books" }), "alice");
await sleep(1800);
await page.getByRole("searchbox", { name: "Search books" }).fill("");
await sleep(900);
await click(page.getByRole("radio", { name: /Completed/ }), { pause: 2000, force: true });
await click(page.getByRole("radio", { name: /^All/ }), { pause: 1200, force: true });

// 12. Book details → reader
await caption("<b>Book details</b> — cover, summary, progress and actions");
await type(page.getByRole("searchbox", { name: "Search books" }), "alice");
await sleep(800);
await click(byTest("library-grid").getByRole("link").first(), { pause: 400 });
await byTest("book-details").waitFor();
await sleep(2600);
await caption("<b>Start reading</b> — a paginated reader");
await click(byTest("start-reading"), { pause: 400 });
await byTest("page-text").waitFor();
await sleep(2200);
await caption("<b>Turn pages</b> with the buttons or the ← → keys", "Your page is saved, so you can continue later on web or mobile");
await click(byTest("next-page"), { pause: 1400 });
await click(byTest("next-page"), { pause: 1200 });
await page.keyboard.press("ArrowRight");
await sleep(1300);
await page.keyboard.press("ArrowLeft");
await sleep(1300);

await caption("<b>Reading settings</b> — font size, theme (light · sepia · dark), alignment");
await click(byTest("settings-toggle"), { pause: 900 });
await click(page.getByRole("button", { name: "Increase font size" }), { pause: 800 });
await click(page.getByText("Sepia", { exact: true }), { pause: 1200 });
await click(page.getByText("Justify", { exact: true }), { pause: 1200 });
await click(byTest("settings-toggle"), { pause: 900 });

await caption("<b>Bookmark</b> the page");
await click(byTest("bookmark-toggle"), { pause: 1600 });
await caption("<b>Highlight a paragraph</b> and add a note");
await click(byTest("paragraph-1"), { pause: 900 });
await click(page.getByRole("button", { name: "Highlight yellow" }), { pause: 900 });
await type(byTest("highlight-note-input"), "Great opening — reread later");
await click(page.getByRole("button", { name: "Save" }), { pause: 1500 });
await caption("<b>All bookmarks, highlights and notes</b> in one panel");
await click(byTest("notes-toggle"), { pause: 2800 });
await click(byTest("notes-toggle"), { pause: 600 });

await caption("<b>Back on the book page</b>", "Continue reading from your page, plus the bookmarks and highlights you made");
await click(page.getByRole("link", { name: /^Back to .* details$/ }), { pause: 400 });
await byTest("book-details").waitFor();
await sleep(1500);
await scrollIntoCenter(byTest("highlight-list"));
await moveTo(byTest("highlight-list"));
await sleep(2600);

// 13. Mark as read with confirmation → syncs to the challenge
await caption("<b>Mark as read</b> (with confirmation) — it also updates the challenge");
await page.goto(`${BASE}/books/a-brief-history-of-time`);
await byTest("book-details").waitFor();
await sleep(1600);
await click(byTest("mark-read"), { pause: 900 });
await click(page.getByRole("dialog").getByRole("button", { name: "Mark as read" }), { pause: 1800 });
await caption("<b>Back on the challenge</b>: Nonfiction is now 2 of 3");
await click(page.getByRole("link", { name: "Challenge" }).first(), { pause: 400 });
await count("nonfiction").waitFor();
await scrollIntoCenter(count("nonfiction"));
await moveTo(count("nonfiction"));
await sleep(2600);
await caption("<b>Library stats</b> now include today's reading streak");
await click(page.getByRole("link", { name: "My Library" }).first(), { pause: 400 });
await byTest("goal-card").waitFor();
await moveTo(byTest("goal-card"));
await sleep(2800);

// 14. Responsive: a real phone-sized browser (390×844 at 2× like an iPhone), recorded into the same timeline
await caption("<b>Works on mobile too</b> — same app on a phone-sized screen");
await sleep(1200);
await cdp.send("Page.stopScreencast");
{
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: "light" });
  await phone.addInitScript(() => localStorage.setItem("rct-walkthrough-done", "1"));
  await phone.addInitScript(overlay);
  const mobile = await phone.newPage();
  const mcdp = await phone.newCDPSession(mobile);
  mcdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
    const file = `f-${String(++n).padStart(6, "0")}.jpg`;
    writeFileSync(join(OUT, file), Buffer.from(data, "base64"));
    frames.push({ file, t: metadata.timestamp });
    await mcdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  await mobile.goto(`${BASE}/`);
  await mobile.getByTestId("count-fiction").waitFor();
  await mobile.evaluate(() => window.__demoCaption("<b>Works on mobile too</b><small>Lists stack, controls stay finger-sized, nothing scrolls sideways</small>"));
  await mcdp.send("Page.startScreencast", { format: "jpeg", quality: 90, maxWidth: 780, maxHeight: 1688, everyNthFrame: 1 });
  await sleep(2400);
  const glide = async (dy) => {
    await mobile.evaluate((d) => window.scrollBy({ top: d, behavior: "smooth" }), dy);
    await sleep(1700);
  };
  for (const dy of [520, 560, 620, 640, 700]) await glide(dy);
  await mobile.evaluate(() => window.__demoCaption("<b>Library on a phone</b>"));
  await mobile.goto(`${BASE}/library`);
  await mobile.getByTestId("library-grid").waitFor();
  await sleep(2000);
  for (const dy of [600, 700]) await glide(dy);
  await sleep(600);
  await mcdp.send("Page.stopScreencast");
  await phone.close();
}
await startCast();

// 15. Replay the tour, then the outro
await page.goto(`${BASE}/`);
await count("fiction").waitFor();
await caption("<b>Take the tour</b> again any time from the footer");
const replay = page.getByRole("button", { name: "Take the tour" });
await scrollIntoCenter(replay);
await click(replay, { pause: 2400 });
await page.keyboard.press("Escape");
await sleep(800);
await caption(null);
await card(`<h1>Thank you</h1><p>Lantern Lane Library — Reading Challenge Tracker</p>
  <ul><li>✓ Two reading lists with counts</li><li>✓ Read / unread saved to the backend</li>
  <li>✓ Survives refresh and restart</li><li>✓ Rewards and special offer</li>
  <li>✓ Welcome video that resumes</li><li>✓ Loading and error states</li>
  <li>✓ Library, reader, notes, goals</li><li>✓ Light / dark, desktop and mobile</li></ul>
  <p style="margin-top:22px;font-size:17px">Also available as an Expo app for iOS and Android</p>`);
await sleep(5500);

await cdp.send("Page.stopScreencast");
// Hold the final card for a moment in the encoded video.
if (frames.length) frames.push({ file: frames.at(-1).file, t: frames.at(-1).t + 1.5 });
writeFileSync(join(OUT, "frames.json"), JSON.stringify(frames));
await browser.close();
console.log(`captured ${frames.length} frames into ${OUT}`);
