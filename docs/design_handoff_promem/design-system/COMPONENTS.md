# Promem — Component specs

Reference for building the React component library. Values come from the prototypes in `../prototypes/`. Where a prototype hard-codes a hex or px value, use the matching token from `tokens.css` (mapping tables in `../README.md` §6).

Conventions:
- Sizes are CSS px. "caption 12/500" means the `caption` type token at weight 500.
- Icons are **lucide-react**: 16 px, `strokeWidth={1.75}`, colour `ink-2` unless noted.
- Every interactive element needs a visible `:focus-visible` state: `border-color: accent` plus the `focus-ring` shadow.
- Component names are suggestions. Use the codebase's naming conventions if they already exist.

---

## 1. Icon map (prototype → lucide-react)

| Concept | lucide-react | Notes |
|---|---|---|
| Decisão | `CircleCheck` | type icon |
| Ação (open) | `Square` | clickable in rows: toggles done |
| Ação (done) | `SquareCheck` | row turns `ink-3` + line-through |
| Tópico | `MessageCircle` | |
| Ideia | `Lightbulb` | |
| Informação | `Info` | |
| Reunião (source) | `Video` | |
| E-mail (source) | `Mail` | |
| Documento (source) | `FileText` | |
| Entrada manual (source) | `Pencil` | |
| Marco (milestone) | `Star` | filled (`fill="currentColor"`) in `accent` = marco; outline in `line-strong` = not a marco |
| Visão geral | `LayoutDashboard` | nav |
| Marcos | `GitCommitVertical` | nav |
| Histórico | `History` | nav |
| Reuniões | `Video` | nav |
| Resumo executivo | `FileText` | nav |
| Todos os projetos | `Folder` | nav |
| Ingestão | `Inbox` | nav + empty state (32 px, stroke 1.25) |
| Buscar | `Search` | |
| Project switcher | `ChevronsUpDown` | |
| Dropdown | `ChevronDown` | |
| Prev / next item | `ChevronUp` / `ChevronDown` | |
| Close / remove / Discorda | `X` | |
| Concorda / approve | `Check` | |
| Com ressalvas | custom `TildeIcon` | path `M2 15c6.667-6 13.333 0 20-6` on the 24 grid with the same stroke props. Use lucide's `Tilde` if your version has it. |
| Sem posição | `Minus` | |
| Add | `Plus` | |
| Warning / uncertain speaker / error | `TriangleAlert` | 14 px inline; 32 px in the error state |
| Link / share | `Link` | |
| Calendar / date range | `Calendar` | |
| Play excerpt | `CirclePlay` | |
| Upload document | `Upload` | |
| Export PDF | `Download` | |
| Delete row | `Trash` | |
| Copy | `Copy` | |
| Team size | `Users` | |
| Mobile "Mais" | `Ellipsis` | |

The prototypes draw these icons as inline SVG paths copied from lucide. Replace them with the components above; never copy SVG paths into the codebase.

---

## 2. Primitives (`src/components/ui`)

### Button
| Variant | Style |
|---|---|
| `primary` | bg `ink`, text white, no border. Hover bg `ink-soft`. **The primary button is ink, not accent.** |
| `secondary` | bg `surface`, 1 px `line-strong` border, text `ink`. Hover bg `surface-2`. |
| `ghost` | no bg or border, text `ink-2` (or `accent` for links such as "Ver no histórico →"). Hover text `ink`. |
| `danger-ghost` | text `danger-ink` ("Revogar link"). For "Arquivar", use `secondary` with `danger-ink` text inside the danger zone. |
| `icon` | 36×36 `secondary` (for example "⋯" project menu); 32×32 inside panels; 44×44 on mobile. |

- Size md: height 36, padding `8px 14px` (primary) or `8px 12px` (secondary), small 13/500, gap 7, icon 16. Size sm: height 32. Size lg (mobile, landing): height 44–48, padding `12px 20px`, body 14–15/600.
- Optional keyboard hint after the label: mono-sm, `ink-4` (on primary: white at 55% opacity). Examples: `Recusar  R`, `Aprovar  A`.
- Disabled: opacity .45, `cursor: not-allowed`. Loading: keep the width and replace the icon with a 14 px spinner.
- Always `white-space: nowrap`. pt-BR labels run 20–30% longer than English, so let button rows wrap instead of truncating labels.

