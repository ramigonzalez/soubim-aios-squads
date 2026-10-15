# Promem — UX/UI guidelines

> This file replaces `docs/ux/UX-UI-GUIDELINES.md` in the product repo. It is the rulebook for **every screen**, including the ones that have no prototype.
>
> The live platform has features the prototypes don't show. Build those from the same tokens, components and patterns described here. If something genuinely needs a new pattern, add it to the component library (with tokens, states and docs) instead of styling it locally.

---

## 1. Principles
1. **Ink on paper.** The interface is neutral. Colour belongs to the disciplines. The single accent (petróleo) marks focus, selection, links and "hoje", and nothing else.
2. **Never colour alone.** A discipline always has its code or name. A type always has its icon. Status always has an icon and text. Impact has bars and text.
3. **Dense within groups, generous between them.** Gaps of 4–12 px inside a group and 24–48 px between groups, like a well-composed drawing sheet.
4. **Rows, not cards.** List views show 10–15 items per screen at 1440×900. Cards are only for summary tiles, dialogs and marketing.
5. **Progressive disclosure.** The row carries a summary. Details open in the side panel, so the list never disappears.
6. **Presentation vs. work.** Marcos (milestones) and the public view are calm and presentation-ready. Histórico (history) and Ingestão (ingestion) are dense working tools.
7. **The human approves; the AI proposes.** Always say what the AI did and let a person confirm: "gerado pela IA", "Escolhido pela IA · motivos abaixo".

## 2. Colour rules
- Use **tokens only** (`design-system/tokens.css`). No hex or rgba values in components, and no Tailwind arbitrary colours such as `bg-[#…]`.
- The primary button is **ink**, not accent.
- Accent usage is limited to: the focus ring, the selected-row rail with `accent-weak` fill, the active nav item fill, links, the milestone star (on), the "hoje" marker, and the current-stage label "· hoje, 03/03".
- Red and amber (`danger*`, `warning*`) are reserved for **errors, lateness, dissent and impact**. Never use them for highlight backgrounds or decoration. (The old Executive Summary used pink and yellow highlights that read as errors.)
- Discipline colours appear **only** on small markers (8–10 px squares). The one exception is charts by discipline (bars), which must still carry text labels.
- Text on coloured fills uses the `*-ink` variant: `danger-ink` on `danger-weak`, `warning-ink` on `warning-weak`, `accent-strong` on `accent-weak`.
- Dark mode is out of scope for v1. Don't add `dark:` variants yet. Because everything runs through tokens, it can be added later by redefining the tokens.

## 3. Typography rules
| Token | Spec | Use |
|---|---|---|
| `display` | 48/1.05/700/−3.5% | Rare. Landing sub-sections, big empty-state numbers |
| `h1` | 28/1.2/600/−2.5% | Page title (project name, "Projetos", "Ingestão") |
| `h2` | 20/1.3/600/−1.5% | Panel title, section title |
| `h3` | 15/1.4/600 | Group headers ("6 de fevereiro"), card titles, form section titles |
| `body` | 14/1.5/400–500 | Row titles (500), paragraphs (400) |
| `small` | 13/1.45/400 | Metadata lines, buttons, nav |
| `caption` | 12/1.4 | Secondary metadata, badges, chips |
| `micro` | 11/1.35 | Tiny non-caps sans text (workspace name, "by souBIM") |
| `label` | 11/1.3/600/+6%, UPPERCASE | Eyebrows and section labels ("CONSENSO", "POR QUÊ") |
| `reading` | Newsreader 17/1.5 | "Por quê", AI summaries, any text meant to be *read*, not scanned |
| `mono` / `mono-sm` | IBM Plex Mono 12 / 11 | Dates, times, durations, counts, codes, URLs |
| `kpi` | 26/1.1/600 | KPI and overview tile numbers |

- Dates and times are always mono. The discipline codes in rows (ARQ, EST) are sans caption 500, not mono.
- Use `text-wrap: pretty` on paragraphs and `balance` on large headings.
- **Single-line rule:** row titles, stage labels and dates truncate with an ellipsis and never wrap. Panel titles, ingestion titles (2 lines max) and paragraphs wrap.

## 4. Layout & density
- **Shell (desktop ≥ 1024):**
  - Fixed sidebar of 248 px. Main column padding `32px 40px 80px`, content max-width 1200 px, centred.
  - The side panel is 480 px, fixed right, and overlays the content.
- **Breakpoints:** 375 / 768 / 1024 / 1280 / 1536.
  - Below 1024: the sidebar collapses to an off-canvas drawer behind a menu button. The side panel becomes full-width.
  - Below 768: the mobile shell (§7).
- **Page anatomy:**
  1. Eyebrow (label, `ink-2`): what kind of page this is.
  2. h1: the object's name.
  3. One description line (small `ink-2`).
  4. Actions on the right, at most 3 buttons plus a "⋯" menu. Exactly one primary button.
  5. Content, 24–32 px below.
