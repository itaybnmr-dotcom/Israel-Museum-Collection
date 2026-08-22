# Iconography Explorer — אוספי מוזיאון ישראל

Reimagining of the Israel Museum collections site, organised by recurring visual
motifs (Warburg-style formal rhymes across time): **מעגל · אנכיות · שער · תנועה · שבר**

---

## Hard rules

1. **Never re-fetch Figma and regenerate a built screen from scratch.** Figma
   extraction is for NEW screens only. On an existing screen, edit the code.
2. **Change the minimum.** Don't restructure containers, rename things, or swap
   layout primitives unless explicitly asked.
3. **Plan before editing.** State which files/elements you'll touch and what
   you'll change. Wait for "go".
4. **Never resize the index images.** `collection-index.html`'s `CARDS` array
   hardcodes `imgW`/`imgH` to the original file dimensions. Any image repair must
   preserve exact dimensions (use edge-pixel extension, not crop+resize).
5. **RTL always.** `dir="rtl"`; logical properties only
   (`insetInlineStart` / `insetInlineEnd`). Never physical `left`/`right`.

---

## Stack

- **Self-contained single-file React + Tailwind, via CDN.** No build step.
  **Node/npm are NOT installed on this machine** — do not suggest npm/Next.js.
- **Babel standalone must be pinned to v7.** Unpinned resolves to v8, which
  defaults to the automatic JSX runtime and throws a syntax error when injected
  as a classic script.
- **Tailwind CDN config must be defined via `tailwind = {config: {...}}` BEFORE
  the CDN script tag loads.**
- Serve locally with `python3 -m http.server` (ports used: 8803 / 8123).

## Files

- `index.html` — home: hero video, wordmark, About section (`#about`)
- `collection-circle.html` — the מעגל motif gallery (primary working file)
- `collection-index.html` — the 107-tile index grid

## Assets

- `public/fonts/` — `TheBasics-*.otf` (display + body, many weights),
  `Masada-Medium.otf` (footer about-copy: weight 500, size 20)
- `public/videos/` — `circle_1.mp4`, `window_1.mp4`, `motion.mp4`, `shard_1.mp4`
  (one per motif; hero still is from `circle_1.mp4`)
- `public/images/index/idx1–107.jpg` — index tiles
- `public/images/wordmark.svg`, `wordmark-blank.svg` — inline SVG, pixel-exact
  vector paths from Figma
- `public/images/collections/` — collection artwork

## Design tokens

- Ink `#28282a` · Background `#fffdfa` · Accent (motif highlight) `#C85A2C`

## Layout system

- **Design canvas is 1728px wide.** `CANVAS_W = "w-[1728px] max-w-full"`.
- `scalePx(px)` converts canvas px → viewport-relative CSS via
  `calc(min(1728px, 100vw) * fraction)`. Use it; don't hardcode px.
- **`CARDS` array**: each card carries its own `x/y/w/h` in Figma canvas
  coordinates, rendered as absolutely-positioned divs. The gallery is
  **freeform, not auto-layout** — spacing is fully determined by each tile's
  individual coordinates. There is no single "gap" value.
- The gallery is a composed asymmetric atlas: varied tile sizes, deliberate
  vertical stagger, non-uniform whitespace. **Never normalise it into a neat
  uniform grid** — the composition is the design.

## Established behaviour (working — don't break)

- **Tile reveal**: `IntersectionObserver`, tiles reveal right-to-left (highest x
  first), ~50ms stagger, gated to scroll-into-view + first-visit-only.
  Functions: `scheduleTileReveal`, `revealTiles`, `checkPendingTiles`,
  `ensureTileScrollBackstop`.
- **Nav handoff**: `sessionStorage` flags `skipIntro` + `scrollToAbout` let the
  אסופות link jump from any page straight to `index.html`'s About section,
  skipping the hero intro zoom. Scroll-spy underline via `useSectionInView`.
- **Gotcha**: `html { scroll-behavior: smooth }` is set globally and fights any
  forced instant `scrollIntoView`. Override
  `document.documentElement.style.scrollBehavior = "auto"` during the jump, then
  restore via double `requestAnimationFrame`.

## Environment gotchas

- **numpy is NOT available.** Image analysis uses PIL 11.3.0 with pure pixel
  loops.
- **ffmpeg is NOT available.** Extract frames from `.mov` via Swift AVFoundation
  (`AVAssetImageGenerator`, `appliesPreferredTrackTransform`).
- Headless Chrome: `--headless=new --disable-gpu`. For CDP, use
  `--remote-debugging-port=9333 --remote-allow-origins=*` (without the latter,
  websockets are rejected 403) and a unique `--user-data-dir` each time.
  Always `pkill -f "remote-debugging-port=9333"` and `rm -rf` the temp profile
  after each round.
- Synthetic JS events do NOT reliably trigger React handlers — use real
  `Input.dispatchMouseEvent` with `type: "mouseMoved"`.
- The index page lazy-loads via IntersectionObserver: a single headless
  screenshot misses tiles below the fold. Use CDP scroll simulation.

## Context discipline (IMPORTANT)

This project is screenshot-heavy and that is what destroys sessions.

- **Run visual verification in a subagent.** It should look at the images and
  report findings in text. Never dump batches of screenshots into the main
  thread.
- **Reference images live on disk** at `public/reference/`. Refer to them by
  path; read one only when needed, once.
- One task per session. `/clear` when the task is done — not when it hurts.
- Prefer `get_metadata` → targeted `get_design_context` over pulling whole
  frames.

---

## Open item

Retake and review `final_check.png` from `localhost:8803/collection-index.html`
and confirm the 16 border-stroke-repaired tiles render cleanly with no
regressions across the grid (watch for lazy-loaded tiles below the fold).

**Repaired (16):** idx2·R, idx3·R, idx4·R, idx6·R, idx8·L, idx18·L+R, idx84·R,
idx104·L, idx14·L, idx20·L, idx29·L, idx35·R, idx78·R, idx81·T, idx86·L, idx97·B

**Do NOT touch (real photo content, not artifacts):** idx7, idx22, idx27, idx31,
idx37, idx43, idx48, idx67, idx72, idx94, idx100, idx103, idx106

Originals backed up:
`~/.claude/jobs/cce592b9/tmp/index_page/stroke_originals_backup/`
