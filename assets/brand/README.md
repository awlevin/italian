# Brand assets

Every picture here is drawn from a source in this folder, so a palette or copy
change is an edit and a re-run, never a hand-exported PNG.

| Source | Output |
| --- | --- |
| `banner.html` | `banner.png` (1280×640): the README banner and the GitHub social preview |
| `og.html` | `src/app/opengraph-image.png` (1200×630) and its alt text |
| `icon.svg` | `src/app/icon.svg`, `src/app/favicon.ico` (16, 32, 48), `src/app/apple-icon.png` (180, square to the edge), `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png` (mark inside the 80% safe circle) |

```bash
pnpm brand          # node assets/brand/render.mjs
pnpm screenshots    # tsx assets/brand/screenshots.ts → assets/screenshots/
```

`render.mjs` serves this folder on a local port, screenshots each page with
Playwright at its exact size, draws each icon from `icon.svg`, packs the
`.ico`, and fails if a font did not load, if anything spills out of the frame
or wraps, or if any output has the wrong size.

`screenshots.ts` needs the dev server on http://localhost:3311 (or
`E2E_BASE`). It signs in as the e2e test user, stubs `/api/progress` with a
fixed mid-course snapshot and swallows `/api/sync`, so the pictures are the
same every run and real progress is never touched. The GIF needs `ffmpeg`.

`brand.css` copies the "Affresco" tokens from `src/app/globals.css`; change
them there first. The mark is a gold-leaf arch bridge on lapis, with one of
the gold stars from the app's night sky.

`fonts/` holds Fraunces, Instrument Sans and JetBrains Mono (the Latin subsets
Google Fonts serves), so rendering needs no network. All three are under the
SIL Open Font License; the licences sit beside them.