### Input · Textarea · Select · DateRange
- Height 38 (forms) or 36 (toolbars). Padding `0 12px`. 1 px `line-strong` border, radius md, bg `surface`, body 14, placeholder `ink-3`.
- Focus: border `accent` plus `focus-ring`.
- Error: border `danger`, then helper text below in caption `danger-ink` with a 14 px `TriangleAlert`. Example: "Não encontramos essa pasta. Verifique se ela foi compartilhada com o Promem."
- Warning (for example overlapping stage dates): border `warning-line`, helper text in `warning-ink`.
- Label above the field: small 13/600 `ink`. Optional fields add " · opcional" in 400 `ink-2`. Help text: caption `ink-2`.
- Select: Radix Select with a `ChevronDown` 16 in `ink-2`. The listbox uses `elev-1`, radius md, items 32 high with padding `6px 10px`, and a check on the selected item.
- DateRange: the value is shown in mono, for example `15/01 → 31/08/26`, with a leading `Calendar` icon.

### Checkbox
16×16, radius sm, 1.5 px `line-strong` border. Checked: bg `ink` with a white `Check` (11 px, stroke 3). Indeterminate: bg `ink` with a white `Minus`. The hit area is at least 24 px on desktop and 44 px on mobile.

### SegmentedControl
Track: `surface-3`, radius md, padding 2. Segments: padding `4px 10px`, caption 12. Active segment: bg `surface`, `elev-xs`, weight 600, `ink`. Inactive segment: weight 500, `ink-2`.
Used in History ("Agrupar por Data | Disciplina"), Ingestion ("Todas | Reuniões | E-mails | Documentos"), Projects ("Ativos | Arquivados") and the landing form ("Demonstração | Piloto gratuito").
Implement it as a radio group (`role="radiogroup"`) with arrow-key support.

### Tabs (underline)
Used in the detail panel ("Visão geral · Trecho da fonte · Similares 3") and the Ingestion page ("Pendentes 7 · Histórico 12").
Height 36, small 13. Active tab: `ink` 600 with a 2 px `ink` bottom border. Inactive tab: `ink-2` 500. Counts are mono-sm `ink-2`. Implement with Radix Tabs.

### Chip (active filter)
Desktop: height 26, padding `3px 8px`, radius sm, 1 px `line` border, bg `surface`, caption 12/500 `ink-soft`.
Contents in order: a leading marker (discipline square or 12 px type icon), the label, then a trailing `X` 12 that removes the filter.
Mobile: height 32, radius full.

### Badge
| Badge | Style |
|---|---|
| Due date (open) | mono-sm, padding `1px 6px`, radius sm, bg `surface-3`, text `ink-2`: `até 13/02` |
| Due date (late) | bg `danger-weak`, text `danger-ink`: `atrasada · 10/02` |
| Due date (done) | bg `surface-3`, text `ink-3`: `concluída · 13/02` |
| Impacto alto | caption 600, padding `2px 7px`, radius sm, bg `danger-weak`, text `danger-ink`. Pair with `ImpactIndicator`. |
| Aprovado / Recusado | caption 600 with a 12 px icon. Aprovado: `success-weak` / `success`. Recusado: `surface-3` / `ink-2`. |
| Confiança | Alta: `success-weak` / `success`. Média: `warning-weak` / `warning-ink`. Text: "Confiança alta". |
| Nav count | mono-sm `ink-2`, right-aligned, no fill |
| Mobile "Mais" count | `danger-ink` text (pending approvals) |

### Avatar
Circle of 20–22 px, bg `surface-3`, the person's initial in label size (11/600, not uppercase-tracked), colour `ink`. Never colour avatars by discipline. The discipline goes next to the name as a `DisciplineMarker`.

### Popover · Menu · Tooltip
Popover and Menu: bg `surface`, radius md, `elev-1`, padding 4, items 32 high. Tooltip: bg `ink`, caption 12 white, radius sm, padding `4px 8px`. All three are built on Radix.

### Dialog
Width 540 (max 100%), radius lg, `elev-2`, scrim `--scrim`.
- Header: padding `20px 22px 0`, h2-like title 18/600, description small `ink-2`, close `X` top-right.
- Body sections are separated by 1 px `line-soft`.
- Esc and a scrim click close it. Focus is trapped inside.

### SidePanel (item detail)
`position: fixed; top: 0; right: 0; bottom: 0; width: 480px; max-width: 100vw`, bg `surface`, `elev-2`, z above the content.
It slides in from the right (200 ms, `ease`). The list behind it stays visible and keeps the selected row highlighted. There is **no scrim**, because the list remains interactive. Specs in §3.

