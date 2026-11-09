#!/usr/bin/env python3
"""Summarize pending changes in a markdown content repo for a changelog entry.

Reports what the corpus gained rather than which lines changed: new articles and
records, real revisions, moves, resolving wikilinks, citations, links out, and a
tag aggregate over published pages.

Read-only. Staging happens in a throwaway index and object directory, so the
repo's real index and objects are untouched. Python standard library only.

    content-stats.py [--repo PATH] [--base REV] [--exclude PATHSPEC]... [--private]

Entry material goes to stdout, and checks meant for the author go to stderr.
--private prints counts only, for repos whose folder names identify clients.
"""
import argparse
import collections
import difflib
import os
import re
import shutil
import subprocess
import sys
import tempfile

RECORD_MAX_WORDS = 50  # below this a new page is an entity record, not an article
REVISED_MIN_WORDS = 25  # below this a body edit is a touch-up
TAG_MIN_COUNT = 2

FRONTMATTER = re.compile(r"^---\n(.*?)\n---\n?(.*)$", re.S)
FENCE = re.compile(r"```.*?```", re.S)
WIKILINK = re.compile(r"(?<!!)\[\[([^\]]+)\]\]")
WIKILINK_PATH = re.compile(r"\[\[(?:[^\]|]*/)?([^\]|]+)(\|[^\]]*)?\]\]")
CITATION_DEF = re.compile(r"^[ \t]*\[(?:\^[0-9a-z]+|\d+)\]:.*$", re.M)
LINK_OUT = re.compile(r"(?<!!)\[[^\]]*\]\((https?://[^)\s]+)")
WORD = re.compile(r"\w[\w'’-]*")


def split_doc(text):
    text = text.replace("\r\n", "\n")
    match = FRONTMATTER.match(text)
    return (match.group(1), match.group(2)) if match else ("", text)


def field(frontmatter, key):
    match = re.search(rf"^{key}:[ \t]*(.*)$", frontmatter, re.M)
    return match.group(1).strip().strip("'\"") if match else None


def is_published(frontmatter):
    # The site's gate: publish-by-default, so a missing key counts as published.
    return (field(frontmatter, "publish") or "").lower() != "false" \
        and (field(frontmatter, "private") or "").lower() != "true"


def parse_tags(frontmatter):
    inline = re.search(r"^tags:[ \t]*\[(.*?)\]", frontmatter, re.M)
    if inline:
        return [t.strip().strip("'\"") for t in inline.group(1).split(",") if t.strip()]
    block = re.search(r"^tags:[ \t]*\n((?:[ \t]*-[ \t]*.+\n?)+)", frontmatter, re.M)
    if block:
        return [re.sub(r"^[ \t]*-[ \t]*", "", line).strip().strip("'\"")
                for line in block.group(1).splitlines() if line.strip()]
    scalar = field(frontmatter, "tags")
    return [scalar] if scalar else []


def wikilinks(body):
    targets = collections.Counter()
    for raw in WIKILINK.findall(FENCE.sub("", body)):
        # Inside a markdown table the alias pipe is escaped: [[path\|Name]]
        target = raw.split("|")[0].split("#")[0].strip().rstrip("\\")
        if target and "visuals" not in target.lower():  # remark-images handles those
            targets[target] += 1
    return targets


def citations(body):
    return len(CITATION_DEF.findall(body))


def links_out(body):
    # Citation definitions are counted as citations, not again as links out.
    return len(LINK_OUT.findall(CITATION_DEF.sub("", FENCE.sub("", body))))


def words(body):
    return len(WORD.findall(body))


def changed_words(old, new):
    before, after = old.split(), new.split()
    if len(before) + len(after) > 8000:
        return abs(len(before) - len(after))
    matcher = difflib.SequenceMatcher(None, before, after, autojunk=False)
    return sum(max(i2 - i1, j2 - j1)
               for op, i1, i2, j1, j2 in matcher.get_opcodes() if op != "equal")


def collection_of(path):
    parts = path.split("/")[:-1]
    if parts[:2] == ["vertical-toolkits", "Alternatives"]:
        parts = parts[:1] + parts[2:]
    depth = 2 if parts[:1] and parts[0] in ("sources", "vertical-toolkits", "concepts") else 1
    return " / ".join(p.replace("-", " ") for p in parts[:depth]) or "(root)"


