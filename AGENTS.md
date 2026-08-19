# AGENTS.md — Sennoric website

Guidance for agents (and humans) working in this repo. Read this before making
changes so new work matches the established style and avoids bugs we've already
hit and fixed.

## What this is

A **static, hand-authored website**. No build step, no bundler, no framework.
Each page is a self-contained `.html` file with inline `<style>` and `<script>`,
and pages share behavior/appearance through a few linked files in `/assets`.

- Edit HTML/CSS/JS directly. There is nothing to compile.
- To preview locally: `python3 -m http.server 8934` from the repo root, then
  open `http://localhost:8934/<page>.html`. Absolute asset paths (`/assets/...`)
  resolve correctly this way.
- Deploys via GitHub Pages from the default branch.

## House style

The brand is **torn paper + a warm parchment/gold accent on a dark ground**.
Photographs of real torn paper (in `/assets/paper/paper-1.jpg` … `paper-8.jpg`)
are used as textures, and letterforms/shapes are revealed through ragged,
`feTurbulence`-displaced edges.

### Design tokens (use these, don't hardcode)

Defined in `assets/theme-dark.css` / `assets/theme-light.css` and consumed with
`var(--…)`:

| token | value | use |
|-------|-------|-----|
| `--accent` | `#b8a27d` (parchment/gold) | primary accent |
| `--accent-d` / `--accent-dim` | `#d9ca9c` (champagne) | hover — **lighter**, not darker |
| `--accent-ink` | `#1a1408` | text/ink on an accent fill |
| `--bg` | `#0d0e13` | page background |
| `--text` | `#e8e9f0` | body text |
| `--fresco` | tracks `--accent` | Fresco-model accents |

Never reintroduce the old orange (`#e8602c` / `rgba(232,96,44,…)`). If you need
a paper-tone green/tan, sample from the paper photos rather than inventing hex.

### Recurring motif: regenerate on load

Much of the site deliberately **looks different on each visit** — the paper
banner crops/cycles, tear-filter seeds are randomized, and the Project Crucible
hero picks a random scene. Lean into this when adding decorative motion; it's a
signature, not an accident.

### No decorative emoji

Decorative emoji were removed site-wide. Keep functional UI glyphs (hamburger
`☰`, arrows, checkmarks, the sun/moon theme toggle, warning triangles) but do
not add emoji flourishes to headings, empty states, or success screens.

## The Project Crucible hero (`project-crucible.html`)

The hero art is the most involved piece in the repo. It is a **scene engine**:
on each load it randomly plays one of four short intro "scenes," each ending on
a solid **TAME**, then hands off to a collage that reshuffles every 500 ms.

### Shared engine

All scenes are built from the same primitives — reuse them, don't fork:

- **`rasterizeWord(word)`** — draws the word to an offscreen `<canvas>` and
  returns `{S, baseY, data}` where `data` is the pixel array. The alpha channel
  tells us which pixels are *inside* a glyph.
- **`pointInside(data)`** — rejection-samples a point inside the letterforms.
  This is how we fill letters **solidly**: every scrap is placed on a glyph
  pixel, so all of them contribute (see "holes" below).