### BottomSheet (mobile)
Full width, radius `12px 12px 0 0` on top, `elev-2`, scrim. Grab handle 36×4 in `line-strong`. Title row (title body 16/600 + optional "Limpar" ghost). Content scrolls. A sticky footer CTA (44 px primary) sits above the safe area.

### Toast
- Position: bottom-left, inset 24 px (desktop). On mobile: bottom centre, above the tab bar.
- Style: bg `ink`, text white small 13/500, radius md, padding `10px 14px`, max-width 420.
- Leading 16 px icon: `success-on-dark` (success), `accent-on-dark` (milestone), `danger-on-dark` (error).
- Action button text: `accent-on-dark` 600, either "Desfazer" (undo) or "Tentar de novo" (retry).
- Lifetime 5 s. Only one toast at a time; a new toast replaces the current one. Use `role="status"`.

Toast copy used in the prototypes:
- "Aprovado · a IA está extraindo os itens" / "3 itens aprovados · a IA está extraindo os itens"
- "Recusado · não entra no projeto"
- "Marcado como marco" / "Removido dos marcos"
- "Não foi possível enviar o documento" + "Tentar de novo"

### Skeleton · EmptyState · ErrorState
- **Skeleton:** bars in `surface-sunk`, radius xs, 10–12 high, widths 78 / 62 / 85 / 54 / 70 %, gentle pulse. Disabled under `prefers-reduced-motion`.
- **EmptyState:** centred in its container. 32 px icon (stroke 1.25, `ink-3`), title h3, text small `ink-2` (max-width 360), optional secondary button. Example: "Nenhum item nesta etapa ainda" / "Assim que uma reunião ou um e-mail do projeto for aprovado, os itens aparecem aqui." / [Enviar documento].
- **ErrorState:** same layout with `TriangleAlert` 32 in `danger`. "Não foi possível carregar o histórico" / "A conexão caiu no meio do caminho. Nada foi perdido." / [Tentar de novo].

### KeyValueList
Grid `76px minmax(0,1fr)` (panel) or `96px minmax(0,1fr)` (ingestion), gap `8px 10–12px`. Labels: small `ink-2`. Values: small `ink`. Wrap it in a `surface-2` box with radius md and padding `10px 12px` when it is a secondary detail.

---

## 3. Domain components (`src/components/domain`)

### Wordmark
Use the SVG files in `../brand/`, or build the wordmark in CSS (exact construction in `../brand/BRAND.md`).
Props: `size` (font-size px; default 19 in the sidebar, 22 in the landing header), `tone: 'ink' | 'white'`, `endorsed?: boolean`.
When `endorsed` is true, "by souBIM" appears below at 0.48× size, 400, `ink-2`.

### ItemTypeIcon · ItemTypeBadge
- The icon follows the §1 map. It is always monochrome (`ink`, or `ink-3` when done). Type is never conveyed by colour.
- Badge: 12 px icon + label, caption 600, `ink`. Example: "Decisão".

### DisciplineMarker · DisciplineList
- Single: square 8×8 (list rows) or 10×10 (detail, filters), radius xs, filled with `disc-*`. Next to it, the 3-letter code in caption 500 `ink-2` (rows) or the full name in small 500 `ink` (detail, filters, chips).
- List: shows up to **2** codes in a row. Above that, a "+N" caption `ink-2` with a tooltip listing every discipline.
- The discipline enum is fixed: `ARQ EST INS ELE HID PAI INC ACU SUS CIV CLI CON LOC ENG GER`. Each has a pt-BR name, a code and a token (see `tokens.css`).

### MilestoneStar
A toggle button (`aria-pressed`) with a 16 px `Star`. On: filled `accent`. Off: outline `line-strong`, and `ink-2` on row hover. Keyboard: `M` on the focused or selected item. Toggling shows a toast with "Desfazer".

### ImpactIndicator
Three ascending bars (3 px wide, 6/9/12 px tall, gap 2, radius 1) plus the text "Impacto alto | médio | baixo".
- Alto: 3 bars in `danger`.
- Médio: 2 bars in `warning`, the 3rd in `line`.
- Baixo: 1 bar in `ink-3`.

Shape and text always come with the colour. Red and amber are reserved for impact and errors.

