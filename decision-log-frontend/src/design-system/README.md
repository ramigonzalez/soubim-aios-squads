# Promem design system

Source of truth: `docs/design_handoff_promem/` (tokens, `COMPONENTS.md`, `UX-UI-GUIDELINES.md`). Feature-to-screen mapping: `docs/ux/REVAMP-MAPPING.md`.

## Rules
- **Tokens only.** Colours, type, radii and shadows come from `tokens.css` through the Tailwind preset (`bg-surface`, `text-ink-2`, `text-small`, `rounded-lg`, `shadow-2`…). Feature code has no hex, rgba or `[13px]` values; `npm run lint:tokens` enforces it in CI.
- **Import from the barrel** `src/design-system` (for example `import { Button, useToast } from '../../design-system'`).
- **Icons** come from `Icons` (concept names), not straight from lucide.
- **Strings** go through i18n. Library strings live in the `ui` namespace; disciplines, item types and sources live in `labels`.
- **Dates** use `src/lib/format.ts` (date-fns, `ptBR`). Stage maths uses `src/lib/stages.ts`.
- `cn()` here knows the Promem type scale, so `cn('text-small', 'text-ink-2')` keeps both classes. `lib/utils` re-exports it.

## Layout
| Folder | Contents |
|---|---|
| `tokens.css`, `tailwind.preset.ts`, `fonts.ts`, `motion.css` | Foundations (copied from the handoff, self-hosted fonts, 200 ms entrances) |
| `icons.tsx`, `disciplines.ts`, `itemTypes.ts` | Concept → icon, backend key → code/token/i18n |
| `primitives/` | Button, IconButton, Input/Textarea, Field, Select, DateRange, Checkbox, SegmentedControl, Tabs, Chip, Badge, Avatar, Popover, Menu, Tooltip, Dialog, SidePanel, BottomSheet, Toast, Skeleton/Empty/Error states, Banner, KeyValueList, Kbd, Spinner |
| `domain/` | Wordmark, ItemTypeIcon/Badge, SourceIcon/Tile, DisciplineMarker/List, MilestoneStar, ImpactIndicator, ConsensusList, DueBadge, StageStrip, MiniStageBar |

Composites (ItemRow, FilterBar, StageTimeline, ItemDetailPanel…) are built in Phase 3 under `src/components/`, only from this folder.

## Gallery
`npm run dev` → `http://localhost:5173/dev/ui` (development builds only). Every component in every state.

## App setup
`App.tsx` wraps the app in `TooltipProvider` and `ToastProvider`. Tests render with both (see `src/tests/design-system/render.tsx`) and assert pt-BR.
