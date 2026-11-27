# Asset credits and licences

Every third-party asset is served from this repository, so nothing depends on a hotlinked host.
`scripts/build-assets.mjs` regenerates the derived files from the original downloads (the outputs are committed).

| File (served at) | What it is | Creator | Source | Licence | How it is used |
| --- | --- | --- | --- | --- | --- |
| `apps/web/public/media/welcome.mp4`, `welcome.webm`, `welcome-poster.jpg` | 45-second excerpt (0:20–1:05) of *Big Buck Bunny*, re-encoded at 640×360 (H.264/AAC and VP9/Opus), plus a poster frame | Blender Foundation (Peach open movie project), www.bigbuckbunny.org | https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_640x360.m4v.zip | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/): redistribution and modification allowed with attribution | Welcome video on web and Expo. Attribution appears under the player and in the page footer. |
| `apps/web/public/media/welcome.en.vtt` | Captions describing the non-speech audio | Written for this project | — | Created for this project | `<track kind="captions">` on the web player |
| `apps/web/public/images/reading-room.webp` | Photo of the library at Arundel Castle, cropped and resized to 960×640 WebP (139 KB) | Andy Li (Wikimedia user "Onthewings") | https://commons.wikimedia.org/wiki/File:Library,_Arundel_Castle_2026-05-14.jpg | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) public-domain dedication (checked on the file page: LicenseShortName "CC0", AttributionRequired "false") | Decorative hero image on desktop web (`alt=""`). The page hides it if it fails to load. Credited here as a courtesy. |
| `apps/web/public/downloads/the-secret-garden-chapter-1.pdf` | **"The Secret Garden — Chapter I: There Is No One Left"**, a 6-page A5 PDF (12 KB) | Text: Frances Hodgson Burnett (1849–1924). Typeset for this project with `pdf-lib` and the standard Times fonts | Text taken from Project Gutenberg eBook #113 (mirror: https://gutenberg.pglaf.org/1/1/113/113-0.txt). The Gutenberg header, footer and trademark are not included. | **Public domain.** First published 1911; the author died in 1924, so the work is public domain in the US and in life+70 countries. This PDF edition is a new typesetting of that public-domain text, not a copy of anyone else's PDF, and it may be redistributed freely. | "Download sample PDF" link on web and Expo. Only this chapter is offered; none of the other listed books has a download. |
| `apps/web/public/og-image.png` (1200×630), `icon.svg`, `apple-icon.png`, `apps/mobile/assets/icon.png` | Social preview image and app icon | Original artwork drawn as SVG in `scripts/build-assets.mjs` | — | Created for this project | Open Graph / Twitter card, favicon, Expo app icon |

## Reader texts (public domain)

`apps/api/content/*.json` are paginated from Project Gutenberg plain-text files (mirror `gutenberg.pglaf.org`), used only as a text source. The Gutenberg header, footer, licence and trademark text are removed. All six works are public domain in the US (published before 1930), and their authors died more than 70 years ago:

| Book | Author (died) | First published | Gutenberg # |
| --- | --- | --- | --- |
| The Secret Garden | Frances Hodgson Burnett (1924) | 1911 | 113 |
| The Story of My Life (Part I, Keller's own chapters) | Helen Keller (1968)¹ | 1903 | 2397 |
| Alice's Adventures in Wonderland | Lewis Carroll (1898) | 1865 | 11 |
| The Wind in the Willows | Kenneth Grahame (1932) | 1908 | 289 |
| Peter Pan | J. M. Barrie (1937)² | 1911 | 16 |
| Walden | Henry David Thoreau (1862) | 1854 | 205 |

¹ *The Story of My Life* (1903) is public domain in the US because it was published before 1930. In countries that use life + 70 years, Keller's works enter the public domain in 2039. Check local rules before redistributing it outside the US.

² *Peter Pan* is public domain, but in the UK the Copyright, Designs and Patents Act 1988 (Schedule 6) gives Great Ormond Street Hospital a perpetual right to royalties for public performance and commercial publication of the play and its adaptations. A non-commercial demo is unaffected; a commercial UK release would need to account for it.

Book covers are original typographic artwork generated from `packages/shared/src/covers.ts`, not publisher covers. Book descriptions were written for this app.

The optional local demo text (`apps/api/content/local/`) is the user's own file. It is git-ignored and Docker-ignored, and it isn't part of this repository.

## Icons, badges and decorative elements

The theme-toggle icons, reward badges, offer star and background bubbles on the web are drawn in CSS/SVG for this project. The mobile tab icons are system SF Symbols (iOS) and Material Symbols (Android) rendered by the OS. Intro and reward emoji are the platform's system emoji font. No new third-party files were added for these features. The splash image reuses the app icon from the table above.

## Fonts

The web app uses **Fraunces** (headings) and **Public Sans** (body), self-hosted at build time by `next/font/google`. Both are under the [SIL Open Font License 1.1](https://openfontlicense.org/). The Expo app uses the platform's system fonts (Georgia/serif for headings).

## What was checked

- **Video**: the project's licence page (https://peach.blender.org/about/) states Creative Commons Attribution 3.0 (`licenses/by/3.0`). The excerpt is attributed wherever it plays.
- **Photo**: the licence was read from the individual Commons file's metadata (`extmetadata`), not assumed from a search result.
- **PDF**: the PDF rights were checked for this specific edition. The file starts with `%PDF-1.7`, has 6 pages, and opens as a PDF. Automated checks: `e2e/seo-assets.spec.ts` checks the content type, the magic bytes and the size; `scripts/docker-smoke.sh` checks the file served by the container.
