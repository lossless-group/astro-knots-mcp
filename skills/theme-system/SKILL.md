---
name: theme-system
description: The Lossless Group's theme and mode architecture — two-tier token system, three-mode contract (light/dark/vibrant), theme.css organization, and design system conventions. Use when setting up themes/modes for any Astro Knots site, debugging mode toggles, working with CSS tokens, or when the user mentions "vibrant mode", "two-tier tokens", "theme.css", or design system patterns.
---

# Theme System

The Lossless Group's firm-wide conventions for theme architecture, visual modes, and design token systems.

**Status:** Initial scaffold (May 2026) — actively developing from astro-knots patterns.

## When to use this skill

- Setting up theme/mode architecture for a new site
- Debugging mode toggle issues (light/dark/vibrant not working)
- Implementing two-tier token systems
- Deciding between `theme.css` vs `global.css` organization
- Creating `/brand-kit` or `/design-system` reference pages
- User mentions "vibrant mode", "two-tier tokens", "mode switcher", "theme architecture"

## Core Principles (WIP)

### 1. Three-Mode Contract (Not Two)

Every Lossless site ships with **three modes**, not two:

- **Light** — clean, minimal, high readability
- **Dark** — code-editor feel, moderate intensity
- **Vibrant** — neon energy, loud gradients, glassmorphic surfaces

**Why three?** Stakeholder management. Nerds pick dark, traditionalists pick light, design-forward stakeholders pick vibrant. The toggle ends the "which mode" argument before it starts.

**Critical:** Vibrant mode is **dark-based** (like dark mode, not light mode). Common error: vibrant inherits light mode's white background. See `references/vibrant-mode-implementation.md` (TBD).

### 2. Two-Tier Token System

Tokens come in **two tiers**:

- **Tier 1: Named tokens** (`--color__blue-azure`, `--font__lato`)
  - Raw values, BEM-ish `__` separator
  - Private to the theme (components don't read these directly)
- **Tier 2: Semantic tokens** (`--color-primary`, `--font-body`)
  - Kebab-case, what Tailwind utilities and components consume
  - Reference named tokens via `var()`

**Why two tiers?** Client iteration. When a client wants a different primary color, you add/change a named token and re-point the semantic token. Components don't change.

See `references/two-tier-tokens.md` (TBD).

### 3. File Organization

- **`theme.css`** — all token definitions (named + semantic), mode blocks
- **`global.css`** — imports `@tailwindcss`, imports `theme.css`, base resets

See `references/file-organization.md` (TBD).

## Cross-skill ties

- **`astro-knots`** — this skill extracts patterns from astro-knots sites
- **`context-vigilance`** — `/brand-kit` and `/design-system` pages follow doc conventions

## Canonical References

Sites with strong implementations:

All paths are under `astro-knots/`. Verified 2026-10-06.

- **`sites/lossless-toolkit-site`** — `data-mode` with plain CSS. It has three designed modes in `src/styles/theme.css` (dark `:62-87`, light `:90-116`, vibrant `:119-146`) and an inline head pre-paint script at `src/layouts/Base.astro:46-61`.
- **`splash/`** — `data-mode`, a head pre-paint script (`src/layouts/BaseLayout.astro:45-60`), and a labeled radiogroup `ModeToggle.astro`.
- **`sites/lossless-slides-site`** — the Tailwind v4 wiring for three modes: `@custom-variant` × 3 and `@theme inline` in `src/styles/globals.css:8-35`, with effects switched off by token in `src/styles/tokens.css`. It uses `data-theme`, a site deviation, so rename it to `data-mode` when copying.
- **`sites/fullstack-vc`** — the vibrant mode reference (lines 162-211 of `src/styles/theme.css`).
- **Not a mode reference:** `sites/hypernova-site`. Its switcher is two-mode only and loses `vibrant`. `packages/ui/theme-mode` applies the mode on `DOMContentLoaded`, which runs after first paint, so it needs an inline pre-paint script added.
- **Lossless brand sites** (changelog, toolkit, slides, client-portals) default to **vibrant**. See `astro-knots/context-v/explorations/Implement-Three-Mode-Theme-System-for-Lossless-Brand-Site-Decouplings.md`.

## What's Not Here Yet (TBD)

This skill is actively under development. Planned content:

- [ ] `references/vibrant-mode-implementation.md` — full guide to dark-based vibrant mode
- [ ] `references/two-tier-tokens.md` — deep dive on token architecture
- [ ] `references/file-organization.md` — theme.css vs global.css vs utilities
- [ ] `references/mode-switcher-utilities.md` — JS utilities pattern
- [ ] `references/brand-kit-page.md` — required sections and patterns
- [ ] `references/design-system-page.md` — component catalog conventions
- [ ] Templates for common token sets (minimal, comprehensive)

## Development Notes

This skill is being extracted from:
- `astro-knots/context-v/blueprints/Maintain-Themes-Mode-Across-CSS-Tailwind.md`
- `astro-knots/context-v/prompts/New-Site-Quickstart-Guide.md` §6
- `astro-knots/references/playbooks/new-site-setup.md` §8-9
- Live implementations in `sites/lossless-toolkit-site`, `sites/lossless-slides-site`, `splash/`, `sites/fullstack-vc` (and `sites/reach-edu-hub`, not checked out locally)

Content will be migrated and refined incrementally. For now, cross-reference those sources.

## See also

- Astro Knots blueprint: `astro-knots/context-v/blueprints/Maintain-Themes-Mode-Across-CSS-Tailwind.md`
- Design system maintenance: `astro-knots/context-v/blueprints/Maintain-Design-System-and-Brandkit-Motions.md`