- **Shared scrap pool** — `buildScraps(N)` creates `N` torn-paper scraps
  (each a `<clipPath>`'d `<image>` with a jagged polygon edge) inside the masked
  `#tame-intro` group. Scraps move by `transform`; the torn edge is a
  pre-generated polygon (cheap to animate — do **not** run a per-scrap
  `feTurbulence` filter every frame).
- **Per-word mask** — `#tame-mask` contains a `<text id="tame-mtext">` with the
  `#tame-letter-tear` displacement filter. `setMask(word,S,baseY)` /
  `applyWord(...)` swap the visible word. Because the scraps live inside a group
  masked by this text, the word always reads crisp regardless of scrap shape.
- **`scenes[]` + selector** — `boot()` picks `scenes[Math.random()*len|0]`.
  Add a new scene by writing a `sceneX(scraps)` function and appending it.
- **`popThenFinish(scraps)`** — the shared ending. Scales the masked word up to
  ~1.09× about its center and settles back (scaling the masked group scales its
  mask with it, so letters stay crisp), then `finish()` removes the intro layer
  and calls `startReshuffle()`.

### The four scenes

1. **Forge** — scraps fly in from off-screen and knit together into TAME.
2. **Cycle** — the name assembles word by word: `TERNARY → ADAPTIVE → MOE →
   TAME` (spelling out the caption's own expansion). Words dissolve/reform via
   the masked engine; long words auto-fit width via `measureText`.
3. **Trailer** — a rhythmic cold-open: one scrap flutters in → beat → flurry →
   torn-paper stat card `1.58-BIT` → flurry → `6-WEEK SPRINT` → flurry → TAME
   slams as the title card. Flurries briefly drop the mask so scattered scraps
   read as bursts.
4. **Telemetry** — an ambient training-run: a loss curve draws left-to-right
   like a ridgeline with an area fill, milestone flags plant at checkpoints
   (`14.5M/102M/600M`), light paper precipitation falls, then the field pours
   down and converges into TAME.

### Steady state

After a scene, `startReshuffle()` fills `#tame-reveal` with ~118 pattern-filled
torn rectangles (placed via `pointInside`) and re-randomizes them every 500 ms.

### Non-negotiable requirements for hero motion

These are lessons paid for in review cycles — keep them:

- **Always mask.** The word must stay crisp. Unmasked clouds of scraps read as
  "broken confetti" — we removed that twice. Brief (<0.35 s) unmasked flurries
  as an intentional rhythmic beat are the only exception.
- **Fill from glyph points, never frame-random.** Scattering scraps across the
  whole frame and relying on overlap leaves **holes** in the letters. Place each
  scrap on a `pointInside` sample.
- **`prefers-reduced-motion`** → render a single static collage, no animation,
  no interval.
- **Pause off-screen.** The reshuffle interval is gated by an
  `IntersectionObserver` so it stops when the hero isn't visible.
- **Font gating with a ceiling.** The canvas (which places scraps) and the SVG
  mask (which shows the letters) must use the same font, so we wait for
  `document.fonts.ready` — but race it against a ~1.5 s fallback so a stalled or
  blocked font never leaves the hero blank.
- **Delta-time rAF.** Accumulate time per frame (clamp `dt` after tab switches);
  don't derive progress from absolute timestamps.

## Gotchas we've already hit (don't reintroduce)

- **Text mode mangles CRLF.** Some files use CRLF. A Python script that opens
  files in default text mode will silently rewrite them to LF and produce huge
  spurious diffs. Read/write bytes, and check `git diff --stat` before
  committing bulk edits.
- **Inline style loses to `!important`.** A JS `el.style.display='none'` always
  loses to any stylesheet rule with `!important`. Toggle a class (we use
  `.ax-hidden`) instead, and add `:not(.ax-hidden)` guards to conflicting rules.
- **`backdrop-filter`/`filter`/`transform` create a containing block.** Putting
  these on an ancestor makes it the containing block for `position:fixed`
  descendants (this broke the mobile nav drawer) and can cause WebKit paint-order
  bugs. Move the effect to a `::before` pseudo-element with an explicit
  `z-index`.
- **`fetch()` has no timeout.** Wrap calls with `AbortController` + `setTimeout`,
  and fire independent requests concurrently so their timeouts don't compound.
- **Bake asset colors, don't rely on CSS filters** for legibility (the "LABS AI"
  subtext went invisible under a `brightness()` filter — the fix was recoloring
  the PNG).
- **The banner wordmark carries a baked keyline — don't swap in the plain SVG.**
  `logo-spiral-wordmark.svg` (single flat gold, `#E8B534`) sits over a paper crop
  that re-randomizes every 500 ms across photos spanning `relLum` 0.05–0.51, so
  the flat gold measures as low as 1.01:1 against the lightest paper — nearly
  invisible, not just low-contrast. `assets/logo-spiral-wordmark-banner.png`
  bakes a soft dark keyline (the `--accent-ink` token) behind the same glyph,
  raising the worst case to 5.13:1 — every paper passes AA. Only the banner on
  `index.html` uses this raster; everywhere else keeps the plain SVG. Regenerate
  it with `.github/scripts/rebuild-wordmark.py` if the brand mark changes —
  don't hand-edit the PNG or point the banner back at the bare SVG.

## Dashboard / API pages

`keys.html`, `settings.html`, `usage.html`, `chat.html`, `admin.html`, etc.
talk to a Cloudflare-Workers backend. When building UI against an endpoint that
doesn't exist yet, degrade gracefully (timeouts, fallbacks) and hand off a
precise backend spec rather than blocking.

## Workflow

- Develop on a feature branch; open a PR against `master` and squash-merge.
- **Squash-merge rewrites history**, so a follow-up on the same branch must
  `git rebase origin/master` (it'll skip the already-applied commit) before the
  next PR will merge cleanly. Force-with-lease is expected after the rebase.
- Prototype involved visual work in a scratch `_*_preview.html` served locally,
  screenshot it with Playwright (Chromium at `/opt/pw-browsers/chromium`),
  iterate, then integrate and delete the preview. Never commit `_*_preview.html`.
- Editing `announcements.html` triggers an email workflow. Add
  `[skip announcement email]` to the commit message if that's not intended.

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

