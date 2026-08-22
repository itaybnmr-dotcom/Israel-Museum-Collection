const {
  useState,
  useRef,
  useEffect
} = React;

// Applied via inline style, not a Tailwind class — see the note by the
// <script src=".../tailwindcss.com"> tag for why a font-masada-style
// utility class silently wouldn't have worked here.
const FONT_THEBASICS = "TheBasics, \"Segoe UI\", Arial, sans-serif"; // big display + nav copy

// Shared underline geometry for every hoverable word (nav links + motif
// links in the paragraph) — native text-decoration (not a manually
// positioned span) so text-decoration-skip-ink can do its job: Hebrew
// letters like ק have a descender that dips below the baseline, and
// without skip-ink the underline just draws straight through it.
// UNDERLINE_OFFSET is the same tight distance below the baseline the old
// span was hand-calibrated to sit at.
const UNDERLINE_OFFSET = "0.08em";
const UNDERLINE_THICKNESS = "0.1em";
const NAV_ITEMS = [{
  label: "אסופות",
  href: "#about"
}, {
  label: "אינדקס",
  href: "collection-index.html"
}, {
  label: "חיפוש",
  href: "#search"
}, {
  label: "אודות",
  href: "about.html"
}];

// Icon dimensions are each icon's real px size at the design's 59px paragraph
// size (pulled from the original Figma node metadata) — not a uniform em-scaled guess.
// Order matches the paragraph reading order: מעגל, אנכיות, שער, תנועה, שבר.
// previewW/previewH are each motif's own reference-mockup box size (not a
// uniform tooltip) — measured off the reference screenshots, where every
// motif's preview has a distinct size/aspect matching its own artwork.
const MOTIFS = [
// מעגל is the first motif in the paragraph, near the start of the line —
// its reference mockup opens the preview to the OPPOSITE side (right)
// of the word from every other motif, hence previewSide.
{
  label: "מעגל",
  icon: "icon-circle.svg",
  iconW: 43,
  iconH: 42,
  video: "public/videos/circle_1.mp4",
  previewW: 660,
  previewH: 370,
  previewSide: "end",
  href: "collection-circle.html"
}, {
  label: "אנכיות",
  icon: "icon-verticality.svg",
  iconW: 36,
  iconH: 37,
  video: "public/videos/vertical.mp4",
  previewW: 375,
  previewH: 660,
  href: "collection-verticality.html"
}, {
  label: "שער",
  icon: "icon-gate.svg",
  iconW: 34,
  iconH: 37,
  video: "public/videos/window_1.mp4",
  previewW: 490,
  previewH: 635,
  href: "collection-gate.html"
}, {
  label: "תנועה",
  icon: "icon-motion.svg",
  iconW: 38,
  iconH: 38,
  video: "public/videos/motion.mp4",
  previewW: 800,
  previewH: 450,
  href: "collection-motion.html"
}, {
  label: "שבר",
  icon: "icon-fragment.svg",
  iconW: 39,
  iconH: 39,
  video: "public/videos/shard_1.mp4",
  previewW: 590,
  previewH: 510,
  href: "collection-shard.html"
}];

// The hero (see Hero) picks randomly from this list rather than from
// MOTIFS directly, because MOTIFS[1]'s video (vertical.mp4) is natively
// 9:16 portrait — right for its own preview box above, which is sized
// to match, but it crops far too aggressively under the hero's full-
// bleed 16:9 object-cover treatment. vertical_landscape.mp4 is the same
// footage exported rotated 90° to landscape (same content, nothing
// cropped, just laid on its side) specifically for use here.
const HERO_VIDEOS = [MOTIFS[0].video, "public/videos/vertical_landscape.mp4", MOTIFS[2].video, MOTIFS[3].video, MOTIFS[4].video];