class Repo:
    def __init__(self, path, base, excludes):
        self.path = path
        self.base = base
        self.tmp = tempfile.mkdtemp(prefix="content-stats-")
        real_index = self.git("rev-parse", "--git-path", "index", text=True, absolute=True)
        real_objects = self.git("rev-parse", "--git-path", "objects", text=True, absolute=True)
        index = os.path.join(self.tmp, "index")
        objects = os.path.join(self.tmp, "objects")
        os.makedirs(objects)
        if os.path.exists(real_index):
            shutil.copy(real_index, index)
        self.env = dict(os.environ, GIT_INDEX_FILE=index, GIT_OBJECT_DIRECTORY=objects,
                        GIT_ALTERNATE_OBJECT_DIRECTORIES=real_objects)
        self.git("add", "-A", "--", ".", *[f":!{e}" for e in excludes])

    def git(self, *args, text=False, absolute=False):
        env = getattr(self, "env", None)
        out = subprocess.run(["git", "-C", self.path, *args], capture_output=True, env=env).stdout
        if not text:
            return out
        value = out.decode().strip()
        return os.path.join(self.path, value) if absolute and not os.path.isabs(value) else value

    def changes(self):
        rows = self.git("diff", "--cached", "-M50%", "--name-status", "-z", self.base).split(b"\0")
        i = 0
        while i < len(rows) and rows[i]:
            status = rows[i].decode()[0]
            if status == "R":
                yield status, rows[i + 1].decode(), rows[i + 2].decode()
                i += 3
            else:
                yield status, rows[i + 1].decode(), rows[i + 1].decode()
                i += 2

    def old(self, path):
        return self.git("show", f"{self.base}:{path}").decode("utf-8", "replace")

    def new(self, path):
        return self.git("show", f":{path}").decode("utf-8", "replace")

    def corpus(self):
        for raw in self.git("ls-files", "-z").split(b"\0"):
            path = raw.decode()
            if path.endswith(".md"):
                try:
                    with open(os.path.join(self.path, path), encoding="utf-8", errors="replace") as f:
                        yield path, f.read()
                except OSError:
                    continue

    def close(self):
        shutil.rmtree(self.tmp, ignore_errors=True)


def classify(status, before, after):
    if status == "A":
        return "new"
    if status == "D":
        return "deleted"
    fm_a, body_a = split_doc(before)
    fm_b, body_b = split_doc(after)
    if body_a == body_b:
        return "moved" if status == "R" and fm_a == fm_b else "metadata_only"
    if WIKILINK_PATH.sub(r"[[\1\2]]", body_a) == WIKILINK_PATH.sub(r"[[\1\2]]", body_b):
        return "links_retargeted"
    if "".join(body_a.split()) == "".join(body_b.split()):
        return "whitespace"
    return "revised" if changed_words(body_a, body_b) >= REVISED_MIN_WORDS else "touch_up"


def analyze(repo):
    docs = {}
    by_lower, by_name = {}, collections.defaultdict(list)
    inbound = collections.Counter()
    urls = collections.defaultdict(list)
    for path, text in repo.corpus():
        frontmatter, body = split_doc(text)
        docs[path] = frontmatter
        stem = path[:-3].lower()
        by_lower[stem] = path
        by_name[os.path.basename(stem)].append(path)
        url = field(frontmatter, "url")
        if url:
            urls[re.sub(r"^https?://(www\.)?", "", url).rstrip("/").lower()].append(path)

    def resolve(target):
        key = target.lower().removesuffix(".md")
        if key in by_lower:
            return by_lower[key]
        matches = by_name.get(os.path.basename(key), [])
        return matches[0] if len(matches) == 1 else None

    for path, text in repo.corpus():
        for target in wikilinks(split_doc(text)[1]):
            found = resolve(target)
            if found and found != path:
                inbound[found] += 1

    stats = collections.Counter()
    tags = collections.Counter()
    table = collections.defaultdict(collections.Counter)
    added = collections.defaultdict(list)
    moves = collections.Counter()
    wanted = collections.Counter()
    new_paths = set()
    for status, old_path, path in repo.changes():
        if status == "R":
            moves[(os.path.dirname(old_path), os.path.dirname(path))] += 1
        if not path.endswith(".md"):
            continue
        before = repo.old(old_path) if status != "A" else ""
        after = repo.new(path) if status != "D" else ""
        fm_a, body_a = split_doc(before)
        fm_b, body_b = split_doc(after)
        kind = classify(status, before, after)
        published = is_published(fm_b) if status != "D" else False
        area = collection_of(path)

        if kind == "new":
            new_paths.add(path)
            size = "articles_added" if words(body_b) >= RECORD_MAX_WORDS else "records_added"
            kind = size if published else f"{size}_unpublished"
            if published:
                title = (field(fm_b, "title") or os.path.basename(path)[:-3]).replace("|", "-")
                added[area].append((path[:-3], title))
                stats["untagged_published_new"] += not parse_tags(fm_b)
        stats[kind] += 1
        table[area][kind] += 1

        if kind.endswith("_added") or kind in ("revised", "touch_up") or "_added_" in kind:
            delta = words(body_b) - words(body_a)
            stats["words_net" if published else "words_net_unpublished"] += delta
            table[area]["words"] += delta if published else 0
        if published and (kind.endswith("_added") or kind == "revised"):
            tags.update(set(parse_tags(fm_b)) - set(parse_tags(fm_a)))

        stats["citations_net"] += citations(body_b) - citations(body_a)
        stats["links_out_net"] += links_out(body_b) - links_out(body_a)
        stats["wikilinks_net"] += sum(wikilinks(body_b).values()) - sum(wikilinks(body_a).values())
        for target, count in (wikilinks(body_b) - wikilinks(body_a)).items():
            root = target.split("/")[0].lower()
            found = resolve(target)
            if found:
                bucket = "to_published" if is_published(docs.get(found, "")) else "to_unpublished"
            elif root in ("content-areas", "client-content"):
                bucket = "to_submodule"
            else:
                bucket = "unresolved"
                wanted[target] += count
            stats[f"wikilinks_added_{bucket}"] += count

    stats["corpus_markdown_files"] = len(docs)
    orphans = sorted(p for p in new_paths if is_published(docs.get(p, "")) and not inbound[p])
    dupes = {u: ps for u, ps in urls.items() if len(ps) > 1 and new_paths & set(ps)}
    return stats, tags, table, added, moves, wanted, orphans, dupes


