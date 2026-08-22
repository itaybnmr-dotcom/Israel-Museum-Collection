# Session Log — 2026-08-06

**Project:** `/Users/itaybenmayor/figma-israel-museum` — single-file React+Babel (no build step), RTL Hebrew museum site, five motif pages: מעגל (circle), אנכיות (verticality), שער (gate), תנועה (motion), שבר (shard), plus a shared index (`collection-index.html`), a per-artwork detail template (`artwork.html` + `artworks-data.js`), and `about.html`.

This is a long session, picking up where `session-log-2026-08-02.md` left off. Covers: filter-tagging touch-ups across the five motif pages, a full pass fixing dead Figma image links and layout on `collection-gate.html`, building out the inner-page linking system between `collection-index.html` and the individual `artwork.html` detail pages, a long series of per-artwork content/geometry/typography fixes on those detail pages, and a headline+hover-video feature on `about.html`.

---

## 1. Filter-tagging touch-ups (מעגל, אנכיות, שער)

Continuation of the per-image `FILTER_MATCHES` tagging work from the previous session — the user supplied exact artwork lists per color/material category per page, verified against each page's actual `CARDS`/`id` values:

- **מעגל**: `ירוק` and `זהב` categories corrected to exact lists (dropping stale entries like `beheaded-sun`, `sunset-arenys`, `annunciation` where not requested); `זהב` later had `red-sun` and `annunciation` added back in on request. `שחור` fully replaced with a 7-item list (`bicycle-wheel`, `paris-graffiti`, `stalactite`, `titus-denarius`, `spindle-whorl`, `optical-parable`, `launch`). `צבעי־שמן` got `red-sun` appended.
- **אנכיות**: `אדום` narrowed to just `malka-gross`. `כחול`, `ירוק`, `שחור`, `לבן`, `אבן`, `זהב`, `צבעי־שמן` all rebuilt to exact user-supplied lists. For `ירוק`, additionally **reordered the `CARDS` array itself** (not just `FILTER_MATCHES`) so the magnet-cluster hover preview stacks smallest-artwork-first — z-order in the hover cluster is DOM order, so the card literal object needs to physically sit earliest in `CARDS` to render behind its cluster-mates. Did this twice: once to put `surreal-landscape` "in the back," once to re-sort the whole `ירוק` group (`picasso-profile` → `totem-legend` → `surreal-landscape` → `stack-drawer`) by ascending on-page pixel area so bigger works don't fully occlude smaller ones. Also increased `MAGNET_CLUSTER_RADIUS` (70 → 220) — at the old radius, scaled-up cluster members all converged within a ~140px circle and fully buried each other; 220 spreads centers across a ~440×360px area so each artwork's edges peek out.
- **שער**: `זהב` (previously intentionally left unset — "nothing genuinely gold-dominant") got `gross-window` added. `שחור` rebuilt twice to different exact lists as the user iterated.

## 2. שער (`collection-gate.html`)

### 2a. Dead Figma links
User reported "everything is missing." Diagnosis: **14 of the page's cards** were still on expired `figma.com/api/mcp/asset/...` signed URLs (same class of bug fixed on this exact page in the 08-02 session, but a much larger batch this time — the earlier session only caught 4). Found local replacements in `public/refrence/גריין/` (all the standard 1460×1122 export-canvas PNGs) for 13 of them by title match; wired those in directly. One (`evans-church`, כנסיית עץ קרוליינה הדרומית) had no local match anywhere in the project — flagged as needing a supplied photo. User later added `public/images/collections/כנסיית עץ, קרוליינה הדרומית.png` (a real Walker Evans photo, verified by eye) and it was wired in, matching the record's existing `ar` almost exactly so no geometry changes were needed.