// The visible word itself never has a text-decoration — the underline
// only exists on a see-through DUPLICATE stacked on top of it (same
// text, color: transparent, so only ITS text-decoration paints, with
// skip-ink breaking it around descenders like ק). That duplicate is
// clip-path'd down to nothing by default and revealed on hover — clip-
// path was chosen specifically because it clips to true transparency,
// unlike the previous attempt (a page-colored rectangle painted OVER the
// underline to hide it), which showed up as a wrong-colored stripe
// whenever the nav sat over the video instead of the cream page bg.
//
// clip-path has one wrinkle scaleX+transform never did: it "remembers"
// where it collapsed to. A plain transform collapses to nothing at
// scale 0 regardless of transform-origin, so the original bar-based
// underline could flip origin freely and always grow from the right. An
// inset() that's collapsed at the LEFT edge (post wipe-away) is a
// different value than one collapsed at the RIGHT edge (initial), so
// re-entering without resetting would grow from whichever side it last
// collapsed to. resetKey forces a fresh remount collapsed at the right
// before every hover-in (a freshly mounted element doesn't animate its
// own initial style, so this snap is invisible), then a doubled
// requestAnimationFrame — to guarantee the browser has actually painted
// that reset before the next change — flips it to fully visible, so the
// grow-in transition always has the right starting point to animate from.
function NavLink({
  label,
  href,
  active,
  onClick
}) {
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);
  const [origin, setOrigin] = useState("right");
  const [resetKey, setResetKey] = useState(0);
  const rafIds = useRef([]);
  // active !== undefined means this link's underline can also be
  // externally controlled (e.g. TopNav's scroll-spy on "אסופות") —
  // hover always works regardless.
  const isControlled = active !== undefined;
  function clearRafs() {
    rafIds.current.forEach(id => cancelAnimationFrame(id));
    rafIds.current = [];
  }
  function open() {
    clearRafs();
    setOrigin("right");
    setVisible(false);
    setResetKey(k => k + 1);
    rafIds.current.push(requestAnimationFrame(() => {
      rafIds.current.push(requestAnimationFrame(() => setVisible(true)));
    }));
  }
  function close() {
    clearRafs();
    setOrigin("left");
    setVisible(false);
  }

  // For scroll-spy controlled links: open when active OR hovered;
  // close only when neither. For plain links: hover drives directly.
  useEffect(() => {
    if (!isControlled) return;
    if (active || hovered) open();else close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isControlled, active, hovered]);

  // Visible: nothing clipped. Hidden: collapsed at whichever edge it
  // should grow from (right, fresh) or wipe to (left, after a hover).
  const clipPath = visible ? "inset(0 0 0 0)" : origin === "right" ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)";
  return /*#__PURE__*/React.createElement("a", {
    href: href,
    onClick: onClick,
    onMouseEnter: isControlled ? () => setHovered(true) : open,
    onMouseLeave: isControlled ? () => setHovered(false) : close,
    onFocus: isControlled ? () => setHovered(true) : open,
    onBlur: isControlled ? () => setHovered(false) : close,
    className: "relative inline-block text-[#28282a] font-medium",
    style: {
      textDecoration: "none"
    }
  }, label, /*#__PURE__*/React.createElement("span", {
    key: resetKey,
    "aria-hidden": "true",
    className: "absolute inset-0 pointer-events-none",
    style: {
      color: "transparent",
      textDecorationLine: "underline",
      textDecorationColor: "#28282a",
      textDecorationThickness: UNDERLINE_THICKNESS,
      textUnderlineOffset: UNDERLINE_OFFSET,
      textDecorationSkipInk: "auto",
      clipPath,
      transition: "clip-path 0.16s ease"
    }
  }, label));
}
function TopNav({
  className = "",
  dir = "rtl",
  style,
  hidden = false,
  aboutActive,
  onSearchToggle
}) {
  return /*#__PURE__*/React.createElement("nav", {
    id: "ix-nav",
    className: "flex items-center gap-5 text-[20px] tracking-[0.2px] " + (hidden ? "opacity-0 pointer-events-none " : "opacity-100 ") + className,
    dir: dir,
    style: {
      fontFamily: FONT_THEBASICS,
      ...style
    }
  }, NAV_ITEMS.map(item => /*#__PURE__*/React.createElement(NavLink, {
    key: item.label,
    label: item.label,
    href: item.href
    // Only "אסופות" tracks the About section's scroll-spy state
    // (see App's useSectionInView) — every other item stays plain
    // hover-only, so this prop is left undefined for them.
    ,
    active: item.label === "אסופות" ? aboutActive : undefined
    // "חיפוש" doesn't navigate — it toggles the search bar (see
    // SearchBar/App). stopPropagation keeps this same click from
    // also being seen by SearchBar's document-level away-listener,
    // which would otherwise immediately close what this just opened.
    ,
    onClick: item.label === "חיפוש" ? e => {
      e.preventDefault();
      e.stopPropagation();
      onSearchToggle();
    } : undefined
  })));
}
const SEARCH_FADE_MS = 180;
const SEARCH_PLACEHOLDER = "חפש.י לפי אסופה, יצירה או יוצר.ת...";
const SEARCH_MAX_RESULTS = 8;
const CARET_BLINK_MS = 530;

