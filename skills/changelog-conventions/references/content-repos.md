# Changelogs for content repos

A content repo like `lossless-content` is a corpus, not a program. It has no semver, no conflicts and no API docs, so a file list and a line count say almost nothing. One paragraph is one line, so 86,000 new words can show up as 14,000 lines. In a single batch, 757 "changed files" turned out to be 23 real edits, with the rest made up of new stubs, moves and wikilink paths following the moves.

So a content entry records **what the corpus gained**. A script generates the numbers and a human or agent writes the story.

## Generate the stats

```bash
python3 scripts/content-stats.py --repo <content-repo> [--exclude <pathspec>] [--private]
```

The script is read-only and stages into a throwaway index and object directory. Entry material goes to stdout. Author checks go to stderr: new published pages with no inbound wikilink, and new pages sharing a `url` with another page.

- **`--exclude`** holds paths back, so the stats match what the commit will contain.
- **`--private`** prints counts only. Use it for `client-content`, whose folder names identify clients, and report those counts in the public parent's entry.

## What each number means

| Group | Keys | Notes |
|---|---|---|
| Coverage | `records_added`, `records_added_unpublished` | New pages under 50 body words: entity files such as firms and people |
| Depth | `articles_added`, `articles_added_unpublished`, `revised`, `touch_up`, `words_net`, `words_net_unpublished` | `revised` is 25+ changed words. `touch_up` is fewer |
| Connectivity | `wikilinks_net`, `wikilinks_added_to_published`, `wikilinks_added_to_unpublished`, `wikilinks_added_to_submodule`, `wikilinks_added_unresolved`, `citations_net`, `links_out_net` | Wikilinks and links out are separate counts. A link in a citation definition counts as a citation only |
| Structure | `moved`, `links_retargeted`, `metadata_only`, `whitespace`, `deleted` | Moves are a content repo's breaking changes, because they change public URLs |
| Size | `corpus_markdown_files`, `since_commit` | `since_commit` plus this entry's commit gives the full file list in git |

"Published" uses the site's rule: `publish` is not `false` and `private` is not `true`, so a missing key counts as published. **This describes intent, not visibility.** As of 2026-11-02 the `lossless-site` page routes don't check `publish`, so `publish: false` pages can still render and appear in the sitemap. They are also readable on GitHub whenever the repo is public.

## `tags_aggregated`

```yaml
tags_aggregated:
  Lossless-Thinking: 5
  Agentic-AI: 4
```

Values are numbers, so components can sort and size them without converting. The map counts tags on published pages that are new or revised, and drops tags used once. Unpublished stubs stay out on purpose: a bulk ingest of 226 firm records would otherwise bury everything that was actually written. Don't merge near-duplicate tags in the script. That's a deliberate editorial cleanup.

## Entry shape

1. **`## Why Care?`** What can the brain answer now that it couldn't before?
2. **`## Worth Reading`** 5 to 10 hand-picked wikilinks, each with a reason.
3. **`## By Collection`** The generated table.
4. **`## What We Added`** The generated list of every new published page, as wikilinks.
5. **`## Moved`** The generated old path → new path list.
6. **`## Most-Wanted Pages`** Generated. Pages other pages link to that don't exist yet.

Write one entry per push. A quiet push can be just the stats and a sentence, and that's fine.

## Links are the point of the list

Frontmatter paths never become links: nothing on the site reads `files_changed`, so it does nothing for SEO on a content repo. Wikilinks in the body render as real anchors, so the list of new pages belongs there.

- **Link new published pages.** Each one gets at least one internal link from a page that's in the sitemap.
- **Don't link pages that didn't change in substance.** Moves, touch-ups and metadata fixes get a path rule or nothing.
- **Don't link unpublished pages.** Their publish state is a decision the entry shouldn't override.
- **Prefer links from related content.** A changelog link helps a crawler find a page. A link from a related page does more for ranking, so treat the no-inbound-wikilink check as a to-do list.

Unresolved wikilinks render as plain text on the site, not as links to a 404, so they do no SEO harm. They also show which pages people want written, which is why they're reported.
