# Claude Design Handoff — App Revamp + Landing Page

**Date:** 2026-10-05
**From:** Rami (souBIM product team)
**For:** Claude Design
**Working product name:** DecisionLog (temporary — see §3)
**Market:** Brazil only — all UI and marketing copy in **Brazilian Portuguese (pt-BR)**

---

## 0. What we're asking for

Three deliverables, in this order:

1. **Brand & naming proposal** — 3–5 name options with a light identity for each (wordmark, palette, type pairing). We pick one; it is then used in 2 and 3.
2. **App UI revamp** — a new visual language **and** a UX rethink of the existing web app (layouts, navigation, flows), keeping the same features and data. Desktop-first, with a usable mobile layout.
3. **Landing page** — a pt-BR marketing page that sells the product to Brazilian AEC companies (architecture firms, engineering firms, construction companies).

Please also deliver a small **design system** that the app and the landing page share: color tokens, type scale, spacing, and the core components listed in §5.4.

---

## 1. The product in one paragraph

Architecture and construction projects are decided in meetings, email threads and documents — and then those decisions get lost. Our product **captures project meetings, emails and documents automatically, uses AI to extract what matters (decisions, action items, open topics, ideas, key information) with who said it, when, why and which disciplines it affects, and organizes everything into a searchable project timeline**. A director can understand where a project stands in under a minute, and a new team member can onboard by reading the project's history.

**How it works (pipeline):**

```
Meeting recorder (Tactiq / Fireflies / Fathom)  ─┐
Gmail threads                                    ├─► Ingestion queue ─► Admin approves ─► AI extraction ─► Project items
Google Drive documents (PDF, DOCX)               │   (what gets in)                       (Claude)          on the timeline
Manual entry                                     ─┘
```

**Origin story (useful for marketing):** built inside **souBIM**, a Brazilian BIM/architecture firm, for its director. She was the bottleneck for every decision across concurrent projects and needed the team to decide on their own while keeping a reliable record she could catch up on later. The tool was validated on souBIM's real projects.

---

## 2. Users

| Persona | Who | What they need | Key screens |
|---|---|---|---|
| **Director** (primary buyer) | Head of an architecture/AEC firm, oversees 3+ concurrent projects | Know where every project stands in <60 s; catch up after being away; show clients what was decided | Projects, Milestone Timeline, Executive Summary |
| **Project lead / architect** | Runs a project day to day | Find "what did we decide about X and why"; track action items | Project History, item detail, Meeting viewer |
| **Admin / coordinator** | Same firm, often the director | Control which meetings, emails and docs enter the system | Ingestion approval, Project setup |
| **External viewer** | Client, contractor, consultant | See milestones without logging in | Shared Milestone Timeline (public link) |

---

## 3. Brand & naming brief

**The current name, "DecisionLog", is too vague.** Its other problem: the product captures far more than decisions.

The positioning is still open between the two founders. **Please design for both and help us choose:**

- **A — souBIM's tool:** souBIM's credibility as a practicing BIM firm is the selling point ("made by architects, for architects").
- **B — standalone SaaS for AEC**, possibly white-label later. An endorsed form ("*Nome* — by souBIM") is a middle ground.

**Name requirements:**
- Easy to say and remember in Portuguese. English roots are fine if they read naturally in Brazil.
- Evokes project memory, clarity, record, or a timeline. Avoid generic "AI" names.
- Works as a wordmark at small sizes (app header, favicon).
- Doesn't lock us to "decisions" only.

For each option, give: the name, a one-line rationale, a wordmark sketch, a palette, a type pairing, and how it looks in the app header and the landing hero.

---

## 4. Design direction

**Keywords:** minimalist · sophisticated · architectural · calm · professional · information-dense.

The audience lives in drawings and BIM models. The UI should feel like a well-composed architectural sheet: precise grid, generous white space *between* groups, compact *within* groups, restrained color, and confident typography.

**Guardrails:**
- **Keep the discipline color coding.** Each discipline has a stable color; users rely on it. You can refine the exact hues for the new palette, but every discipline must stay distinguishable and keep a consistent color everywhere (see §5.3).
- **Information density over cards.** Aim for 10–15 items visible per screen in list views. Use rows, not big cards.
- **Progressive disclosure:** a summary in the row, details on click.
- **Color is never the only signal.** Always pair it with an icon or label. Target WCAG 2.1 AA and full keyboard navigation.
- The **Milestone Timeline** should be elegant and presentation-ready, since it's shown to clients. **Project History** should be dense, built for work.
- **Light mode first.** Dark mode is a nice-to-have; if you propose it, define its tokens.
- Must look good when **exported to PDF/JPEG** (the Milestone Timeline is exported for clients).