- **Rows:** 40 px (dense) or 32 px (compact). Two-line rows are 52 px; mobile rows are at least 56 px. Inside a list, rows are separated by `line-soft`. The list container has a `line` border and radius lg.
- **Spacing:** Tailwind's 4 px scale. Inside a group: 4, 8, 12. Between groups: 24, 32, 48. Panel padding: 20–24.
- **Radius:** 3 for chips and badges, 4 for buttons, inputs and menus, 6 for panels, tiles and dialogs. Nothing rounder, except pills and avatars.
- **Elevation:** level 0 is border only (default). Level 1 for popovers and menus. Level 2 for the side panel, dialogs and sheets.

## 5. Pattern cookbook (use these for unprototyped features)
| Need | Pattern | Example in prototypes |
|---|---|---|
| A list of things | Dense rows in a bordered container, a group header per date/kind, filter bar on top | History, Ingestion list, Projects list |
| Details of one thing | **SidePanel** (480) with ↑/↓ navigation. Use a full page only for long-lived objects with their own sub-navigation. | Item detail; Meeting viewer (full page) |
| Create / edit an object | Full-page single-column form (max 760), numbered section cards, footer with Cancelar + primary | Create/Edit project |
| Settings / integrations | Same shell as the form. Each integration is a row: icon, name, status ("Conectada · monitorando novos arquivos" or "Não conectada"), and one action button. | Drive folder block |
| Confirm a reversible action | **Do it immediately**, then show a toast with "Desfazer" (5 s). No confirm dialog. | Approve/reject, mark milestone, complete action |
| Confirm an irreversible or destructive action | Dialog with explicit consequence text and a destructive button label that names the action ("Revogar link", "Excluir projeto") | Revoke link; Archive lives in a danger zone |
| Summaries / KPIs | KpiTile row: label says exactly what is counted, number in ink, colour only in the note | Overview tiles, Executive summary KPIs |
| Choose one of 2–4 views | SegmentedControl | Agrupar por Data/Disciplina |
| Choose sub-pages of one object | Sidebar nav (desktop) / tab bar (mobile). Use underline Tabs only inside panels or one page. | Project sections; panel tabs |
| Filters | Search + up to 5 menu buttons + removable chips. Never a wall of always-visible pills. | History filter bar |
| AI output | Label the provenance ("Resumo da IA", "gerado pela IA"), show the reasons when the AI made a choice, and keep the human action next to it | Ingestion "Por que este projeto" |
| Notifications (not prototyped) | Popover from the sidebar footer (desktop) or the "Mais" tab (mobile), using OverviewRow-style two-line rows grouped by project, with unread rows in `accent-weak` | – |
| Global search ⌘K (not prototyped) | Radix Dialog at the top centre, 640 wide. Input on top, results grouped by kind (Projetos, Itens, Reuniões) as two-line rows. ↑↓ + Enter. | – |
| Login (not prototyped) | `bg` page, centred 400 px `surface` card with radius lg and a `line` border. Endorsed lockup, h2 "Entrar", Google sign-in as the primary path (the product lives on Gmail and Drive) and e-mail as secondary. No demo hints. | – |

### Empty, loading, error: every data view has all three
- **Loading:** skeleton rows that match the final layout. Never a full-page spinner. Show a spinner only inside a button that is working.
- **Empty:** say what will appear and how it gets there, and offer one action. Don't apologise.
- **Error:** say what failed in plain words, reassure ("Nada foi perdido") when true, and offer "Tentar de novo".
- **Empty sections inside a detail are not rendered.** Never show a heading with "—" under it.

## 6. Navigation rules
- **Project section** of the sidebar (in this order): Visão geral (project home), Marcos, Histórico, Reuniões, Resumo executivo. Counts sit on the right in mono.
- **Firm section** ("Escritório"): Todos os projetos, Ingestão (pending count), Buscar ⌘K.
- **Footer:** user (avatar, name, "Diretora · Admin").
- **Project switcher** at the top: shows the current project and its stage. It opens a popover with search, active projects (name, stage, news since last visit, last activity) and "+ Criar projeto".
- **New features:**
  - A feature about one project becomes a project-section entry, or a block inside an existing page.
  - A feature about the whole firm goes in the firm section.
  - Settings go under the user/firm menu in the sidebar footer.
  - Don't add top bars.
- **Edit / Archive / Delete** always live in a "⋯" menu or a danger zone, never next to primary actions.
- **Deep links:** the open item is in the URL (`?item=:id`). Filters are in the query string. The meeting timestamp is `?t=00:05:32`. The browser Back button closes the panel.

