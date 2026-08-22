# Session Handoff — collection page layout system (שבר + תנועה)

**Project:** `/Users/itaybenmayor/figma-israel-museum` — single-file React+Babel (no build step), RTL Hebrew museum site.

Read `MDs/CLAUDE.md` first for base project conventions (stack, file list, design tokens). This doc covers what changed in the session that just ended (context ran out) — the layout system for `collection-motion.html` (תנועה) and `collection-shard.html` (שבר). The previous handoff doc (index-page border-stroke repair) is done and superseded; this replaces it.

## The core mechanic (previously misunderstood — read this first)

Every card renders via `computeImage(card)` and a shared `Card` component. The card's `x/y/w/h` define an **invisible box**. `computeImage` centers the actual `<img>` inside that box: `offsetX = (w - iw) / 2`. **Whitespace comes from the image being smaller than its box, not from gaps between boxes.** Boxes always tile flush (`next.x = prev.x + prev.w`, zero gap). This was the thing that caused three rounds of rejected layouts before it was found by measuring circle/gate/verticality's actual rendered image edges instead of just their card coordinates.

Two whitespace modes, encoded as a `mode` value per card in the generator scripts used this session:
- **inset** (`mode > 0`, px): image is `2·mode` narrower than the box, floats centered. `h = round((w − 2·mode)/ar) + 22`
- **slack** (`mode < 0`, px): image fills the box width, box is `−mode` px taller than the image needs. `h = round(w/ar) + 22 + (−mode)`
- **fill** (`mode = 0`): image exactly fills the box. `h = round(w/ar) + 22`

(`22` = `CARD_CAPTION_GAP(2) + CARD_CAPTION_LINE_H(20)`.)

Reference pages (gate/verticality) are **skewed** toward small insets with occasional big ones — not evenly distributed. Median inset ~3px, mean ~8, max ~40-58 on isolated/solo cards only. Cards with an immediate row-neighbor keep insets tiny (0-4px); big insets only appear on cards with no same-row neighbor.

## Margin/indent palette (established this session, applied to both pages)

Every row's left-indent should be drawn from: **`{-25, 24, 92, 160, 208, 247}`**. `-25` is the one deliberate left-canvas-bleed value. This was reverse-engineered from gate/verticality's actual indents and then enforced on both תנועה and שבר (drifted off-palette once during a שבר reshuffle and had to snap back — check new work against this set).

## The overflow bug (real bug, not a guess) — check other pages for it too

Caption/description overlay text position formula (in the `Card` component):
```
right edge = artRight − 14 + descOffsetX
```
This is **independent of `descWidthFrac`** in the normal case. The old default `descOffsetX: 20` on every card puts the text's right edge **6px past the artwork's own right edge** — for 0-inset (fill-mode) cards this pokes past the card boundary too, especially with tight ~4px margins between neighbors.

**Fix applied (both תנועה and שבר, all cards):** replaced the flat `20` with a width-proportional formula anchored at `w=340 → -14` (validated against `ח׳מר`, first card the user manually confirmed correct):
```python
def offx(w): return round(-14 + 0.025*(w - 340))
```
Wider cards get pushed further right (toward 0 and positive), narrower cards stay more negative. Several individual cards later got manually nudged a few px beyond the formula by direct user request (`ח׳מר` itself ended at `-14`, `discus-thrower` ended at `11` after several "a bit more right" requests, etc.) — check the live files for current per-card values, don't assume the formula alone still holds everywhere.

**⚠️ מעגל, אנכיות, and שער almost certainly still have `descOffsetX: 20` on every card (unfixed).** This session only touched תנועה and שבר. If asked to work on those three pages, check for this bug first — it's exactly the pattern above.

## Row-to-row vertical gap rule

A card's `y` should sit **3px below the caption-bottom of whatever card(s) share its x-range in the row above** (not necessarily the tallest card in a shared cluster — compute per-card, since a narrow card may only overlap one of several upper-row cards). Caption bottom for a card = `y + min(h, computed_image_height + 22)`.

Applied as a **cascading top-down pass**: process rows in y-order, and for each row's cards, find the max caption-bottom among all *already-placed* cards whose x-range overlaps, then set `y = that + 3`. Rows can end up with larger natural gaps (14–190px) when a card only overlaps a *shorter* neighbor above — that's correct, not a bug (verified this is what תנועה's own real end-state looks like, not artificially forced to always be exactly 3).

## Verification method (important — simulated hover is unreliable here)

Dispatching synthetic `mouseenter`/`mouseover` JS events, or even the `computer` hover tool, **did not reliably trigger the React `hovered` state** in this environment (tested extensively, gave up on it). The reliable method used throughout:

1. Find the line `const [hovered, setHovered] = useState(false);` in the file.
2. Temporarily `Edit` it to `useState(true)`.
3. Reload the page in the browser preview, run a JS measurement script (see below).
4. **Always revert to `useState(false)`** before ending the turn, reload once more, and confirm zero console errors.

Standard overflow/clipping check script (paste into `javascript_exec` after forcing hover true):
```js
(function(){
  const cards=[...document.querySelectorAll('[id^="card-"]')];
  const res=[];
  for(const card of cards){
    const cr=card.getBoundingClientRect();
    const d=card.querySelector('.overflow-hidden.pointer-events-none.text-right');
    if(!d) continue;
    const dr=d.getBoundingClientRect();
    res.push({id:card.id.replace('card-',''),
      oR:Math.round((dr.right-cr.right)*10)/10,
      oL:Math.round((cr.left-dr.left)*10)/10,
      clipped:d.scrollHeight>d.clientHeight+2});
  }
  const bad=res.filter(r=>r.oR>0.5||r.oL>0.5||r.clipped);
  return JSON.stringify({total:res.length,bad},null,1);
})()
```
`bad` must be `[]`. `total` must equal the page's card count (if it's `0`, the page failed to compile — see quote-escaping gotcha below).

