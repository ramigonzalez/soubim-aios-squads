# Handoff: Promem — app revamp (desktop + mobile), design system, brand and landing page

**Product:** Promem (formerly "DecisionLog"), *Memória de projeto para arquitetura e construção*. A B2B SaaS for Brazilian AEC firms, endorsed as **"Promem — by souBIM"**.
**Language:** every UI and marketing string is **pt-BR**.
**Target stack:** React 18 + TypeScript + Tailwind CSS + lucide-react + Radix UI. These are the existing platform constraints from the original brief, `reference/original-brief-HANDOFF.md` §5.5.

---

## 0. Read this first: instructions for Claude Code

### 0.1 The task
1. Build the **Promem design system** as React components (tokens → primitives → domain components).
2. Re-implement the **existing platform's UI** with it, on desktop and mobile, following the prototypes in `prototypes/`.
3. Build the **landing page** in pt-BR with the same tokens and components.

### 0.2 The prototypes are references, not code to port
The files in `prototypes/` are single-file HTML "Design Components". Each one is a template with inline styles plus one large `class Component` holding fake data and all of the UI state. They show **exactly how things should look and behave**. They are deliberately **not** structured the way a production app should be.

**You must convert them into a maintainable React codebase:**
- **Decompose into reusable components.** Every repeated pattern becomes one typed component in the library (see `design-system/COMPONENTS.md`): ItemRow, DisciplineMarker, StageStrip, SidePanel, Toast and so on. Feature screens are thin compositions of library components, data hooks and i18n strings.
- **No inline styles and no hard-coded values.**
  - Map every hex, rgba and px value in the prototypes to a token (`design-system/tokens.css`, mapping tables in §6).
  - Style with Tailwind classes generated from the preset.
  - No arbitrary values like `bg-[#1C1E22]` or `text-[13.5px]`. Add a CI check (see §0.4).
- **No monolithic state.**
  - The prototype's single state object (`screen`, `sel`, `f`, `ingDone`…) maps to: router state (screen, open item, filters in the URL), server state (React Query or the codebase's existing data layer) and small local UI state per component.
  - Undo is a real mechanism (optimistic update + revert), not a state flag.
- **Icons:** use `lucide-react` components (map in `COMPONENTS.md` §1). Never copy the SVG paths from the prototypes.
- **Strings:** extract every pt-BR string into the i18n catalogue with feature-namespaced keys (`history.filters.searchPlaceholder`). Use ICU plurals ("{count, plural, one {# item} other {# itens}}") and date-fns with the `ptBR` locale.
- **Shared between app and landing:** tokens, fonts, Wordmark, Button and every product visual. The landing's product mock-ups must be rendered with the **real app components** fed static demo data, not re-drawn.
- Keep components presentational and typed (`interface ItemRowProps`). Data fetching lives in hooks and containers. Every library component ships with its states (default, hover, focus, selected, disabled, loading, empty, error). Showcase them in Storybook, or in a `/dev/ui` route if Storybook isn't set up.

### 0.3 The live platform is ahead of this prototype
The real app already has features, fields and screens that the prototypes don't show. Rules:
1. **Audit first** (Phase 0 below). List every route, feature and data field in the current codebase and map each one to a prototype screen and component. Write the result to `docs/ux/REVAMP-MAPPING.md`.
2. **Keep all existing features and data.** The revamp changes the visual language, layouts and navigation, not capabilities. If the prototype lacks something the platform has, it stays.
3. **Anything without a prototype** must be built from the same tokens, components and patterns, following `UX-UI-GUIDELINES.md`. The pattern cookbook in §5 there covers lists, details, forms, settings, notifications, global search and login. Never introduce a new visual style for one screen.
4. **A genuinely new pattern** gets added to the component library (tokens only, all states, documented) and listed in the PR for design review.
5. **Prototype data is fictional.** Field names in the prototype (`ty`, `ds`, `s`…) are not an API. Use the platform's real types. §9 lists the data each screen needs. Where a screen needs data the backend may not provide yet, it is flagged in §9.3. **Build the UI so that section hides gracefully**, and list the gap. Don't silently invent endpoints.
6. If the prototype and the platform disagree on behaviour (validation rules, permissions…), **the platform wins** and the difference is noted in the mapping doc.

### 0.4 Plan and acceptance criteria
| Phase | Scope | Done when |
|---|---|---|
| 0 · Audit | Read this folder and the existing codebase; write `docs/ux/REVAMP-MAPPING.md` (feature → screen → components; gaps; backend needs) | Mapping reviewed by the team |
| 1 · Foundations | Self-hosted fonts; `tokens.css`; Tailwind preset (v3) or `@theme` (v4); icon map; all **primitives** and **domain atoms** from `COMPONENTS.md` §2–3; component gallery | Every component renders all its states in the gallery; zero hex/px literals outside `tokens.css` and the preset |
| 2 · Shell | Sidebar, project switcher, routing (§4), drawer < 1024, mobile top bar + tab bar | Navigation between all project sections and firm sections works; deep links restore state |
| 3 · Screens | In this order: Visão geral + Marcos → Histórico + item SidePanel → Reuniões + Meeting viewer → Ingestão → Projetos → Create/Edit forms → Share dialog + public client view → mobile pass | Visual parity with the prototypes at 1440×900 and 390×844; keyboard map (§8.1) works; loading/empty/error states exist |
| 4 · Unprototyped | Everything the platform has beyond the prototypes (Resumo executivo, login, settings, notifications…) built from the cookbook | Each screen passes the checklist in `UX-UI-GUIDELINES.md` §11 |
| 5 · Landing | Static, fast page; shares tokens and components; copy from `LANDING_COPY.md` | Lighthouse ≥ 90 on mobile (performance, accessibility, SEO); placeholders visibly marked |