// Matching lives in search-engine.js so this dropdown and the full results
// page (search.html) can never disagree about what a query means. It
// returns the complete list; the dropdown shows the first
// SEARCH_MAX_RESULTS and links the rest through to search.html.
function searchArtworks(query) {
  return window.MuseumSearch.run(query).results;
}
function SearchBar({
  open,
  onClose
}) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");
  const rafIds = useRef([]);
  const closeTimer = useRef(null);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const allResults = searchArtworks(query);
  const results = allResults.slice(0, SEARCH_MAX_RESULTS);
  function goToResult(art) {
    window.location.href = "artwork.html?id=" + art.id;
  }

  // Fake caret matching the stroke's own weight (scalePx(4)) — the real
  // <input> keeps native focus/selection/typing, but its own caret is
  // hidden (caret-color: transparent) since browsers don't expose a way
  // to make that thin native bar match our 4px line. This bar is
  // repositioned by measuring the pre-cursor substring on a scratch
  // canvas (matching the input's own live computed font), same
  // measure-in-browser technique used throughout this file for text
  // fitting — cheap enough to run on every keystroke.
  const [caretOffset, setCaretOffset] = useState(0);
  const [caretOn, setCaretOn] = useState(true);
  const [caretFocused, setCaretFocused] = useState(false);
  const measureCtxRef = useRef(null);
  const blinkTimerRef = useRef(null);
  function measureCaret() {
    const el = inputRef.current;
    if (!el) return;
    if (!measureCtxRef.current) measureCtxRef.current = document.createElement("canvas").getContext("2d");
    const cs = getComputedStyle(el);
    measureCtxRef.current.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const pos = el.selectionStart == null ? el.value.length : el.selectionStart;
    setCaretOffset(measureCtxRef.current.measureText(el.value.slice(0, pos)).width);
  }
  function restartBlink() {
    setCaretOn(true);
    clearInterval(blinkTimerRef.current);
    blinkTimerRef.current = setInterval(() => setCaretOn(v => !v), CARET_BLINK_MS);
  }
  useEffect(() => {
    if (!caretFocused) {
      clearInterval(blinkTimerRef.current);
      return;
    }
    restartBlink();
    return () => clearInterval(blinkTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caretFocused]);
  useEffect(() => {
    rafIds.current.forEach(id => cancelAnimationFrame(id));
    rafIds.current = [];
    clearTimeout(closeTimer.current);
    if (open) {
      setMounted(true);
      setVisible(false);
      rafIds.current.push(requestAnimationFrame(() => {
        rafIds.current.push(requestAnimationFrame(() => setVisible(true)));
      }));
    } else if (mounted) {
      setVisible(false);
      setQuery("");
      if (inputRef.current) inputRef.current.value = "";
      closeTimer.current = setTimeout(() => setMounted(false), SEARCH_FADE_MS);
    }
    return () => {
      rafIds.current.forEach(id => cancelAnimationFrame(id));
      rafIds.current = [];
      clearTimeout(closeTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(() => {
    if (open && visible && inputRef.current) inputRef.current.focus();
  }, [open, visible]);

  // Click-away and Escape both close it. This listens on "click" (not
  // "mousedown") specifically so the toggle's own stopPropagation — fired
  // during the same click event — can suppress it; a mousedown listener
  // would fire on a different, earlier event and miss that suppression.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) onClose();
    }
    function onKeyDown(e) {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter") {
        // Enter goes to the full results list rather than jumping straight
        // into the top hit — a query like "אדום" has 27 matches and the
        // dropdown only ever shows 8 of them.
        window.location.href = window.MuseumSearch.urlFor(inputRef.current ? inputRef.current.value : "");
      }
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);
  if (!mounted) return null;
  return /*#__PURE__*/React.createElement("div", {
    ref: wrapperRef,
    className: "absolute pointer-events-auto",
    style: {
      left: 0,
      right: 0,
      top: scalePx(0),
      height: scalePx(70),
      zIndex: 50,
      backgroundColor: "#fffdfa",
      opacity: visible ? 1 : 0,
      transition: `opacity ${SEARCH_FADE_MS}ms ease`
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute",
    style: {
      left: 0,
      right: 0,
      top: scalePx(66),
      borderBottom: `${scalePx(4)} solid #28282a`
    }
  }), /*#__PURE__*/React.createElement("input", {
    ref: inputRef,
    type: "text",
    dir: "rtl",
    placeholder: SEARCH_PLACEHOLDER,
    className: "absolute bg-transparent outline-none text-right placeholder:text-[#28282a]",
    style: {
      right: scalePx(15),
      left: scalePx(15),
      top: scalePx(10),
      height: scalePx(56),
      fontFamily: FONT_THEBASICS,
      fontWeight: 500,
      fontSize: scalePx(58),
      lineHeight: 1.21,
      color: "#28282a",
      caretColor: "transparent"
    },
    onFocus: () => {
      setCaretFocused(true);
      setQuery(inputRef.current.value);
      measureCaret();
      restartBlink();
    },
    onBlur: () => setCaretFocused(false),
    onInput: e => {
      setQuery(e.target.value);
      measureCaret();
      restartBlink();
    },
    onKeyUp: () => {
      measureCaret();
      restartBlink();
    },
    onClick: () => {
      measureCaret();
      restartBlink();
    }
  }), caretFocused && query && /*#__PURE__*/React.createElement("div", {
    className: "absolute pointer-events-none",
    style: {
      right: `calc(${scalePx(15)} + ${caretOffset}px)`,
      top: scalePx(8),
      height: scalePx(48),
      width: scalePx(4),
      backgroundColor: "#28282a",
      opacity: caretOn ? 1 : 0
    }
  }), query.trim() && /*#__PURE__*/React.createElement("div", {
    className: "absolute",
    style: {
      left: 0,
      right: 0,
      top: scalePx(70),
      backgroundColor: "#fffdfa"
    }
  }, results.length === 0 ? /*#__PURE__*/React.createElement("div", {
    dir: "rtl",
    className: "text-right",
    style: {
      padding: `${scalePx(18)} ${scalePx(15)}`,
      fontFamily: FONT_THEBASICS,
      fontSize: scalePx(20),
      color: "rgba(40, 40, 42, 0.6)"
    }
  }, "אין תוצאות") : results.map((art, i) => /*#__PURE__*/React.createElement("div", {
    key: art.id,
    dir: "rtl",
    onClick: () => goToResult(art),
    className: "flex items-baseline justify-between cursor-pointer",
    style: {
      padding: `${scalePx(14)} ${scalePx(15)}`,
      borderBottom: i < results.length - 1 || allResults.length > results.length ? "1px solid rgba(40, 40, 42, 0.2)" : "none",
      fontFamily: FONT_THEBASICS
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 500,
      fontSize: scalePx(22)
    }
  }, art.title, art.artist && /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 400,
      color: "rgba(40, 40, 42, 0.6)"
    }
  }, " ", art.artist)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: scalePx(16),
      color: "rgba(40, 40, 42, 0.5)",
      flexShrink: 0,
      marginInlineStart: scalePx(12)
    }
  }, art.motif))), allResults.length > results.length && /*#__PURE__*/React.createElement("div", {
    dir: "rtl",
    onClick: () => {
      window.location.href = window.MuseumSearch.urlFor(query);
    },
    className: "text-right cursor-pointer",
    style: {
      padding: `${scalePx(14)} ${scalePx(15)}`,
      fontFamily: FONT_THEBASICS,
      fontSize: scalePx(20),
      color: "rgba(40, 40, 42, 0.6)"
    }
  }, `כל התוצאות (${allResults.length})`)));
}