Dev server: `.claude/launch.json` already defines a `museum` config (`python3 -m http.server 8912`). Use `mcp__Claude_Browser__preview_start({name:"museum"})`, not `file://` (file:// renders as a static snapshot, can't scroll/hover).

## Quote-escaping gotcha (caused a full page blank-out once)

When programmatically regenerating a `CARDS` array, **every string field** (`image`, `title`, `subtitle`, `description`) needs quote-safe escaping, not just the ones that "look risky." One card's `image` path containing `לוח חלון "עין השור"...png` broke the whole file (0 cards rendered, empty `#root`, **no console error** — React/Babel just silently produced nothing) because only `title`/`subtitle`/`description` were escaped, not `image`. Always use one `q(v)` helper for *all four* string fields:
```python
def q(v):
    if v is None: return '""'
    if '"' in v: return "'" + v.replace("'", "\\'") + "'"
    return '"' + v + '"'
```
After any bulk regeneration, **check `document.querySelectorAll('[id^="card-"]').length` equals the expected count** before doing anything else — this is the fastest signal that generation silently broke.

## Footer formula (unchanged from original CLAUDE.md, just restating)

```
FOOTER_LINKS_TOP    = last_card_caption_bottom + 140
FOOTER_PARAGRAPH_TOP = FOOTER_LINKS_TOP − 48
FOOTER_WORDMARK_TOP  = FOOTER_LINKS_TOP + 75
CANVAS_H             = FOOTER_WORDMARK_TOP + 210
```

## Artist/year/description data source

`collection-index.html`'s `CARDS` array (107 curated tiles) has **real** subtitle (artist, year) and description text, keyed by image filename (basename, extension stripped, compare after Unicode NFC normalization + stripping Hebrew geresh/gershayim/quote variants). Many — but not all — of תנועה's 28 and שבר's 31 pieces matched against it (roughly 20/28 and 22/31). For unmatched pieces, **do not fabricate** artist/year — this is a real museum's data. Either ask the user, or (only if asked to research) use `WebSearch`/`WebFetch` and clearly flag confidence level before writing anything in. The user has since manually supplied several of the misses directly in chat — check current file state for what's already filled vs. still `"..."`.

## Current state (as of end of session)

- **תנועה (`collection-motion.html`)**: Fully polished. All 28 cards have real subtitle+description (or user-supplied text where research came up empty — `מאבו` was resolved via Robert Frank attribution found in the image's own handwritten caption). Margins/overflow fixed per the rules above. Many individual cards got hand-tuned position/offset nudges across dozens of small user requests (e.g. `אישה + נֵאון` and `לוליין...` were both repositioned because they were sharing a row-y with a taller card they didn't actually overlap in x — check current file rather than assuming a card's position matches an earlier description in this doc).
- **שבר (`collection-shard.html`)**: Intro paragraph text replaced (user supplied exact copy). Fully reshuffled **twice** this session — current layout has 12 clusters, opens with `arrowhead` solo-wide + `ganga-devi`/`two-women-mural` pair (see live file for the authoritative current `CARDS` array — don't trust any specific cluster plan described in earlier chat, only the file on disk). All margins snapped to the palette, all voids reasonable (0–660px range, no orphans, no overflow past x=1704).
- Both pages verified: card count matches source, zero overlay overflow/clipping, max right edge ≤1704 (frame is 1728), footer constants recomputed to match actual content height.

## Likely next asks (based on this session's pattern)

- Same treatment (margin palette + overflow fix + gap normalization + reshuffle) requested for מעגל/אנכיות/שער — **check them for the same `descOffsetX: 20` bug first**, don't assume they're fine just because they're older/"reference" pages.
- More individual "move X's text/position a bit left/right/up" micro-requests — always verify via the forced-hover method above, never assume from math alone (sub-pixel rounding differences between viewport widths bit us more than once).
- More artist/year data fills as the user supplies them.

## Scratchpad

Working Python generator scripts and intermediate JSON (`shard_cards.json`, `shard_layout*.json`) were written to a session-specific scratchpad path and `/tmp/` — these **will not exist in a new session**. If regenerating שבר's layout again, re-extract card data from the live `collection-shard.html` first (parse the `CARDS` array block, split on `id:` boundaries, pull `image`/`title`/`subtitle`/`description`/`ar` per card) — the extraction/generation scripts were not saved anywhere persistent and need to be rewritten from scratch.