### ConsensusList
- Header: label caps "CONSENSO" plus a summary on the right, for example "3 de 3 concordam". The summary is `success` 600 when everyone agrees, `warning-ink` when there are ressalvas, `danger-ink` when someone dissents.
- Rows are 36–40 high with a `line-soft` divider: discipline square + full name on the left, state on the right as icon + text (small 600):
  - Concorda: `Check`, `success`
  - Com ressalvas: tilde, `warning-ink`
  - Discorda: `X`, `danger-ink`
  - Sem posição: `Minus`, `ink-3`

### ItemRow (History, dense)
- Grid `24px minmax(220px,1fr) minmax(0,104px) minmax(0,112px) 18px 46px 18px`, gap 10, height 40 (compact: 32), padding `0 8px`, bottom border 1 px `line-soft`, bg `surface`. The columns, in order:
  1. Type icon. For Ação it is a button that toggles done.
  2. Title (body 14/500, single line with ellipsis, min 90 px visible) followed by a due-date badge if any.
  3. Disciplines (DisciplineList; the column clips).
  4. Owner: avatar 20 plus first name in caption `ink-2` (clips).
  5. Source icon 14 in `ink-3`.
  6. Date (mono-sm `ink-2`, `dd/mm`).
  7. MilestoneStar.
- States:
  - Hover: `surface-2`.
  - Selected (panel open): `accent-weak` plus `rail-selected` (2 px accent inset on the left).
  - Done action: title and icon in `ink-3` with line-through.
  - Late action: danger badge.
  - Focus-visible: focus ring inset.
- Click or Enter opens the SidePanel. The row is a `button` (or uses `role="row"` inside a grid).

### OverviewRow (two-line)
- Grid `20px minmax(0,1fr) auto 48px`, gap 12, min-height 52, padding `8px 16px`, divider `line-soft`.
- Line 1: title body 14/500 (ellipsis) + due badge. Line 2: source icon 14 `ink-3` + "Revisão do projeto estrutural · Carlos" in caption `ink-2`. The person is shown for Ação and Tópico only.
- Right side: DisciplineList, then the date in mono.

### GroupHeader (History)
- **Date group:** h3 15/600 "6 de fevereiro" + caption `ink-2` "sexta-feira" + mono-sm count "13 itens" on the right.
- **Discipline group:** 10 px square + discipline name + count.
- **Source group** (inside a date group): a collapsible band.
  - Band: bg `surface-2`, padding `10px 12px`, bottom border.
  - Source tile 32×32, radius lg:
    - Reunião: bg `ink` + white icon.
    - E-mail: bg `surface` + 1 px `line-strong` border + `ink` icon.
    - Documento: bg `surface-sunk` + `ink` icon.
  - Kind label + title 14/600, meta caption `ink-2` ("Reunião · 45 min · Gabriela, Carlos, Lucia"), one-line AI summary, and a chevron.
  - Meetings also get "Abrir transcrição" (`CirclePlay`), which opens the Meeting viewer.
- The list toolbar has "Expandir tudo / Recolher tudo".

### FilterBar (History)
- Row 1:
  - Search input: `Search` icon, placeholder "Buscar em 21 itens…", and a `/` key hint (mono-sm `ink-4` in a 1 px `line` box, radius sm). Pressing `/` focuses the search.
  - Four filter menu buttons: **Disciplina, Tipo, Fonte, Quem**. Each opens a multi-select popover; options show a checkbox, a marker, the name and a count. When a filter is active, its button shows the count and gets a `accent` border on `accent-weak` bg.
  - **Período**: a date range.
- Row 2 (only when filters are active): removable chips, then a "Limpar filtros" ghost button.
- List header: result count ("21 itens") on the left. On the right: "Expandir tudo" and a SegmentedControl "Agrupar por Data | Disciplina".
- No results: EmptyState "Nenhum item com esses filtros" / "Tente outra busca ou remova um filtro." / [Limpar filtros].

### ProjectHeader + StageStrip
- **Header:** eyebrow (label caps `ink-2`, the page name, for example "Visão geral do projeto", "Linha do tempo de marcos", "Histórico do projeto", "Reuniões do projeto"), h1 project name, description small `ink-2` ("Torre residencial de 50 pavimentos no centro · 8 participantes").
- **Actions on the right, in order:**
  - [Exportar PDF] (Marcos only)
  - [Enviar documento] (Overview and History)
  - **[Compartilhar marcos]** (primary)
  - [⋯] (36 px icon button: Editar projeto, Arquivar)

  Edit and Archive never get their own buttons in the header.
