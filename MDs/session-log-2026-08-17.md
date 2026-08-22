# Session Log — 2026-08-17

**Project:** `/Users/itaybenmayor/figma-israel-museum` — single-file React+Babel museum site. This session worked almost exclusively in `artwork.html` (the per-artwork detail template) and `artworks-data.js` (all 134 artwork records).

This log exists to hand off to a **new chat** continuing the same layout-fix work. Read this before touching anything — it documents formulas, gotchas, and exactly which records are still incomplete.

---

## 1. What this session was

Two phases:

1. **Individual per-artwork layout requests** — user names an artwork, asks for some combination of: bigger title-line-height, `artistTop` nudges, image bigger/repositioned, paragraph (`bodyRight`/`bodyWidth`) nudged left/right, meta info block rewritten from real museum data, dimensions line, tag color fix. Dozens of these, one artwork at a time, always verified live via the browser (never assumed).
2. **A big batch job**: the user gave a list of 61 artwork titles ("do the rest of the pages we haven't touched yet") and asked to (a) apply the same layout conventions established in phase 1 across all of them, and (b) **look up real museum data** for each from `imj.org.il` rather than inventing anything.

**Status of the batch: 45 of 61 done. 16 remain** — see §6.

---

## 2. Established layout conventions (apply these to any new artwork)

### `artistTop` — the recurring overlap bug
Every record with an `artist` field but no explicit `artistTop` has the artist name overlapping the title, because the shared default (350) assumes a 1-line title. **Formula, verified against 37 live-rendered records with zero mispredictions:**

```
artistTop = round(286 + n_title_lines * 74 * (titleLineHeight || 1.05)) + 8
```

- `n_title_lines`: count **unique line-tops** when rendering the title at its real `titleWidth` (default 430) and `titleLineHeight` — do NOT count `getClientRects()` length directly, RTL bidi can split one visual line into multiple rects (bug caught on `venetian-woman`, whose title has a digit "6" in it). Group by `Math.round(top)` instead.
- This is now applied to **all 76 records with an artist** — `noArtistTop` check returns `[]`. If you add a new artist record, or change a title/titleWidth in a way that changes line count, **recompute this**.

### `titleLineHeight`
Default line-height is `1.05`. "Make the line height smaller" always means set `titleLineHeight: 0.95`. This is purely cosmetic but **changes the title's rendered bottom**, so if a record already has `artistTop` set, tightening line-height after the fact requires reducing `artistTop` too (recompute with the formula above, or just nudge it up ~8-10px and re-verify the gap).

### Forcing a title line break
`art.title` supports embedded `\n` — `artwork.html`'s `<h1>` splits on it and inserts `<br/>`. Use this instead of fighting the natural word-wrap. **Gotcha:** canvas `measureText` and even a `white-space:nowrap` probe **without** `letter-spacing:-1.48px` will overestimate real width by 15-20% — always probe with the exact CSS (`font: 500 74px Masada,...; letter-spacing:-1.48px`) or you'll pick a `titleWidth` that's wrong.

When a title's natural minimum-line-width (i.e. its single longest unbreakable line at any reasonable box width) exceeds the safe title-column width, you cannot get a clean non-overlapping 2-line layout — see `nanna-ningal-tablet` for a case where I forced 2 lines anyway per explicit user request, accepting ~130px of text-over-image overlap, and said so.

### `titleWidth` (default 430) and `metaWidth` (default 330)
Both are optional per-record overrides. Before widening either, **check whether the image sits in the same vertical band**:
- If `metaTop`/`title top (286)` falls **within** `[imgTop, imgTop+imgH]`, the image and meta/title share a vertical band — you have a **hard horizontal budget**: max safe width = `1728 - 24 - imageRightEdge`. Many records (`deity-stand`, `building-model`, `axe`) hit this — sometimes there just isn't room to force single-line meta without overlapping the image; when that happens, either leave it wrapped (default) or explicitly ask/tell the user before overlapping.
- If the image is short enough that `metaTop` (default 700) falls **below** `imgTop+imgH`, there's no horizontal constraint at all (e.g. `fish-vessel`, `sickle-handle`) — widen freely.
- Always verify the *real* rendered width, not canvas `measureText` (same caveat as above, using the meta font: `500 20px TheBasics,...`, no letter-spacing needed there, but still verify).

