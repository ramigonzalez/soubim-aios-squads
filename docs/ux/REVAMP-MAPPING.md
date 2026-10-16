# Promem revamp: Phase 0 mapping

> **Status:** Phase 0 approved (decisions in §6.1). Phase 1 (foundations) done, see §7.
> **Inputs:** `docs/design_handoff_promem/` (README, UX-UI-GUIDELINES, COMPONENTS, tokens, BRAND, prototypes) and an audit of `decision-log-frontend/` and `decision-log-backend/` on `feat/promem-revamp` @ `2e1e20e`.
> **Rule of thumb used here:** the platform wins (README §0.3). Where the prototype shows something the API can't back, the section hides and the gap is listed in §4.

---

## 1. Codebase audit summary

| Area | Finding | Implication for the revamp |
|---|---|---|
| Framework | React 18.2, TS 5.3, Vite 5 | Matches the handoff target. |
| Tailwind | **v3.3** (`tailwind.config.ts`, `@tailwindcss/forms`) | Use `tailwind.preset.ts` (v3), not the v4 theme. |
| Existing theme | `colors.{border,input,ring,background,foreground}` point at **undefined** CSS vars. `discipline.*`, `consensus.*` and `impact.*` are hard-coded hex. Custom `screens` 375/768/1024/1280/1536 match the handoff. | Replace with the preset. Keep `screens`. The preset overrides `rounded`/`rounded-{sm,md,lg}` and `font-sans`, so **legacy screens shift slightly** (8 → 6 px radius, new font) until they are migrated. That's acceptable on this branch. |
| Icons | `lucide-react` **0.292** | Several names in the icon map (`CircleCheck`, `SquareCheck`, `TriangleAlert`, `CirclePlay`, `Ellipsis`, `GitCommitVertical`) were renamed after 0.292. **Upgrade lucide in Phase 1**, or alias them in `icons.ts`. |
| Radix | Only `react-dialog` is used. `react-select` and `react-slot` are installed but unused. | Add `popover`, `dropdown-menu`, `tabs`, `tooltip`, `checkbox` and `toast` (or a custom toast). |
| Data layer | **`react-query` v3** (not `@tanstack`), axios client in `src/services/api.ts` | Keep it. A migration is out of scope. Optimistic update + revert works in v3. |
| Router | react-router-dom 6.20, `BrowserRouter`. Project tabs use the URL **hash** (`#milestones`, `#history`, `#digest`). | New nested routes (§2.4). Redirect the old hashes. |
| i18n | `i18next` + `react-i18next`, 13 namespaces, **pt-BR default + en**, with a key-parity test | Good base. Plurals use i18next's native `_one/_other` (not ICU). Proposal: keep the native plurals rather than adding `i18next-icu`. Leftover English: `ITEM_TYPE_LABELS`, `SOURCE_TYPE_LABELS`, `DISCIPLINE_LABELS` in `types/projectItem.ts`, some aria-labels, "DecisionLog" in `Navigation`/`Login`/`index.html`. |
| Dates | **No date-fns**. Native `toLocaleDateString`. `react-datepicker` in FilterBar. | Add `date-fns` + `ptBR` in Phase 1 (`src/lib/format.ts`). |
| Forms | **No react-hook-form/zod**. Hand-rolled `useState` forms. | Keep the codebase's own approach (README allows it). No new form library unless you want one. |
| Toasts | **None**. Uses inline alerts and `window.confirm()`. | New `ToastProvider` + `useToast()` (one at a time, undo/retry callbacks). |
| Storybook | **None** | Use a dev-only **`/dev/ui`** gallery route (cheaper than adding Storybook). |
| Shared UI | No Button/Input/Card primitives. Every file writes its own Tailwind. Colour maps are duplicated and inconsistent (`MilestoneNode` vs `ITEM_TYPE_CONFIG`, `FilterBar` dots). | The design-system folder (§5) becomes the single source. |
| Mobile | No mobile shell, drawer or hamburger. Ingestion tables scroll horizontally, the timeline uses fixed offsets. | Phase 2 shell + Phase 3 mobile pass, built from scratch. |
| Tests | Vitest + RTL, 56 files, `setup.ts` forces **English** | Switch to pt-BR (§6.1 #6). Migrated screens get their tests rewritten to assert pt-BR. |
| Export | `jspdf` + `html2canvas` client-side (`src/lib/exportTimeline.ts`): PDF A4 + JPEG | Keep the mechanism and restyle to guidelines §9. Add print CSS. |
| Dead code | `DecisionCard`, `DecisionRow`, `MeetingGroup`, `GroupingToggle`, `FiltersSidebar`, `MeetingTypeBadge`, `ParticipantIndicator`, `DisciplinePill`, the hooks `useDecisions`, `useDecisionsMock`, `useProjectsMock`, `useAuth`, `usePendingCount`, and `lib/mockData.ts` | Don't migrate them. They're deleted in one separate cleanup PR (§6.1 #5). `ManualItemCreate`/`ManualItemForm` are **not** dead code: they get a route (§6.1 #4). |

### 1.1 Domain mapping (prototype vocabulary → platform types)

| Handoff concept | Platform reality | Mapping |
|---|---|---|
| `ItemType` | `idea \| topic \| decision \| action_item \| information` | Identical. |
| `SourceKind` | `meeting \| email \| document \| manual_input` | `manual` → `manual_input`. |
| `DisciplineCode` (ARQ…GER) | Backend stores English keys: `architecture, structural, mep, electrical, plumbing, landscape, fire_protection, acoustical, sustainability, civil, client, contractor, tenant, engineer, general` | One table in `design-system/disciplines.ts`: key → code → token → i18n name (ARQ=architecture, EST=structural, INS=mep, ELE=electrical, HID=plumbing, PAI=landscape, INC=fire_protection, ACU=acoustical, SUS=sustainability, CIV=civil, CLI=client, CON=contractor, LOC=tenant, ENG=engineer, GER=general). Plus an explicit `shortName` (README §7.5). |
| `Consensus` agree / mixed / dissent / none | `{discipline: {status: AGREE \| DISAGREE \| ABSTAIN, notes}}` | AGREE → Concorda, DISAGREE → Discorda, ABSTAIN → Sem posição. **"Com ressalvas" never occurs** (no `mixed` value). Show `notes` under the row when present. |
| `impact` high/medium/low + `impacts[]` per discipline | One object `{cost_impact, timeline_impact, scope_impact, risk_level, affected_areas[]}` | `ImpactIndicator` level = `risk_level`. The "Impactos" section lists rows by **kind** (Custo · Prazo · Escopo, plus areas) instead of by discipline. Platform wins. |
| `Item.stageId` | Items have **no stage** | Derive the stage client-side from the item date against stage ranges (`lib/stages.ts`). Items outside every range go to an "Outros" bucket, which already exists in `MilestoneTimeline`. |
| `Item.title` | `title?` + `statement` (+ legacy `decision_statement`) | `title ?? statement`. |
| `Item.owner` (PersonRef) | `who` (speaker string) + `owner` (action owner string) | "Quem" = `who`. "Responsável" = `owner` for actions. No person IDs, so avatars use the initial of the string. |
| `transcriptTs` HH:MM:SS | `timestamp` string such as `"12:34"`. The viewer uses `?t=<seconds>`. | Normalise in `lib/format.ts`. The viewer accepts both `?t=332` and `?t=00:05:32`. |
| `isMilestone`, `done`, `due` | `is_milestone`, `is_done`, `due_date` | Direct. **Toggling the milestone is admin-only** in the backend (`project_items.py:357`), so the star renders read-only for non-admins. |
| Review status | Items have `review_status` pending/approved/rejected, edits, AI original, restore | **Not in the prototype.** Kept (see §3). |
| `Source.tool` | `source_label` (Fathom, Fireflies, Upload, Gmail, Google Drive). Meetings only; empty for Tactiq. | Show it when present, otherwise just the kind. |
| `Participant.role` enum | `project_participants.role` is free text | The Select offers the handoff's list, but the form keeps any existing free-text value (no data loss). |

---

## 2. Feature → screen → components

Columns: **Prototype ref** points at `screenshots/desktop/*` or the README section. **Components** are library components (§5 = Phase 1 atoms; the rest are Phase 3 composites).

### 2.1 Shell and navigation

| Existing feature | Today | New home (prototype ref) | Components |
|---|---|---|---|
| Top bar: brand, breadcrumb, links | `common/Navigation.tsx` | **Sidebar 248** (README §4, §5.1). Drawer below 1024. Mobile top bar + tab bar. | `AppShell`, `Sidebar`, `SidebarNavItem`, `Wordmark`, `ProjectSwitcher` (Popover), `MobileTopBar`, `MobileTabBar`, `BottomSheet` |
| Ingestion count badge | `GET /ingestion/count`, shown if `canReviewSomewhere` | Sidebar "Ingestão N" (Escritório section) | `SidebarNavItem` with count |
| Organisation switcher | `molecules/OrganizationSwitcher` | Workspace name next to the wordmark becomes a Popover menu when the user has more than one organisation | `Popover`, `Menu` |
| User name + role, logout, password, integrations, team, platform links | Icons in the top bar | **Sidebar footer user menu** (guidelines §6: "settings go under the user/firm menu"): Integrações, Equipe (admin), Plataforma (operator), Alterar senha, Sair. The footer role shows the **organisation role** (owner/admin/reviewer/member), not the legacy `users.role`. | `Avatar`, `Menu` |
| Payment-pending banner | `PaymentPendingBanner` | Keep. A `warning-weak` banner at the top of `main` (cookbook: status always icon + text). | `Banner` (new primitive, flagged) |
| Project nav counts | n/a | Marcos / Histórico counts from the items response `total` and facets. Reuniões = number of distinct sources. | – |
| "Buscar ⌘K" | **No global search exists** | See §3: hidden until there's a backend. | – |

### 2.2 Project screens

| Existing feature | Today | Prototype screen | Components |
|---|---|---|---|
| Project page with 3 hash tabs | `pages/ProjectDetail.tsx` | Split into routes: **Visão geral** (new default), **Marcos**, **Histórico**, **Reuniões** (new list), **Resumo executivo** | `ProjectHeader`, `StageStrip`, `PageHeaderActions` |
| — (new) | – | **Visão geral** (`01-visao-geral.png`, README §5.2) | `OverviewTiles`, `OverviewRow`, side box with `MilestoneStar` rows. Data per tile in §4 (G1, G6). |
| Milestone timeline + type/source chip filters | `organisms/MilestoneTimeline`, `molecules/MilestoneNode`, `StageNode`, `MilestoneFilterBar`, `useMilestoneFilters` (URL) | **Marcos** (`02-marcos-linha-do-tempo.png`, §5.3) | `StageTimeline`, `MilestoneRow`, toolbar with two `Menu`s (Tipos, Disciplinas) and the "Mostrar etapas sem marcos" toggle. The existing **source** filter is kept as a 3rd quiet menu "Todas as fontes" (§6.1 #3). |
| Export PDF / JPEG (admin) | `lib/exportTimeline.ts` | [Exportar PDF] on Marcos | `Button` + `Menu` (PDF / JPEG). Keep JPEG: the platform has it. |
| Share link (admin) | `molecules/ShareDialog` | **ShareDialog** (`12-compartilhar-marcos.png`, §5.10) | `Dialog`, `Input` (read-only), `Select` (Expira em), `Button` danger-ghost |
| Document upload PDF/DOCX (write) | `DocumentUploadButton` on the Milestones tab | **[Enviar documento]** in ProjectHeader on Overview and History. It moves off Marcos. | `Button` + hidden file input. Toast on success/error ("Não foi possível enviar o documento" + Tentar de novo). |
| Edit / Archive (admin) | Inline buttons + inline confirm | "⋯" menu: Editar projeto, Arquivar. Archive asks for confirmation (irreversible from the UI, because there is no unarchive endpoint). | `IconButton`, `Menu`, `Dialog` |
| History list: date → source → items; group by discipline | `organisms/Timeline`, `SourceGroupAccordion`, `ProjectItemRow` | **Histórico** (`03-historico-pagina.png`, §5.4) | `FilterBar`, `GroupHeader` (date / discipline / source band), `ItemRow`, `SegmentedControl` |
| Filters: search, discipline, date range, who, meeting type, source/item chips | `organisms/FilterBar`, `store/filterStore` (persisted), `useFilterUrlSync` | FilterBar: search `/`, menus Disciplina · Tipo · Fonte · Quem, Período, chips, Limpar | `Input`, `FilterMenu` (Popover + Checkbox list with counts from `facets`), `DateRange`, `Chip`. **Meeting-type filter** (client meeting / coordination / design review…): it exists today but isn't in the spec. Proposal: keep it as sub-options under "Fonte → Reunião" (keeps the feature; no new menu). Filter state moves to the URL (handoff) and the persisted Zustand store is retired. |
| Show rejected items (reviewer) | Checkbox in ProjectDetail | Checkbox in the History list header ("Mostrar recusados") | `Checkbox` |
| Bulk "approve pending" per source (reviewer) | `SourceGroupAccordion` | Action in the source band ("Aprovar N pendentes") | `Button` sm |
| Item review badges (Pendente / Recusado / Editado) | `atoms/ReviewStatusBadge` | Small `Badge` after the title in `ItemRow` (same slot as the due badge) | `Badge` (new variants, flagged) |
| Action done toggle (optimistic) | `useToggleDone` | Type icon button in `ItemRow`, `X` key, toast + Desfazer | `ItemTypeIcon` (button mode), `Toast` |
| Milestone star (admin) | `MilestoneStarToggle` | `MilestoneStar`, `M` key, toast + Desfazer | `MilestoneStar` |
| Item detail modal | `organisms/DrilldownModal` | **SidePanel 480** (`04-detalhe-do-item.png`, §5.5), `?item=` in the URL, ↑/↓ | `SidePanel`, `ItemDetailPanel`, `KeyValueList`, `Tabs`, `ConsensusList`, `ImpactIndicator` |
| Rationale, causation, consensus, impacts | DrilldownModal Overview tab | "Por quê" (reading), **"Causa"** (extra block in the same style, not in the prototype), Consenso, Impactos (by kind; see §1.1) | – |
| Transcript excerpt + "open in meeting" | DrilldownModal Transcript tab | "Trecho da fonte" + "Abrir reunião completa" | `TranscriptTurn` (compact) |
| Similar tab | Placeholder | "Similares": **hidden** (G11) | – |
| Item review: approve / reject / edit / AI original / restore | `organisms/ItemReviewPanel` (inside the modal) | A **"Revisão" block** in the panel, shown only when `review_status != approved` or `is_edited`: status, [Aprovar] [Recusar], "Editar", "Ver original da IA" / "Restaurar". Edit happens inline in the panel. Not prototyped; flagged. | `Button`, `Input`, `Textarea` |
| Meeting viewer: video + transcript sync, `?t=`, uncertain speakers | `pages/MeetingViewer.tsx`, `lib/transcript.ts` | **Meeting viewer** (`06-reuniao-transcricao.png`, §5.6) at `/projects/:id/meetings/:sourceId` | `MeetingHeader`, `AiSummaryCard`, `PlayerBar` (wraps the **real `<video>`**; ticks from item timestamps), `TranscriptTurn`, `ExtractedItemsList` |
| Recording: file vs external link | `recording{type,url}` | Player for `file`. "Abrir gravação ↗" for `external`. Neither: hide the player bar. | – |
| Meeting visibility internal/shared | `MeetingVisibilityControl` | Meeting header: `Badge` + `Menu` action "Tornar compartilhada / interna" with a confirm `Dialog` | – |
| Extraction versions, activate, re-extract (admin) | `organisms/ExtractionVersions` | A collapsible **"Versões da extração"** section below the transcript (admin-oriented, low prominence). Not prototyped. | `KeyValueList`, row list, `Button` |
| — (new) Reuniões list | – | **Reuniões** (`05-reunioes.png`) | `MeetingRow`. Data: G3. |
| Executive digest | `organisms/ExecutiveDigest`, numbers **computed in the browser and partly fake** (85% consensus constant, "highlights" = first 5 items) | **Resumo executivo** (README §5.12) | `KpiTile`, `OverviewRow`, `DisciplineBarList` (new, flagged). **Every KPI is computed honestly from the items**: totals by type, milestones, open/late actions, % of decisions where every discipline is AGREE. The fake constant is removed. |

### 2.3 Firm-level and object screens

| Existing feature | Today | Prototype screen | Components |
|---|---|---|---|
| Projects grid of cards, pagination 12, create button | `pages/Projects.tsx`, `common/ProjectCard` | **Projetos** table (`09-projetos.png`, §5.8) | `ProjectRow`, `MiniStageBar`, toolbar (`Input`, `SegmentedControl` Ativos/Arquivados, `Checkbox`, `Select` sort). Column 3 aggregates mostly hidden (G6). **Create button**: today every user sees it, but the backend requires org owner/admin. Show it only to owner/admin (platform wins). |
| Archived projects | API `?archived=true`, no UI | "Arquivados" segment | – |
| Card "Edit" button (can_manage) | Story 12.3 | ProjectRow "⋯" menu → Editar | `Menu` |
| Create project | `pages/ProjectCreate.tsx`, `organisms/ProjectForm`, `StageScheduleBuilder`, `ParticipantRoster` | **Novo projeto** (`10-novo-projeto.png`, §5.9) | `FormShell`, `FormSection`, `StageEditor` (+ live `StageStrip`), `ParticipantEditor`, `Field` |
| Project type (residential, commercial…) | ProjectForm | Kept inside "1 · Dados do projeto" | `Select` |
| Stage templates | `GET /stage-templates` (architecture_full: 7 stages, architecture_legal: 4) | Template chips. **Use the backend templates** rather than the prototype's three client constants (platform wins). G10. | `Chip` (button variant) |
| Edit project | `pages/ProjectEdit.tsx` | **Editar projeto** (`11-editar-projeto.png`) + danger zone "Arquivar" | same + `DangerZone` |
| Drive folder (service account; pick from folders shared with it) | `organisms/DriveFolderSection` | "4 · Documentos do Google Drive", restyled as an **integration row** (cookbook). Keeps the current flow: copy the service-account e-mail, choose from shared folders. No Google Picker (G9). Never shows the raw folder ID. | `IntegrationRow`, `Select`, `Button` |
| Share project with other organisations | `organisms/ProjectSharing` | Edit form **section 5 · "Organizações com acesso"** (not prototyped; cookbook form section) | `FormSection`, rows, `Select` |
| Fathom routing rules (reviewer) | `organisms/FathomRulesSection` | Edit form **section 6 · "Regras de importação do Fathom"**. Reviewers who aren't admins see only this section, as today. | `FormSection`, rows |
| Ingestion pending table + history | `pages/Ingestion.tsx`, `organisms/IngestionApproval`, the three `*SourceRow`s, `BulkActionBar`, `IngestionFiltersBar`, `store/ingestionStore` | **Ingestão inbox** (`07-ingestao.png`, `08-ingestao-historico.png`, §5.7) | `IngestionRow`, `IngestionDetail`, `Tabs`, `Select`, `SegmentedControl`, `Checkbox`, `Toast` |
| Date-range filter on ingestion | `IngestionFiltersBar` | Keep as a `DateRange` next to the project Select (not in the prototype) | `DateRange` |
| Retry failed source, job status (queued / running / retrying), live polling | `IngestionStatusBadge`, polling every 5 s | History-tab `Badge` with status + job state. "Tentar de novo" on failed rows. | `Badge` (status variants) |
| Delete source (admin) | Confirm modal | History row "⋯" → "Excluir fonte" → destructive `Dialog` | `Menu`, `Dialog` |
| Fathom unassigned / conflict meetings | `UnassignedMeetingRow` inside the pending table | Pending list rows with a `warn` flag ("Sem projeto definido" / "Mais de um projeto possível"). The decision footer's project Select is **required** before Aprovar ("Importar"). Discard maps to Recusar. Not prototyped as such; flagged. | `IngestionRow` variant |
| Add meeting (video/transcript upload) | `organisms/AddMeetingDialog` | Ingestão header secondary button **[Adicionar reunião]** → same dialog, restyled | `Dialog`, `Field`s, progress |
| AI summary per source | `AISummaryExpander` | "Resumo da IA · do que trata" in the panel | – |
| Original link (transcript, thread, file) | Link column | "Abrir no Fathom ↗" / "Abrir no Gmail ↗" / "Abrir documento ↗" | – |
| Public shared timeline (logged-out) | `pages/SharedMilestoneTimeline.tsx` | **PublicTimelinePage** (`13-visao-do-cliente-link-publico.png`, §5.11) | `PublicHeader`, summary card, `StageStrip`, `StageTimeline` (client variant), expired state |

### 2.4 Routes (old → new)

| Old | New | Notes |
|---|---|---|
| `/projects/:id` (hash `#milestones` default) | `/projects/:id` → `/projects/:id/overview` | The new default is Visão geral. A hash redirect maps `#milestones` → `/milestones`, `#history` → `/history` and `#digest` → `/summary`. |
| – | `/projects/:id/milestones`, `/history`, `/meetings`, `/summary` | Item panel: `?item=:id` on any of them |
| – (unreachable today) | `/projects/:id/items/new` | Manual item entry (§6.1 #4) |
| `/meetings/:sourceId?t=` | `/projects/:id/meetings/:sourceId?t=` | The redirect component fetches `GET /sources/:id/meeting` to learn `project_id`. |
| `/projects/new`, `/projects/:id/edit`, `/projects`, `/ingestion`, `/login` | unchanged (ingestion gains `?tab=&project=&source=`) | |
| `/shared/milestones/:token` | unchanged + alias `/m/:token` | The backend builds `share_url` as `/shared/milestones/{token}`. The short URL needs a one-line backend change (G8). |
| `/settings/*`, `/platform`, `/invite/:token`, `/auth/google/callback` | unchanged | Restyled (§3). |
| – | `/dev/ui` | Dev-only gallery (`import.meta.env.DEV`). |
| no 404 | add a catch-all `NotFound` (EmptyState) | Small and cheap. Flagged. |

---

## 3. Platform features without a prototype: proposed cookbook pattern

| Feature | Route / location | Pattern (guidelines §5) |
|---|---|---|
| Login (e-mail + password, Google when enabled, `?blocked=1`, 429) | `/login` | Login recipe: 400 px `surface` card, endorsed lockup, h2 "Entrar". **Google is the primary button only when `/auth/providers` says it's enabled**, otherwise e-mail/password is primary. Remove the demo-password hint. |
| Google callback (15 error reasons) | `/auth/google/callback` | Same card. `Skeleton` while exchanging. `ErrorState` per reason with "Voltar para entrar". |
| Accept invitation (4 paths) | `/invite/:token` | Same card shell. Path-specific body. Form fields via `Field`. |
| Change password | `/settings/password` | Form shell (max 760), one section card. Success via `Toast`. |
| Integrations (Fathom: connect / reconnect / disconnect / auto-import) | `/settings/integrations` | Settings recipe: integration rows (icon, name, status line, one action). Auto-import becomes a sub-row with a `Checkbox` + visibility `Select`. Disconnect uses a destructive `Dialog` (replaces `window.confirm`). |
| Fathom meetings browser (search, preview, import, retry) | `/settings/integrations/fathom` | List recipe: dense two-line rows (thumbnail as a `SourceTile`-sized image, title, meta, per-project import badges), search on top, "Carregar mais". Import → `Dialog`. |
| Team settings (invite, roles, remove, project assignments) | `/settings/team` | Form-shell page with sections: "Convidar", "Convites pendentes", "Membros" (rows: avatar, name, e-mail, role `Select`, "⋯" Remover). Assignments open in a **SidePanel** (details recipe). Remove uses a destructive `Dialog`. |
| Platform operator (organisations, status, company invitations) | `/platform` | List recipe with `Tabs` (Organizações · Convites). Organisation detail in a SidePanel. "Bloquear" uses a destructive `Dialog`. |
| Payment-pending banner, blocked org | Shell | `Banner` (warning) at the top of `main`. Blocked → login card with an error. |
| Item review workflow | SidePanel + History | Described in §2.2. |
| Extraction versions | Meeting viewer | Described in §2.2. |
| Meeting visibility | Meeting viewer + upload/import dialogs | `Badge` "Interna" / "Compartilhada" + `Menu` action + confirm `Dialog`. |
| Show rejected items | History | `Checkbox` in the list header. |
| Toasts for existing actions | Everywhere | Replaces inline success/error text and `window.confirm` for **reversible** actions only. |
| Global search ⌘K | – | **The feature doesn't exist.** Recommendation: don't add the sidebar entry yet. The History `/` search covers the in-project need. Phase 2+ todo once a backend endpoint exists. |
| Notifications | – | **The feature doesn't exist.** Omit the entry from the sidebar and from mobile "Mais". Phase 2+ todo. |
| Manual item entry | `ManualItemCreate` (no route today) → `/projects/:id/items/new` | **Included** (§6.1 #4). "Adicionar item" in Histórico → form shell. |
| Landing page | – | Phase 5. Not in this repo today. Hosting decision needed (separate Vite entry vs. separate app). |

---

## 4. Backend gaps (verified against `decision-log-backend/`)

Legend: ✅ exists · 🟡 partial · ❌ missing.

> **Superseded (§6.1 #7):** nothing is hidden. Every gap below is built in the backend. The "UI behaviour" column only records what was considered before that decision.

| # | Need (README §9.3) | Status | Evidence | UI behaviour without backend work | Backend ask (optional, separate tickets) |
|---|---|---|---|---|---|
| G1 | Last visit per user per project | ❌ | `project_members` has only `created_at`; no visit table | Overview tile 1 needs a fallback. **Decided:** "N novos nos últimos 7 dias", computed from item `created_at`. | `project_visits(user_id, project_id, last_seen_at)` + touch on GET |
| G2 | Ingestion suggestion: confidence, reasons, flags, candidate items before approval | ❌ (summary ✅, original link ✅) | Confidence is per item, not per source. No reasons/flags. Items only exist after approval. | Hide "Por que este projeto", the confidence badge, flags (except the Fathom unassigned/conflict reason, which **does** exist) and "O que deve entrar no projeto". The panel shows: AI summary, preview (see G2b), meta, original link, decision footer. | Pre-extraction preview + match reasons |
| G2b | Ingestion preview excerpt | 🟡 | `ai_summary` ✅. The transcript excerpt isn't in the list payload; `raw_content` is only on the meeting endpoint. | For meetings, lazy-load `GET /sources/:id/meeting` on focus and show the first turns. Emails/docs: summary only. | – |
| G2c | Change the project on approve | ❌ | `PATCH /ingestion/{id}` accepts only the status | The project Select in the decision footer is **read-only** (shows the suggested project), except for Fathom unassigned rows, which use `/unassigned/{id}/assign`. | Accept `project_id` on approve |
| G3 | Meeting list per project, AI summary, item counts per source, participants | 🟡 | Summary ✅. `extracted_item_count` only in `/ingestion/history`. Participants stored but **not returned**. Duration only on the single-meeting endpoint. | **Reuniões list**: derived from the project's items grouped by `source` (title, date, summary, count). Sources with zero items won't appear. Participant pills are hidden in the viewer. | `GET /projects/:id/sources` with counts, duration, participants |
| G4 | Speaker correction | ❌ | Transcript is plain text; the frontend parses "⚠️ Name [reason]" | Show the uncertain-speaker **warning** (that exists). Hide the "Quem falou? [A] [B]" buttons. | Structured turns + correction endpoint |
| G5 | Undo for approve / reject / milestone / done | 🟡 | Milestone/done are boolean PATCHes (reversible). Source approve/reject can't return to pending, and approve enqueues a job immediately. | Milestone/done: optimistic + Desfazer = reverse PATCH. **Approve/reject: delayed commit on the client**: show the toast with Desfazer for 5 s and only then call the API (no backend change). Flag: if the tab closes inside the 5 s, the action is lost; the row reappears as pending, which is safe. | (optional) revert-to-pending endpoint |
| G6 | Projects list aggregates (current stage, news, last activity, late actions, pending ingestion, open topics) | ❌ | The list returns only `member_count`, `decision_count`, `latest_decision`. `ProjectCard` reads `project.current_stage`, which **the API never sends** (the stage pill never renders today). | Column 2 (stage) and column 3 hidden or reduced to "Última atividade" from `latest_decision`. **Avoid N+1 calls** (no per-row stage/items queries). "Só com pendências" and the "Pendências" sort hidden. | Add `stages`, `current_stage`, and counts to `GET /projects` |
| G7 | Workspace branding (logo, tagline, contact e-mail) for the public view | ❌ | `organizations` has only name/slug/status, and the shared payload doesn't include the org at all | The firm name isn't available today. Proposal: the public header shows the project name only, with no logo slot; the expired state says "Peça um novo link a quem compartilhou". | Add the org `name` (and later logo/tagline/e-mail) to `GET /shared/milestones/:token` |
| G7b | "Por quê" under each public milestone; "Compartilhado por" | ❌ | The shared payload milestones lack `why`; no creator name | Hide both. | Add `why`, `created_by` name |
| G8 | Share link: expiry options, view count, revoke, short URL | 🟡 | `expires_in_days` int (default 30) ✅, `view_count` ✅, revoke ✅. "Nunca" isn't supported. `share_url` is `/shared/milestones/…`. | "Expira em": **30 dias · 90 dias** only (no "Nunca"). The link shows the existing URL. | Nullable expiry; `/m/:token` |
| G9 | Google Picker for Drive | ❌ (service-account flow ✅) | `drive_folders.py:45-66` | Keep the current flow (copy the service-account e-mail, pick from shared folders), restyled. No Picker. | Separate initiative (OAuth Drive scope) |
| G10 | Stage templates | ✅ | `GET /stage-templates` | Use the backend templates. The prototype's "Casa" and "Retrofit" don't exist; **not added**. | (optional) seed more templates |
| G11 | Similar items with reason | ❌ | Embeddings exist, no route; `similar_decisions` never written | Hide the "Similares" tab. | Similarity endpoint |
| G11b | Item → transcript timestamp | ✅ | `timestamp` string + `source_excerpt` | Used for "Na gravação", "Trecho da fonte" and player ticks. | – |
| G12 | PDF export | ✅ client-side | `lib/exportTimeline.ts` (jspdf + html2canvas) | Restyle to guidelines §9. Public "Baixar PDF" reuses the same client export. | – |
| G13 | Item stage | ❌ | No `stage_id` on items | Derived client-side from the date (§1.1). | – |
| G14 | Executive summary | ❌ (`/digest` is a stub) | `digest.py:26-46` | Computed client-side from the items (§2.2). | – |
| G15 | Global search, notifications | ❌ | – | Not built (§3). | – |
| G16 | "Tópicos em aberto" | ❌ | Topics have no resolved state | **Decided:** the "Em aberto" tile counts open actions only. Topics are a follow-up (§6.1 #2). | Topic status |

---

## 5. Proposed Phase 1 file structure

The design system lives **inside the frontend app** for now (`src/design-system/`), the folder the CI guard excludes. It moves to a shared package in Phase 5, only if the landing ends up as a separate app. That avoids monorepo tooling until it's needed.

```
decision-log-frontend/
├── tailwind.config.ts                 # presets: [promemPreset]; keeps `screens`; removes the old colour/hsl keys
├── index.html                         # lang="pt-BR", <title>Promem</title>, favicons
├── public/brand/                      # favicon.svg, favicon-16/32.png, apple-touch-icon.png, icon-512.png
├── scripts/check-tokens.sh            # README §0.4 guard → `npm run lint:tokens` (+ CI step in deploy.yml)
└── src/
    ├── design-system/
    │   ├── tokens.css                 # copied verbatim from the handoff (single source of truth)
    │   ├── fonts.ts                   # @fontsource imports (Plus Jakarta Sans, Newsreader, IBM Plex Mono)
    │   ├── tailwind.preset.ts         # from the handoff
    │   ├── icons.ts                   # concept → lucide map + TildeIcon
    │   ├── disciplines.ts             # backend key ↔ code ↔ token class ↔ i18n key ↔ shortName
    │   ├── itemTypes.ts               # type → icon, i18n key
    │   ├── sourceKinds.ts             # source → icon, tile variant, i18n key
    │   ├── primitives/                # COMPONENTS.md §2
    │   │   ├── Button.tsx  IconButton.tsx  Kbd.tsx
    │   │   ├── Input.tsx  Textarea.tsx  Select.tsx  DateRange.tsx  Field.tsx  Checkbox.tsx
    │   │   ├── SegmentedControl.tsx  Tabs.tsx  Chip.tsx  Badge.tsx  Avatar.tsx
    │   │   ├── Popover.tsx  Menu.tsx  Tooltip.tsx  Dialog.tsx  SidePanel.tsx  BottomSheet.tsx
    │   │   ├── Toast.tsx  ToastProvider.tsx  useToast.ts
    │   │   ├── Skeleton.tsx  EmptyState.tsx  ErrorState.tsx  KeyValueList.tsx  Banner.tsx*
    │   ├── domain/                    # COMPONENTS.md §3 atoms only
    │   │   ├── Wordmark.tsx  ItemTypeIcon.tsx  ItemTypeBadge.tsx  SourceIcon.tsx  SourceTile.tsx
    │   │   ├── DisciplineMarker.tsx  DisciplineList.tsx  MilestoneStar.tsx  ImpactIndicator.tsx
    │   │   ├── ConsensusList.tsx  DueBadge.tsx  StageStrip.tsx  MiniStageBar.tsx
    │   └── index.ts
    ├── lib/format.ts                  # date-fns ptBR: dd/MM, group headers, relative, ranges, durations, timestamps
    ├── lib/stages.ts                  # stage proportions, progress, "hoje" position, item → stage
    ├── i18n/locales/{pt-BR,en}/ui.json  # new namespace for library strings (aria-labels, states)
    ├── pages/dev/UiGallery.tsx        # /dev/ui, DEV only: every component × every state
    └── tests/design-system/…          # one test file per component (states, a11y attributes, keyboard)
```

`*` = a pattern not in `COMPONENTS.md`, to be flagged for design review in the PR.

**Phase 3 composites** (`ItemRow`, `OverviewRow`, `GroupHeader`, `FilterBar`, `StageTimeline`, `ItemDetailPanel`, `TranscriptTurn`, `IngestionRow`/`IngestionDetail`, `ProjectRow`, `ShareDialog`, `ProjectForm` parts, `KpiTile`) go under `src/components/organisms|molecules` per the existing CLAUDE.md conventions, built only from `design-system/`.

**New dependencies (Phase 1):**
- `date-fns`
- `@fontsource/plus-jakarta-sans`, `@fontsource/newsreader` (or the variable package), `@fontsource/ibm-plex-mono`
- `@radix-ui/react-popover`, `-dropdown-menu`, `-tabs`, `-tooltip`, `-checkbox`
- `lucide-react` upgrade

---

## 6. Decisions

### 6.1 Decided (Rami, 2026-10-15)
1. **G1 Overview tile 1:** use **"N novos nos últimos 7 dias"**, computed from item `created_at`. Replace it with "desde sua última visita" once `project_visits` exists.
2. **G16 "Em aberto":** **open actions only** (`action_item && !is_done`). The tile note reads "N ações em aberto · N atrasadas". Topics are a follow-up: they need an open/resolved notion first. Options to discuss:
   - (a) a backend `status` on topics with a "Resolver" action;
   - (b) treat a topic as resolved when a later decision references it (needs AI linking);
   - (c) a manual "resolvido" toggle like the action done toggle.
3. **Marcos source filter:** **keep it.** It filters by source: Reunião · E-mail · Documento · Entrada manual (`MilestoneFilterBar.tsx:21-26`). It becomes a third quiet menu "Todas as fontes" in the Marcos toolbar, next to Tipos and Disciplinas.
4. **Manual item entry:** **include it.** Important decisions also happen informally (calls, site visits, hallway conversations). It goes in as an **"Adicionar item"** action in the Histórico header, and as an entry in the Visão geral "⋯" menu. Route `/projects/:id/items/new`, a full-page form shell (cookbook "Create / edit"). It reuses the `ManualItemForm` fields (statement, type, who with participant suggestions, disciplines, date, why, causation, owner/due/done for actions, impacts, consensus). It saves as `source_type=manual_input`, then returns to Histórico with `?item=<newId>` open. Needs `write` access. This also fixes today's broken post-save redirect.
5. **Dead code:** removed in **one separate cleanup PR**, not inside the screen PRs.
6. **Tests and language:** pt-BR is the primary language. New and migrated tests **assert pt-BR strings**. Design-system tests run in pt-BR now (`src/tests/design-system/render.tsx`). The global `src/tests/setup.ts` stays English until the legacy English-asserting tests are rewritten with their screens. Switching it today would break the legacy tests that assert English labels. The `en` catalogue stays in key parity (the existing parity test is kept).

7. **Backend gaps: build, don't hide.** Nothing in the prototypes is hidden or simplified. Every ❌/🟡 gap in §4 becomes backend work in the phase of the screen that needs it. The "UI behaviour without backend work" column in §4 is **superseded**: read the "Backend ask" column as the plan. Where the backend design is ambiguous, ask first.
   - **G1:** build `project_visits`. Tile 1 becomes "desde sua última visita" as in the prototype. "Últimos 7 dias" is only the fallback for a user's first visit.
   - **G2 candidate items:** **step 1** is a cheap preview pass on arrival (a small model call listing likely items: title, type, discipline), with full extraction still after approval. **Step 2 (later)** migrates to full extraction on arrival, where approval publishes the staged items. Confidence and reasons come from the deterministic match that assigned the project (Drive folder, Fathom rule, Gmail matcher). Flags come from participant/e-mail domains and duplicate checks.
   - **G4 speaker correction:** the transcript marks uncertain speakers as `⚠️ Name [reason]` with no candidate list. The picker offers the meeting's participants, and the correction is stored as an override on the turn.
   - **G5 undo:** approve/reject enqueue the job with a short `run_after`. A revert endpoint cancels the job while it's still queued.
   - **G9 Drive:** keep the **service-account ("robot e-mail") flow** that's already in production. Folder IDs are never shown or typed. No Google Picker.
   - **G11 similar items:** embeddings already exist. Build a similarity endpoint with a reason ("mesma disciplina", "mesma fonte", "assunto semelhante").
   - **Consensus:** add `MIXED` ("Com ressalvas") to the extraction schema and prompt, for new extractions only. **Impacts** keep the current shape (custo / prazo / escopo / risco / áreas), shown in full.
   - **G15:** build **global search ⌘K** (cross-project: projects, items, meetings) and **Notificações**. The notification trigger events will be proposed for approval before that phase.
   - **G10:** seed the prototype templates (Edificação padrão, Casa, Retrofit) alongside the existing ones.
   - **G8:** nullable expiry ("Nunca") and the `/m/:token` short URL.

---

## 7. Phase 1 (foundations): delivered

- **Foundations:** `tokens.css` and the v3 preset (copied verbatim), self-hosted fonts (`@fontsource`, latin subset), `motion.css` (200 ms entrances, off under reduced motion), favicons and brand SVGs in `public/brand/`, `index.html` set to `lang="pt-BR"` with the title "Promem".
- **Library:** `decision-log-frontend/src/design-system/`. The primitives and domain atoms are listed in its README. A Promem-aware `cn()` (tailwind-merge knows the type scale) is re-exported from `lib/utils`.
- **Helpers:** `lib/format.ts` (date-fns `ptBR`) and `lib/stages.ts` (proportions, progress, "hoje" position, item → stage).
- **i18n:** a new `ui` namespace (pt-BR + en) and `labels.disciplineShort` (the explicit short names from README §7.5).
- **Gallery:** `/dev/ui`, development builds only (verified absent from the production bundle). No horizontal scroll at 375 px.
- **CI:** `npm run lint:tokens` (README §0.4 guard). Legacy files with raw values are listed in `scripts/token-guard-baseline.txt` and leave the list as their screens migrate.
- **Tests:** 55 new tests in `src/tests/design-system/` (pt-BR). Full suite: 63 files, 788 passed.

### Deviations for design review
1. **New patterns:**
   - `Banner` (info/warning/danger notice; also the ingestion flag box).
   - `Count` (nav count).
   - The toggle variant of `Chip` (template picker, mobile filter sheet).
   - The `Spinner`/`Kbd` helpers.
2. **Snapped sizes (README §6.3):** the Dialog title is 18 → `h2`, and the BottomSheet title is 16 → `h3`.
3. **Copy:**
   - `formatDaysLeft(0)` reads "termina hoje". pt-BR plural rules would otherwise produce "falta 0 dia".
   - Durations of an hour or more read "1 h 05 min". The handoff only shows minutes.
4. **`lucide-react` 0.292 → 1.57:** needed for the icon map. `Tilde` still doesn't exist, so the custom `TildeIcon` from COMPONENTS.md is used.
5. **Legacy screens are affected immediately:** the preset sets the base font (Plus Jakarta Sans), the paper background, the `rounded`/`rounded-sm|md|lg` radii and the accent focus ring globally. They render correctly; they will look mixed until Phases 2–3 migrate them.
6. **`ConsensusList`** already supports `MIXED` ("Com ressalvas"). The backend and extraction change lands with the item panel (§6.1 #7).

## 8. Delivery log

Every phase is a PR into the integration branch `feat/promem-revamp`. It merges only with green CI. `main` gets the revamp once the screens are rebuilt.

| PR | Phase | Notes |
|---|---|---|
| #50 | 0 · Audit, 1 · Foundations | See §7. |
| #51 | 2 · Shell | Sidebar, project switcher, drawer, mobile top bar + tab bar + Mais, section routes and redirects. Backend: `project_visits` (migration 025), list aggregates, section counts, `/m/:token`. |
| #52 | 3 · Visão geral + Marcos + item SidePanel | Backend: `GET /projects/{id}/items/{item_id}/similar` (G11). Frontend: ProjectHeader (export, upload, share, ⋯ edit/archive), OverviewTiles/OverviewRow, StageTimeline, ItemDetailPanel (`?item=`, ↑/↓, Esc, M, X, review block, Similares), undo toasts for marco/done. |

| 3b | 3 · Histórico + Adicionar item | Backend: source duration / participants / tool / meeting type on items, `project_items.occurred_at` (migration 026), manual items take a title and date, consensus accepts `MIXED`. Frontend: FilterBar (search `/`, Disciplina · Tipo · Fonte · Tipo de reunião · Quem, Período, chips), date groups with collapsible source bands (approve pending, open transcript), discipline groups, ItemRow, list keyboard (↑/↓, Enter, M, X), "Mostrar recusados", manual item form at `/projects/:id/items/new`. |

### Phase 3 deviations for design review
- **Side box with no stage in progress:** "Nenhuma etapa em andamento · marcos recentes" shows the latest five milestones.
- **Panel "Impactos":** the ImpactIndicator (risk level) plus the platform's impact kinds (Custo · Prazo · Escopo · Áreas) instead of per-discipline rows (§1.1).
- **Panel extra blocks:** "O que levou a isso" (`causation`), "Adicionado por" (Story 12.15 manual items, with "Externo") and the Revisão block (Story 12.6).
- **Marcos:** keeps the source filter (decision §6.1 #3) and the JPEG export next to the PDF.
- **New patterns:** a `Switch` primitive ("Mostrar etapas sem marcos") and `RowList`/`CompactRow` helpers.
- **Histórico:**
  - By discipline, an item sits under its main (first) discipline only, so the keyboard never visits a row twice.
  - The legacy meeting-type filter is kept as its own "Tipo de reunião" menu (shown only when sources have a type).
  - Source bands also show the visibility badge (Interna/Compartilhada) and, for reviewers, "Aprovar N pendentes".
- **Adicionar item:** the form follows the create/edit cookbook. Its section 5 (consenso and impactos) is optional.