// Hero plays a randomly-picked one of HERO_VIDEOS each time the page
// loads (see heroVideo below) — confirmed against the reference
// recording that hovering a motif word does NOT touch the hero; it opens
// a small floating preview next to the word instead (see MotifLink), so
// this random pick is independent of that hover interaction. object-
// cover, full width, no side bars once expanded — per the reference,
// the video must eventually span the full canvas width edge to edge.
// heroVideoH is circle_1.mp4's true native 16:9 height at this width;
// every entry in HERO_VIDEOS shares that same 16:9 landscape framing
// (see HERO_VIDEOS' own comment for why the verticality reel needed a
// separate landscape export just for use here). The wordmark is NOT
// rendered here any more — see App, it's a
// fixed viewport overlay (like the nav) so it can stay sticky on screen
// instead of scrolling away with this hero block.
//
// Starts paused on a random frame of the reel (so it doesn't always
// open on the same shot) as a small centered thumbnail (matching the
// video's own native aspect ratio, so nothing is cropped while small).
// Hovering (or tapping, for touch) it expands to the full hero geometry
// AND resumes playback (from that same random point) at the same
// moment — see App's onExpand. The outer div is always sized to the
// FULL expanded height even before that happens, so the rest of the
// page's layout never jumps when it expands; only the video's own box
// animates.
function Hero({
  started,
  onExpand,
  presetVideo
}) {
  // Lazy initializer so this only runs once, on mount — picks a fresh
  // random motif reel each time the page loads, rather than re-rolling
  // on every re-render (e.g. from activeMotif changing elsewhere).
  // presetVideo (from App's skipIntro arrival flow) overrides the random
  // pick with whichever reel was already showing in the wordmark's
  // full-screen hover on collection-circle.html, so the fade-in lands on
  // the same footage instead of cutting to an unrelated one.
  const [heroVideo] = useState(() => presetVideo || HERO_VIDEOS[Math.floor(Math.random() * HERO_VIDEOS.length)]);
  const videoRef = useRef(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onLoadedMetadata = () => {
      video.currentTime = Math.random() * video.duration;
    };
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    return () => video.removeEventListener("loadedmetadata", onLoadedMetadata);
  }, []);
  useEffect(() => {
    if (started) videoRef.current?.play();
  }, [started]);
  const thumbW = scalePx(HERO_THUMB_W);
  const thumbH = `calc(${scalePx(HERO_THUMB_W)} * 9 / 16)`;
  const geometry = started ? {
    top: `${HERO_TOP_GAP}px`,
    left: "0px",
    width: "100%",
    height: heroVideoH()
  } : {
    top: `calc(50vh - (${thumbH}) / 2)`,
    left: `calc(50% - (${thumbW}) / 2)`,
    width: thumbW,
    height: thumbH
  };
  return /*#__PURE__*/React.createElement("div", {
    id: "ix-hero",
    className: "relative w-full bg-[#fffdfa]",
    style: {
      height: `calc(${HERO_TOP_GAP}px + ${heroVideoH()})`
    }
  }, /*#__PURE__*/React.createElement("video", {
    id: "ix-hero-video",
    ref: videoRef,
    src: heroVideo,
    loop: true,
    muted: true,
    playsInline: true,
    onMouseMove: started ? undefined : onExpand,
    onClick: started ? undefined : onExpand,
    className: "absolute object-cover",
    style: {
      ...geometry,
      cursor: started ? "auto" : "pointer",
      transition: `top ${HERO_EXPAND_MS}ms ease, left ${HERO_EXPAND_MS}ms ease, width ${HERO_EXPAND_MS}ms ease, height ${HERO_EXPAND_MS}ms ease`
    }
  }));
}