### `bodyRight` / `bodyWidth` (the paragraph column)
No override → derived: `bodyRight = round(864 - imgW/2) + 21`, `bodyWidth = min(470, bodyRight - 24)`, i.e. left edge pinned at `24` (the page's `GUTTER`). This is the "default overlap" (~21px into the image, the site's own `BLURB_OVERLAP` convention).

Vocabulary this session settled on for paragraph-position requests (all confirmed against live measurement every time):
- **"expand/take/narrow ... to the right"** → increase `bodyRight` (right edge grows/moves right), width grows, left usually stays pinned at 24.
- **"narrow ... to the left"** → increase left edge by shrinking `bodyWidth`, **keep `bodyRight` fixed** (pulls left edge in, right edge stays).
- **"take/move/push ... to the left"** → shift both edges left by the same delta (width unchanged). **If left is already at the 24px gutter minimum**, this isn't literally possible — the practical equivalent used throughout was reducing `bodyRight` by the delta while width shrinks and left stays at 24 (i.e. narrowing from the right instead).
- **"narrow ... to the right"** → keep left edge fixed, pull `bodyRight` in (width shrinks from the right).
- Iterative "more" / "a bit more" always means repeat the last operation's direction by roughly the same increment (~20-30 canvas px).
- `imgW` growing on a record with **no explicit `bodyRight`/`bodyWidth`** silently changes the paragraph's derived position (it re-centers on the new smaller/larger image gap). If the user says "make image bigger, don't move the text," **pin `bodyRight`/`bodyWidth` to their pre-growth derived values explicitly** before growing the image (done on `jericho-first`).

### `imgOffsetX` — new field, added this session
`artwork.html`'s image wrapper originally always centered via `left:"50%"`. Added optional `art.imgOffsetX` (canvas px, +right/-left) so an image can be shifted off-center without affecting any other record (defaults to centered everywhere else it's unset). Used on `sickle-handle`.

### `imgTop` — hard ceiling from the fixed header nav
The site header (`#aw-header-overlay`) is `position:fixed`, spans real canvas y≈19–79, and sits at `z-30` (above the canvas content). An image pulled up past `imgTop≈70` (real y≈80) starts sitting *behind* the nav; past `imgTop≈0` it starts clipping off the top of the *viewport itself* (not just the nav) since the canvas has no more room to scroll up. Tested and confirmed both failure modes live on `jericho-first` — got explicit user sign-off before leaving it clipped/overlapping. **Always screenshot-check before committing an aggressive `imgTop` reduction.**

### `navSize` / `navSizeRight` / `navWidth` / `navGutterRight` — new fields, added this session
The prev/next nav thumbnails (`NeighbourLink` in `artwork.html`) previously only supported a shared height override (`navSize`/`navSizeRight`, pre-existing). This session added:
- `thumbW` prop / `art.navWidth` — fixes the thumbnail width regardless of the neighbor's own aspect ratio (previously `w = h * imgW/imgH`, which made e.g. a very-tall-aspect neighbor render a bizarrely narrow/wide thumbnail). Used on `khamar` (both thumbnails forced to 100×100 square, `objectFit:cover` crops).
- `gutter` prop / `art.navGutterRight` — overrides the default 24px edge-margin for just the right-side thumbnail. Used on `khamar` to push it closer to the canvas edge.
Both default to prior behavior everywhere else (aspect-derived width, 24px gutter) — fully backward compatible.

### `rotateImage` — pre-existing field, wired into `artwork.html` this session
`collection-gate.html` and `collection-index.html` already had `rotateImage`/`previewTransform: rotate(-90deg)` on `manray-lovers` (its source photo is stored rotated). `artwork.html` didn't support it at all — added support to both the main image and `NeighbourLink` thumbnails (wraps in an `overflow:hidden` box, swaps width/height pre-rotation, `objectFit:cover`). If you find another record whose image looks wrong-oriented, check its `collection-*.html` sibling entries for an existing `rotateImage` value before assuming the file itself is wrong — that's literally how `manray-lovers` was diagnosed (compare pixel-measured content bounding box against a raw rotation test with PIL to confirm orientation before touching anything).

### `dimensions` as an array (measured records only)
A few older "measured" records (e.g. `calf-temple`) use `dimensions: [{t,u},{br:true},...]` (segments, supports underline + manual `<br/>`) instead of a plain string. Don't clobber that shape — check the existing type before overwriting.

