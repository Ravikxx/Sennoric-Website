# Sennoric Website — Claude instructions

See `AGENTS.md` in this repo for the full house style, design tokens, and workflow notes. The rule below is repeated here because it is the one most often broken.

## Announcement formatting (non-negotiable)

**Every announcement must be formatted identically to every other announcement.**
No exceptions, no per-entry variation.

In `Website/announcements.html` each visible entry is one `<article class="ann <category>" data-cat="<category>">` containing:

1. `<button class="ann-head">` with, in this order: `<span class="ann-when">` (full date, `Month D, YYYY`), `<span class="ann-cat <category>">` (label), `<span class="ann-title">`, then the chevron `<svg class="ann-chev">`.
2. `<div class="ann-panel"><div class="ann-panel-inner">` holding the body paragraphs, optionally ending in `<div class="ann-footer">` with `<a class="ann-link">` links.

Rules:

- **Categories are a closed set**, matching `ANN_CATS`: `release` / Release, `update` / Update, `safety` / Safety Update, `notice` / Notice, plus `announcement` / Announcement. Never invent a label such as "Safety Report".
- **No inline paragraph margins.** Spacing comes from the single `.ann-panel-inner p + p` rule. Do not add `style="margin-top:…"` to entry paragraphs.
- **Titles carry no trailing period** and are not wrapped in extra markup.
- **Entries are ordered newest first** by their `.ann-when` date.
- **Do not hand-set `lead` or `open`** on an entry; the page assigns them to the newest row at runtime.
- The hidden `<div class="announcement" style="display:none">` blocks are the **email payloads** parsed by `.github/scripts/send-announcement.cjs`; they use `<h2>` plus `<p>` and are a separate format. Do not merge them with the visible entries or reorder them.
- Editing `announcements.html` triggers the announcement email workflow. Use `[skip announcement email]` in the commit message for formatting or migration work that must not notify subscribers.
- The homepage Latest section reads these entries at runtime, so malformed markup silently degrades the homepage too.

