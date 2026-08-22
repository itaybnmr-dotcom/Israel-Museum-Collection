# Element ID Reference Map

Use these IDs when describing what to change. Format: `#id` or just the ID name.

---

## index.html (`ix-` prefix)

| ID | What it is | Notes |
|----|-----------|-------|
| `ix-header-overlay` | Fixed top wrapper (holds nav) | `position: fixed`, `z-30` |
| `ix-nav` | `<nav>` — אסופות · אינדקס · חיפוש · אודות | Root of `TopNav` component |
| `ix-wordmark-overlay` | Fixed bottom wrapper (holds wordmark bar) | `position: fixed`, `z-20` |
| `ix-wordmark-bar` | Wordmark container row | Root of `Wordmark` component; has padding/centering |
| `ix-wordmark-img` | `<img>` of wordmark.svg | The actual logo image |
| `ix-canvas` | Main scrollable content column | Wraps Hero + AboutSection |
| `ix-hero` | Hero block (outer div, full expanded height) | Root of `Hero` component |
| `ix-hero-video` | `<video>` — the hero reel | Starts as thumbnail, expands on hover |
| `about` | `<section>` — About / motif paragraph | Existing scroll-target ID; root of `AboutSection` |
| `ix-about-heading` | `<h2>` — "על האתר" | Fades out on motif hover |
| `ix-about-paragraph` | `<p>` — the full motif sentence | Contains motif links inline |

---

## collection-circle.html (`cc-` prefix)

| ID | What it is | Notes |
|----|-----------|-------|
| `cc-header-overlay` | Fixed top wrapper | Holds nav, motif row, wordmark, filter menu |
| `cc-nav` | `<nav>` — אינדקס · חיפוש · אודות | Root of `TopNav`; "אסופות" is always-underlined here |
| `cc-motif-row` | Motif tag row — מעגל, אנכיות, שער, תנועה, שבר | Root of `MotifTagRow`; מעגל is underlined (current) |
| `cc-filter-menu` | Open filter menu div | Root of open `FilterMenu` state; icon-only state has no stable ID |
| `cc-canvas` | Scrollable canvas (cards + footer) | `position: relative`, `overflow: clip` |
| `cc-circle-video` | Small circle video thumbnail | Top of gallery, next to description |
| `cc-description` | Motif description `<p>` | "מעגל המעגל הוא צורה..." |
| `card-{id}` | Individual artwork card | e.g. `card-adam-sacrificing-animals`, `card-annunciation` |
| `cc-footer-about` | Footer "אודות" link wrapper | |
| `cc-footer-contact` | Footer "יצירת קשר" link wrapper | |
| `cc-footer-paragraph` | Footer about-copy `<p>` | Masada + TheBasics spans |
| `cc-footer-wordmark` | Animated footer wordmark | Root of `AnimatedFooterWordmark` |

### cc card IDs (all artwork cards)

Query in browser console: `document.querySelectorAll('[id^="card-"]')` to list all.

---

## collection-index.html (`ci-` prefix)

| ID | What it is | Notes |
|----|-----------|-------|
| `ci-header-overlay` | Fixed top wrapper | Holds nav, wordmark, view toggle |
| `ci-nav` | `<nav>` — אסופות · אינדקס · חיפוש · אודות | Root of `IndexTopNav`; אינדקס is always-underlined |
| `ci-view-toggle` | Grid/list view toggle | Root of `ViewToggle`; grid is default |
| `ci-canvas` | Scrollable canvas (all 107 tiles + footer) | `overflow: clip` |
| `tile-idx{N}` | Individual index tile | e.g. `tile-idx1` … `tile-idx107` |
| `ci-footer-about` | Footer "אודות" link wrapper | |
| `ci-footer-contact` | Footer "יצירת קשר" link wrapper | |
| `ci-footer-paragraph` | Footer about-copy `<p>` | |
| `ci-footer-wordmark` | Animated footer wordmark | Root of `AnimatedFooterWordmark` |

### ci tile IDs (all 107 index tiles)

`tile-idx1` through `tile-idx107`. Derived from `card.image` path at render time.

---

## Shared / cross-page

| Element | Notes |
|---------|-------|
| `HeaderWordmarkLink` | No stable ID yet — small top-right wordmark on cc/ci pages |
| `NavLink` instances | No IDs — repeated elements; reference by label instead |
| `MotifLink` instances | No IDs — reference by motif label (מעגל, אנכיות, etc.) |
| `RedFilterCard` instances | No IDs — reference by card id + "red-" / "stone-" prefix |