- **StageStrip:**
  - Grid columns proportional to stage **durations in days** (for example `31fr 44fr 45fr 108fr`), gap 4.
  - Bars are 6 px high, radius 1. Completed: `ink`. Current: `linear-gradient(90deg, ink 0 P%, track P%)`, where P is the elapsed share of the stage. Future: `line`.
  - "Hoje" marker: absolute, 2×16 px `accent`, top −5 px, left = today's position across the whole strip (in %).
  - Labels under each bar:
    - Name in caption 600: `ink` for the current stage, `ink-2` for the others. The current stage adds " · hoje, 03/03" in `accent`.
    - Dates in mono-sm `ink-3`: "16/02 – 31/03 · faltam 28 dias".
  - Single line with ellipsis; never wrap the dates.

### OverviewTiles
Three selectable tiles act as tabs for the list below them.
- Layout: grid `repeat(auto-fit, minmax(180px, 1fr))`, gap 12.
- Tile: padding `14px 18px`, 1 px `line` border, radius lg, bg `surface`.
- Selected tile: `ink` border + `tab-active` shadow.
- Contents: number in `kpi` 26/600, label small 600, note caption `ink-2`. When the note needs action (for example "1 atrasada") it is `danger-ink` 600.
- Tiles: **"3 novos desde 27/02"** (default) · **"5 em aberto"** (open actions and topics without a decision) · **"3 aguardando aprovação"** (this project's ingestion). Each tile drives the list title, subtitle, rows and footer link ("Ver no histórico →", "Ver todas →", "Abrir ingestão →").

### KpiTile (Executive summary, not prototyped as a screen)
Same tile anatomy without the selection state. Labels say exactly what they count:
- "Itens capturados" (21, "+5 desde 27/02")
- "Decisões" (11, "4 marcadas como marco")
- "Ações em aberto" (3, "1 atrasada" in `danger-ink`)
- "Decisões com consenso total" (85%, "2 com ressalvas" in `warning-ink`)

The number is always `ink`. Colour appears only in the note.

### StageTimeline (Marcos, presentation-ready)
- Grid per stage: `minmax(120px,180px) 24px minmax(0,1fr)`.
  - **Left:** stage name 15/600, right-aligned (`ink-2` for future stages); dates in mono-sm `ink-2` on one line ("15/01 – 15/02/2026"); status in caption 600 ("Concluída" `success`, "Em andamento · faltam 28 dias" `accent`).
  - **Centre:** a 13 px dot with a 2 px `ink` border (filled `ink` when completed, `surface` otherwise) and a 2 px vertical line below it (`ink` between completed stages, `line` for future ones, none after the last).
  - **Right:** milestone rows. Each has a type icon, the title (body 14/600), DisciplineList, meta caption `ink-2` ("Decisão · Carlos · Revisão do projeto estrutural") and the date in mono. Clicking a row opens the SidePanel.
- **Today marker** inside the current stage: a pill (mono-sm uppercase, bg `accent`, white, radius sm, padding `2px 8px`) reading "HOJE · 03/03", followed by a 1 px dashed `accent` line to the right edge.
- **Empty stages** collapse to one line: "Sem marcos ainda" in `ink-3`. The "Mostrar etapas sem marcos" toggle hides them, and a note explains how many are hidden.
- **Toolbar:** "7 marcos · 4 etapas · atualizada em 03/03/2026", then two quiet menus ("Todos os tipos", "Todas as disciplinas"). There is no filter bar on this page.
- **Print/PDF:** see `UX-UI-GUIDELINES.md` §9.

### ItemDetailPanel (inside SidePanel)
1. **Top bar** (padding `14px 20px`, bottom border `line-soft`): ItemTypeBadge + "Impacto alto" badge on the left. On the right, 32 px icon buttons: MilestoneStar, ↑ previous, ↓ next, ✕ close.
2. **Title:** h2 20/600, wraps freely.
3. **Disciplines:** full names with 10 px squares.
4. **KeyValueList:**
   - Quem: "Gabriela · Diretora de projeto"
   - Origem: source icon + "Revisão de paisagismo · 07/02/2026"
   - Na gravação: `CirclePlay` + mono "00:08:30" + "ouvir trecho" link (only when there is a timestamp)
   - Prazo: actions only
   - Etapa
5. **Tabs:** "Visão geral" · "Trecho da fonte" · "Similares N".
   - **Visão geral:**
     - **Por quê:** label caps, then the text in `reading` (Newsreader 17/1.5).
     - **Consenso:** ConsensusList.
     - **Impactos:** rows with a discipline marker + text.
     - Empty sections are **not rendered**. If the item has none of them, show one sparse note in `ink-2` instead.
   - **Trecho da fonte:** source header (icon + kind · title) and the ±2 transcript turns around the item, with the item's turn highlighted. For meetings, a button "Abrir reunião completa" opens the Meeting viewer at that timestamp.
   - **Similares:** intro text ("Itens da mesma disciplina ou da mesma fonte. Sirvem para ver se o assunto já foi tratado antes."), then rows with an icon, the title, "type · reason · date" and DisciplineList. Clicking a row opens that item.
6. **Keyboard:** ↑/↓ moves to the previous/next item in the **current visible list order** without closing the panel. Esc closes. M toggles marco. X toggles done (actions only).

### TranscriptTurn
- Grid `64px minmax(0,1fr)`, padding `10px 12px`.
  - Timestamp: mono-sm `ink-3`; clicking it seeks the player.
  - Speaker: small 13/600.
  - Text: body 14/1.55.
- **Anchored item:** when an item was extracted from the turn, a chip appears below the text: 12 px type icon + "Decisão · Concreto C50 nos pilares principais", caption 600, `accent-strong` on `accent-weak`, radius sm, padding `2px 8px`. Clicking it opens the item.
- **Focused turn** (jumped to from an item): bg `accent-weak` + `rail-selected`. The scroll container scrolls it into view with a 60 px offset (`scrollTo`, not `scrollIntoView`).
- **Uncertain speaker:**
  - Speaker line: `TriangleAlert` 14 + "Gabriela ou Lucia" in `warning-ink`.
  - Inline prompt below: "Vozes sobrepostas. Quem falou?" plus one small secondary button per candidate ("Gabriela", "Lucia").
  - Picking a candidate replaces the speaker and saves the correction.
  - The warning is never shown by colour alone.

### MeetingViewer parts
- **Header:** "← Reuniões" ghost link; eyebrow mono-sm caps "REUNIÃO · FIREFLIES"; title h1; meta small `ink-2` ("06/02/2026 · sexta-feira · 45 min · 14 falas"); participant pills (avatar 22 + name + discipline code, 1 px `line` border, radius full).
- **AI summary card:** `surface`, `line` border, radius lg, padding `18px 20px`. Label "Resumo da reunião · gerado pela IA", text in `reading`, footer caption "6 itens extraídos · 4 decisões · 1 ação · 1 tópico".
- **Player bar:** current time / duration in mono ("00:05:32 / 00:45:00"), a scrubber with one tick per extracted item at its timestamp (`ink-3`, the focused one in `accent`; clicking a tick seeks), and a speed button "1×".
- **Two columns** (they stack below about 900 px):
  - Transcript: the wider column, its own scroll container.
  - "Itens extraídos · clique para ir ao trecho": a sticky list. Rows use grid `20px minmax(0,1fr) 44px` (icon, title + DisciplineList, mono timestamp) plus a "Detalhe" link that opens the SidePanel.
  - Clicking a row seeks and focuses the matching turn.

### IngestionRow + IngestionDetail
- **Page layout:** list (`flex: 1 1 300px; max-width: 420px`) beside the decision panel (`flex: 2 1 460px; position: sticky; top: 24px`). They stack on narrow screens.
- **Bulk header:** "Selecionar todos" checkbox + "7 pendentes" or "2 selecionados". With a selection, it also shows [Recusar] [Aprovar selecionados].
- **Row:** grid `16px 32px minmax(0,1fr) auto`, gap 12, padding `12px 14px`.
  - Checkbox (selection is independent from focus).
  - Source tile.
  - Title body 14/600, up to 2 lines.
  - Meta caption `ink-2`: "Reunião · 02/03 às 14:00 · → Commercial Plaza Beta". The suggested project always appears in the meta.
  - Date in mono-sm.
  - Focused row: `accent-weak` + rail.
- **Decision panel**, top to bottom:
  1. Header caption: icon + "Reunião · 3 de 7".
  2. Title h2.
  3. Meta (date, tool, duration, participants).
  4. **Flags:** boxes with radius md, padding `10px 12px`, a 15 px icon and caption text.
     - `info`: bg `surface-3`, text `ink-soft`. Example: "2 participantes externos (cliente). Os itens ficam visíveis só para a equipe, a menos que entrem nos marcos compartilhados."
     - `warn`: bg `warning-weak`, text `warning-ink`. For a possible duplicate or a low-confidence match.
  5. **"Resumo da IA · do que trata":** a paragraph.
  6. **"O que deve entrar no projeto (3)":** candidate rows with a type icon, the title, the type label and a discipline code, followed by a candidate note.
  7. **Preview** ("Trecho da transcrição", "Trecho do e-mail" or "Trecho do documento"): lines on grid `62px minmax(0,1fr)` with a mono timestamp and "**Ana (cliente):** text", plus an "Abrir no Fireflies ↗" link.
  8. **"Por que este projeto"** + confidence badge, then a list of reasons (12 px check + text).
  9. KeyValueList: Participantes / Recebido.
  10. **Decision footer:**
      - Label "Entra no projeto" with a hint: "Escolhido pela IA · motivos abaixo", or "Você escolheu este projeto" after a manual change.
      - Project Select.
      - Buttons on grid `1fr 1.6fr`: [✕ Recusar R] secondary, [✓ Aprovar A] primary.
      - Footnote caption `ink-3`: "Aprovar extrai os itens para o projeto · Recusar descarta a fonte".
- **History tab rows:** icon, title, meta, status badge (Aprovado/Recusado) + "por Gabriela · 02/03".
- **Empty state:** "Caixa de ingestão em dia" / "Novas reuniões, e-mails e documentos aparecem aqui assim que chegarem."

### ProjectRow (Projects list)
- **Table header** (label caps `ink-2`): "Projeto | Etapa atual | Novidades e pendências". Rows use grid `minmax(0,1.5fr) minmax(0,1fr) minmax(0,1.3fr)`, gap 16, padding `14px 16px`, divider `line-soft`. The whole row is a link to the project's Visão geral.
- **Column 1:** name h3 15/600, then a caption `ink-2` line: description + " · " + `Users` 12 + team size.
- **Column 2:** mini stage bar (one segment per stage, 4 px high, gap 2: completed `ink`, current `ink` → `track` gradient by progress, future `line`), then the stage name in small 600 and a note in caption `ink-2` ("faltam 28 dias").
- **Column 3:** news line ("3 novos", small 600) + last activity in caption `ink-2` ("hoje · Reunião semanal"), then attention badges ("1 ação atrasada" danger, "3 aguardando aprovação", "3 tópicos em aberto"). With none, "Nenhuma pendência" in `ink-3`.
- **Toolbar:**
  - Search "Buscar projeto…"
  - SegmentedControl "Ativos | Arquivados"
  - Checkbox toggle "Só com pendências"
  - Select "Ordenar por": Atividade recente · Pendências · Nome · Etapa
  - Primary [Criar projeto] in the page header.
- The "Pendências" sort uses an attention score: `lateActions × 10 + pendingIngestion + openTopics`.

### ProjectForm parts
- **Shell:** single column (max-width 760). Back link "← Projetos" or "← Visão geral". Title h1 "Novo projeto" or "Editar projeto".
- **Subtitle:**
  - Create: "Quatro passos. Só o nome é obrigatório…"
  - Edit: "As mudanças valem a partir de agora. Itens já registrados não mudam de etapa."
- **Section cards:** `surface`, `line` border, radius lg, padding 24, gap 16. Numbered title in h3: "1 · Dados do projeto", "2 · Etapas", "3 · Equipe", "4 · Documentos do Google Drive".
- **Stage editor:**
  - Template chips: "Começar de um modelo:" followed by **Edificação padrão** (Estudo Preliminar 31 d · Anteprojeto 44 · Projeto Legal 45 · Projeto Executivo 108), **Casa** (EP 30 · AP 45 · PE 90) and **Retrofit** (Levantamento 30 · Diagnóstico 30 · Projeto Legal 60 · Projeto Executivo 90).
  - Applying a template chains the dates from the project start date.
  - Below the chips, a live StageStrip preview.
  - Rows on grid `16px minmax(140px,1fr) minmax(0,128px) minmax(0,128px) 56px 28px`: drag handle "⋮⋮", name input, start date, end date, auto duration ("31 dias"), `Trash`. The table header is label caps "Etapa | Início | Fim | Duração".
  - Validation: overlapping or inverted dates set the date borders to `warning-line` and show one warning line under the table. Overlap is a warning, not a blocker.
  - Empty: "Escolha um modelo acima ou adicione a primeira etapa."
  - Button: "+ Adicionar etapa".
- **Participant editor:**
  - Help text: "A disciplina de cada pessoa ajuda a IA a classificar quem falou o quê. O e-mail liga a pessoa às mensagens do Gmail."
  - Grid `minmax(0,1fr) minmax(0,1.3fr) minmax(0,1.1fr) minmax(0,1fr) 28px` with the columns Nome | E-mail | Disciplina | Papel | trash.
  - **Disciplina** is a Select of the fixed 15-item list, each option with its square + name.
  - **Papel** is optional: — · Diretor(a) · Coordenador(a) · Projetista · Consultor(a) · Cliente · Fornecedor.
  - Button: "+ Adicionar participante".
- **Drive folder:**
  - Connected: folder icon + "Drive › Projetos › {name}" + "Conectada · monitorando novos arquivos" + [Trocar pasta].
  - Not connected: [Escolher pasta no Google Drive] + help "Abre o seletor do Google. Não é preciso copiar o ID da pasta." This uses the Google Picker; never ask for a folder ID.
- **Danger zone** (edit only): 1 px `danger-line` border, radius lg. "Arquivar projeto" / "Sai da lista de ativos. O histórico e os links compartilhados continuam acessíveis." / [Arquivar].
- **Footer:** [Cancelar] secondary + primary "Criar projeto" or "Salvar alterações". Validation runs on submit (`formTried`). The only required field is the name: "Dê um nome ao projeto para continuar."

### ShareDialog
- Title "Compartilhar marcos". Description: "Link somente leitura para clientes e fornecedores. Ninguém precisa de login. Mostra só os marcos, nunca o histórico completo."
- **Preview card** (bg `bg`, radius md, padding 14), linking to the public page in a new tab: "Prévia do que o cliente vê" + "Abrir ↗". Inside: a mini card with the firm logo slot, the firm name, the project name, a mini stage bar and "7 marcos · Estudo Preliminar e Anteprojeto".
- **Link row:** a read-only field with a `Link` icon and the mono URL `promem.com.br/m/rta-7k2p`, plus primary [Copiar link]. After copying, the button reads "✓ Copiado".
- **Footer row** (top border `line-soft`): "Expira em" Select (30 dias · 90 dias · Nunca) · "Visualizado **N vezes**" · danger-ghost [Revogar link] on the right.

### PublicTimelinePage (client view, logged out)
- **Header** (`surface`, bottom border): firm logo slot (40×40, dashed `line-strong` until uploaded) + firm name 15/600 + firm tagline caption. On the right: pill "Somente leitura · atualizado em 03/03/2026" (bg `surface-3`) and [↓ Baixar PDF].
- **Main** (max-width 980, padding `40px 24px 56px`, gap 32):
  - Eyebrow "Linha do tempo de marcos", h1 40/700 project name (landing-like scale), description "… · Cliente: Incorporadora Alfa".
  - Summary card: "Etapa atual **Anteprojeto** · 2 de 4", "Próxima **Projeto Legal** em 01/04/2026", "Marcos registrados **7**", then a StageStrip with 8 px bars.
  - Timeline card: the StageTimeline in its client variant. The **"por quê" line** under a milestone is set in Newsreader 15.5/1.5 `ink-soft`, written for the client.
- **Footer:** "Compartilhado por Gabriela · Escritório Exemplo" · "Link válido até 04/11/2026" · "Feito com [promem wordmark 13 px]".
- **Expired state:** a centred card: "Este link expirou" / "O acesso à linha do tempo de {projeto} terminou em {data}. Peça um novo link ao {escritório}." / contact e-mail in `accent`.
- No internal navigation, never the full history, and no discipline filters.

### Mobile shell (≤ 767 px)
- **Top bar:** project name body 16/600 + "▾" (opens the project BottomSheet), sub caption "Anteprojeto · 2 de 4 · faltam 28 dias", and a 44 px search icon button.
- **Bottom tab bar:** 4 equal tabs (Visão geral · Marcos · Histórico · Mais), 50 px plus the safe area, icon 22 + label 11. Active tab: `ink` 700. Inactive: `ink-3` 500. Top border `line`.
- **"Mais"** opens a list: Aguardando aprovação [count] · Trocar projeto · Compartilhar com o cliente · Notificações.
- **Detail** is a full-screen route:
  - Top bar: ‹ back, type label, star, share.
  - The content scrolls.
  - The bottom bar has "↑ Anterior" and "Próximo ↓" (44 px each).
- **History filters** open a BottomSheet: Disciplina and Tipo chips, sticky CTA "Ver N itens", "Limpar".
- Every target is at least 44 px. There is no horizontal scroll at any width from 320 px up.
