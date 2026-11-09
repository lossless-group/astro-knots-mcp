---
site_uuid: 1e72456b-e57a-4e58-af4f-0997ef964a4e   # REGENERATE: uuidgen | tr 'A-Z' 'a-z' — never type one by hand
hex_code: n3chw2                    # REGENERATE: LC_ALL=C tr -dc 'a-z0-9' </dev/urandom | head -c6
date_authored_initial_draft: YYYY-MM-DD
date_authored_current_draft: YYYY-MM-DD
# When the WORK happened, if it spanned more than the day you wrote this up.
# Optional. Omit rather than guess; never derive from the filesystem.
# date_work_started: YYYY-MM-DD
# date_work_completed: YYYY-MM-DD
date_created: YYYY-MM-DD
date_modified: YYYY-MM-DD
title: "Title in title case"
lede: "One-sentence hook that makes the reader want to keep reading. Specific, not generic."
summary: "Optional, agent-facing. What this entry is FOR, where it sits in the workflow, what it unblocks or supersedes, how pseudomonorepo / context-vigilance logic should treat it. Not a longer lede — the lede sells the click and feeds OpenGraph; this orients an agent deciding whether to open the file."
publish: true
authors:
  - Firstname Lastname
augmented_with:
  - Pi on Claude Sonnet 4.5
files_changed:
  - path/from/project-root/src/components/NameOfComponent.astro
  - path/from/project-root/context-v/specs/Some-Spec.md
tags:
  - Relevant-Tag
---

# TITLE HERE

## Why Care?

Audience-facing answer. One to three short paragraphs that work as a standalone preview. What does this enable, change, or unlock for someone who isn't on the team?

If you can't write this section without referring to internal jargon or prior context, the work might not be ready for a public changelog yet — or might need a different framing.

## What's New?

Concrete summary of what shipped. Bullet list or short paragraphs.

- Each item clear enough that an outside reader gets it
- Link to actual artifacts via `[[wikilinks]]` or standard Markdown links
- Specifics over generics

## The Story

> *(Optional but strongly encouraged.)* The journey behind the work. Problem → attempt → resolution. Realization → reframing → result. Convergence. Honest setbacks.

What happened. What was hard. What surprised you. What you tried that didn't work and why. The shape of the arc.

```mermaid
flowchart LR
    A[Where we started] --> B[What we tried]
    B --> C[What we learned]
    C --> D[What shipped]
```

## How It Works (or "Under the Hood")

> *(Optional, for entries where readers will want to learn the technique.)* Show enough of the "how" that it clicks. Code blocks, diagrams, file structures.

```ts
// real code from what shipped
```

## What's Next

What this opens up. Either an immediate next step, or a longer-term arc this entry is one move toward.

## Related

- [[Spec or blueprint this implements]]
- [[Other recent changelog entries that connect]]
- [Public artifact link]