// Sits in normal document flow between the hero and the paragraph, but
// its wrapper in App is a fixed overlay (see App) — same fixed-overlay
// pattern as TopNav, so it sits on top of the hero video in the first
// frame and then stays sticky in that same spot as the user scrolls
// through the rest of the page, rather than scrolling away with the
// hero.
// Width AND height are both explicit scalePx values (not width + auto
// height via aspectRatio, which used to derive height from a width that
// could itself come from the wrong reference and squash the logo).
// Explicit width+height (rather than aspectRatio) keeps the 1622:165
// ratio (the source SVG's own viewBox — its root has
// preserveAspectRatio="none", so without forcing the ratio explicitly it
// would stretch/squash).
function Wordmark({
  className = "",
  revealed
}) {
  // revealed comes from App: true once shortly after the hero finishes
  // expanding (see Hero's onExpand / POST_EXPAND_DELAY_MS), fading in
  // together with the nav and paragraph.
  //
  // hasRisen latches true the first time it's revealed and never resets
  // — so the rise (translateY) only ever plays once, on that first
  // reveal. A plain opacity fade with no vertical movement handles
  // every case after that; without this, fading out would visibly sink
  // the line back down by FADE_UP_RISE_PX, which reads as an unwanted
  // "falling" motion rather than a clean fade. (In the current design
  // revealed never goes back to false, so this mostly guards against
  // that being added back later.)
  const [hasRisen, setHasRisen] = useState(false);
  useEffect(() => {
    if (revealed) setHasRisen(true);
  }, [revealed]);
  return /*#__PURE__*/React.createElement("div", {
    id: "ix-wordmark-bar",
    className: "w-full flex justify-center " + className,
    style: {
      paddingTop: scalePx(WORDMARK_TOP_GAP),
      paddingBottom: scalePx(WORDMARK_BOTTOM_PAD),
      paddingInline: scalePx(53)
    }
  }, /*#__PURE__*/React.createElement("img", {
    id: "ix-wordmark-img",
    src: "public/images/wordmark.svg",
    alt: "אוספי מוזיאון ישראל",
    style: {
      width: scalePx(1622),
      height: scalePx(165),
      opacity: revealed ? 1 : 0,
      transform: `translateY(${hasRisen ? 0 : FADE_UP_RISE_PX}px)`,
      transition: `opacity ${WORDMARK_FADE_MS}ms ease, transform ${WORDMARK_FADE_MS}ms ease`
    }
  }));
}

// Matches the reference recording: hovering/focusing a motif word opens a
// floating video preview right beside it (top-aligned with the word,
// sitting just past its inline-end edge — i.e. visually to the word's
// left under dir="rtl" — per the reference mockups, not stacked high
// above it), while every OTHER piece of
// paragraph text — plain copy and the other four motif links alike, plus
// the nav and "על האתר" heading (see App/AboutSection) — disappears.
// Layout never reflows: fading is opacity-only, so the hovered word stays
// exactly where it sat in the sentence. The preview itself is NOT
// animated — no transition, no drop shadow — it should snap in/out
// instantly, so it's only in the DOM at all while isActive is true.
function MotifLink({
  label,
  icon,
  iconW,
  iconH,
  video,
  previewW,
  previewH,
  previewSide = "start",
  href = "#collections",
  isActive,
  isDimmed,
  onHover,
  onLeave
}) {
  const previewPos = previewSide === "end" ? {
    insetInlineEnd: "100%",
    marginInlineEnd: "24px"
  } : {
    insetInlineStart: "100%",
    marginInlineStart: "24px"
  };
  return /*#__PURE__*/React.createElement("a", {
    href: href,
    onMouseEnter: () => onHover(label),
    onMouseLeave: onLeave,
    onFocus: () => onHover(label),
    onBlur: onLeave,
    className: "relative inline-flex items-center gap-2 align-middle " + (isDimmed ? " opacity-0 pointer-events-none" : " opacity-100")
  }, /*#__PURE__*/React.createElement("img", {
    src: `public/images/${icon}`,
    alt: "",
    style: {
      width: iconW,
      height: iconH
    },
    className: "inline-block shrink-0"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      textDecorationLine: "underline",
      textDecorationColor: "currentColor",
      textDecorationThickness: UNDERLINE_THICKNESS,
      textUnderlineOffset: UNDERLINE_OFFSET,
      textDecorationSkipInk: "auto"
    }
  }, label), isActive && /*#__PURE__*/React.createElement("span", {
    className: "absolute overflow-hidden bg-[#28282a]/5 pointer-events-none",
    style: {
      ...previewPos,
      top: 0,
      width: previewW,
      height: previewH
    }
  }, /*#__PURE__*/React.createElement("video", {
    key: video,
    src: video,
    autoPlay: true,
    loop: true,
    muted: true,
    playsInline: true,
    preload: "auto",
    className: "w-full h-full object-cover"
  })));
}
function AboutSection({
  activeMotif,
  setActiveMotif,
  hasActive,
  revealed
}) {
  const link = m => /*#__PURE__*/React.createElement(MotifLink, {
    ...m,
    isActive: activeMotif === m.label,
    isDimmed: hasActive && activeMotif !== m.label,
    onHover: setActiveMotif,
    onLeave: () => setActiveMotif(null)
  });
  const textFade = hasActive ? "opacity-0" : "opacity-100";

  // 24 leading non-breaking spaces reserve blank room at the very start of
  // the first (right-aligned) line, matching the original Figma paragraph
  // — "על האתר" then sits absolutely inside that reserved gap instead of
  // stacking above the paragraph as its own line.
  const LEADING_GAP = " ".repeat(24);
  return /*#__PURE__*/React.createElement("section", {
    id: "about",
    className: "relative w-full flex flex-col items-end text-right",
    dir: "rtl"
    // paddingBottom's constant is the real lever for the paragraph's
    // FINAL resting position at max scroll, not paddingTop — the two
    // are entangled: paddingTop shifts the document's total height by
    // the same amount it shifts the paragraph down by, and since
    // scrollY at max scroll is (documentHeight - viewportHeight), that
    // shift cancels out exactly. Repeated "paragraph still sits too
    // low" feedback was against a paddingTop that had no effect on the
    // number that mattered; 390 → 351 (=65 + this paragraph's own
    // ~286px rendered height at this canvas width) is the change that
    // actually moves the settled position, confirmed by direct
    // measurement (was landing at pTop 104, now targets ~65).
    ,
    style: {
      paddingTop: scalePx(110),
      paddingInline: scalePx(24),
      paddingBottom: "calc(100vh - 351px)",
      opacity: revealed ? 1 : 0,
      pointerEvents: revealed ? "auto" : "none",
      transition: `opacity ${INTRO_REVEAL_FADE_MS}ms ease`
    }
  }, /*#__PURE__*/React.createElement("h2", {
    id: "ix-about-heading",
    className: "absolute text-[20px] leading-[1.21] tracking-[-0.4px] text-[#28282a] " + textFade,
    style: {
      insetInlineStart: scalePx(24),
      top: scalePx(124),
      fontFamily: FONT_THEBASICS,
      fontWeight: 500
    }
  }, "על האתר"), /*#__PURE__*/React.createElement("p", {
    id: "ix-about-paragraph",
    className: "max-w-[1679px] text-[32px] md:text-[42px] lg:text-[59px] leading-[1.21] tracking-[-1.18px] text-[#28282a]",
    style: {
      fontFamily: FONT_THEBASICS
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: textFade
  }, LEADING_GAP, "האתר מציע דרך אחרת לחקור את האוסף. היצירות מסודרות לאסופות לפי המשותף להן מבחינה חזותית — מוטיבים חוזרים —", " "), link(MOTIFS[0]), /*#__PURE__*/React.createElement("span", {
    className: textFade
  }, ",", " "), link(MOTIFS[1]), /*#__PURE__*/React.createElement("span", {
    className: textFade
  }, ",", " "), link(MOTIFS[2]), /*#__PURE__*/React.createElement("span", {
    className: textFade
  }, ",", " "), link(MOTIFS[3]), /*#__PURE__*/React.createElement("span", {
    className: textFade
  }, " ", "או", " "), link(MOTIFS[4]), /*#__PURE__*/React.createElement("span", {
    className: textFade
  }, ". צללו לתוך האסופות וגלו אילו יצירות מצליחות לתקשר מעבר לפערים של זמן, סוגה ומקום.")));
}

