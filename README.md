# Reading Challenge Tracker

A small full-stack app for the **Lantern Lane Library** (a fictional library) reading challenge. One demo reader tracks two lists of three books, marks each as read or unread, and resumes a welcome video where they paused it.

- **Web**: Next.js 16 (App Router), responsive, accessible, with SEO metadata
- **API**: Node.js 24 + Fastify 5, with SQLite through the built-in `node:sqlite`
- **Mobile**: Expo SDK 58 (React Native 0.88) for iOS and Android, using the same backend and the same demo reader
- **Docker**: one multi-stage image that runs the web app and the API in **one container**, with SQLite on a volume

Extras on top of the assignment:
- **Library rewards and offer**: a bookmark for each finished list, a free tote bag with a claim code for finishing both, and a "late fees waived" deadline banner. Rewards are derived from saved progress by one shared function used by the API (`GET /api/rewards`), the web app and Expo. The offer is labelled as a demo from a fictional library.
- **Light and dark mode** on web and mobile: follows the system by default, with a remembered System / Light / Dark choice. The web app applies it before first paint, so there is no flash.
- **Glass surfaces**: translucent, blurred cards and a floating glass header over soft colour bubbles on web; Apple's Liquid Glass (`expo-glass-effect`) on iOS 26 with blur and solid fallbacks elsewhere. All fall back to solid surfaces under *Reduce transparency* or *Increase contrast*.
- **Mobile navigation**: native splash screen, a three-slide intro shown once (with Skip), and a system bottom tab bar (Challenge · Library · Video · Rewards) that uses Liquid Glass on iOS 26.
- **Reading experience** on web and mobile: see [Reading experience](#reading-experience).

## Quick start (one command)

```bash
docker compose up --build
```

Open **http://localhost:3000**. The first build takes about 2 minutes. Data persists in the `reading-data` volume.

## Five-minute reviewer walkthrough

1. **Fresh database.** Run `docker compose down -v && docker compose up --build`, then open http://localhost:3000. Fiction and Nonfiction each list three unread books and show **0 of 3 read**.
2. **Mark Matilda read and refresh.** Click *Matilda*. The row shows *Saving…*, then a green ✓ and **Read**, and Fiction shows **1 of 3 read**. Refresh: Fiction is still **1 of 3**, Nonfiction **0 of 3**.
3. **Video resume.** Press **Play**, drag the seek bar to about 0:12, then press **Pause**. *Saved your place at 0:12.* appears. Refresh: the player stays paused and says *Press Play to pick up at 0:12*. Press **Play** and playback continues from about 12 s.
4. **Recreate the container with the same volume.**
   ```bash
   docker compose down && docker compose up -d
   ```
   (Or `docker rm -f reading-challenge` followed by `docker compose up -d`.) Refresh: Matilda is still read and the video still resumes near 12 s. Running `docker compose down -v` deletes the volume and resets everything.
5. **Same progress in Expo.**
   ```bash
   npm ci
   npm run mobile
   ```
   Press `i` for the iOS simulator or `a` for the Android emulator, or scan the QR code with Expo Go on a phone. On first launch, tap **Skip** on the intro. The Challenge tab shows Fiction **1 of 3** with Matilda read, and the Video tab offers to resume at 0:12. Toggle a book in Expo and refresh the web page: the change is there too. See [Expo and the API URL](#expo-and-the-api-url) if the app can't reach the backend.

6. **Read a book.** Open **My Library** in the web header, choose *The Secret Garden*, press **Start reading** and turn two pages. On the phone, open the **Library** tab: *Continue reading* shows the same page, and the reader opens there with the same settings.

## Reading experience

Everything below works the same on web (`/library`, `/books/:id`, `/books/:id/read`) and mobile (Library tab → book → reader). Both clients use one API client (`packages/shared/src/client.ts`) and the same pure logic (`packages/shared/src/reading.ts`). All reading state lives on the server, so you can start on one device and continue on the other.

| Feature | Web | Mobile |
| --- | --- | --- |
| Library: covers, title, author, category, summary, status badge, % + progress bar | ✓ | ✓ |
| Filters (All / Not Started / Currently Reading / Completed) with counts, and search (title/author/category; ignores case and accents) | ✓ | ✓ |
| Stats (total, reading, completed, pages read, reading time), daily or weekly goal, streak | ✓ | ✓ |
| Continue Reading and Recently Read rows | ✓ | ✓ |
| Details: cover, metadata, description, chapters, progress, time read, last read | ✓ | ✓ |
| Start / Continue / Read again; manual "I'm on page __" for books that can't be read in the app | ✓ | ✓ |
| Mark as Read with confirmation, Mark as unread, Reset progress with confirmation (bookmarks, highlights and notes are kept) | ✓ (`<dialog>`) | ✓ (native alert) |
| Reader: Previous/Next, page X of Y, progress bar, chapter titles | ✓ + ← / → keys + swipe | ✓ + swipe |
| Settings: font size, font style (serif/sans/mono), Light/Dark/Sepia, line spacing, alignment, background tint; saved per reader | ✓ | ✓ |
| Bookmarks, paragraph highlights in 4 colours with notes, book notes, jump to page | ✓ (click) | ✓ (long-press) |
| Automatic progress: resume page, Not Started → Currently Reading → Completed at the last page, "You finished …" dialog | ✓ | ✓ + haptics |
| Reading-time tracking: only while visible and active (2-minute idle cut-off), saved every 15 s, max 60 s per save | ✓ | ✓ (`AppState`) |

**What can be read in the app**
- Only public-domain texts are bundled: *The Secret Garden* and *The Story of My Life* (challenge books), plus *Alice's Adventures in Wonderland*, *The Wind in the Willows*, *Peter Pan* and *Walden* in My Library.
- *The Hobbit*, *Matilda*, *A Brief History of Time* and *The Diary of a Young Girl* are still in copyright. They get details, notes and bookmarks, and manual page tracking against a typical print page count (shown with "~").
- Pages are fixed on the server (about 1,800 characters, cut at paragraph boundaries), so page numbers, bookmarks and highlights match on every device and font size.
- "Completed" is the same flag as the challenge checkbox. Finishing *The Secret Garden* in the reader ticks it in the Fiction list and counts toward rewards.

**Local demo text (optional, private).** To read a PDF you own in the app, for example while testing:

```bash
npx tsx scripts/import-local-book.mts "/path/to/book.pdf" --title "Title" --author "Author"
```

While `apps/api/content/local/override.json` exists, every book opens that text, and the UI says so. The file is git-ignored and Docker-ignored, so copyrighted text is never committed or shipped. Delete the folder to go back to the public-domain texts. Tests and E2E always ignore it (`CONTENT_OVERRIDE=""`).

## Prerequisites

| For | You need |
| --- | --- |
| Docker quick start | Docker 24+ with Compose v2 |
| Local development and tests | Node.js **≥ 22.13** (24 LTS recommended; tested on 25.2) and npm 10+ |
| Expo | The Expo Go app on a phone, Xcode's iOS Simulator, or an Android emulator |

## Environment variables

| Variable | Used by | Default | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | web (build time) | `http://localhost:3000` | Absolute public URL for the canonical link, Open Graph/Twitter image URLs, `robots.txt` and `sitemap.xml`. Set it to the deployed origin, e.g. `NEXT_PUBLIC_SITE_URL=https://reading.example.org docker compose up --build`. |
| `API_INTERNAL_URL` | web (build time) | `http://127.0.0.1:4000` | Where Next.js forwards `/api/*`. |
| `DATABASE_PATH` | API | `./data/reading.db` locally, `/data/reading.db` in Docker | SQLite file location. |
| `API_PORT` / `API_HOST` | API | `4000` / `0.0.0.0` locally, `127.0.0.1` in Docker | API listen address. |
| `PORT` / `HOSTNAME` | web (Docker) | `3000` / `0.0.0.0` | Public web server address. |
| `CORS_ORIGIN` | API | unset (same-origin only) | Comma-separated origins, or `*`, if a browser needs to call the API directly. Expo native apps don't need it. |
| `EXPO_PUBLIC_API_URL` | Expo | auto-detected (see below) | Base URL of the backend's public entry point. |

## Local development (without Docker)

```bash
npm ci
npm run dev        # API on :4000 (tsx watch) + Next.js dev server on :3000
```

Open http://localhost:3000. The browser only ever calls `/api/...` on its own origin, and Next.js forwards those requests to the API. To run the production build locally, use `npm run build && npm start`; `npm start` runs the same supervisor script as the container.

### Expo and the API URL

The Expo app talks to the backend's **public entry point**: port 3000 from Docker, or `npm run dev`. That one origin serves `/api/*`, the video and the PDF. The app picks a base URL in this order:

1. `EXPO_PUBLIC_API_URL`, if set.
2. Otherwise, the LAN address of your computer that Expo already uses to serve the JavaScript bundle (`hostUri`), on port 3000. Expo Go on a phone on the same Wi-Fi therefore works without configuration.
3. Otherwise, `http://localhost:3000` on the iOS simulator, or `http://10.0.2.2:3000` on the Android emulator.

```bash
# Physical phone (find your computer's LAN IP: macOS `ipconfig getifaddr en0`, Linux `hostname -I`)
EXPO_PUBLIC_API_URL=http://192.168.1.20:3000 npm run mobile
# Android emulator (10.0.2.2 is the emulator's alias for the host machine)
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000 npm run mobile
```

**Why not `localhost` on a phone?** On a phone, `localhost` means the phone itself, not your computer. The phone has to use your computer's address on the shared network, and port 3000 must be reachable through the computer's firewall. The Android emulator runs in its own virtual network, where the host machine is `10.0.2.2`. Only the iOS simulator shares the Mac's network, so `localhost` works there. Expo development stays outside the production container.

## Tests and checks

```bash
npm run lint           # ESLint (TypeScript, React hooks, jsx-a11y)
npm run typecheck      # tsc in every workspace
npm test               # shared + API + web + Expo unit/integration tests
npx playwright install chromium   # once
npm run test:e2e       # Playwright E2E against the production build (needs ports 3100 and 4000 free)
npm run docker:smoke   # builds the image and checks persistence across container recreation
npm run check:contrast # WCAG contrast for light, dark and text-on-glass
```

| Suite | Where | What it covers |
| --- | --- | --- |
| Shared (Vitest, 26) | `packages/shared/src/*.test.ts` | Save state machine: pending keeps the confirmed value, duplicate in-flight saves are ignored, row and count update together, failures are retryable, and a save that completes a list announces the reward. Schema rejects `null`, `0`, `1`, `"false"` and extra keys. Rewards: thresholds, a stable claim code, no tote unless both lists are present, the offer's day count and ended state. Reading: status derivation, percentages, filtering and search, streaks across gaps and month ends, daily and weekly goals, date/duration formatting, preference validation. |
| API integration (Vitest, 47) | `apps/api/test/*.test.ts` | Runs `fastify.inject` against a **temporary SQLite file per test**. Fresh DB: 2 lists, 3 unread books each, 0 of 3. Read/unread, a repeated identical PATCH, independent counts, 404 for an unknown ID, 400 for missing/`null`/`0`/`1`/`"false"`/`"true"`/array/extra keys/malformed JSON, the error shape, `no-store`, restart persistence, seeding never overwriting saved data, video progress including seeking backward and invalid values, and `GET /api/rewards` (all locked on a fresh DB, Fiction-only unlock, the tote claim code, re-locking after un-reading).
Reading:
- library (10 books, `/api/books` still 6) and pages (range, 409 for copyrighted)
- progress (status transitions, resume page, the 60 s cap, last page → Completed, re-reading)
- Mark as Read + reset keeping notes and bookmarks
- bookmark, highlight and note CRUD, with validation and 404s
- preferences, and stats (streak, goal, Continue/Recent order)
- the **v1 → v2 migration of an existing database**, and the local override
- pagination |
| Web components (Vitest + Testing Library, 23) | `apps/web/test/*.test.tsx` | Loading state; initial load failure and Retry; saving keeps the confirmed value and count; duplicate clicks; other books stay usable; failure message and Retry; keyboard Space; video resume applied only after both metadata and fetch, never saving 0; saving on pause, including after seeking backward; save failure and retry; load vs playback failure; the theme toggle (radio group, arrow keys, `data-theme`, remembered choice); the offer banner with a fixed clock (days left and ended); a reward unlock and its announcement. Reading: library filters, search, empty and error states; Mark as Read confirm and cancel; reset confirm; manual page tracking; the reader resuming, paging with buttons and arrow keys, saving progress, changing settings, bookmarking, highlighting with a note. |
| Expo (jest-expo + RNTL, 17) | `apps/mobile/__tests__` | The same list behaviours on React Native with accessibility roles and states (checkbox, checked, busy); video resume without autoplay; saving on pause and rewind; save, load and playback failures; lists still usable when the video fails. Also: reward unlock and announcement, the offer banner, the appearance setting saved to storage, and the **real expo-router tree**: the intro on first launch, Skip, Next → Get started, and no intro once seen. Reading: Library stats, filters and search; details Mark as Read via the native alert; the reader resuming on the saved page, turning pages, saving progress and settings, and long-press highlighting. |
| E2E (Playwright, 45 + 1 skipped) | `e2e/*.spec.ts` | Real production build and real API on a fresh temp DB per test. Fresh 0 of 3; Matilda read, refresh, unread; keyboard-only with a visible focus ring; failed save via a routed 500 and Retry; load failure and recovery; **an actual API process restart**; a cross-client update through the API (the path Expo uses); **play, seek to 12 s, pause, refresh, Play resumes near 12 s**; seeking backward; video load, playback and save failures; desktop side-by-side and Pixel 7 stacked layout; touch targets; accessible names; reduced motion (0 s transitions); 150–220 ms default motion; rendered SEO tags; OG image size and type; robots and sitemap; PDF download (`%PDF-`); system dark mode; a manual theme choice surviving a reload even with JavaScript blocked (no flash); backdrop blur on the glass header and cards, with a sticky header; the offer banner; Fiction completion unlocking the bookmark; and all six books unlocking the tote with the same claim code as `GET /api/rewards`.
Reading:
- library search and filters
- read two pages → refresh → **Continue reading resumes on page 3**
- keyboard paging; settings persisting after a reload and in the API
- bookmark + highlight + note visible after a reload
- **finishing the last page completes the book and ticks the challenge**
- Mark as Read with confirmation, then reset; manual page tracking
- progress made through the API (the Expo path) showing on the web

The skipped test is the desktop-only layout check in the mobile project. |
| Docker smoke | `scripts/docker-smoke.sh` | Builds the image, runs one container, saves Matilda and 12.3 s, stops it (SIGTERM exit 0), **removes it, starts a new container on the same volume**, and checks both values, reading progress and the bundled public-domain texts (and that no local override text is in the image) plus `/api/rewards`, the HTML, OG image, robots, sitemap, PDF, video range requests and `no-store`. |

The E2E suite plays the app's own local clip, so it never depends on a third-party media host. Chromium uses the WebM source, and Safari and iOS use the MP4.

## API

All responses are JSON with `Cache-Control: no-store`. Errors always look like `{"error":{"code":"…","message":"…"}}`.

| Method and path | Body | Success | Errors |
| --- | --- | --- | --- |
| `GET /api/health` | — | `{"ok":true}` (also checks the DB) | 503 |
| `GET /api/books` | — | `{"lists":[{"id":"fiction","title":"Fiction","readCount":1,"total":3,"books":[{"id":"matilda","listId":"fiction","title":"Matilda","author":"Roald Dahl","read":true,"updatedAt":"…"}, …]}, …]}` | — |
| `PATCH /api/books/:id` | `{"read": true}` or `{"read": false}` | `{"book":{…},"list":{"id","title","readCount","total"},"message":"Matilda marked as read. Fiction: 1 of 3 read."}` | 404 `BOOK_NOT_FOUND`; 400 `INVALID_STATUS` (missing, `null`, `0`, `1`, `"false"`, other keys); 400 `INVALID_JSON` |
| `GET /api/video-progress` | — | `{"positionSeconds":12.4,"updatedAt":"…"}` (0 and `null` when nothing is saved) | — |
| `PUT /api/video-progress` | `{"positionSeconds": 12.4}` (a finite number from 0 to 21600) | The saved value | 400 `INVALID_POSITION` |
| `GET /api/library` | — | `{"books":[{id,title,author,category,year,summary,description,listId,readable,pagesApprox,contentNote,cover,progress:{status,currentPage,furthestPage,totalPages,percent,secondsRead,startedAt,lastReadAt,completedAt}}]}` | — |
| `GET /api/books/:id/details` | — | `{book, chapters:[{title,startPage}], counts:{bookmarks,highlights,notes}}` | 404 `NOT_FOUND` |
| `GET /api/books/:id/pages/:n` | — | `{bookId,page,totalPages,chapterTitle,paragraphs}` | 404 `PAGE_OUT_OF_RANGE`; 409 `NOT_READABLE` |
| `PUT /api/books/:id/progress` | `{"page":12,"secondsDelta":15,"day":"2026-11-27"}` | `{progress, justCompleted}` (the last page completes the book) | 400 `INVALID_BODY`; 404 |
| `DELETE /api/books/:id/progress` | — | `{progress}`: back to Not Started (bookmarks, highlights and notes kept) | 404 |
| `GET/POST /api/books/:id/bookmarks`, `DELETE /api/bookmarks/:id` | `{"page":4,"label?":"…"}` | bookmark(s) | 400, 404 |
| `GET/POST /api/books/:id/highlights`, `PATCH/DELETE /api/highlights/:id` | `{"page":4,"paragraph":0,"color":"yellow|green|blue|pink","note?":"…"}` | highlight(s) with excerpt | 400, 404, 409 |
| `GET/POST /api/books/:id/notes`, `PATCH/DELETE /api/notes/:id` | `{"text":"…","page?":4}` | note(s) | 400, 404 |
| `GET/PUT /api/reader/preferences` | `{fontSize,fontFamily,theme,lineSpacing,align,background,goal:{period,minutes}}` | preferences | 400 |
| `GET /api/reading/stats?today=YYYY-MM-DD` | — | `{totalBooks,reading,completed,notStarted,pagesRead,secondsRead,streak,goal,continueReading,recentlyRead}` | 400 |
| `GET /api/rewards` | — | `{"rewards":[{"id":"fiction-bookmark","title","description","current":3,"total":3,"unlocked":true,"claimCode":null}, …, {"id":"challenge-tote",…,"claimCode":"LANTERN-XXXX"}],"offer":{"endsAt":"2027-01-31T23:59:59Z","daysLeft":66,"ended":false}}` | — |

PATCH is idempotent: sending the same status twice returns the same status and count and doesn't change `updatedAt`. An unknown ID returns 404 before the body is validated.

```bash
curl -X PATCH localhost:3000/api/books/matilda -H 'content-type: application/json' -d '{"read":true}'
```

## Storage

- SQLite runs in WAL mode. The tables are `books` (the fixed catalogue), `reading_status (reader_id, book_id, read, updated_at)` and `video_progress (reader_id, position_seconds, updated_at)`. There is one demo reader, `demo-reader`.
- On every start the API seeds with `INSERT OR IGNORE`. A fresh database gets six unread books, and a database that already exists is never overwritten.
- The web page shell is static. The browser fetches reader progress with `cache: "no-store"` and the API marks every response `no-store`, so progress never ends up in static HTML, shared caches, or search and social metadata. Both clients do a fresh fetch on load, so each sees changes saved by the other.

## Docker: one image, one container

```
container :3000 ── Next.js standalone server (pages, /media, /downloads, SEO files)
                     └─ rewrites /api/* ─► 127.0.0.1:4000  Node API (Fastify + SQLite at /data/reading.db)
```

- `Dockerfile` has four stages: install → build (shared, API, Next.js standalone) → production-only API dependencies → `node:24-alpine` runtime running as a non-root user.
- `docker/start.mjs` is a small supervisor, run under `tini` as PID 1. It starts both processes, forwards SIGTERM and SIGINT so Fastify closes and SQLite is closed cleanly, and exits non-zero if either process dies so the restart policy takes over.
- There is one public port (3000). `/api` works on that same port. The API port is internal only.
- `HEALTHCHECK` calls `/api/health` through the public port, which exercises both processes.
- `VOLUME /data` holds the SQLite file.

The equivalent commands without Compose:

```bash
docker build -t reading-challenge-tracker .
docker volume create reading-data
docker run -d --name reading-challenge -p 3000:3000 -v reading-data:/data reading-challenge-tracker
# recreate with the same data:
docker rm -f reading-challenge
docker run -d --name reading-challenge -p 3000:3000 -v reading-data:/data reading-challenge-tracker
```

To build for a public URL, pass `--build-arg NEXT_PUBLIC_SITE_URL=https://your-domain`.

## Publishing and deployment

The repository is set up for GitHub but not yet pushed. No live deployment exists, so no live URL is claimed.

```bash
git remote add origin git@github.com:<you>/reading-challenge-tracker.git
git push -u origin main
# then add the reviewer under Settings → Collaborators (or make the repository public)
```

Live deployment with persistent storage, for example on Fly.io, uses the same Dockerfile:

```bash
fly launch --no-deploy --name <app-name>    # accept the Dockerfile; internal port 3000
fly volumes create reading_data --size 1
# add to fly.toml:
#   [mounts]
#     source = "reading_data"
#     destination = "/data"
#   [build.args]
#     NEXT_PUBLIC_SITE_URL = "https://<app-name>.fly.dev"
fly deploy
```

After deploying, check on the live URL that a book toggle survives a refresh and a `fly machine restart`, and that the video resumes near the paused point. Render or Railway work the same way: a Docker service plus a persistent disk mounted at `/data`.

## Requirement → implementation → test

| Requirement (assignment PDF and brief) | Implementation | Verified by |
| --- | --- | --- |
| Both lists on one page or screen, three unread books each | `apps/web/components/BookList.tsx`, `apps/mobile/src/components/ListCard.tsx`, seed in `apps/api/src/db.ts` | API "fresh database"; E2E "fresh database"; Expo "loads both lists" |
| Mark read and unread; live count per list | Shared `booksReducer`, with `useBooks` on web and mobile | API read/unread; web, Expo and E2E toggle tests |
| Fetch and update through the backend; persist across refresh and restart | Fastify routes + SQLite file | API "survives a server restart"; E2E refresh and "actual API server restart"; Docker smoke recreate |
| Reject unknown IDs and non-boolean statuses; idempotent | `UpdateBookBodySchema` (strict zod) and the PATCH route | API 404/400 table and idempotency test; Docker smoke |
| Keep the last saved value visible on failure; retry; no duplicate in-flight saves | Reducer keeps `lists` confirmed-only, with `pending`/`errors` maps | Shared, web and Expo reducer tests; E2E "failed save … Retry succeeds" |
| Welcome video with play, pause and seek | `WelcomeVideo` (web: custom Play/Pause and seek slider; Expo: Play/Pause, ±10 s) | Web, Expo and E2E video tests |
| Save the position on pause; resume after refresh without autoplay; initialisation never writes 0 | `useVideoProgress` / `useWelcomeVideo` apply the resume once, after metadata **and** fetch | Web "applies the saved position only after…"; Expo "never saves 0"; E2E resume and seek-backward |
| Loading state and clear load, save and playback errors | `ReadingChallenge`, `WelcomeVideo`, `Notice` | Web, Expo and E2E error tests |
| Desktop and mobile layout | CSS grid (side by side from 760 px), compact player | E2E desktop and Pixel 7 layout tests |
| Accessibility | Native checkboxes and labels, live region, visible focus, 44–48 px targets, ✓ plus text, reduced motion, captions track | E2E a11y tests, `npm run check:contrast`, jsx-a11y lint |
| SEO | `app/layout.tsx` metadata, `robots.ts`, `sitemap.ts`, `og-image.png` | E2E "SEO and assets" |
| Sample PDF | `public/downloads/the-secret-garden-chapter-1.pdf` (public-domain text) | E2E PDF download; Docker smoke |
| Docker bonus: one image, one container | `Dockerfile`, `docker/start.mjs`, `compose.yaml` | `scripts/docker-smoke.sh` |
| Expo parity, same reader and backend | `apps/mobile` | Expo tests; manual run on the iOS simulator (below) |
| *Extra:* rewards and offer | `packages/shared/src/rewards.ts`, `GET /api/rewards`, web `Rewards`/`OfferBanner`, Expo Rewards tab | Shared, API, web, Expo and E2E reward tests |
| *Extra:* light/dark mode | Web `light-dark()` tokens + `ThemeToggle` + inline head script; Expo `ThemeProvider` | Web and Expo theme tests; E2E dark mode and no-flash reload; contrast check for both palettes |
| *Extra:* glass surfaces | Web `.glass` utility + `.bubbles`; Expo `GlassSurface` (Liquid Glass → blur → solid) | E2E backdrop-filter check; contrast for text on glass; simulator screenshots |
| *Extra:* splash, intro, bottom tabs | `app.json` splash plugin; `app/onboarding.tsx`; `app/(tabs)/_layout.tsx` (native tabs) | Expo router tests; simulator run |

## Verification log

**Automated checks that ran and passed** (Node 25.2, macOS, Docker 29):
- `npm run lint`, `npm run typecheck` and `npm run build`
- `npm test`: 26 shared + 47 API + 23 web + 17 Expo = 113 tests
- `npm run test:e2e`: 45 passed and 1 skipped by design, on desktop Chrome and Pixel 7 profiles
- `npm run docker:smoke`: all checks passed, including persistence after `docker rm` and recreation on the same volume
- `npm run check:contrast`: all 106 pairs pass across the light and dark palettes and the Light/Dark/Sepia reader themes (on every background tint), including body, muted and mango text on glass over the brightest background bubble. Text is at least 4.5:1; UI parts, focus and the progress fill are at least 3:1.

**Manual checks performed:**
- In a browser against the dev server: marked Matilda read, refreshed and saw 1 of 3 / 0 of 3; played, sought to 12.7 s, paused, refreshed, pressed Play, and playback continued from 12.7 s.
- **Web → Expo on the iOS simulator** (iPhone 17, iOS 26.2, Expo Go) against `docker compose up`: Matilda and 12.4 s were saved through the API. The Expo app showed Fiction 1 of 3 with Matilda read and *Press Play to pick up at 0:12*. Tapping *The Hobbit* in Expo updated the backend (Fiction 2 of 3). Pressing Play played from 12.4 s, and Pause saved 15.4 s.
- **New mobile features on the iOS simulator** (iPhone 17, iOS 26.2, Expo Go, against `npm run dev`):
  - The intro appeared on first launch, and Next → Next → Get started opened the tabs.
  - The system tab bar and cards rendered with Liquid Glass.
  - The Rewards tab matched the web (Fiction bookmark unlocked after finishing Fiction on the web).
  - Switching the simulator to dark mode re-themed the app. Choosing *Light* in Settings overrode the dark system setting.
  - After a relaunch, there was no intro and Light was still selected.
- **New web features in the browser:** System mode followed a dark OS theme; the toggle switched to Light; the glass header stayed sticky while scrolling; finishing Fiction unlocked the bookmark and the live region announced it, and `/api/rewards` agreed.

- **Reading, web ⇄ iOS simulator** against `npm run dev`, with the local demo text loaded:
  - On the web: opened Walden, turned pages, switched to Sepia at 20 px, and highlighted a paragraph in green with a note.
  - In Expo Go: the Library tab showed Walden under Continue reading at page 5 with the same stats and streak. The reader opened on page 5 in Sepia at 20 px with the green highlight and its note marker.
  - On the phone: Next saved page 6, and a long-press blue highlight reached the backend next to the web one.

**Not verified here:**
- A physical phone and the Android emulator, which need a device. On Android, the glass cards are translucent tinted surfaces rather than real blur, and that path hasn't been seen on a device.
- The **custom splash screen**. Expo Go shows its own launch screen, so the app's splash (icon on ivory, or charcoal in dark mode) only appears in a development or production build (`npx expo run:ios` or EAS), which wasn't built here.
- The GitHub push and a live deployment, which need credentials; no live URL exists.
- Screen-reader output with VoiceOver or TalkBack. Roles, names, states and live regions are asserted in tests, but no screen reader was used.

## AI disclosure

This project was built with an AI coding assistant (Claude). It helped with the project structure, the API, web and Expo code, the tests, the Docker setup, the asset pipeline and this README. A person directed the work and chose the scope, for example using a longer locally hosted clip instead of the 10-second sample so the "pause near 12 s" step works.

**One behaviour verified concretely:** that player start-up can't overwrite a saved timestamp with 0. The first E2E run found a real bug: the production build can fire `loadedmetadata` before React hydrates, so the player never learned its duration and the seek bar stayed disabled. It was fixed by syncing the media element's state once after hydration (`WelcomeVideo.tsx`) and re-verified. The E2E test now asserts that after a refresh the saved position is still the paused value, the player is paused, and pressing Play resumes between 0.5 s before and 3 s after that point.

## Known limitations

- There is one hard-coded demo reader and no sign-in, as the brief specifies. The schema already keys status by `reader_id`.
- `NEXT_PUBLIC_SITE_URL` and the API rewrite target are fixed at build time. Rebuild the image for a different public URL.
- The Expo video uses app-level controls (Play/Pause, ±10 s) instead of native controls, so the save-on-pause logic is reliable. A free-drag scrubber is web-only.
- The web player has a captions track describing non-speech audio (the clip has no dialogue). The Expo player has none.
- `node:sqlite` still prints an ExperimentalWarning on Node 22–25. The container suppresses it.
- `npm audit` reports 22 moderate advisories, all in development tooling (Jest, `jest-expo` and Expo CLI's `@expo/fingerprint`, through `glob`/`minimatch`). None are in the Docker image's dependencies, and the suggested "fix" downgrades Expo.
- The offer and rewards are a demo: the deadline is a constant in `packages/shared/src/rewards.ts`, and claim codes are deterministic per reader. Nobody verifies a code at a front desk.
- Copyrighted books are tracked, not readable. Their page totals are typical print editions ("~"). Highlights are paragraph-level, not word-level, so they behave the same on web and mobile.
- Reading time only counts while the reader is visible and touched or scrolled within the last 2 minutes. Streaks and goals use the device's local date, sent with each save.
- Liquid Glass needs iOS 26. Earlier iOS versions get a system blur, and *Reduce transparency* gets solid cards.
- The fonts are fetched from Google Fonts at build time (`next/font`), so `docker build` needs network access.