CI guard (adapt to the repo):
```bash
# fail if feature code contains raw colours or arbitrary px values
! grep -rnE "#[0-9A-Fa-f]{6}\b|rgba?\(|\[[0-9.]+px\]" src --include=*.tsx --include=*.ts \
  --exclude-dir=design-system
```

---

## 1. Overview
Promem captures project **meetings** (Tactiq / Fireflies / Fathom), **Gmail** threads and **Google Drive** documents.
- An admin approves what enters (the **Ingestão** queue).
- AI then extracts **Decisões, Ações, Tópicos, Ideias and Informações**, each with who, when, why, disciplines, consensus and impact.
- These items are organised on a project timeline by **etapa** (stage) and **disciplina** (discipline).

The goals of the revamp:
- A director understands any project in under a minute (**Visão geral**).
- A presentation-ready **Marcos** timeline for clients, shareable by link or PDF.
- A calm but dense **Histórico** for work.
- A **Meeting viewer** with transcript and extracted items side by side.
- An **Ingestão** that feels like an inbox.
- A mobile layout that actually works.

Users:
- Director (primary buyer)
- Project lead / architect
- Admin / coordinator
- External viewer (client), who uses the public link without logging in

## 2. About the design files
- `prototypes/*.dc.html` are **design references created in HTML**. They are not production code; recreate them in the platform's React codebase as described in §0.
- To view them, serve the folder statically (`npx serve prototypes`) and open each file. They load `support.js` from the same folder and React and fonts from CDNs.
- Source layout of each file:
  - `<x-dc>…</x-dc>`: the template, HTML with `{{ holes }}`, `<sc-if>` and `<sc-for>`, all styles inline.
  - `<script data-dc-script>`: `class Component`. `state` holds the UI state, and `renderVals()` holds the fake data and derived values.
  - Read both: the template for layout and exact styles, the class for behaviour and copy.
- Some interactions are faked (see "Prototype limits" under each screen).

## 3. Fidelity
**High-fidelity.** Colours, type, spacing, radii, copy and interactions are final. Recreate them faithfully with the platform's libraries (Tailwind, Radix, lucide).

Small deviations are expected and correct:
- Half-pixel font sizes snap to the type scale (§6.3).
- The prototypes' slightly different discipline hexes resolve to the tokens (§6.2).

---

## 4. Information architecture and navigation
The **top bar is replaced by a sidebar**, and project tabs become **navigation**. The project **Overview** is the new project home. Ingestion becomes a **firm-level inbox**. Both changes were approved.