// The whole page is a fixed 1728px-wide canvas (matching the Figma
// spec's 1728x2290 frame) that scrolls normally in the browser, rather
// than a vh-relative layout — that's what kept fighting the hero/wordmark
// proportions across viewport sizes. Nav is a viewport-fixed overlay (it
// sits at the very top of the document anyway, so pinning it there from
// the start is indistinguishable from sticky). The wordmark, though,
// belongs IN FLOW between the hero and the paragraph — sticky (not
// fixed) is what's needed there. Note this is `sticky` with a `top`
// value near the viewport's bottom edge, NOT `bottom: 0` — `bottom`
// sticky only catches an element being revealed from below while
// scrolling UP; for our top-down scroll, `top: calc(100vh - height)`
// is what holds it in place once scrolling down would carry it past
// that point, letting the paragraph scroll up underneath it.
const CANVAS_W = "w-[1728px] max-w-full";
// FRAME_W matches CANVAS_W: the canvas is 1728px wide, or narrower on any
// viewport under that (max-w-full). Plain fixed-px heights only looked
// right at exactly 1728 — on a narrower window the canvas shrinks but a
// fixed height didn't, breaking the Figma frame's proportions. scalePx
// ties a Figma px value to the SAME width the canvas itself renders at,
// so the whole hero/wordmark block scales together with the canvas, like
// a resized copy of the Figma frame rather than a fixed-size crop of it.
// Used for horizontal measurements (the x53/x24 insets) — those aren't
// part of the "must always fit on screen" problem heroVideoH solves below.
const FRAME_W = 1728;
const scalePx = px => `calc(min(${FRAME_W}px, 100vw) * ${(px / FRAME_W).toFixed(6)})`;

// Originally these all came directly from the Figma frame (1728x2290):
// video at y70, wordmark at y940, paragraph at y1262. Since then, feedback
// moved them off those exact numbers — and these five values are all
// competing for the same fixed vertical budget (see heroVideoH below):
// nav needs real clearance, the wordmark needs real breathing room above
// AND below it, and whatever's left over is what the video gets to be
// tall (i.e. uncropped) with. Every non-video gap here (including nav's
// own top offset, scalePx(32) on TopNav below — same value collection-
// circle.html/collection-index.html use, so the nav sits at an
// identical height on every page) has been trimmed to the tightest it
// can go while still reading as a real gap, so the video gets as much
// of the "always fits" budget as possible.
const HERO_TOP_GAP = 63; // video's y — nav's own footprint is now ~56px tall (top offset 32 + ~24px line height)
const HERO_VIDEO_H = 972; // the cap on tall screens (source's own 16:9 height at this width — effectively uncropped); shorter viewports still compress this
const WORDMARK_TOP_GAP = 0; // no gap — video's bottom edge touches the wordmark directly
const WORDMARK_BOTTOM_PAD = 12; // keeps the wordmark off the viewport edge

// The video always renders at its true, full, uncropped width-relative
// height (the source's own 16:9 ratio at this canvas width) — no
// viewport-based compression.
const heroVideoH = () => scalePx(HERO_VIDEO_H);

// The hero video starts paused on a random frame, as a small thumbnail
// (HERO_THUMB_W wide, at the source's own 16:9 ratio so nothing is
// cropped while small) centered on the first screen. Hovering (or
// tapping) it expands to the full hero geometry over HERO_EXPAND_MS and
// resumes playing at the same moment — see Hero's onExpand.
const HERO_THUMB_W = 400;
const HERO_EXPAND_MS = 900;

