# Kickoff prompt for Claude Code

Copy the `design_handoff_promem/` folder into the product repo (for example under `docs/design/`), then paste the prompt below into Claude Code.

---

You are implementing the **Promem UI revamp** in this repository: a new design system, the app UI (desktop + mobile) and the landing page. All UI copy is pt-BR.

**Read, in this order:**
1. `design_handoff_promem/README.md` (start with §0)
2. `design_handoff_promem/UX-UI-GUIDELINES.md`
3. `design_handoff_promem/design-system/COMPONENTS.md` and `design-system/tokens.css`
4. `design_handoff_promem/brand/BRAND.md`
5. `design_handoff_promem/LANDING_COPY.md`

Then read the source of the prototypes in `design_handoff_promem/prototypes/` (start with `Promem - App.dc.html`) for exact layout, copy and behaviour. You can view them with `npx serve design_handoff_promem/prototypes`.

**Non-negotiable rules:**
1. **Don't port the prototypes.** They are HTML references with inline styles and one monolithic state class. Rebuild them as **typed React 18 + TypeScript components** with Tailwind mapped to `tokens.css`, **lucide-react** icons and **Radix** primitives. Feature screens must be thin compositions of reusable library components, data hooks and i18n strings. The goal is a maintainable codebase after the new UI ships.
2. **Tokens only.** Feature code has no raw hex, rgba or px values and no Tailwind arbitrary values. Add the CI guard from README §0.4.
3. **All strings go through i18n**, in pt-BR, using the domain vocabulary in the guidelines §8.
4. **The live platform is ahead of the prototype.** Keep every existing feature, route and data field. Anything the prototypes don't show is composed from the same components, following the pattern cookbook (guidelines §5). Any genuinely new pattern is added to the component library and flagged in the PR.
5. **Don't invent backend behaviour.** Where a screen needs data the API doesn't provide (README §9.3), hide that section gracefully and record the gap.

**Do Phase 0 only for now:**
- Audit the codebase: routes and screens, existing components, data types and API, Tailwind version (v3 or v4), the i18n setup, the data-fetching layer, and whether Storybook exists.
- Write `docs/ux/REVAMP-MAPPING.md` with three parts:
  - A table mapping each existing feature or screen to its prototype screen and the library components it needs.
  - Platform features with no prototype, and the cookbook pattern you propose for each.
  - Backend gaps.
- Propose the Phase 1 file structure for the design-system package (tokens, preset, primitives, domain components, gallery).

**Stop and wait for my approval before writing UI code.**