---

## 3. Sourcing real museum data — the technique

**WebFetch does not work** on `imj.org.il` — it's a client-rendered SPA, WebFetch returns an empty shell. **Must use the actual browser tool** (`mcp__Claude_Browser__*`), which executes JS.

### The reliable path: artist index pages
`https://www.imj.org.il/en/artistec/<slug>` lists every work by that artist, and — even though the visible links are just share buttons — you can scrape `title :: node-id` pairs out of the `href`s (`facebook.com/sharer?u=.../collections/<id>&title=<title>`, `twitter.com/intent/tweet?status=<title>+https://.../collections/<id>`, etc.) via a single `javascript_exec` per artist. Slugs are usually `firstname-lastname`, sometimes need a WebSearch first to confirm (e.g. `arman-armand-fernandez`, not `arman`).

Once you have the node id, load `https://www.imj.org.il/he/collections/<id>` (Hebrew version — **this is the actual source of truth for department-line wording** like `אמנויות/אמנות מודרנית` with no spaces around the slash, and for which accession-label the object uses) and extract via `.field-name-*` selectors:
- `.field-name-field-biographicaldatae` — nationality/bio line
- `.field-name-field-periodoryear` — date
- `.field-name-field-materialtechniqueec` — material (for design objects, this field annoyingly **concatenates the manufacturer line in front** — strip it, e.g. `pastilli-chair` had `"תוצרת אסקו בע״מ, להטי, פינלנד, 1972פוליאסטר משוריין..."`, kept only the material)
- `.field-name-field-dimensionsec-` — dimensions (sometimes absent — object has none on record; don't invent)
- `.field-name-field-regnume` — accession number (**label varies**: `מס' רישום`, `מס' סידורי`, `IAA:` — regex `/(מס['׳]\s*רישום|מס['׳]\s*סידורי|IAA)\s*:/ ` finds which one)
- Department line: regex against `document.body.textContent` for `/(?:אמנויות|אומנויות|ארכאולוגיה|אמנות ותרבות יהודית)\s*\/\s*.../ `
- For anonymous archaeology objects (no artist): origin is `.field-name-field-place-name`, IAA number is `.field-name-field-iaae`. Found this on `hazor-gate`.

**For a record with no artist**, there's no index page — fall back to `WebSearch` with `allowed_domains: ["imj.org.il"]` and the Hebrew title in quotes. Hit rate is much lower (maybe 40%) and many searches return zero usable direct links — this is expected, not a sign to keep retrying the same query differently.

### A `python3 apply_meta.py payload.json` helper was built
At `/private/tmp/.../scratchpad/apply_meta.py` (session-scratchpad path, **won't persist to a new session** — rewrite it if useful, it's ~50 lines, takes `{id: {meta:[...], dims:"raw string"}}` and regex-splices `artworks-data.js` by record id boundaries). Useful for batching 4-5 records per edit instead of one Edit-tool call each. Always re-verify via the live browser after running it (it did work correctly every time it was used, but it's blunt regex, not a real parser).

### Corrections this surfaced (real data was often wrong before)
Several records had materially incorrect dimensions/dates/materials before this session touched them — e.g. `arman-tribute` was 130×25×25cm in the file, actually 375×120×120cm; `radio-tower` was 33.5×26.5, actually 16.7×11.7; `beheaded-sun`'s dims were mm mislabeled as cm (627×940 "ס״מ" → actually 62.7×94cm); `shahn-shelter`'s artist bio said "born Lithuania," actually born Russia. **Don't assume existing data is right just because it's already in the file** — this whole exercise was prompted by that not being safe to assume.

---

## 4. Content mismatches flagged, not fixed (per user's own precedent this session)

Project convention (confirmed repeatedly): when new museum-sourced `meta`/`tags` data contradicts the artwork's own body-copy prose (e.g. new material says "bronze" but the prose still says "stone"), **update only what was explicitly asked** (meta/tags), leave body copy alone, and **flag the contradiction in the chat response**. Never silently rewrite prose. Still-open flags from this session, in case the next session is asked to reconcile them:

- `pomegranate-bottle` — meta says glass (`זכוכית חומה`), body/tag say ceramic (`חרס`/`קרמיקה`)
- `axe` — meta says bronze, body says stone axe-head
- `khamar` — meta says bronze, body says stone sculpture
- `venus-restored` — now tag `אבן` (stone) per user request but material line says plaster/rope (`גבס וחבל`) — this one might actually be fine, flagged for awareness only
- `fish-vessel` — meta says clay (`חרס`), body says carved stone object
- `jericho-first` — meta says acrylic on canvas, body still describes it as a video installation

## 5. Known wrapped-meta compromises left as-is (image too close for single-line)

These have long meta lines that wrap to 2 lines because widening `metaWidth` would overlap the image (see §2 budget rule) — left wrapped, not fixed, flagged to user each time:
- `building-model` — department line wraps
- `deity-stand` — two lines wrap (image was grown repeatedly this session, shrinking the safe budget to ~295px)
- `tomb-inscription` — department line wraps

---

## 6. Remaining work — 16 of the original 61-title batch list not yet done

No layout work, no museum lookup, done for these yet:

```
warriors-tablet       לוחית המתארת שורת לוחמים
acrobat-drum          לוליין עומד על ידיו על תוף
ben-maglos-stele      מצבת בן מגלוס
surreal-landscape     נוף סוראליסטי  (artist: וילהלם ביירק-פטרסון — "wilhelm-bjerke-petersen" artist-index slug returned nothing, needs a different slug or WebSearch)
tree-landscape        נוף עם עץ  (artist: יעקב שטיינהרט — "jacob-steinhardt" slug also returned nothing, retry)
jaguar-mask           מסכת חזה בדמות צדודית
engraved-plate        צלחת ועליה מגולפים סמלים
tumi-knife            סכין טומי טקסית
mosaic-bowl-rim       שבר שפה של קערת זכוכית פסיפס
two-women-mural       ציור קיר המתאר שתי נשים
figure-inlays         קטעים לשיבוץ בצורת דמויות
atget-hotel           מלון ד׳ארגוז׳, רחוב סגייה 16  (artist IS findable — eugene-atget artist page returned 10+ works, just never picked the matching one and applied it — pick up here first, easy win)
sphinx-tablet         שבר לוחית בצורת ספינקס
guardsman-relief      שבר תבליט המתאר שומר ראש
athena-intaglio       תגליף המתאר את אתנה  (has 4 meta rows already, not 2 — just needs verification against source + possibly a 5th row, not a from-scratch job)
ancient-mold-modern-figurine   תבנית עתיקה וצלמית מודרנית
```

All 16 are anonymous-artist archaeological/craft objects except `surreal-landscape`, `tree-landscape`, and `atget-hotel` (which do have artists — start there, the artist-index technique should work once the right slug is found).

None of these have had any layout work done either (no `artistTop` check needed for the anonymous ones; the 3 artist ones — verify `artistTop` per §2 formula once their titles/content are finalized, in case title line-count changes).

---

## 7. Environment gotchas hit this session

- **The local `python3 -m http.server 8803` dev server kept dying between turns** (background process not surviving). Symptom: `preview_start`/`navigate` returns `navOk: false` or a `chrome-error://` page. Fix: `nohup python3 -m http.server 8803 --directory /Users/itaybenmayor/figma-israel-museum > /tmp/http8803.log 2>&1 & disown`, then retry navigation. Happened ~4 times this session — check for it first if a page won't load rather than assuming a code error.
- **`artworks-data.js` edits need a hard cache-bust to show up**: `fetch('artworks-data.js', {cache:'reload'}).then(()=>location.reload(true))` in the browser console before checking anything, every time. A plain reload silently serves the stale cached JS.
- **Non-breaking space (`\xa0`) vs regular space**: `about.html`'s intro paragraph uses `"\xa0".repeat(20)` for a layout gap — a plain-text Edit `old_string` match with a normal space silently fails (no error, just "string not found"). If an Edit call fails against a string you can clearly see in a Read, suspect an invisible non-breaking space and check with `python3 -c "print(repr(open(path,encoding='utf-8').readlines()[N]))"`.
- **`getClientRects()` on an RTL text node can return more rects than visual lines** — a digit or Latin substring inside Hebrew text creates a bidi run boundary. Always group by `Math.round(top)` to get the true line count, never trust `rects.length` directly.