// The page is scroll-locked (see App's overflow toggle) from first
// load until shortly after the hero finishes expanding — like a loader
// that's "stuck" until its animation completes. POST_EXPAND_DELAY_MS is
// the extra beat AFTER the expand animation ends before nav/wordmark/
// paragraph start fading in (so the reveal doesn't collide with the
// tail end of the expand), and *_FADE_MS are how long each takes to
// fade in once that starts. WORDMARK_FADE_MS is deliberately quicker
// than INTRO_REVEAL_FADE_MS (the paragraph's fade).
// TODO(easing): swap the "ease" in Wordmark/App/Hero for whatever's
// sampled from the user's reference recording.
const POST_EXPAND_DELAY_MS = 250;
const INTRO_REVEAL_FADE_MS = 300;
const WORDMARK_FADE_MS = 200;
const FADE_UP_RISE_PX = 28;

// The wordmark line, once the intro reveal has happened, keeps tracking
// scroll position: it fades back out if the user scrolls back up to the
// top (back to the video), and fades back in scrolling away again — not
// a one-way reveal like the nav. SCROLLED_PAST_TOP_PX is a small dead
// zone so trackpad rubber-banding at the very top doesn't flicker it.
// forceVisible (the intro's `revealed`) snaps it visible the instant the
// intro finishes, even though scrollY is still 0 at that exact moment —
// after that first snap, real scroll events take back over normally,
// including hiding it again if scrolled back to the top.
function useScrolledPastTop(thresholdPx, forceVisible) {
  const [pastTop, setPastTop] = useState(false);
  useEffect(() => {
    if (forceVisible) setPastTop(true);
  }, [forceVisible]);
  useEffect(() => {
    let ticking = false;
    const compute = () => {
      setPastTop(window.scrollY > thresholdPx);
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(compute);
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, {
      passive: true
    });
    return () => window.removeEventListener("scroll", onScroll);
  }, [thresholdPx]);
  return pastTop;
}
const SCROLLED_PAST_TOP_PX = 10;

