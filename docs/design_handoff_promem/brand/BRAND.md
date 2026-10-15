# Promem — Brand

## Name
**Promem** = **Pro**jeto + **Mem**ória (Project + Memory). It means the same thing in Portuguese and in English.

- Pronunciation: PT /pɾoˈmẽj/ · EN /ˈproʊ.mɛm/
- Descriptor (pt-BR): **Memória de projeto para arquitetura e construção.**
- Descriptor (EN, future use): *Project memory for architecture and construction.*
- Rallying line: **"Tá no Promem."** (what people say in the office: "the decision is recorded").
- Why the vertical bar: it splits the two halves of the name, and it is the same mark as the **"hoje"** (today) marker on the stage timeline. Brand and product share one sign.

## Positioning: standalone SaaS, endorsed
Promem is presented as its own product, endorsed by souBIM: **"Promem — by souBIM"**. Where each form appears:

| Surface | Lockup |
|---|---|
| Landing header | Wordmark with "by souBIM" stacked below (`promem-lockup-by-soubim.svg`) |
| Landing footer | Wordmark + "by souBIM" · copyright line "© 2026 Promem · um produto souBIM" |
| Login (not prototyped) | Endorsed lockup, centred |
| App sidebar | Wordmark only, plus the **workspace (firm) name** at the right ("Escritório Exemplo"). Keep the app chrome quiet. |
| Public client view | The **firm's** brand leads (logo + name). Promem appears only as "Feito com [wordmark]" in the footer. |
| Origin story (landing) | souBIM named in the copy: "Feito dentro da souBIM…" |

## Wordmark
Set in **Plus Jakarta Sans**. Use the outlined SVGs in this folder. Build it live in CSS only where SVG isn't possible.

Construction, for font-size `s`:
- "pro" weight **700**, then a vertical bar, then "mem" weight **500**
- letter-spacing −0.04em, line-height 1, all lowercase
- bar: width `s/14` (minimum 1 px), height `0.95·s`, horizontal margin `0.1·s` on each side, shifted down `0.06em`; vertically centred on the line box

Colours:
- On light: text `--ink #1C1E22`, bar `--accent #3E5F66`.
- On dark: text and bar both `#F4F3EF` (paper).

Sizes:
- App sidebar 19 px · landing header 22 px · public view footer 13 px.
- Minimum 13 px. Below that, use the app icon.
- Clear space: at least `0.5·s` on every side.

Don'ts:
- Never colour the halves differently.
- Never set the text in the accent.
- Never drop the bar, add a dot, capitalise, or outline it.

Endorsed lockup: "by souBIM" sits under the wordmark, left-aligned, at `0.48·s`, weight 400, `--ink-2`, with a `0.09·s` gap.

## App icon / favicon
- Construction for side `s`: a square with radius `s/6` filled `--ink`.
- Inside: lowercase **"p"** in Plus Jakarta Sans 700 at `0.62·s`, colour `#F4F3EF`, centred on its line box (so it sits slightly low, by design).
- A petrol square (`--accent`) of side `0.14·s`, placed `0.16·s` from the right and bottom edges.

## Files in this folder
| File | Use |
|---|---|
| `promem-wordmark.svg` | Primary wordmark, ink + petrol bar, outlined paths (no font needed) |
| `promem-wordmark-white.svg` | On dark backgrounds |
| `promem-lockup-by-soubim.svg` | Endorsed lockup (landing header, login) |
| `promem-wordmark.png` | 640 px wide raster, transparent (docs, e-mail) |
| `favicon.svg` | Modern browsers (`<link rel="icon" type="image/svg+xml">`) |
| `favicon-32.png`, `favicon-16.png` | Legacy fallbacks |
| `apple-touch-icon.png` | 180×180, full bleed (iOS rounds the corners itself) |
| `icon-512.png` | PWA / manifest, rounded |

Not produced yet: Open Graph image (1200×630), e-mail signature, souBIM logo files (use souBIM's own). Mark them as TODO in the code.

## Palette (brand level)
| Role | Hex |
|---|---|
| Papel (paper) | `#F4F3EF` |
| Tinta (ink) | `#1C1E22` |
| Petróleo (accent) | `#3E5F66` |
| Neutrals | `#FFFFFF`, `#F9F8F5`, `#E3E0D9`, `#CFCBC2`, `#5F6168`, `#8A8C92` |

The 15 **discipline** colours are a *product* system, not brand colours. They never appear in the logo or in marketing decoration, only on discipline markers.

## Type
- **Plus Jakarta Sans** 400/500/600/700: UI, headings, wordmark.
- **Newsreader** 400/500 (optical size 6–72): long reading such as "Por quê", AI summaries and landing body quotes.
- **IBM Plex Mono** 400/500: dates, times, counts and codes.

All three are free on Google Fonts:

`https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,400;6..72,500&family=IBM+Plex+Mono:wght@400;500&display=swap`

Self-host them in production (for LGPD/privacy and speed), for example with `@fontsource`.

## Voice
Calm, precise, specific. It is how an experienced project coordinator speaks: short sentences, concrete nouns from the trade (etapa, disciplina, ata, compatibilização, obra), no hype, no exclamation marks, no "revolucionário", no generic "IA" claims. Address the reader as "você". Full rules in `../UX-UI-GUIDELINES.md` §8.