## 7. Mobile rules (≤ 767 px)
- No horizontal scroll at 320 px or wider. This was a top complaint about the old app.
- **Top bar:** project name + ▾ (switcher BottomSheet) and a search icon. **Bottom tab bar:** Visão geral · Marcos · Histórico · Mais.
- Lists become two-line rows (≥ 56 px). The detail opens as a full-screen route with Anterior/Próximo at the bottom.
- Filters open in a BottomSheet with a sticky "Ver N itens" CTA.
- Hit targets are at least 44×44 px. Use `env(safe-area-inset-*)` around fixed bars.
- Everything a director needs must work on the phone: Projects, Overview, Marcos, Histórico, item detail and approvals. Forms may stay desktop-first, but they must not break.

## 8. Copy & voice (pt-BR)
- Every string goes through i18n; the pt-BR strings in the prototypes are the source copy. Design for strings 20–30% longer than English.
- **Sentence case** everywhere ("Compartilhar marcos", not "Compartilhar Marcos"). No exclamation marks. Address the user as "você".
- **Buttons are verbs:** Aprovar, Recusar, Compartilhar marcos, Enviar documento, Criar projeto, Salvar alterações, Tentar de novo, Desfazer.
- **Domain vocabulary.** Use these exact labels:
  - Item types: **Decisão · Ação · Tópico · Ideia · Informação**
  - Sources: **Reunião · E-mail · Documento · Entrada manual**
  - Other terms: **Marco** (milestone) · **Consenso** (Concorda / Com ressalvas / Discorda / Sem posição) · **Impacto** (alto / médio / baixo) · **Participante** · **Etapa** · **Ingestão** · **Disciplina**
- **Disciplines** (code · name): ARQ Arquitetura · EST Estrutura · INS Instalações · ELE Elétrica · HID Hidrossanitário · PAI Paisagismo · INC Prevenção de incêndio · ACU Acústica · SUS Sustentabilidade · CIV Civil · CLI Cliente · CON Construtora · LOC Locatário · ENG Engenharia · GER Geral.
- **Formats** (date-fns with the `ptBR` locale):
  - Dates: `dd/MM` in rows, `dd/MM/yyyy` in detail, group headers like "6 de fevereiro" plus the weekday "sexta-feira".
  - Time: 24 h, "02/03 às 14:00". Durations: "45 min". Timestamps: `00:08:30`.
  - Relative: "hoje", "ontem", "há 2 dias", "faltam 28 dias".
  - Ranges use an en dash with spaces: "15/01 – 15/02".
  - Separators: " · " between meta fields.
  - Decimal comma ("4,2 MB").
- **Counts say what they count:** "21 itens capturados", "3 ações em aberto · 1 atrasada". Never "Total de decisões" for all items.
- **Never show technical IDs**, folder IDs or raw e-mail headers. Use human titles, then the tool name ("Fireflies", "Google Drive").
- **Error messages** have two parts: what happened, then what to do. Example: "Não encontramos essa pasta. Verifique se ela foi compartilhada com o Promem."
- **Placeholders** show a realistic example: "ex.: Residencial Vila Madalena".

## 9. Export & print (Marcos and the public view)
- Exports look like a drawing sheet: white background, no app chrome, no filters, no hover states.
- **Page header:** firm logo + firm name, project name (h1), "Linha do tempo de marcos · atualizada em dd/mm/aaaa".
- **Page footer:** "Gerado com Promem · promem.com.br" + page number.
- A4 landscape by default. Avoid page breaks inside a stage block (`break-inside: avoid`). The "hoje" marker stays.
- Colours print as they are, so set `print-color-adjust: exact` on discipline markers and stage bars.

## 10. Accessibility (WCAG 2.1 AA)
- Text contrast is at least 4.5:1. `ink-2` on `bg` passes (5.6:1). `ink-3` is for non-essential text only.
- **Full keyboard path:** every row is reachable, Enter opens it, Esc closes panels and dialogs, and focus returns to the row that opened the panel.
- **Shortcuts:**
  - Lists: ↑↓ move, Enter opens, M toggles marco, X toggles done.
  - Ingestion: A approves, R rejects.
  - `/` focuses search, ⌘K opens global search.
  - Shortcuts are disabled while typing in an input. Discoverability: the "?" key shows the shortcut list.
- Radix primitives for Dialog, Popover, Select, Tabs, Tooltip and RadioGroup, so focus trapping and ARIA come built in.
- Icon-only buttons need an `aria-label` in pt-BR. MilestoneStar uses `aria-pressed`. Toasts use `role="status"`.
- Respect `prefers-reduced-motion`: no slide animations, no skeleton pulse.

## 11. Checklist for any new or migrated screen
- [ ] Built only from library components and tokens. No hex, px or arbitrary Tailwind values in feature code.
- [ ] Follows the page anatomy (eyebrow, h1, description, at most 3 actions + ⋯).
- [ ] Has loading, empty and error states.
- [ ] Colour is never the only signal.
- [ ] Keyboard path and focus states work. Shortcuts are documented.
- [ ] All copy is in pt-BR via i18n, uses the vocabulary above, and fits at +30% length.
- [ ] Works at 320 / 390 / 768 / 1024 / 1440 with no horizontal scroll.
- [ ] Any deviation from this document is listed in the PR description for design review.
