# DecisionLog V3: Epics Breakdown

**Document Version:** 3.0-draft
**Date Created:** 2026-10-05
**Last Updated:** 2026-10-05
**Status:** E12 + E13 implemented and merged (2026-10-06); open decisions and live tests in each story's `Assumptions & gaps` — E14 not started
**Product Owner:** Rami (with Youval)
**For:** DecisionLog V3 — multi-company access and recording ingestion
**Source:** Pilot with the first real meeting (souBIM + DIMAS, D/SEASON, 2026-09-04) and the spikes listed in [Proven by spikes](#proven-by-spikes)

---

## TABLE OF CONTENTS

1. [Epic 11: Localization (pt-BR)](#epic-11-localization-pt-br) — ✅ done
2. [Epic 12: Organizations & Client Access](#epic-12-organizations--client-access)
3. [Epic 13: Recording Ingestion](#epic-13-recording-ingestion)
4. [Epic 14: Speaker Review & GPU Transcription](#epic-14-speaker-review--gpu-transcription)
5. [Dependency Graph](#dependency-graph)
6. [Delivery Timeline](#delivery-timeline)
7. [Risks & Open Decisions](#risks--open-decisions)
8. [Proven by Spikes](#proven-by-spikes)
9. [Other Open Items](#other-open-items)

---

## EPIC 11: Localization (pt-BR)

**Epic ID:** E11
**Priority:** HIGH
**Timeline:** ✅ Done (merged in PR #8, 2026-10-05)
**Owner:** @dev (Frontend)
**Depends on:** —
**Blocks:** —

### Epic Description

Interface labels in Brazilian Portuguese (i18next, pt-BR default, en fallback) for the Brazilian AEC market. Extracted content follows the transcript's language (extraction prompt rule, Story 7.10).

### Stories (1)

| Story | Title | Effort | Priority | Phase |
|-------|-------|--------|----------|-------|
| 11.1 | Interface in Brazilian Portuguese (i18n) | L | High | ✅ |

---

## EPIC 12: Organizations & Client Access

**Epic ID:** E12
**Priority:** CRITICAL (prerequisite for any client access)
**Timeline:** Phase A
**Owner:** @dev (Backend + Frontend), @architect (data model review)
**Depends on:** —
**Blocks:** E13 (13.3, 13.4 — connections and imports belong to an organization), any client onboarding

### Epic Description

Today DecisionLog has no organization concept: one global `director` role, projects with members, and every director sees everything. V3 makes **each company an organization** (souBIM, DIMAS, and future AEC firms). An organization owns its projects and meetings; a **project can be shared with other organizations**; each organization keeps **internal meetings** that only its members see, and can mark meetings **shared** on a shared project. DIMAS (Construtora) may become a direct customer, so the model treats every company the same — souBIM is not special-cased.

### Business Value

- Clients can log in and see the decisions of the projects they share with souBIM — no more exporting
- Internal meetings stay internal (souBIM internal reviews, DIMAS internal meetings)
- Ready for the next customer (e.g. DIMAS Construtora with its own projects and partners)
- Roles per organization replace the single global `director` role (also answers "who can approve/edit items")

### Success Criteria

- [ ] Every user belongs to at least one organization with a role; existing data migrated to souBIM
- [ ] No API returns another organization's projects, meetings, items or recordings (isolation tests)
- [ ] A project can be shared with another organization at owner / contributor / viewer level
- [ ] A meeting is internal by default; shared meetings are visible to all organizations on the project
- [ ] Organization admins can invite users; users switch their active organization
- [ ] Item review (approve / reject / edit) restricted by organization role

### Stories (7)

| Story | Title | Effort | Priority | Phase |
|-------|-------|--------|----------|-------|
| 12.1 | Organizations & Memberships | M | Critical | ✅ |
| 12.2 | Organization-Scoped Authorization | L | Critical | ✅ #15 |
| 12.3 | Project Sharing Between Organizations | M | High | ✅ #17 |
| 12.4 | Meeting Visibility: Internal vs Shared | M | High | ✅ #20 |
| 12.5 | Users, Invitations & Active Organization | M | High | ✅ #19 |
| 12.6 | Item Review: Approve / Reject / Edit by Role | M | Medium | ✅ #25 |
| 12.7 | Roles Follow-ups: Reviewer Role, Project Assignment, Admin UI Gating | M | High | Ready for Review |

### Agent Assignment

| Story | Primary | QA | Review |
|-------|---------|-----|--------|
| 12.1 | @dev | @qa | @architect |
| 12.2 | @dev | @qa | @architect |
| 12.3 | @dev | @qa | @po |
| 12.4 | @dev | @qa | @po |
| 12.5 | @dev | @qa | @ux-design-expert |
| 12.6 | @dev | @qa | @po |
| 12.7 | @dev | @qa | @architect |

---

## EPIC 13: Recording Ingestion

**Epic ID:** E13
**Priority:** HIGH
**Timeline:** Phase B (13.1–13.8), Phase C (13.9)
**Owner:** @dev (Backend + Frontend), @devops (13.8)
**Depends on:** E12 (connections, imports and recordings belong to an organization), Story 7.11
**Blocks:** E14

### Epic Description

Make getting a meeting into DecisionLog an app workflow instead of scripts. Users **connect their own Fathom account (OAuth)**, browse their recordings and **pick** which to import into a project; the recording is downloaded by `recording_id` and **stored privately in S3-compatible storage** (SeaweedFS locally, Cloudflare R2 or Backblaze B2 in production). Meetings from other tools come in by **manual upload** (.mp4, or .txt transcripts). A **background worker** runs the slow steps (download, extraction) so the web server stays responsive. Extraction runs on the Claude API with versioning, so a new run never silently overwrites a result people liked.

### Business Value

- No more hand-run scripts per meeting (today: ~6 manual steps, see `data/tools/*/README.md`)
- Each client imports their own Fathom meetings — access never goes through souBIM's account
- Recordings stay private and cheap (~$1/month per 100 meetings on R2), playable with seeking
- Any meeting source works (manual .mp4 / .txt), not only Fathom
- Extraction results are versioned and can be rolled back

### Success Criteria

- [ ] A user connects Fathom from the app and sees only their own recordings
- [ ] Picking a recording imports it into a project: video in storage, transcript stored, meeting pending in Ingestão
- [ ] Manual upload works for a 761 MB .mp4 (direct to storage) and for .txt (Fathom format and plain text)
- [ ] Download and extraction run in a background worker with retries and visible status
- [ ] Re-extraction creates a new version; the previous one can be restored
- [ ] Deployed on Railway (API + worker + Postgres with pgvector) with an HTTPS domain and rotated secrets
- [ ] (Phase C) Fathom webhook lands new meetings in Ingestão as pending

### Stories (10)

| Story | Title | Effort | Priority | Phase |
|-------|-------|--------|----------|-------|
| 13.1 | Recording Storage (S3-Compatible) | M | High | ✅ #14 |
| 13.2 | Background Worker & Jobs Table | L | High | ✅ #12 |
| 13.3 | Connect to Fathom (OAuth) | M | High | ✅ #16 |
| 13.4 | Browse & Import Fathom Meetings | L | High | ✅ #18 |
| 13.5 | Manual Upload: .mp4 and .txt | M | High | ✅ #21 |
| 13.6 | Extraction as a Worker Job | M | High | ✅ #24 |
| 13.7 | Extraction Versions & Rollback | M | Medium | ✅ #22 |
| 13.8 | Deploy API + Worker + Postgres on Railway | M | High | ✅ config #13 (live deploy pending) |
| 13.9 | Fathom Webhook (Push) | M | Low | ✅ #23 |
| 13.10 | CI Checks (GitHub Actions) | S | High | ✅ |

### Agent Assignment

| Story | Primary | QA | Review |
|-------|---------|-----|--------|
| 13.1 | @dev | @qa | @architect |
| 13.2 | @dev | @qa | @architect |
| 13.3 | @dev | @qa | @architect (security) |
| 13.4 | @dev | @qa | @po |
| 13.5 | @dev | @qa | @po |
| 13.6 | @dev | @qa | @architect |
| 13.7 | @dev | @qa | @po |
| 13.8 | @devops | @qa | @architect |
| 13.9 | @dev | @qa | @architect (security) |
| 13.10 | @devops | @qa | @architect |

---

## EPIC 14: Speaker Review & GPU Transcription

**Epic ID:** E14
**Priority:** MEDIUM
**Timeline:** Phase C (after cost measurement in 14.1)
**Owner:** @dev (Backend + Frontend), @data-engineer (pipeline)
**Depends on:** E13 (storage, worker)
**Blocks:** —

### Epic Description

Fathom attributes speech by microphone, so several people sharing one room microphone appear as one person (D/SEASON: 62% of what Fathom labeled "Debora" was Debora). The local pipeline (WhisperX + pyannote + voiceprints + by-ear labeling) fixed this for the pilot. E14 moves it into the app: transcription and speaker separation on a **serverless GPU**, then a **"Revisar falantes" screen** where a person listens to each detected voice and names it, before extraction.

### Business Value

- Correct "who said what" — decisions and actions attributed to the right person
- Uncertain attributions are flagged (⚠️) instead of silently wrong
- Better words than Fathom for PT-BR technical vocabulary

### Success Criteria

- [ ] Real GPU time and cost per meeting measured on D/SEASON before committing (target ≤ $0.20/meeting)
- [ ] Transcription + speaker separation run as a worker job on a GPU provider
- [ ] Reviewer names voices from audio clips in the app; transcript rebuilt with names and ⚠️ markers
- [ ] A meeting can keep both the Fathom and the re-transcribed transcript

### Stories (3)

| Story | Title | Effort | Priority | Phase |
|-------|-------|--------|----------|-------|
| 14.1 | GPU Transcription Job (Modal) | L | Medium | C |
| 14.2 | Speaker Review Screen ("Revisar falantes") | L | Medium | C |
| 14.3 | Multiple Transcripts per Meeting | M | Low | C |

### Agent Assignment

| Story | Primary | QA | Review |
|-------|---------|-----|--------|
| 14.1 | @data-engineer | @qa | @architect |
| 14.2 | @dev | @qa | @ux-design-expert |
| 14.3 | @dev | @qa | @po |

---

## DEPENDENCY GRAPH

```
                 ┌──────────────────────────────┐
                 │ 7.11 Fix in-app extraction   │ (drafted, E7)
                 └──────────────┬───────────────┘
                                │
┌───────────────────────────────┼─────────────────────────────────────┐
│ E12 Organizations             │                                     │
│ 12.1 → 12.2 → 12.3 → 12.4     │                                     │
│          └──→ 12.5             │                                     │
│          └──→ 12.6 (Phase C)   │                                     │
└──────────┬────────────────────┼─────────────────────────────────────┘
           │                    │
┌──────────▼────────────────────▼─────────────────────────────────────┐
│ E13 Recording Ingestion                                             │
│ 13.1 storage ─┐                                                     │
│ 13.2 worker ──┼─→ 13.4 Fathom import ←── 13.3 Fathom OAuth          │
│               ├─→ 13.5 manual upload                                │
│               └─→ 13.6 extraction job (needs 7.11) → 13.7 versions  │
│ 13.8 Railway deploy  ──→ 13.9 Fathom webhook (Phase C)              │
└──────────┬──────────────────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────────────────┐
│ E14 Speaker Review                                                  │
│ 14.1 GPU job (measure cost first) → 14.2 Revisar falantes → 14.3    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## DELIVERY TIMELINE

**Phase A — Organizations (E12: 12.1–12.5)**
**Gate:** isolation tests pass (no cross-organization data in any endpoint); souBIM data migrated; a DIMAS test user sees only D/SEASON shared meetings.

**Phase B — Recording ingestion (7.11, E13: 13.1–13.8)**
**Gate:** a client connects their own Fathom, imports a recording into a shared project, it is extracted by the worker, approved in Ingestão and played in the meeting viewer — on the Railway deployment.

**Phase C — Later (12.6, 13.9, E14)**
**Gate per story:** 14.1 starts with a cost measurement and a go/no-go.

| Phase | Stories | Notes |
|-------|---------|-------|
| A | 12.1–12.5 | Product decision on roles needed before 12.2 |
| B | 7.11, 13.1–13.8 | Storage provider decision needed before 13.8 |
| C | 12.6, 13.9, 14.1–14.3 | Each optional; prioritize after pilot feedback |

---

## RISKS & OPEN DECISIONS

| # | Risk / decision | Impact | Mitigation / owner |
|---|---|---|---|
| 1 | **Cross-organization data leak** (a client sees another's meetings/recordings) | Critical — trust, LGPD | Isolation tests on every endpoint (12.2); recordings only via signed, expiring links (13.1) |
| 2 | **Fathom dev apps may only connect the owner's account** (untested) | Blocks client imports | Run the client-account test before 13.3; ask Fathom about app approval |
| 3 | **Recording consent / retention (LGPD)** | Legal | Retention rules + deletion per organization; consent noted at import — decide with Youval |
| 4 | Production storage: **Cloudflare R2 vs Backblaze B2** | Cost/ops (R2 needs a card on file; both ~$0–1/month at pilot scale) | Decide before 13.8; code is identical (S3 API) |
| 5 | GPU provider and spend (E14) | Cost | 14.1 measures first; estimate $0.10–0.15/meeting on Modal L4 vs ~$1–1.30 on Railway CPU |
| 6 | Organization roles granularity (owner/admin/member + project access levels) | Rework if wrong | Review with Youval before 12.2 |
| 7 | Leaked Anthropic API key in tracked `decision-log-backend/.env.development` | Security | Rotate now; untrack in 13.8 |
| 8 | Fathom API changes (docs already wrong about the token URL) | Integration breaks | Isolate Fathom calls in one client module (13.3) with contract tests |

---

## PROVEN BY SPIKES

Throwaway tests run on 2026-10-04/05 (scripts kept locally in `data/tools/`, not in git):

| Spike | Result |
|---|---|
| Fathom OAuth (`data/tools/fathom/oauth_test.py`) | Connect → token (24 h + refresh), list meetings, `POST /recordings/{id}/download` → poll → MP4 in ~15 s (26 s test video). Authorize `https://fathom.video/external/v1/oauth2/authorize`, token `https://fathom.video/external/v1/oauth2/token` (the docs' `api.fathom.ai` token URL is wrong). Redirect must be HTTPS (ngrok in dev). Tested with the app owner's own account only |
| Private storage (`data/tools/storage/s3_test.py`) | SeaweedFS (S3 API): Fathom → storage streaming, private bucket (403 anonymous), signed links with Range (206) and expiry, 761 MB multipart, browser playback seeking to 33:40 |
| Speaker separation (`data/tools/transcription/`) | WhisperX large-v3 + pyannote community-1 on CPU (~1.5 h / 98 min); by-ear labeling of voices; room-mic voices can't be separated by voiceprint (⚠️ `Camila / Erica`) |
| Extraction (`data/eval/dseason-2026-09-04/`) | Same prompt on Haiku 4.5 / Sonnet 5.5 / Opus 5.5 via Claude Code CLI; Opus most complete; all exceed the in-app 4096-token limit (7.11) |

---

## OTHER OPEN ITEMS

Not part of these epics; to be scheduled separately:
- Search fix: one backend search over title / statement / why / excerpt, accent-insensitive; remove the conflicting frontend filter
- Similar tab (was "7.15"): multilingual embeddings + pgvector search
- Test setup: drop the throwaway DB if pgvector is missing (CodeRabbit, PR #4)
- 5 minor CodeRabbit comments on PR #6 (input normalization, prompt detail, story wording)
- Pre-existing failing tests: `SourceGroupAccordion.test.tsx` (12), backend failures identical on main

*— Rami, com Claude Code*
