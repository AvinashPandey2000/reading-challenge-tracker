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

## Fonts

The web app uses **Fraunces** (headings) and **Public Sans** (body), self-hosted at build time by `next/font/google`. Both are under the [SIL Open Font License 1.1](https://openfontlicense.org/). The Expo app uses the platform's system fonts (Georgia/serif for headings).

## What was checked

- **Video**: the project's licence page (https://peach.blender.org/about/) states Creative Commons Attribution 3.0 (`licenses/by/3.0`). The excerpt is attributed wherever it plays.
- **Photo**: the licence was read from the individual Commons file's metadata (`extmetadata`), not assumed from a search result.
- **PDF**: the PDF rights were checked for this specific edition. The file starts with `%PDF-1.7`, has 6 pages, and opens as a PDF. Automated checks: `e2e/seo-assets.spec.ts` checks the content type, the magic bytes and the size; `scripts/docker-smoke.sh` checks the file served by the container.