---

## 5. Part A — App revamp

### 5.1 Current information architecture

```
/login
/projects                         Projects list
/projects/new                     Create project (data, stage schedule, participants)
/projects/:id                     Project, with 3 tabs:
    ├── Milestone Timeline        curated key items along the project's stages (default tab)
    ├── Project History           every item, grouped by date → source → item; filters
    └── Executive Summary         KPIs + highlights
/projects/:id/edit                Edit project
/meetings/:sourceId               Meeting viewer (transcript)
/ingestion                        Ingestion approval queue (pending / history)
/shared/milestones/:token         Public read-only Milestone Timeline
```

Open to rethink: navigation (today it's a top bar with Projects and Ingestion only), whether project tabs are the right model, where Ingestion lives, and how a director moves across projects.

### 5.2 Screens: what exists and what's wrong

Screenshots are in `screenshots/`, taken at 1440×900 (desktop) and 390×844 (mobile) using **fictional demo data** (seed projects are named in English; real UI copy is pt-BR).

| # | Screen | File | What works | Problems / opportunities |
|---|---|---|---|---|
| 1 | Login | `01-login.png` | Simple | Generic; no brand presence; shows the demo hint "use any e-mail" |
| 2 | Projects list | `02-projects-list.png` | Clear count | Large cards with little information; no current stage, recent activity or "needs attention" signal; doesn't scale to 20+ projects |
| 3 | **Milestone Timeline** | `03-project-milestone-timeline.png` | The core idea of stages on the left and milestones on the right validated well | Stage dates wrap awkwardly; empty stages take space; no "today" or current-stage indicator; filters feel heavy for a presentation view; Edit/Archive compete with the main actions |
| 4 | **Project History** | `04-project-history.png` | Dense, scannable rows; date → source → item grouping; item type and discipline signals | Visual noise (many small pills, avatars, truncated names); filter bar is crowded; hierarchy between date header, source and item is weak |
| 5 | History grouped by discipline | `05-project-history-by-discipline.png` | Second mental model (by discipline) | Same as 4; the Data/Disciplina toggle is easy to miss |
| 6 | Item detail modal | `06-item-detail-modal.png` | Rich context: why, origin, consensus per discipline, impacts, jump to recording | Modal is long and boxy; sections are visually equal; empty "Impactos" section still renders; tabs Visão geral / Transcrição / Similares |
| 7 | Meeting viewer | `07-meeting-viewer.png` | Transcript with timestamps; uncertain speakers flagged ⚠️ | Missing the items extracted from this meeting next to the transcript (the key link); no meeting summary; plain layout |
| 8 | Executive Summary | `08-executive-summary.png` | KPIs at a glance | KPI labels unclear ("Total de decisões" counts all items); highlights use pink/yellow backgrounds that read as errors; truncated titles |
| 9 | Ingestion approval | `09-ingestion-approval.png` | Batch review, AI summary per source | **Table overflows its container** (the AI summary column is cut off); technical IDs are shown to users; hard to scan; the approve/reject actions aren't obvious |
| 10 | Create project | `10-project-create.png` | Straightforward | Long single column; the Google Drive *folder ID* field is too technical; the stage schedule could use templates up front |
| 11 | Edit project (stages, participants) | `11-project-edit-stages.png` | Inline editing of stages and participants | Dense grid of inputs; stage dates show empty although the stages have dates (bug); a participant's discipline and role are separate free-text fields |
| 12 | Share dialog | `12-share-dialog.png` | Read-only link with expiry, view count and revoke | Fine functionally; restyle to the new system; consider a preview of what the client will see |
| 13 | Public shared timeline | `13-shared-milestone-public.png` | Clean read-only view | Should be fully branded for the firm's clients. Shown here while logged in, so the internal nav appears; design the logged-out version |
| 14 | Mobile — History | `14-mobile-project-history.png` | — | **Horizontal overflow**; header squeezed; tabs wrap into three lines; filters take the whole screen |
| 15 | Mobile — Milestones | `15-mobile-milestone-timeline.png` | — | Same overflow; action buttons cut off; timeline rows truncated |

**Biggest UX opportunities, in order:**
1. **Project overview:** "where is this project now?" in one glance — current stage, latest decisions, open action items, what changed since my last visit.
2. **Calmer Project History:** fewer competing signals per row, a clearer group hierarchy, and a lighter filter UI.
3. **Meeting viewer:** transcript and extracted items side by side, with click-to-jump between an item and its moment in the transcript.
4. **Ingestion:** feels like an inbox, not a database table.
5. **Mobile:** a director checks status on the phone; at minimum Projects, Milestones, History and item detail must work.

### 5.3 Domain vocabulary (use these exact pt-BR labels)

**Item types** (every captured item is one of these):

| Value | pt-BR | Meaning |
|---|---|---|
| decision | **Decisão** | Something agreed; has why, consensus per discipline, impacts |
| action_item | **Ação** | A task with an owner and a due date; can be checked off |
| topic | **Tópico** | An open discussion, not yet resolved |
| idea | **Ideia** | A suggestion worth remembering |
| information | **Informação** | A fact or reference shared |

**Sources:** Reunião (meeting) · E-mail · Documento · Entrada manual

**Disciplines** and current colors. Refine the hues if needed, but keep them distinguishable:

| pt-BR | Current hex |
|---|---|
| Arquitetura | `#3B82F6` blue |
| Estrutura | `#8B5CF6` purple |
| Instalações (MEP) | `#F97316` orange |
| Elétrica | `#F59E0B` amber |
| Hidrossanitário | `#06B6D4` cyan |
| Paisagismo | `#10B981` green |
| Prevenção de incêndio | `#EF4444` red |
| Acústica | `#7C3AED` violet |
| Sustentabilidade, Civil, Cliente, Construtora, Locatário, Engenharia, Geral | need colors (currently gray or ad hoc) |

**Typical Brazilian project stages:** Estudo Preliminar → Anteprojeto → Projeto Legal → Projeto Executivo. Stages are configurable per project.

**Other concepts:** Marco (milestone, a starred item shown on the Milestone Timeline), Consenso (agree / mixed / dissent per discipline), Impacto (high / medium / low), Participante (a person with a discipline and role), Aprovação de ingestão (the approval queue).

### 5.4 Components we need designed

App shell and navigation · project switcher · project overview header (current stage, progress) · **item row** (type, title, disciplines, owner, date, source, milestone star) · item type badge · discipline marker (single and multiple) · source icon · filter bar (search, multi-select, date range, chips) · date/source group headers · **stage timeline** (stages with nested milestones, "today" marker) · item detail panel (consider a side panel instead of a modal) · consensus display · transcript turn (including the uncertain-speaker state) · ingestion inbox row with approve/reject · KPI tile · forms (inputs, date range, select, repeatable rows) · empty, loading and error states · share dialog · toasts.

### 5.5 Technical constraints (so the design is buildable)

- React 18 + TypeScript + **Tailwind CSS**; icons from **lucide-react**; Radix UI primitives (Dialog, Select) are available.
- Deliver tokens that map to Tailwind (colors as CSS variables, plus a type scale and spacing scale).
- All copy is i18n'd; design with **pt-BR strings**, which run ~20–30% longer than English.
- Breakpoints: 375 / 768 / 1024 / 1280 / 1536.
- Fonts: free web fonts (Google Fonts or similar). No paid licenses.

---

## 6. Part B — Landing page

### 6.1 Goal and audience

- **Goal:** generate qualified demo requests from Brazilian AEC firms.
- **Primary audience:** directors and partners of architecture and BIM firms with 10–50 people.
- **Secondary:** engineering consultancies (structural, MEP), construction companies and developers.
- **Language:** pt-BR only.

### 6.2 Calls to action

- **Primary CTA: "Agendar demonstração"** (book a demo). AEC buyers in Brazil buy through relationships, and setup needs integrations (meeting recorder, Gmail, Drive), so a guided start converts better than self-serve.
- **Secondary CTA: "Solicitar piloto gratuito"** (request a free pilot). A guided 30-day pilot with a limited number of meetings.
- Design a short form: name, firm, role, team size, WhatsApp/phone, e-mail. WhatsApp matters in Brazil.
- **No pricing on the page for now.** Leave room for a future pricing section.

### 6.3 Messaging pillars (copy direction, pt-BR)

These are directions, not final copy. Please write the final pt-BR copy in the design.

1. **Problem:** "As decisões do projeto se perdem entre reuniões, e-mails e documentos." Meeting minutes nobody writes, WhatsApp threads, "who approved this?", rework, and disputes with clients and contractors.
2. **Automatic capture:** connect the meeting recorder, Gmail and Drive. No change to how the team works, and no one has to write minutes.
3. **AI that understands AEC:** it extracts decisions, actions, topics, ideas and information by discipline (Arquitetura, Estrutura, Instalações…), with who, when, why and impact.
4. **The project at a glance:** a Milestone Timeline along the project's stages (Estudo Preliminar → Executivo), shareable with the client through a link or PDF.
5. **Memory that onboards:** new team members read the project history; the director catches up in minutes.
6. **Control:** you approve what goes in (the ingestion queue). The firm's data stays the firm's.
7. **Credibility:** made inside a working BIM firm (souBIM) and used on real projects.

### 6.4 Suggested page structure

1. **Hero:** headline, subheadline, primary and secondary CTA, and a product visual (the Milestone Timeline in the new design).
2. **Pain:** 3 short pains with icons.
3. **How it works:** 3 steps: Conecte → A IA organiza → Decida com contexto.
4. **Feature showcase:** Milestone Timeline · Histórico do projeto · Detalhe da decisão (why + consenso) · Reunião com transcrição · Aprovação de ingestão.
5. **For whom:** escritórios de arquitetura, projetistas e consultores, construtoras e incorporadoras.
6. **Origin and credibility:** the souBIM story, plus a testimonial placeholder (see Q4).
7. **Security and data:** approval before processing; data ownership; LGPD (state only what's true; leave placeholders).
8. **FAQ:** setup time, which meeting tools are supported, Portuguese transcripts, data privacy, pilot terms.
9. **Final CTA and footer.**

### 6.5 Landing constraints

- Static page, fast, responsive (strong mobile, since much traffic will come from WhatsApp and LinkedIn).
- Product visuals should use the **new** app design, not the current screenshots.
- No invented statistics, client logos or testimonials. Use clearly marked placeholders.

---

## 7. Out of scope (for now)

- New product features beyond what exists today. Visual and UX changes to existing features are in scope.
- Pricing and plans.
- An English version of the landing page.
- A native mobile app.

---

## 8. Open questions (we'll answer them during review)

1. Positioning: souBIM tool, standalone SaaS, or endorsed brand (§3)?
2. Final product name (from your proposals).
3. Do we want dark mode in the first release?
4. Can we use the souBIM director's name and quote as a testimonial? (Needs her consent.)
5. Domain and contact channels for the landing form (e-mail and/or WhatsApp number).

---

## 9. Asset index

| File | Content |
|---|---|
| `screenshots/01-login.png` | Login |
| `screenshots/02-projects-list.png` | Projects list |
| `screenshots/03-project-milestone-timeline.png` | Project → Milestone Timeline (full page) |
| `screenshots/04-project-history.png` | Project → History, grouped by date (full page) |
| `screenshots/05-project-history-by-discipline.png` | Project → History, grouped by discipline |
| `screenshots/06-item-detail-modal.png` | Item detail (decision) |
| `screenshots/07-meeting-viewer.png` | Meeting transcript viewer |
| `screenshots/08-executive-summary.png` | Project → Executive Summary |
| `screenshots/09-ingestion-approval.png` | Ingestion approval queue |
| `screenshots/10-project-create.png` | Create project form |
| `screenshots/11-project-edit-stages.png` | Edit project (stages + participants) |
| `screenshots/12-share-dialog.png` | Share Milestone Timeline dialog |
| `screenshots/13-shared-milestone-public.png` | Public shared Milestone Timeline |
| `screenshots/14-mobile-project-history.png` | Mobile: Project History |
| `screenshots/15-mobile-milestone-timeline.png` | Mobile: Milestone Timeline |

Reference (optional): our current UX guidelines live in `docs/ux/UX-UI-GUIDELINES.md` in the repo. Treat them as context, not constraints; this revamp may replace them.