### 2b. Footer position
`FOOTER_LINKS_TOP`/`PARAGRAPH_TOP`/`WORDMARK_TOP`/`CANVAS_H` were hardcoded and drifted 217px below the `LAST_CARD_BOTTOM + 140` convention used elsewhere on the page (and matching `collection-circle.html`'s dynamic formula). Recomputed against the actual lowest card (`jaffa-gate`, bottom 5888) and shifted the whole footer block up to match.

### 2c. Row-2 layout: `building-model` / `calf-temple` / `motherwell-guillotine`
A long iterative back-and-forth (this is the bulk of the session's early "just move it a bit" turns) tuning:
- `duchamp-widow`'s box size/position relative to `feininger-barns`, converging on a ~3px canvas-unit margin convention (cross-referenced against `shahn-shelter`→`manray-lovers`'s existing 3px gap as the site's own precedent).
- `building-model` (דגם מבנה) resized and repositioned repeatedly against both neighbors, at one point requiring `calf-temple` to also shrink/shift to avoid an overlap that had crept in — settled on `x:846, w:388` for building-model with `calf-temple` back at its original `x:1235, w:459, h:605` (a "smaller" edit had accidentally cost real size without being asked for; reverted when flagged).
- `motherwell-guillotine`'s caption: title/subtitle were flush to the image edges (matching the page-wide convention) but the user wanted them pulled inward — added `capInsetL`/`capInsetR` (settled at 22/35, asymmetric) and adjusted the hover-description's `descOffsetX` to keep it inside the artwork bounds. Also: the shared `MetaTable` hairline color was changed globally from solid `#28282a` to `rgba(40,40,42,0.34)` — this affects every artwork's metadata rules, not just this one.

## 3. Inner artwork pages — linking `collection-index.html` → `artwork.html`

Discovered `artwork.html` + `artworks-data.js` already existed from an earlier (context-compressed) part of this session — a single template driven by `?id=`, with `window.ARTWORK_HREF` built into `artworks-data.js` itself (`cardId → "artwork.html?id=..."`, falling back to each record's own `id` when no explicit `cards` override exists). All 5 motif pages already consumed this via `<a href={window.ARTWORK_HREF[card.id]}>` on their `Card` component — verified working, no changes needed there.

**`collection-index.html` had no equivalent** — neither its grid nor list view linked anywhere. Built a title-matching bridge:
- Normalizes both sides (strip nikud, quote-mark variants, hyphens→spaces) and tries exact match, then substring containment, then a `difflib`-equivalent fuzzy match (implemented as a one-off Python analysis, not shipped as runtime JS) against `artworks-data.js` titles *and* every motif page's own card titles (joined back to a real id via each motif page's existing `id`).
- Final match rate: 107/107 index tiles resolved. Rather than ship the fuzzy-matching logic to the browser, **precomputed the result and wrote it directly onto each `CARDS` entry** as a new `artworkId` field, then simplified the runtime `artworkHrefFor(card)` down to a one-line lookup (`card.artworkId ? "artwork.html?id=" + card.artworkId : null`).
- Wired both `Card` (grid) and `ListRow` (list) to navigate on click when a match exists — grid via a click handler on the existing hover-hitbox div, list via a click handler on the row itself, both with `cursor: pointer` gating.
- 10 titles had genuinely no matching `artworks-data.js` record at first pass; after the user added 6 new records, re-ran the match and hand-resolved the remaining 4 (`totem-legend`, `vessel-handle`, `rothko-untitled`, `discus-thrower`) where the title wording differed too much for automated matching (e.g. `ללא כותרת` vs. `בלי כותרת`).

## 4. `artwork.html` template engineering

Several shared-component changes, each originally prompted by one specific artwork but applying to all of them:

- **Image envelope** (`FIT_MAX_W`/`FIT_MAX_H`): was `820×990`, clipping tall works badly (the 22 real Figma-measured frames span up to 993×1539). Raised to `840×1400`. *(22 measured records supply explicit `imgW`/`imgH` and were unaffected.)*
- **Blurb/artwork overlap**: derived (non-measured) records forced the blurb to *clear* the image by 24px. A parallel visual-reference analysis (7 of 24 uploaded reference screenshots, via a background subagent) found the opposite is the norm across real Figma frames — 17 of 22 measured records overlap the artwork, by a mode of ~20px. Flipped the default to `BLURB_OVERLAP = 21`.
- **Justification**: briefly set body copy to `text-align: justify` (matching the same reference analysis), then reverted to plain right-align on explicit request — the user wanted ragged-left, not blocked text.
- **`br` segment support**: `BodyCopy` only handled `{ t, u }` segments; added `{ br: true }` → `<br/>` so a paragraph can force a manual line break (used to push "כך" onto its own line on `venetian-woman`).
- **Nav thumbnails** (`NeighbourLink`):
  - Grayscale by default, fading to full color on hover (`filter: grayscale(1)` → `grayscale(0)`, 250ms) — applies to every artwork page's prev/next.
  - `NAV_TOP` was a fixed `985`, which put nav thumbnails mid-image on tall renders and floating above still-running body copy on short/wide ones. Changed to `contentBottom` (already the max of image-bottom / dims-bottom / an 1085 floor, used for the footer offset) — verified no regression on tall pages (still resolves to the same number) while fixing short ones.
  - Added optional per-record `navTop`/`navSize` overrides (used once, on `woman-neon`, to pull nav up and enlarge it beyond the shared default).
- **Per-record typography overrides**, all optional and defaulting to the prior shared constants so untouched records are pixel-identical to before: `titleWidth`, `titleLineHeight`, `artistWidth`, `bodyLetterSpacing`, `bodyLineHeight`. The recurring bug these fixed: `artistTop` defaults to a fixed `350`, but many titles wrap to 2 lines at the default 430px width, and 350 sits *inside* that 2-line span — every affected record got an explicit `artistTop` pushing it below the title's real rendered bottom.

## 5. Per-artwork fixes (via the above overrides + `artworks-data.js` content edits)

Each of these got some combination of: bigger `imgW`/`imgH`, `artistTop` correction, `titleLineHeight`/`titleWidth`, `bodyRight`/`bodyWidth` (narrower and/or shifted, sometimes iterated 4–5 times in "a bit more" steps up to very heavy overlap on request), corrected 5-row `meta` (material → origin → date → department → accession no., matching the reference frames' canonical row order), and exact `dimensions` strings supplied by the user:

- **`hand-stone`** (אבן יד) — first one done, established the pattern: full 5-row meta, exact dimensions string, narrower/left-shifted blurb, and the `NAV_TOP` fix (this page's near-full-height image is what surfaced the fixed-985 bug).
- **`totem-legend`** (אגדת מוצא המשפחה) — title forced to a specific 2-line break ("...המשפחה" / "על עמוד טוטם") via `titleWidth: 600` tuned by trial, `titleLineHeight: 0.95`, artist repositioned twice (440 → 432) for a tighter gap.
- **`air-iron-water`** (אוויר, ברזל ומים) — bigger image, tighter title line-height, artist-under-title fix, dropped inline artist life-dates from the meta row, nav-position generalization traced to this page.
- **`woman-neon`** (אישה + נֵאון) — bigger image + bigger/higher nav thumbnails (the `navSize`/`navTop` overrides), narrower blurb with only slight overlap, full meta rewrite, exact dimensions.
- **`even-more`** (אף יותר) — bigger image, artist-position fix, dropped artist life-dates, meta slash-spacing fix (`"אמנויות / אמנות מודרנית"` → `"אמנויות/אמנות מודרנית"` — recurs on almost every record), then two rounds of loosening body typography (`bodyLetterSpacing`/`bodyLineHeight`) and widening+shifting the blurb right.
- **`walking`** (אני הולך) — full meta rewrite including a corrected/shortened artist line, dimensions, dropped artist dates.
- **`alla-effigy`** (אלה (אוה)) — title changed to include phonetic nikud/transliteration, full meta rewrite (האי פסחא / אוקיאניה department), then the image was made **much** bigger in two steps (1000×769 → 1450×1114, the largest of any record this session) with the blurb column widened rightward in three separate "a bit more" steps (320→420→470) to keep pace — deliberately heavy overlap, matching the user's explicit "more tension" framing for this piece. Also searched the whole project for a better-quality source photo (none exists — the current file is the only copy, duplicated byte-for-byte in two folders) and flagged that rather than silently keeping a scan with visible artifacts.
- **`venetian-woman`** (אישה ונציאנית מס' 6) — artist-position fix, forced a manual line break before "כך" (the `br`-segment feature), full meta rewrite, then — after initially defending the existing tightly-cropped local JPG as already correct/better quality than the alternative — **swapped to the גריין padded-canvas PNG on explicit request**, first confirming via a pixel bounding-box check that the existing narrow-portrait crop box would land almost exactly on the sculpture with no head/base cutoff. Title line-height tightened last.
- **`paris-graffiti`** (גרפיטי פריזאי) — artist-position fix, bigger image, full meta rewrite, then the blurb widened rightward across **five** successive "a bit more" requests (320→370→420→460→480), ending with a very deliberate ~270px overlap onto the photograph.
- **`athletics`** (אתלטיקה קלה) — bigger image, full meta rewrite; proactively also fixed the same recurring artist/title overlap bug even though not explicitly asked, since every other record this session had the identical defect.

## 6. `about.html` — headline + hover video

- `#ab-eyebrow` ("על המוזיאון") was stacked above the intro paragraph as its own line; moved to the same leading-gap technique already used on `index.html`'s `AboutSection` — a 20-non-breaking-space span at the paragraph's own 59.4px font size reserves room at the start of the first line, and the small eyebrow text is absolutely positioned inside that gap (landed within 2px of true vertical-center against the headline on first try).
- Added a hover video: `public/videos/הכל.mp4` (already present in the project — 42MB, confirmed valid MP4) plays muted/looping/`playsInline` while hovering the "אוספי מוזיאון ישראל" headline link, fading in/out over 300ms, pausing and rewinding to 0 on mouse-leave (via a `wordmarkHovered` state + a `useEffect` driving `.play()`/`.pause()` rather than relying on the `autoplay` attribute, since browsers block that pre-interaction).
- Sized up twice: started at 600×338 sitting to the side, then per request became a full-bleed `left:0; right:0; width:100%` element 900px tall, positioned just below the headline's own line and extending down to just short of the footer.

## Recurring conventions confirmed/established this session

- **Margin convention**: adjacent cards/artworks on the masonry motif pages target a **~2–3 canvas-px gap**, not zero and not a large gap — repeatedly cross-checked against existing precedent pairs (`shahn-shelter`→`manray-lovers` = 3px) rather than picked arbitrarily.
- **Magnet-cluster stacking**: z-order within a hover-triggered cluster is plain DOM order (`CARDS` array position), since every cluster member shares the same `zIndex: 20` when active — "put X in the back" means moving its literal object earlier in the array, not a style change.
- **`artistTop` bug pattern**: any title that wraps to 2 lines at the default 430px width needs an explicit `artistTop`, because the shared default (`350`) is tuned for a 1-line title and sits inside a 2-line title's own span otherwise. Treated as a proactive fix once recognized as systemic, not just reactive per-complaint.
- **Verification loop**: this session leaned on `getBoundingClientRect()` + a canvas-scale factor (`1728 / canvasRect.width`) read via `javascript_exec`, in preference to screenshots — the screenshot tool repeatedly returned stale/mis-scaled captures this session (confirmed via DOM measurement matching expected values while the screenshot showed the old state), so DOM measurement was treated as ground truth and screenshots as a secondary visual sanity check only.
- **Cache busting**: `artworks-data.js` edits often didn't show up on a plain reload; `fetch('artworks-data.js', {cache:'reload'})` immediately before `location.reload(true)` reliably picked up changes.
- **No fabricated museum data** (carried over from 08-02): every accession number, department line, and dimension came from the user directly; unmatched/unknown fields were left alone rather than invented, and image-quality complaints were resolved by searching the actual project folders, never by silently reusing the same file.