// Scroll-spy for the "אסופות" nav item: it gets the same permanent
// underline a HoverWord shows in its active state (see NavLink's
// isControlled) while the About section is in view, and reverts to
// plain hover-only once scrolled back above it. Same rootMargin
// convention as the collection pages' own tile-reveal observers —
// triggers once the section has scrolled up to roughly 80% of the
// viewport, not the instant a single pixel clips the bottom edge.
const ABOUT_TRIGGER_FRAC = 0.2;
function useSectionInView(id) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = document.getElementById(id);
    if (!el) return;
    const observer = new IntersectionObserver(entries => setInView(entries[0].isIntersecting), {
      rootMargin: `0px 0px -${ABOUT_TRIGGER_FRAC * 100}% 0px`,
      threshold: 0
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [id]);
  return inView;
}
function App() {
  // Lifted above AboutSection so a paragraph motif hover can also hide the
  // nav (a sibling), not just the paragraph's own text — per the
  // reference, hovering a motif clears the whole page except the hovered
  // word, its preview, and the big wordmark.
  const [activeMotif, setActiveMotif] = useState(null);
  const hasActive = activeMotif !== null;
  const [searchOpen, setSearchOpen] = useState(false);

  // Set by collection-circle.html's wordmark link right before it
  // navigates here (see its onClick) — arriving from a full-screen
  // video hover rather than a fresh visit, so the thumbnail-expand
  // intro below should be skipped entirely and the page should just
  // fade straight in instead.
  const [skipIntro] = useState(() => {
    const flag = sessionStorage.getItem("skipIntro") === "1";
    if (flag) sessionStorage.removeItem("skipIntro");
    return flag;
  });
  // Same handoff, carrying which reel was already playing in that hover
  // so Hero (below) can play that exact file instead of a fresh random one.
  const [presetHeroVideo] = useState(() => {
    const v = sessionStorage.getItem("heroVideo");
    if (v) sessionStorage.removeItem("heroVideo");
    return v;
  });
  // Set by the other pages' own "אסופות" link right before it navigates
  // here (see collection-circle.html/collection-index.html's own
  // onClick) — clicking אסופות from elsewhere should land directly on
  // the About section, not the hero, so this always arrives paired
  // with skipIntro (no point skipping the intro fade but still landing
  // on the hero first, only to jump away from it a moment later).
  const [scrollToAbout] = useState(() => {
    const flag = sessionStorage.getItem("scrollToAbout") === "1";
    if (flag) sessionStorage.removeItem("scrollToAbout");
    return flag;
  });

  // Lifted up (rather than local state inside Hero) so the same
  // hover/tap that starts the hero expanding is also what starts the
  // countdown to unlocking scroll and revealing everything else below.
  const [started, setStarted] = useState(skipIntro);
  const onExpand = () => setStarted(true);
  // Arriving via a header wordmark link (see HeaderWordmarkLink on the
  // other pages): it no longer sets skipIntro, so the loader animation
  // actually plays instead of being bypassed — but the click that sent
  // the user here already was the "start" gesture, so the expand
  // shouldn't sit waiting for a second hover on the thumbnail.
  useEffect(() => {
    if (skipIntro || !presetHeroVideo) return;
    const id = setTimeout(onExpand, 50);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (!started) return;
    const delay = skipIntro ? 0 : HERO_EXPAND_MS + POST_EXPAND_DELAY_MS;
    const id = setTimeout(() => setRevealed(true), delay);
    return () => clearTimeout(id);
  }, [started]);

  // Whole-page soft fade for the skipIntro arrival only — starts hidden
  // and flips true a beat after mount so the opacity transition actually
  // animates (a same-tick flip wouldn't). The normal first-visit flow
  // never touches this (starts at opacity 1, transition "none"): Hero's
  // own thumbnail must stay visible pre-reveal there, so this can't be
  // tied to `revealed` globally without breaking that.
  //
  // For a scrollToAbout arrival specifically, this must not start until
  // AFTER the jump below has actually happened — otherwise the opacity
  // fade and the scroll jump race each other, and the still-collapsed
  // Hero (now supposed to be scrolled past) and the About section can
  // both paint mid-transition at once, ghosting through each other for
  // a frame. readyToFadeIn gates that: true immediately when there's
  // nothing to wait for, but only flips once the scroll-into-view
  // effect further down has actually run.
  const [pageFadeIn, setPageFadeIn] = useState(!skipIntro);
  const [readyToFadeIn, setReadyToFadeIn] = useState(!scrollToAbout);
  useEffect(() => {
    if (!skipIntro || !readyToFadeIn) return;
    const id = setTimeout(() => setPageFadeIn(true), 60);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyToFadeIn]);

  // Scroll-locked (loader-style) until revealed: overflow: hidden stops
  // the page from moving at all while the hero sits as a thumbnail and
  // then plays its expand, so nothing can be scrolled past mid-animation.
  useEffect(() => {
    document.body.style.overflow = revealed ? "" : "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [revealed]);

  // Jump straight to the About section on arrival (see scrollToAbout
  // above) — waits for `revealed` so the scroll-lock above has already
  // been lifted. This page sets a global CSS scroll-behavior: smooth,
  // and neither scrollIntoView's "auto" nor "instant" option reliably
  // overrode it in testing — both still animated over ~500ms, running
  // at the same time as the opacity fade below and ghosting the
  // still-visible Hero through the About section for a frame. Directly
  // toggling the CSS property off for the jump is what actually forces
  // a real, immediate scroll — but restoring it in the same tick (right
  // after calling scrollIntoView) was still too soon: the browser
  // hadn't yet committed to "instant" at that point, so it reverted to
  // smooth before the jump actually happened. Waiting a couple of
  // animation frames before restoring it gives the instant jump time to
  // land first.
  useEffect(() => {
    if (!scrollToAbout || !revealed) return;
    const el = document.getElementById("about");
    if (el) {
      const prevBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = "auto";
      el.scrollIntoView({
        block: "start"
      });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.documentElement.style.scrollBehavior = prevBehavior;
        });
      });
    }
    setReadyToFadeIn(true);
  }, [scrollToAbout, revealed]);

  // Unlike the nav (which just stays up once revealed), the wordmark
  // keeps fading in/out with scroll position after the intro — snapped
  // visible the instant revealed flips true, then toggling normally
  // from then on (hidden again if scrolled back up to the video).
  const wordmarkVisible = useScrolledPastTop(SCROLLED_PAST_TOP_PX, revealed);
  const aboutActive = useSectionInView("about");
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen w-full bg-[#fffdfa] relative",
    dir: "rtl"
  }, /*#__PURE__*/React.createElement("div", {
    id: "ix-header-overlay",
    className: "fixed inset-x-0 top-0 z-30 flex justify-center pointer-events-none",
    style: {
      viewTransitionName: "site-header"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative " + CANVAS_W
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      opacity: revealed ? 1 : 0,
      pointerEvents: revealed ? "auto" : "none",
      transition: `opacity ${WORDMARK_FADE_MS}ms ease`
    }
  }, /*#__PURE__*/React.createElement(TopNav, {
    className: "absolute pointer-events-auto",
    dir: "rtl",
    style: {
      insetInlineEnd: scalePx(24),
      top: scalePx(32)
    },
    hidden: hasActive,
    aboutActive: aboutActive,
    onSearchToggle: () => setSearchOpen(v => !v)
  })), /*#__PURE__*/React.createElement(SearchBar, {
    open: searchOpen,
    onClose: () => setSearchOpen(false)
  }))), /*#__PURE__*/React.createElement("div", {
    id: "ix-wordmark-overlay",
    className: "fixed inset-x-0 bottom-0 z-20 flex justify-center pointer-events-none"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative " + CANVAS_W
  }, /*#__PURE__*/React.createElement(Wordmark, {
    className: "pointer-events-auto",
    revealed: wordmarkVisible
  }))), /*#__PURE__*/React.createElement("div", {
    id: "ix-canvas",
    className: "mx-auto " + CANVAS_W,
    style: {
      opacity: pageFadeIn ? 1 : 0,
      transition: skipIntro ? "opacity 500ms ease" : "none"
    }
  }, /*#__PURE__*/React.createElement(Hero, {
    started: started,
    onExpand: onExpand,
    presetVideo: presetHeroVideo
  }), /*#__PURE__*/React.createElement(AboutSection, {
    activeMotif: activeMotif,
    setActiveMotif: setActiveMotif,
    hasActive: hasActive,
    revealed: revealed
  })));
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));