def yaml_key(tag):
    return tag if re.fullmatch(r"[\w-]+", tag) else '"' + tag.replace('"', "'") + '"'


STAT_ORDER = [
    "articles_added", "records_added", "articles_added_unpublished",
    "records_added_unpublished", "revised", "touch_up", "moved", "links_retargeted",
    "metadata_only", "whitespace", "deleted", "words_net", "words_net_unpublished",
    "citations_net", "links_out_net", "wikilinks_net", "wikilinks_added_to_published",
    "wikilinks_added_to_unpublished", "wikilinks_added_to_submodule",
    "wikilinks_added_unresolved", "untagged_published_new", "corpus_markdown_files",
]


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--repo", default=".")
    parser.add_argument("--base", default="HEAD")
    parser.add_argument("--exclude", action="append", default=[], help="pathspec to hold back")
    parser.add_argument("--private", action="store_true", help="counts only, no names")
    args = parser.parse_args()

    repo = Repo(os.path.abspath(args.repo), args.base, args.exclude)
    try:
        stats, tags, table, added, moves, wanted, orphans, dupes = analyze(repo)
        since = repo.git("rev-parse", "--short", args.base, text=True)
    finally:
        repo.close()

    print("content_stats:")
    print(f"  since_commit: {since}")
    for key in STAT_ORDER:
        if stats[key]:
            print(f"  {key}: {stats[key]}")
    if args.private:
        return

    ranked = sorted(((c, t) for t, c in tags.items() if c >= TAG_MIN_COUNT), key=lambda x: (-x[0], x[1]))
    if ranked:
        print("tags_aggregated:")
        for count, tag in ranked:
            print(f"  {yaml_key(tag)}: {count}")

    print("\n## By Collection\n")
    print("| Collection | Articles | Records | Unpublished | Revised | Words |")
    print("|---|---:|---:|---:|---:|---:|")
    for area, row in sorted(table.items(), key=lambda x: (-x[1]["words"], x[0])):
        hidden = row["articles_added_unpublished"] + row["records_added_unpublished"]
        if row["articles_added"] or row["records_added"] or hidden or row["revised"]:
            print(f"| {area} | {row['articles_added']} | {row['records_added']} | {hidden} "
                  f"| {row['revised']} | {row['words']:,} |")

    if added:
        print("\n## What We Added\n")
        for area in sorted(added):
            print(f"### {area} ({len(added[area])})\n")
            print(" · ".join(f"[[{p}|{t}]]" for p, t in sorted(added[area], key=lambda x: x[1].lower())))
            print()

    if moves:
        print("## Moved\n")
        for (old, new), count in moves.most_common():
            print(f"- `{old or '(root)'}/` → `{new or '(root)'}/` ({count})")
        print()

    popular = [(c, t) for t, c in wanted.most_common(15) if c >= 2]
    if popular:
        print("## Most-Wanted Pages\n")
        print("Linked to, but not written yet:\n")
        for count, target in popular:
            print(f"- {os.path.basename(target)} ({count})")

    print(f"\nCHECKS (not for the entry)\n  new published pages with no inbound wikilink: {len(orphans)}",
          file=sys.stderr)
    for path in orphans[:20]:
        print(f"    {path}", file=sys.stderr)
    print(f"  new pages sharing a url with another page: {len(dupes)}", file=sys.stderr)
    for url, paths in sorted(dupes.items()):
        print(f"    {url}: {' | '.join(paths)}", file=sys.stderr)


if __name__ == "__main__":
    main()