Keep existing URLs working (redirects). Suggested routes (rename to fit the codebase's conventions):

| Screen | Route | Notes |
|---|---|---|
| Login | `/login` | Not prototyped. Recipe in the guidelines cookbook. |
| Projetos (list) | `/projects` | Firm section. Ativos / Arquivados. |
| Novo projeto | `/projects/new` | |
| Visão geral (project home) | `/projects/:id` → `/projects/:id/overview` | **New default** (was the Milestone tab) |
| Marcos | `/projects/:id/milestones` | |
| Histórico | `/projects/:id/history?q=&disc=&type=&src=&who=&from=&to=&group=date\|discipline` | |
| Item detail (SidePanel) | `?item=:itemId` on any project page | Back button closes it |
| Reuniões (list) | `/projects/:id/meetings` | New list page |
| Meeting viewer | `/projects/:id/meetings/:sourceId?t=00:05:32` | Old `/meetings/:sourceId` redirects here |
| Resumo executivo | `/projects/:id/summary` | Not prototyped as a screen. KpiTile spec + guidelines. |
| Editar projeto | `/projects/:id/edit` | Reached from the "⋯" menu |
| Ingestão | `/ingestion?tab=pending\|history&project=&source=` | Global, with a count in the sidebar |
| Public timeline | `/m/:token` (short) | Old `/shared/milestones/:token` keeps working |

Sidebar (248 px, fixed):
1. Wordmark + workspace name.
2. **Project switcher** card (project name + "Anteprojeto · 2 de 4", `ChevronsUpDown`). It opens a popover: "Buscar projeto…", "Projetos ativos" (name, stage, news since last visit, last activity) and "+ Criar projeto".
3. Project nav: Visão geral · Marcos 7 · Histórico 21 · Reuniões 6 · Resumo executivo.
4. Divider.
5. Label "ESCRITÓRIO": Todos os projetos · Ingestão 7 · Buscar ⌘K.
6. Footer: avatar "G", "Gabriela", "Diretora · Admin".

Nav item styles:
- Size: 13/500 with a 16 px icon in `ink-2`, padding `7px 10px`, radius md.
- Active: bg `accent-weak`, weight 600, icon `accent`.
- Counts: mono-sm `ink-2`.

## 5. Screens (desktop, 1440×900 reference)
Exact component specs are in `design-system/COMPONENTS.md`; prototype source is `prototypes/Promem - App.dc.html` unless noted.

### 5.1 App shell
- `aside` fixed 248 px (bg `surface`, right border `line`).
- `main` has `margin-left: 248px`, padding `32px 40px 80px`, and an inner max-width of 1200 px centred, laid out as a flex column with gap 24–32.
- **Project pages** share a **ProjectHeader**:
  - Eyebrow with the page name.
  - h1 "Residential Tower Alpha".
  - Description "Torre residencial de 50 pavimentos no centro · 8 participantes".
  - Actions: [Exportar PDF] on Marcos only, [Enviar documento] on Overview and History, primary **[Compartilhar marcos]**, and [⋯] for Editar projeto / Arquivar.
  - The **StageStrip** below shows proportional stages, progress, the "hoje" marker, and labels "Anteprojeto · hoje, 03/03 / 16/02 – 31/03 · faltam 28 dias".

### 5.2 Visão geral (project home)
- **Purpose:** "Where is this project now, and what changed since my last visit?"
- **Layout:**
  - ProjectHeader.
  - **OverviewTiles** (3 selectable tiles):
    - **3 · novos desde 27/02** · "o que entrou desde sua última visita" (default)
    - **5 · em aberto** · "2 ações e 3 tópicos · 1 atrasada" (note in `danger-ink`)
    - **3 · aguardando aprovação** · "na ingestão deste projeto"
  - Below the tiles, a flex row with wrap and gap 32:
    - **Left (flex 2, min 480):** list title + subtitle for the active tile ("Desde sua última visita · 27/02 → hoje" / "Em aberto: precisa de alguém · 2 ações em aberto · 3 tópicos sem decisão" / "Aguardando aprovação · só entra no projeto o que você aprovar"), then a bordered list of **OverviewRow**s, then a footer line + link ("Ver no histórico →" / "Ver todas →" / "Abrir ingestão →").
    - **Right (side box):** "Marcos da etapa atual" with "Linha do tempo →", the current stage name, and starred items of the current stage (star `accent`, title, date). Footer: "Estudo Preliminar concluída com 6 marcos".
- **Behaviour:**
  - A row click opens the item SidePanel.
  - In the "aguardando aprovação" list, a row click goes to **Ingestão filtered to this project**, with that source focused.
  - The tile choice is local UI state; persisting it in the URL is optional.
- **Needs:** per-user last-visit timestamp (see §9.3).

### 5.3 Marcos (milestone timeline)
- **Purpose:** a presentation-ready view, shown to clients.
- **Layout:**
  - ProjectHeader (with Exportar PDF).
  - Toolbar: "7 marcos · 4 etapas · atualizada em 03/03/2026", menus "Todos os tipos ▾" and "Todas as disciplinas ▾", toggle "Mostrar etapas sem marcos".
  - **StageTimeline** in a `surface` card.
- **Behaviour:**
  - Milestone click opens the SidePanel.
  - The empty-stage toggle hides stages without milestones and shows a note explaining how many are hidden.
  - Prop `showEmptyStages` (default true) exists as a tweak in the prototype.
- **PDF export:** guidelines §9.

### 5.4 Histórico (project history)
- **Purpose:** a dense work view. Find "what did we decide about X and why".
- **Layout:**
  - ProjectHeader.
  - **FilterBar:** search with the `/` hint, the menus Disciplina · Tipo · Fonte · Quem, and Período. Active chips and "Limpar filtros" appear below.
  - List header: "21 itens", "Expandir tudo / Recolher tudo", and "Agrupar por **Data | Disciplina**".
  - Groups:
    - **By date:** a date group header ("6 de fevereiro · sexta-feira · 13 itens"), then **source groups**: collapsible bands with source tile, title, meta, AI summary and "Abrir transcrição". Inside each band are the **ItemRow**s.
    - **By discipline:** discipline group headers (10 px square + name + count). Rows still show their source icon.
- **Row behaviour:**
  - Click or Enter opens the SidePanel; the row shows the selected style (accent-weak + rail).
  - Clicking the Ação icon toggles done (line-through, `ink-3`).
  - The star toggles marco and shows a toast with Desfazer.
  - Late actions show "atrasada · 10/02".
- **No results:** EmptyState with [Limpar filtros].
- **Prototype limits:** the Período picker is static; the filter menus are functional.

### 5.5 Item detail (SidePanel, 480 px)
Replaces the old modal (an approved change). Spec in `COMPONENTS.md` → ItemDetailPanel.
- Opens from any list, keeps the list visible, and navigates ↑/↓ through the **visible order** of the current list. Esc closes.
- Example decision:
  - Title: "Preservar as árvores existentes e instalar cobertura verde no pódio"
  - Disciplines: Paisagismo, Estrutura
  - Quem: Gabriela · Diretora de projeto
  - Origem: Revisão de paisagismo · 07/02/2026
  - Na gravação: ▶ 00:08:30 ouvir trecho
  - Etapa: Estudo Preliminar
  - Tabs: Visão geral, Trecho da fonte, **Similares 3**
  - Por quê (serif reading text), Consenso "3 de 3 concordam", Impactos
- Empty sections are not rendered.
- "Trecho da fonte" shows the transcript excerpt around the item's timestamp, with "Abrir reunião completa" (opens the Meeting viewer at `?t=`).

### 5.6 Reuniões (list) and Meeting viewer
- **List:** rows with the `Video` tile, title, meta ("01/03 · 52 min · Fireflies · Gabriela, Carlos, cliente") and the item count ("1 item"). Click opens the viewer. *Prototype limit:* only "Revisão do projeto estrutural" opens.
- **Viewer** (`COMPONENTS.md` → MeetingViewer parts, TranscriptTurn):
  - "← Reuniões", eyebrow "REUNIÃO · FIREFLIES", title, meta "06/02/2026 · sexta-feira · 45 min · 14 falas", participant pills.
  - **AI summary card** ("Resumo da reunião · gerado pela IA", serif text, "6 itens extraídos · 4 decisões · 1 ação · 1 tópico").
  - Player bar with item ticks.
  - Two columns: **transcript** (own scroll) | **"Itens extraídos · clique para ir ao trecho"**.
- **Behaviour:**
  - Clicking an extracted item (or a tick) sets `?t=`, seeks the player, scrolls the transcript container to the turn (offset 60 px) and highlights it.
  - The anchored item chip in a turn opens the SidePanel.
  - **Uncertain speaker:** "⚠ Gabriela ou Lucia", then "Vozes sobrepostas. Quem falou? [Gabriela] [Lucia]". Picking one saves the correction.
- **Prototype limits:** the player is simulated. Wire it to the recorder's media or to a deep link if the platform has no media.

### 5.7 Ingestão (firm-level inbox)
- **Purpose:** control what enters. It is an inbox, not a table.
- **Header:** eyebrow "Escritório Exemplo · todos os projetos", h1 "Ingestão", text "Só entra nos projetos o que você aprovar. Ao aprovar, a IA extrai decisões, ações e tópicos da fonte."
- **Tabs:** "Pendentes 7 | Histórico N".
- **Filters:** project Select ("Todos os projetos" or one project) and a source SegmentedControl ("Todas | Reuniões | E-mails | Documentos").
- **Body:** list (max 420) beside the sticky **decision panel** (IngestionRow + IngestionDetail in `COMPONENTS.md`).
  - The panel answers *what* is being approved: AI summary, **"O que deve entrar no projeto"** (candidate items), transcript/e-mail excerpt, **"Por que este projeto"** with confidence and reasons, and flags (external participants, possible duplicate).
  - Decision footer: "Entra no projeto" + project Select + [Recusar R] [Aprovar A].
- **Behaviour:**
  - **A** approves and **R** rejects the focused source; ↑/↓ move the focus.
  - After a decision, focus moves to the next pending source.
  - Toast: "Aprovado · a IA está extraindo os itens" / "Recusado · não entra no projeto" with **Desfazer**.
  - Checkboxes enable bulk "Aprovar selecionados" / "Recusar".
  - Changing the project Select switches the hint to "Você escolheu este projeto".
  - **History tab:** approved/rejected rows with a status badge and "por Gabriela · 02/03".
  - **Empty:** "Caixa de ingestão em dia".

### 5.8 Projetos (projects list)
- **Header:** eyebrow "Escritório Exemplo", h1 "Projetos", summary line, primary [+ Criar projeto].
- **Toolbar:** search, "Ativos | Arquivados", "Só com pendências", "Ordenar por".
- **Table:** the **ProjectRow** layout, with columns "Projeto | Etapa atual | Novidades e pendências". It scales to 20+ projects: one row per project, no cards.
- Row click opens the project Overview. Empty: "Nenhum projeto encontrado."

### 5.9 Criar / Editar projeto (forms)
- A single column of four numbered section cards: **1 · Dados do projeto**, **2 · Etapas** (templates, live StageStrip preview, editable rows with auto duration, overlap warnings), **3 · Equipe** (discipline from the fixed list, optional role), **4 · Documentos do Google Drive** (Google Picker, never a folder ID).
- Edit mode adds the "Arquivar projeto" danger zone.
- The footer has Cancelar and the CTA. Full spec: `COMPONENTS.md` → ProjectForm parts.
- Edit mode pre-fills the data, fixing the old bug where stage dates showed empty.
- **Prototype limits:** drag-reorder of stages is visual only.

### 5.10 Share dialog
Opened by **Compartilhar marcos**. It contains a preview card (links to the public view), a copyable link, "Expira em" (30 dias · 90 dias · Nunca), the view count and "Revogar link". Spec in `COMPONENTS.md` → ShareDialog.

### 5.11 Public client view (logged out)
Source: `prototypes/Promem - Visão do cliente.dc.html`. The prop `linkState` switches it between `ativo` and `expirado`.
- The **firm's** branding leads.
- Content: summary card, stage strip, and the StageTimeline client variant with a "por quê" line under each milestone, plus [Baixar PDF].
- Footer: "Feito com Promem". There is an expired state.
- Spec: `COMPONENTS.md` → PublicTimelinePage.

### 5.12 Not prototyped: build from the system
- **Resumo executivo:** a KpiTile row ("Itens capturados", "Decisões", "Ações em aberto", "Decisões com consenso total"), then highlights as OverviewRows (never pink or yellow fills), then a by-discipline bar list (count per discipline, bars in discipline colour with labels).
- **Login, settings and integrations, notifications, global search ⌘K, user and permissions management:** use the cookbook in `UX-UI-GUIDELINES.md` §5.
- **Anything else the platform has.** Same rules.

## 6. Design tokens
The full set is in `design-system/tokens.css` (CSS variables), mapped by `tailwind.preset.ts` (v3) or `tailwind-v4-theme.css` (v4).

### 6.1 Core palette
| Token | Hex | Use |
|---|---|---|
| `--bg` | #F4F3EF | Paper background |
| `--surface` / `-2` / `-3` / `-sunk` | #FFFFFF / #F9F8F5 / #EFEDE8 / #E9E7E1 | Panels / hover + bands / neutral fills / document tile, skeleton |
| `--line` / `-soft` / `-strong` | #E3E0D9 / #EFEDE8 / #CFCBC2 | Borders / row dividers / control borders |
| `--track` | #D6D2CA | Unfilled current-stage bar |
| `--ink` / `-soft` / `-2` / `-3` / `-4` | #1C1E22 / #3A3C42 / #5F6168 / #8A8C92 / #B5B3AC | Text hierarchy |
| `--accent` / `-strong` / `-weak` / `-on-dark` | #3E5F66 / #2F4C52 / #E6EEEF / #A9C4C9 | Petróleo |
| `--success` / `-weak` | #2F7A4F / #E7F2EA | |
| `--warning` / `-ink` / `-weak` / `-line` | #9A6A12 / #7A520C / #F8F0DE / #C9A14A | |
| `--danger` / `-ink` / `-weak` / `-line` | #B3402F / #8E3224 / #F8E7E3 / #E8C9C2 | |
| `--on-dark` / `-2` / `-3` / `-line` | #FFFFFF / #D9D7D1 / #B5B3AC / #6B6D74 | Landing dark band |

Disciplines (OKLCH-balanced; always shown with a code or name):

| Code | Name | Hex |
|---|---|---|
| ARQ | Arquitetura | #3A7BCB |
| EST | Estrutura | #795BBF |
| INS | Instalações (MEP) | #E07227 |
| ELE | Elétrica | #E0AB22 |
| HID | Hidrossanitário | #25AABE |
| PAI | Paisagismo | #28A16D |
| INC | Prevenção de incêndio | #D33A3C |
| ACU | Acústica | #974391 |
| SUS | Sustentabilidade | #80A03E |
| CIV | Civil | #8F653A |
| CLI | Cliente | #404E63 |
| CON | Construtora | #824748 |
| LOC | Locatário | #D281A8 |
| ENG | Engenharia | #135372 |
| GER | Geral | #918F88 |

### 6.2 Prototype hex → token (use when converting inline styles)
| Prototype value | Token |
|---|---|
| #F4F3EF | `bg` |
| #FFFFFF | `surface` (or `on-dark` for text on ink) |
| #F9F8F5 | `surface-2` |
| #EFEDE8 | `surface-3` for fills, `line-soft` for row borders |
| #E9E7E1 | `surface-sunk` |
| #E3E0D9 | `line` |
| #CFCBC2 | `line-strong` |
| #D6D2CA | `track` |
| #1C1E22, #2E3036 | `ink` |
| #3A3C42, #3A3D44 | `ink-soft` |
| #5F6168 | `ink-2` |
| #8A8C92 | `ink-3` |
| #B5B3AC, #B0B1B5, #A9ABB0 | `ink-4` (on the dark band: `on-dark-3`) |
| #6B6D74 | `on-dark-line` |
| #D9D7D1 | `on-dark-2` |
| #3E5F66 | `accent` |
| #2F4C52 | `accent-strong` |
| #E6EEEF | `accent-weak` |
| #A9C4C9 | `accent-on-dark` |
| #2F7A4F | `success` |
| #E7F2EA | `success-weak` |
| #7FC49B | `success-on-dark` |
| #9A6A12 | `warning` |
| #7A520C, #6B4A0E | `warning-ink` |
| #F8F0DE | `warning-weak` |
| #C9A14A | `warning-line` |
| #B3402F | `danger` |
| #8E3224 | `danger-ink` |
| #F8E7E3 | `danger-weak` |
| #E8C9C2 | `danger-line` |
| #F0A493 | `danger-on-dark` |
| rgba(28,30,34,.32) | `--scrim` |
| rgba(244,243,239,.92) + blur(8px) | landing sticky header: `bg` at 92% + `backdrop-blur-sm` |
| #E9E8E4, #4A4A47 | Presentation canvas only (mobile board). Ignore. |

**Discipline legacy values** in the App, Mobile and Landing prototypes resolve to the tokens:

| Prototype hex | Token |
|---|---|
| #3D7DD8 | `disc-arq` |
| #7C5AD6 | `disc-est` |
| #E67A3A | `disc-ins` |
| #E2A92A | `disc-ele` |
| #2BA9C2 | `disc-hid` |
| #2E9E73 | `disc-pai` |
| #D9423A | `disc-inc` |
| #7EA83E | `disc-sus` |
| #8D6B45 | `disc-civ` |
| #4F5768 | `disc-cli` |

**The token values in §6.1 are canonical.**

### 6.3 Type scale and snapping
Families: **Plus Jakarta Sans** (UI), **Newsreader** (reading), **IBM Plex Mono** (data). Scale and usage: `UX-UI-GUIDELINES.md` §3.

The prototypes use some in-between sizes. Snap them to tokens:

| Prototype px | Token |
|---|---|
| 10, 10.5, 11 | `label` if uppercase · `mono-sm` if mono · otherwise `micro` |
| 11.5, 12, 12.5 | `caption` (sans) · `mono` (mono) |
| 13, 13.5 | `small` |
| 14, 14.5 | `body` |
| 15, 16, 16.5 | `h3` |
| 17–19, serif | `reading` (landing quote 19 → `reading-lg`) |
| 18–20, sans | `h2` |
| 21–28 | `h1` |
| 26 (numbers) | `kpi` |
| Landing headings | `hero`, `section`, `section-sm` (fluid clamps) |

### 6.4 Spacing, radius, elevation, layout
- **Spacing:** Tailwind's default 4 px scale. Inside groups 4–12, between groups 24–48.
- **Radius:** `xs` 2 (discipline squares) · `sm` 3 (chips, badges, checkbox) · `md` 4 (buttons, inputs, menus) · `lg` 6 (panels, tiles, dialogs) · full (pills, avatars).
  - The Design System prototype calls these `--radius-*`. The final names are `--corner-*`, to avoid a Tailwind v4 namespace clash.
- **Elevation:**
  - `elev-xs`: active segment
  - `elev-1`: popover and menu (`0 4px 16px rgba(28,30,34,.10)` + 1 px `line` ring)
  - `elev-2`: panel, dialog and sheet (`0 12px 40px rgba(28,30,34,.16)` + 1 px ring at 6%)
  - `rail-selected`: inset 2 px accent
  - `tab-active`: inset −3 px ink
- **Layout:**
  - Sidebar 248 · panel 480 · content max 1200. The Design System doc says 1280; **1200 is final**.
  - Rows 40 / 32 / 52 (two-line); mobile rows ≥ 56; touch targets ≥ 44.

## 7. Mobile (≤ 767 px)
- **Interactive reference:** `prototypes/Promem - Mobile Prototype.dc.html`.
- **Static board:** `prototypes/Promem - Mobile.dc.html`, four 390×844 frames (Visão geral, Marcos, Histórico with an active filter, Detalhe).
- **Shell:** top bar with the project switcher (BottomSheet "Trocar projeto") and search; bottom tab bar **Visão geral · Marcos · Histórico · Mais**.
- **Visão geral:**
  - Stage stepper: "01 ✓ Estudo · 02 · atual Anteprojeto · 03 Legal · 04 Executivo".
  - Line "Hoje 03/03 · 36% da etapa · entrega em 31/03".
  - 3 tiles. "em aberto" opens Histórico filtered to Ações; "aguardando aprovação" opens Mais → approvals.
  - "Desde sua última visita" and "Marcos da etapa atual".
- **Marcos:** a single-column timeline + "Compartilhar".
- **Histórico:**
  - Search, then a "Filtros · N" button that opens a BottomSheet (Disciplina and Tipo chips, "Limpar", sticky "Ver N itens"), then the active chips.
  - Below: date groups, source cards and two-line rows.
- **Mais:** Aguardando aprovação [count] · Trocar projeto · Compartilhar com o cliente · Notificações. Approvals is a list with [Recusar] [Aprovar] per entry and a toast with Desfazer.
- **Detail:** a full-screen route with "▶ Ouvir trecho · 00:08:30" (44 px), a "Concluir ação" toggle for actions, Consenso, and "↑ Anterior / Próximo ↓".
- **Resolve these prototype inconsistencies:**
  1. Mobile approvals say "Descartar". Use **"Recusar"**, the same as desktop.
  2. The mobile current-stage progress uses the accent. Use **ink** for progress, as on desktop; the accent is only for the "hoje" marker.
  3. Mobile approvals are drawn per *item* (with "Confiança alta"). The real model approves **sources**. Show the source title with its candidate items summarised, and approve or reject the source, the same as desktop.
  4. The mobile filter sheet's "Tipo" chips show "Decisão · Ação · Discussão". Use the **5 canonical types**: Decisão · Ação · Tópico · Ideia · Informação ("Discussão" → **Tópico**).
  5. The mobile discipline chips shorten "Prevenção de incêndio" to "Incêndio". If short labels are needed, add an explicit `shortName` to the discipline enum; never improvise one per screen.

## 8. Interactions and behaviour

### 8.1 Keyboard map
| Context | Keys |
|---|---|
| Global | `/` focus search on list pages · `⌘K`/`Ctrl K` global search · `?` shortcut help |
| Lists (History, Overview, Marcos) | ↑/↓ move focus · Enter open panel · `M` toggle marco · `X` toggle done (Ação) |
| SidePanel open | ↑/↓ previous/next item in visible order (panel stays open) · Esc close (focus returns to the row) · `M`, `X` as above |
| Ingestão | ↑/↓ move focus · `A` approve · `R` reject · Space toggle checkbox |
| Dialogs and sheets | Esc close · focus trapped |

Shortcuts are ignored while focus is in an input, select or textarea. The prototype implements: panel ↑/↓/Esc, Ingestão A/R/↑/↓. Everything else is part of the spec.

### 8.2 Feedback and undo
- **Reversible actions** happen immediately, with a toast offering "Desfazer" for 5 s: approve, reject, marco on/off, action done/undone, bulk approve.
- Toast position: bottom-left (desktop), above the tab bar (mobile). One toast at a time.
- Errors show a toast with "Tentar de novo", or an inline ErrorState for page loads.
- Optimistic updates revert on failure, with an error toast.

### 8.3 Motion
- Hover and press: 120 ms.
- Panel, sheet and popover entrance: 200 ms `cubic-bezier(0.2,0,0,1)`. The panel slides in from the right and sheets from the bottom.
- No other animation. Reduced motion turns these off.

### 8.4 Responsive
- 1536 / 1280: as designed.
- 1024: sidebar fixed, panel 480 overlays.
- 768–1023: sidebar becomes a drawer, panel full-width, Ingestão list and panel stack, Meeting viewer columns stack.
- < 768: the mobile shell (§7).
- Rows protect the title column (min 220 px). Secondary columns clip first.
- Button groups wrap; labels never truncate.

## 9. State and data

### 9.1 Suggested domain types (align to the platform's real types)
```ts
type ItemType = 'decision' | 'action_item' | 'topic' | 'idea' | 'information'; // Decisão · Ação · Tópico · Ideia · Informação
type SourceKind = 'meeting' | 'email' | 'document' | 'manual';                   // Reunião · E-mail · Documento · Entrada manual
type DisciplineCode = 'ARQ'|'EST'|'INS'|'ELE'|'HID'|'PAI'|'INC'|'ACU'|'SUS'|'CIV'|'CLI'|'CON'|'LOC'|'ENG'|'GER';
type Consensus = 'agree' | 'mixed' | 'dissent' | 'none';                         // Concorda · Com ressalvas · Discorda · Sem posição
type Impact = 'high' | 'medium' | 'low';

interface Item {
  id: string; projectId: string; type: ItemType; title: string;
  disciplines: DisciplineCode[]; owner: PersonRef; sourceId: string; date: string; stageId: string;
  isMilestone: boolean; transcriptTs?: string /* HH:MM:SS */; impact?: Impact; why?: string;
  consensus?: { discipline: DisciplineCode; state: Consensus }[];
  impacts?: { discipline: DisciplineCode; text: string }[];
  due?: string; done?: boolean; // actions only; "late" = !done && due < today
}
interface Source { id: string; projectId: string; kind: SourceKind; title: string; date: string; durationMin?: number;
  tool?: 'Tactiq' | 'Fireflies' | 'Fathom' | 'Gmail' | 'Google Drive'; participants: PersonRef[]; aiSummary?: string; originalUrl?: string; }
interface TranscriptTurn { ts: string; speaker: PersonRef | null; speakerCandidates?: PersonRef[]; text: string; itemIds: string[]; }
interface Stage { id: string; name: string; start: string; end: string; order: number; }
interface Participant { id: string; name: string; email: string; discipline: DisciplineCode; role?: 'director'|'coordinator'|'designer'|'consultant'|'client'|'supplier'; }
interface IngestionEntry { id: string; kind: SourceKind; title: string; receivedAt: string; meta: string;
  suggestedProjectId: string; confidence?: 'high' | 'medium' | 'low'; reasons?: string[]; aiSummary?: string;
  candidates?: { type: ItemType; title: string; discipline: DisciplineCode }[]; preview?: { ts?: string; who: string; text: string }[];
  flags?: { kind: 'info' | 'warn'; text: string }[]; originalUrl?: string;
  status: 'pending' | 'approved' | 'rejected'; decidedBy?: PersonRef; decidedAt?: string; }
interface ShareLink { token: string; url: string; expiresAt: string | null; viewCount: number; revokedAt?: string; }
interface ProjectListEntry { id: string; name: string; description: string; teamSize: number; stages: Stage[]; currentStageId: string;
  stageProgress: number; daysLeft: number; newSinceLastVisit: number; lastActivity: { at: string; label: string };
  lateActions: number; pendingIngestion: number; openTopics: number; archived: boolean; }
```

### 9.2 UI state: prototype → production
| Prototype state | Production home |
|---|---|
| `screen`, `meeting` | Router (routes in §4) |
| `sel` (open item), `panelTab` | URL `?item=` · local tab state |
| `q`, `f.{disc,type,src,who}`, `group`, `collapsed` | URL query (filters, group). Collapsed groups in local state or `sessionStorage`. |
| `starOv`, `doneOv` | Server mutations with optimistic update |
| `tab` (overview tile) | Local, optional URL |
| `focusTs`, `speakerOv` | URL `?t=` · server mutation for the speaker fix |
| `ingTab`, `ingSrc`, `ingProj`, `ingFocus`, `ingChk`, `ingDone`, `projOv` | URL (tab, filters) · local focus and selection · server mutations (decide, reassign project) |
| `pq`, `pStatus`, `onlyAttn`, `prjSort` | URL query on `/projects` |
| `form`, `formMode`, `formTried` | Form library (react-hook-form + zod, or the codebase's own) |
| `shareOpen`, `copied` | Dialog state · server (ShareLink) |
| `toast` | Toast provider (one queue, undo callbacks) |
| Mobile: `tab`, `detailId`, `sheet`, `discs`, `kinds`, `query`, `proj`, `more` | Same router and URL approach |

**Derived data the UI computes:**
- Stage proportions (days per stage), current-stage progress and "faltam N dias", and the "hoje" position.
- Visible-order list of item ids, for ↑/↓ navigation in the panel.
- Attention score for sorting projects: `late × 10 + pending + openTopics`.
- Filter option counts.
- Stage template date chaining.

### 9.3 Backend implications: check before building, degrade gracefully
1. **Last visit per user per project** ("novos desde 27/02", "Desde sua última visita").
2. **Ingestion suggestion data:** confidence, reasons, flags (external participants, possible duplicate), **candidate items before approval**, excerpt, original link. If a field is missing, hide its section.
3. **Meeting AI summary** and item counts per source.
4. **Speaker correction** (choose among candidates for overlapping voices).
5. **Undo:** reversible endpoints or delayed commit for approve, reject, marco and done.
6. **Projects list aggregates:** news since last visit, last activity, late actions, pending ingestion, open topics.
7. **Workspace branding** for the public view: firm logo, name, tagline, contact e-mail.
8. **Share link:** expiry options, view count, revoke. These exist per the brief; confirm.
9. **Google Picker** for the Drive folder (replaces pasting a folder ID).
10. **Stage templates** (can be client-side constants: Edificação padrão, Casa, Retrofit).
11. **Similar items** ("Similares" tab, with a reason) and the **item → transcript timestamp** link. Both exist per the brief; confirm.
12. **PDF export** of Marcos and the public view (exists per the brief); restyle to guidelines §9.

## 10. Landing page
- **Source:** `prototypes/Promem - Landing.dc.html`. **Copy:** `LANDING_COPY.md`, final pt-BR, with placeholders marked.
- **Structure:**
  1. Sticky header (`bg` at 92% + blur, bottom border).
  2. Hero (text + Marcos visual + floating decision card).
  3. Integrations band (white).
  4. **O problema** (8 pains, "Com o Promem").
  5. **Como funciona** (3 steps).
  6. **Recursos** (5 features with product visuals, white band).
  7. **Para quem** (3).
  8. **De onde viemos** (dark `ink` band, souBIM story, testimonial placeholder).
  9. **Segurança e dados** (4).
  10. **Perguntas** (FAQ accordion, white band).
  11. **Contato** (form with Demonstração / Piloto gratuito).
  12. Footer.
- Content width is 1200, with section padding 72–96 px vertical and 24 px horizontal.
- **CTAs:** primary **"Agendar demonstração"**, secondary **"Solicitar piloto gratuito"**. Both scroll to `#contato` and set the form mode. There is no pricing; leave room for it later.
- **Product visuals** use the shared app components with static demo data. *Prototype limit:* the landing file draws icons as text glyphs (◆ ☐ ○ ▶ ✉ ▤). Replace them with the real ItemTypeIcon and SourceIcon.
- **Technical:**
  - Static or SSG, separate from the app bundle, sharing the design-system package.
  - Self-hosted fonts with `font-display: swap`, images in AVIF/WebP, no client JS except the form, FAQ and mode switch.
  - Strong mobile layout (traffic from WhatsApp and LinkedIn): the header stays on one line (the nav hides, the CTA stays), the pains stack, headings use the fluid clamps.
- No invented stats, logos or testimonials (brief §6.5).

## 11. Accessibility
WCAG 2.1 AA.
- Colour is never the only signal.
- Full keyboard path (§8.1), visible focus (`focus-ring`), and Radix primitives for ARIA.
- `aria-label` on icon buttons, `aria-pressed` on the star, `role="status"` on toasts.
- Reduced motion respected. No horizontal scroll from 320 px up.

## 12. Assets
- **Brand** (`brand/`): outlined SVG wordmark (ink/white), endorsed lockup, favicon SVG and PNGs (16/32), apple-touch-icon (180), icon-512, wordmark PNG. All generated from the real Plus Jakarta Sans outlines. Construction and usage are in `brand/BRAND.md`.
- **Fonts:** Google Fonts (Plus Jakarta Sans, Newsreader, IBM Plex Mono). Self-host them in production.
- **Icons:** lucide-react (map in `COMPONENTS.md` §1).
- **Imagery:** none. The product visuals are UI. Placeholders: souBIM logo, client logos, testimonial photo, firm logo in the public view, OG image.
- **Demo data:** all names and projects in the prototypes are fictional (seed projects are named in English, as in the real demo data).

## 13. Files in this bundle
```
design_handoff_promem/
├── README.md                     ← this file (start here)
├── UX-UI-GUIDELINES.md           ← rules + pattern cookbook for every screen, incl. unprototyped ones
├── LANDING_COPY.md               ← final pt-BR landing copy + placeholder checklist
├── KICKOFF_PROMPT.md             ← paste-able first prompt for Claude Code
├── design-system/
│   ├── tokens.css                ← single source of truth (CSS variables)
│   ├── tailwind.preset.ts        ← Tailwind v3 mapping
│   ├── tailwind-v4-theme.css     ← Tailwind v4 mapping
│   └── COMPONENTS.md             ← component specs, states, measurements, icon map
├── brand/
│   ├── BRAND.md
│   ├── promem-wordmark.svg · promem-wordmark-white.svg · promem-lockup-by-soubim.svg · promem-wordmark.png
│   └── favicon.svg · favicon-16.png · favicon-32.png · apple-touch-icon.png · icon-512.png
├── prototypes/                   ← open with a static server (npx serve prototypes)
│   ├── Promem - App.dc.html                 desktop app, interactive (all desktop screens)
│   ├── Promem - Mobile Prototype.dc.html    mobile, interactive
│   ├── Promem - Mobile.dc.html              mobile, 4 static frames
│   ├── Promem - Visão do cliente.dc.html    public client view (prop linkState)
│   ├── Promem - Landing.dc.html             landing page
│   ├── Promem - Design System.dc.html       visual design-system reference (16 sections)
│   └── support.js                           runtime for the .dc.html files
├── screenshots/                  ← visual reference (the prototypes' source stays the spec)
│   ├── desktop/   1440 px wide, 1×: 01 visão geral · 02 marcos · 03 histórico · 04 detalhe do item (painel) ·
│   │              05 reuniões · 06 reunião/transcrição · 07 ingestão · 08 ingestão/histórico · 09 projetos ·
│   │              10 novo projeto · 11 editar projeto · 12 compartilhar marcos · 13 visão do cliente (link público)
│   ├── mobile/    390×844, 2×: 01 visão geral · 02 marcos · 03 histórico · 04 filtros · 05 detalhe ·
│   │              06 mais · 07 aprovações · 08 trocar projeto
│   ├── landing/   página inteira + hero · o problema · recursos · contato
│   └── design-system/  página inteira + cores · disciplinas · tipografia · linha de item · estados
└── reference/
    └── original-brief-HANDOFF.md            the original product brief (personas, vocabulary, constraints)
```

The screenshots were captured from the prototypes with fictional data. Where a screenshot and this README disagree (for example the inconsistencies listed in §7), **the README and the tokens win**.
