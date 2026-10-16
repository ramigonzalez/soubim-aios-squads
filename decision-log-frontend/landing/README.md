# Promem landing page

Static marketing page (handoff README §10, copy in `docs/design_handoff_promem/LANDING_COPY.md`). It is separate from the app bundle and is built from the app's design system (`src/design-system`) and Tailwind preset.

| Command (from `decision-log-frontend/`) | What it does |
|---|---|
| `npm run landing:dev` | Dev server on http://localhost:5174, prerendered on each request, `/api` proxied to `localhost:8000` |
| `npm run landing:build` | Type-check (`landing/tsconfig.json`) + build to `dist-landing/` (self-contained: `index.html`, CSS, JS, fonts, favicons) |
| `npm run landing:preview` | Serves `dist-landing/` on http://localhost:5180 |

## How it works
- `index.html` is the template. The `prerender` plugin in `vite.config.ts` loads `render.tsx` with Vite's SSR loader and inserts `renderToStaticMarkup(<Landing />)` in place of `<!--landing-->`. No React runtime is shipped.
- `client.ts` is the only script (about 2.5 kB gzip): CTA → form mode, WhatsApp mask, validation, submission. The FAQ is native `<details name>` (one open at a time) and the mode switch is native radios, so both work without JS.
- Product visuals (`visuals.tsx`) use the real components (`StageTimeline`, `StageStrip`, `ItemTypeIcon`, `SourceTile`, `SourceBand`, `ConsensusList`, `TranscriptTurn`…) with static demo data. They are `inert`, with a screen-reader caption.
- Copy in `[brackets]` renders as `<Placeholder>` (dashed outline). Search for `data-placeholder` in the output before publishing.
- Tokens only: `npm run lint:tokens` also scans `landing/`.

## Contact form contract
`POST ${VITE_API_BASE_URL ?? '/api'}/leads` with JSON `{ mode: 'demo'|'pilot', name, company, whatsapp, email, role, team_size, website }`.
- `whatsapp` is sent as its 11 digits (`11912345678`). `website` is a honeypot and must be empty.
- `role`: `partner|coordinator|architect|other`. `team_size`: `1-9|10-24|25-50|50+`.
- 201 shows the success state. 422 maps `detail[].loc[-1]` to pt-BR field messages. 429 and other statuses show a general message. Logic and tests: `form.ts`, `form.test.ts`.
