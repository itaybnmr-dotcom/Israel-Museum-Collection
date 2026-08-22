/*
 * Shared search engine for אוספי מוזיאון ישראל.
 *
 * Every page carries its own copy of the SearchBar component (this project has
 * no build step, so components are duplicated per page), but the *matching*
 * logic lives here so the quick dropdown on any page and the full results page
 * (search.html) can never disagree about what a query means.
 *
 * Reads window.ARTWORKS — the same 134-record dataset artwork.html renders
 * from — so every object in the collection is reachable by search.
 *
 * Exposes window.MuseumSearch.
 */
(function () {
  // ── Normalisation ────────────────────────────────────────────────────────
  //
  // Folds the three things that silently break Hebrew matching here:
  //   · maqaf   — the filter vocabulary writes "צבעי־שמן" (U+05BE) while the
  //               tags write "צבעי-שמן" with an ASCII hyphen
  //   · niqqud  — so "טומי" finds the title spelled "טוּמי"
  //   · gershayim — so "ירח" finds ״ירח״
  //
  // Order matters: U+05BE sits *inside* the U+0591–U+05C7 niqqud range, so
  // stripping niqqud first would delete the maqaf outright and turn
  // "צבעי־שמן" into "צבעישמן", matching nothing.
  function normalize(s) {
    return (s || "")
      .replace(/־/g, "-")
      .replace(/[֑-ׇ]/g, "")
      .replace(/[׳״"'’]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // The site's own filter vocabulary (the collection pages' FILTER_ROWS) plus
  // the five motifs. A query that *is* one of these words is a facet: it
  // returns every artwork carrying that tag rather than a text match, so
  // "אדום" means "everything labelled אדום" — not "records with those letters
  // somewhere in them".
  var FACET_GROUPS = [
    { kind: "אסופה", values: ["מעגל", "אנכיות", "שער", "תנועה", "שבר"] },
    { kind: "צבע", values: ["אדום", "כחול", "ירוק", "זהב", "שחור", "לבן"] },
    { kind: "חומר", values: ["אבן", "זכוכית", "מתכת", "עץ", "בד וטקסטיל", "קרמיקה", "צבעי-שמן", "צילום", "אחר"] }
  ];

  function facetFor(query) {
    var q = normalize(query);
    for (var i = 0; i < FACET_GROUPS.length; i++) {
      var group = FACET_GROUPS[i];
      for (var j = 0; j < group.values.length; j++) {
        if (normalize(group.values[j]) === q) {
          return { kind: group.kind, value: group.values[j] };
        }
      }
    }
    return null;
  }

  // startsWith, not equality: the material facet "צבעי-שמן" also has to catch
  // the 23 records tagged "צבעי-שמן על בד".
  function hasTag(art, value) {
    var v = normalize(value);
    var tags = art.tags || [];
    for (var i = 0; i < tags.length; i++) {
      if (normalize(tags[i]).indexOf(v) === 0) return true;
    }
    return false;
  }

  // Field-weighted rather than one concatenated blob, so a title hit outranks
  // an accession-number hit. Every term must land somewhere (AND), which is
  // what makes multi-word queries like "דאלי מתווה" useful.
  function scoreArtwork(art, terms) {
    var title = normalize((art.title || "").replace(/\n/g, " "));
    var artist = normalize(art.artist);
    var meta = (art.meta || []).map(normalize);
    var tags = (art.tags || []).map(normalize);
    var technique = meta[0] || "";
    var rest = meta.slice(1).join(" ");

    var total = 0;
    for (var i = 0; i < terms.length; i++) {
      var term = terms[i];
      var s = 0;
      if (title === term) s = 260;
      else if (title.indexOf(term) === 0) s = 200;
      else if (title.indexOf(term) !== -1) s = 160;
      else if (artist && artist.indexOf(term) !== -1) s = artist.indexOf(term) === 0 ? 140 : 120;
      else if (tags.indexOf(term) !== -1) s = 110;
      else if (tags.some(function (t) { return t.indexOf(term) !== -1; })) s = 95;
      else if (technique.indexOf(term) !== -1) s = 80;
      else if (rest.indexOf(term) !== -1) s = 50;
      if (!s) return 0;
      total += s;
    }
    return total;
  }

  // → { facet, results } — results is the complete list, uncapped. Callers
  // that only want a preview (the header dropdown) slice it themselves.
  function run(query) {
    var all = window.ARTWORKS || [];
    var q = normalize(query);
    if (!q) return { facet: null, results: [] };

    var facet = facetFor(q);
    if (facet) {
      var tagged = all.filter(function (a) { return hasTag(a, facet.value); });
      tagged.sort(function (a, b) {
        return (a.title || "").localeCompare(b.title || "", "he");
      });
      return { facet: facet, results: tagged };
    }

    var terms = q.split(" ").filter(Boolean);
    var scored = [];
    for (var i = 0; i < all.length; i++) {
      var score = scoreArtwork(all[i], terms);
      if (score > 0) scored.push({ art: all[i], score: score });
    }
    scored.sort(function (x, y) {
      return y.score - x.score || (x.art.title || "").localeCompare(y.art.title || "", "he");
    });
    return {
      facet: null,
      results: scored.map(function (s) { return s.art; })
    };
  }

  // ── List metadata ───────────────────────────────────────────────────────
  //
  // The technique/dimensions text the list views actually display is the
  // same hand-curated table collection-index.html's own ListView uses (not
  // every record's meta[]/dimensions is clean list-column prose) — copied
  // here verbatim so search.html's rows read identically for any title this
  // table covers, falling back to the derived meta[]/dimensions reading for
  // the rest.
  var LIST_METADATA = {
      // Figma-verified entries
      "אוויר, ברזל ומים":                      { technique: "צבעי-שמן על בד",                                    dimensions: "97.4x151.4"     },
      "אישה ונציאנית מס’ 6":                { technique: "ברונזה, 3/6",                                       dimensions: "132.4x15.5x36.6"},
      "אף יותר":                                { technique: "צבעי-שמן על בד",                                    dimensions: "69x69"          },
      "בקבוק דמוי רימון":                       { technique: "זכוכית חומה, מעוצבת על ליבה",                        dimensions: "7.9x6.8"        },
      "גלגל אופניים":                           { technique: "גלגל אופניים ומזלג מחוברים לשרפרף מטבח לבן",         dimensions: "126.5x63.5x31.8"},
      "גרפיטי פריזאי":                          { technique: "הדפסת-כסף",                                          dimensions: "28.6x22.2"      },
      "דיכוי החפץ":                             { technique: "צבעי-שמן על בד",                                    dimensions: "90x116.5"       },
      "הבשורה למרים":                           { technique: "צבעי-שמן על בד",                                    dimensions: "65x89"          },
      "הדס לבשמים":                             { technique: "כסף בעבודת פיליגרן, יצוק ומוזהב חלקית",             dimensions: "40x6"           },
      "השקה":                                   { technique: "צבעי-שמן על בד",                                    dimensions: "228x152"        },
      "חרוז מתוך מטמון כסף":                    { technique: "אבן קרניאול",                                        dimensions: "0.4x0.7"        },
      "יריחו תחילה":                            { technique: "אקריליק על בד",                                      dimensions: "27x40 / 160x200"},
      "כותרת וחוליות עמוד":                     { technique: "אבן גיר קשה",                                        dimensions: "109x62"         },
      'כיסא ״פסטיל״':                           { technique: "פוליאסטר משוריין בפיברגלס ויצוק בדפוס",             dimensions: "56x95"          },
      "מבט על וולסטריט מברודווי":               { technique: "הדפסת-כסף",                                          dimensions: "27x35"          },
      "מגדל שעון":                              { technique: "תצריב",                                               dimensions: "260x185"        },
      "מראה בעלת ידית סירנה":                  { technique: "ברונזה",                                              dimensions: "25.5x19"        },
      "משל אופטי":                              { technique: "הדפסת-כסף",                                          dimensions: "23.8x18.2"      },
      "משקולת פלך":                             { technique: "אבן",                                                 dimensions: "1.3x2.1"        },
      "נגב":                                    { technique: "אבן גיר",                                             dimensions: "280x3500"       },
      "שמש ערופה":                              { technique: "הדפס-אבן צבעוני ואקווטינטה צבעונית",                 dimensions: "627x940"        },
      "שמש בקרוטון":                            { technique: "מתכת צבועה",                                         dimensions: "442x129.2"      },
      "שמש אדומה":                              { technique: "צבעי–שמן על בד",                                    dimensions: "178x56.5x61.5"  },
      'שידת מגירות ״סטאק״':                     { technique: "לבנה לבוד צבוע ומצופה לכה, סיבית ופלדה",            dimensions: "178x56.5x61.5"  },
      "שקיעה באראניי":                          { technique: "צבעי-שמן על בד",                                    dimensions: "65.2x81.3"      },
      "תגליף המתאר את אתנה":                    { technique: "קרנליאן",                                             dimensions: "1.6x1.3x0.5"   },
      "צלחת גדולה ועליה מגולפים סמלים":         { technique: "זכוכית ירקרקה, מנופחת וחרותה",                        dimensions: "52"             },
      // Additional entries
      "אבן יד":                                 { technique: "צור מסותת",                                           dimensions: "14x9"           },
      "אגדת מוצא הטוטם":                        { technique: "עץ מגולף וצבוע",                                     dimensions: "205x56"         },
      "אדם":                                    { technique: "ברונזה",                                              dimensions: "198x72x62"      },
      "אישה + נֵאון, ניו-יורק":                 { technique: "הדפסת-ג׳לטין כסף",                                   dimensions: "32x22"          },
      "אלה (אוה)":                              { technique: "עץ עם עיניים משובצות",                               dimensions: "68x10"          },
      "אלמנה טרייה":                            { technique: "עץ צבוע, זכוכית ועור",                               dimensions: "77.5x44.5x8.5"  },
      "אני הולך":                               { technique: "צבעי-שמן על בד",                                    dimensions: "97x127"         },
      "אסמים בלילה":                            { technique: "חיתוך-עץ",                                           dimensions: "30.8x25.1"      },
      "אתלטיקה קלה":                            { technique: "הדפסת-כסף",                                          dimensions: "23.8x17.5"      },
      "בלי כותרת (לבוב ופט רום)":              { technique: "נורות אור פלורסנט",                                  dimensions: "244x244x10"     },
      "עינויי ברתולומאו הקדוש":                 { technique: "צבעי-שמן על בד",                                    dimensions: "110x85"         },
      "גליוטינה":                               { technique: "צבעי-שמן על בד",                                    dimensions: "167x122"        },
      "גַנְגָה דֶווי אלת הנהר":                 { technique: "אבן חול",                                            dimensions: "87x35x20"       },
      "גרזן":                                   { technique: "אבן",                                                 dimensions: "13x6"           },
      "דגם מבנה":                               { technique: "חרס",                                                 dimensions: "11.2x9x8.5"     },
      "כנסיית עץ, קרוליינה הדרומית":           { technique: "הדפסת-ג׳לטין כסף",                                   dimensions: "19.2x15.5"      },
      "החלל הרואה":                             { technique: "התקנה (חלל אור)",                                    dimensions: "500x500x370"    },
      "הנאהבים":                                { technique: "הדפסת-כסף",                                          dimensions: "23.5x17.5"      },
      "הנוקם":                                  { technique: "ברונזה",                                              dimensions: "44x59x36"       },
      "העגל והיכלו":                            { technique: "ברונזה ונחושת",                                      dimensions: "10x4.5"         },
      "הצד העליון של השמים":                    { technique: "צבעי-שמן על בד",                                    dimensions: "101.6x76.2"     },
      "השלכות":                                 { technique: "אבן גיר",                                             dimensions: "310x180x80"     },
      "ונוס משוחזרת":                           { technique: "גבס",                                                 dimensions: "58x18x14"       },
      "זמן אביב 2":                             { technique: "גבס צבוע",                                           dimensions: "7x30x2"         },
      "ח׳מר":                                   { technique: "אבן בזלת",                                           dimensions: "84x43x28"       },
      "חזית חנות":                              { technique: "קולאז׳ ועיפרון על נייר",                             dimensions: "56x71"          },
      "חלון גג בירושלים":                       { technique: "צבעי-שמן על בד",                                    dimensions: "130x65"         },
      "חלון הסדנה":                             { technique: "צבעי-שמן על בד",                                    dimensions: "130x96"         },
      "חרפושית ועליה משרת האל":                 { technique: "סטאטיט מצופה חרסינה",                               dimensions: "1.8x1.3x0.7"   },
      "טופולוגיה שקופה":                        { technique: "הדפסת-כסף",                                          dimensions: "50x60"          },
      "טורסו של אפרודיטה":                      { technique: "שיש",                                                dimensions: "22x11"          },
      "יבול יפה":                               { technique: "צבעי-שמן על בד",                                    dimensions: "54.3x65"        },
      "ידית בצורת דולפינים":                    { technique: "ברונזה",                                              dimensions: "7.5x4.3"        },
      "ידית מגל":                               { technique: "עצם",                                                 dimensions: "12.5x2"         },
      "כד גלילי לגבינה מיובאת ממצרים":         { technique: "חרס",                                                dimensions: "12.5x7.8"       },
      "כורים במנוחה":                           { technique: "צבעי-שמן על בד",                                    dimensions: "73x100"         },
      "כיכר הכפר בסרה":                        { technique: "צבעי-שמן על בד",                                    dimensions: "73x60"          },
      "כלי בצורת דג":                           { technique: "אבן",                                                 dimensions: "12.5x5"         },
      "כן להצבת פסל אלוהות":                   { technique: "חרס",                                                 dimensions: "45x23"          },
      'כרזה לסרט ״אקסודוס״':                   { technique: "אופסט",                                               dimensions: "104x70"         },
      "כתובת ממערת קבורה":                      { technique: "אבן גיר",                                            dimensions: "32x22"          },
      'לוח אבות קדמונים (״גוֹפֶּה״)':          { technique: "עץ מגולף וצבוע",                                     dimensions: "160x28"         },
      'לוח חלון ״עין השור״':                    { technique: "זכוכית",                                              dimensions: "22"             },
      "לוחית המתארת את האלים ננה ונינגל":       { technique: "חימר",                                               dimensions: "6.2x4.5"        },
      "לוחית המתארת שורת לוחמים":               { technique: "טרקוטה צבועה",                                       dimensions: "18x12"          },
      "לוליין עומד על ידיו על תוף":             { technique: "עץ צבוע",                                            dimensions: "15x6x6"         },
      "ללא כותרת":                              { technique: "צבעי-שמן על בד",                                    dimensions: "240x174"        },
      "מאבו":                                   { technique: "הדפסת-כסף",                                          dimensions: "20.3x25.4"      },
      "מגדל מים בנהלל":                         { technique: "הדפסת-כסף",                                          dimensions: "23x18"          },
      "מגדל רדיו":                              { technique: "הדפסת-כסף",                                          dimensions: "33.5x26.5"      },
      "מחווה לרובע הביגוד":                     { technique: "בטון ואקומולציה",                                    dimensions: "130x25x25"      },
      'מחווה לריבוע מס״ 853':                   { technique: "צבעי-שמן על מזוניט",                                 dimensions: "40.6x40.6"      },
      "מחסה ארעי למהגרי עבודה בארקנסו":        { technique: "הדפסת-ג׳לטין כסף",                                   dimensions: "20.5x25.8"      },
      "מלכה":                                   { technique: "מתכת צבועה",                                         dimensions: "170x90x90"      },
      'מנורת ״ירח״':                            { technique: "מתכת",                                               dimensions: "40"             },
      "מסה סוראליסטית":                         { technique: "גואש על נייר",                                       dimensions: "21.5x26.5"      },
      "מסכת חזה בדמות צדודית":                  { technique: "אבן ירוקה",                                          dimensions: "4.5x3.5"        },
      "מצבת בן מגלוס":                          { technique: "שיש",                                                dimensions: "65x35x8"        },
      'מתווה ל״התעברות ללא רבב״':               { technique: "עיפרון ועט על נייר",                                 dimensions: "21x27"          },
      "נהר האלבה בדרזדן":                       { technique: "צבעי-שמן על בד",                                    dimensions: "70x100"         },
      "נוף סוראליסטי":                          { technique: "צבעי-שמן על בד",                                    dimensions: "89x65"          },
      "נוף עם עץ":                              { technique: "חיתוך-עץ",                                           dimensions: "42x30"          },
      "נושא אבוד":                              { technique: "עופרת",                                               dimensions: "189x53x29"      },
      'סכין ״טוּמי״ טקסית':                    { technique: "זהב",                                                dimensions: "30.5x14"        },
      "סל ניירות":                              { technique: "מתכת",                                               dimensions: "19.5x22.5"      },
      "זורקת דיסקוס":                           { technique: "הדפסת-כסף",                                          dimensions: "24x17.5"        },
      "עיטורי סימה":                            { technique: "טרקוטה צבועה",                                       dimensions: "86x28"          },
      "נמרוד":                                  { technique: "אבן נובית",                                           dimensions: "94x50x43"       },
      "ציור (רקדנית ספרדייה)":                  { technique: "צבעי-שמן על בד",                                    dimensions: "97x81"          },
      "ציור קיר מקבר המתאר שתי נשים":          { technique: "פרסקו על טיח",                                       dimensions: "38x45"          },
      "קטעים לשיבוץ בצורת דמויות":              { technique: "שנהב",                                               dimensions: "5x2.5"          },
      'מלון ד״ארגוז״ (סגייה), רחוב סגייה 16': { technique: "הדפסת-אלבומן",                                       dimensions: "17.9x22.9"      },
      "שבר שפה של קערת זכוכית פסיפס":          { technique: "זכוכית פסיפס",                                       dimensions: "8.5x4x0.5"      },
      "שער יפו":                                { technique: "הדפסת-אלבומן",                                       dimensions: "20x25"          },
      "שבר לוחית בצורת ספינקס":                { technique: "שנהב",                                               dimensions: "5.5x8.5x0.5"   },
      "שבר תבליט המתאר שומר ראש":              { technique: "אבן גיר",                                            dimensions: "12x9"           },
      "שער מצודה מלכותית":                      { technique: "בזלת",                                               dimensions: "245x195x50"     },
      'שרפרף מתקפל ״One_Shot״':                { technique: "פוליפרופילן",                                        dimensions: "45x33x45"       },
      "שתי מתעמלות":                            { technique: "הדפסת-כסף",                                          dimensions: "22.7x17.3"      },
      "תבנית עתיקה וצלמית מודרנית":             { technique: "חרס",                                                dimensions: "11x4"           },
  };

  // ── Row field derivation ─────────────────────────────────────────────────
  //
  // The list columns come out of each record's own meta block, whose shape is
  // consistent enough to read positionally: meta[0] is always the
  // material/technique line; the 106 five-line records run
  // [technique, origin/nationality, date, department, accession]; the shorter
  // ones fold origin and date into a single trailing line.
  function techniqueOf(art) {
    var listed = LIST_METADATA[art.title];
    if (listed) return listed.technique;
    return (art.meta || [])[0] || "";
  }

  function dateOf(art) {
    var m = art.meta || [];
    if (m.length >= 5) return m[2] || "";
    var tail = m.slice(1).filter(function (x) {
      return /\d|לפנה|לספיר|המאה|תקופ/.test(x);
    });
    return tail.length ? tail[tail.length - 1] : (m[1] || "");
  }

  function creatorOf(art) {
    return art.artist || "ללא שם";
  }

  // artworks-data stores dimensions as prose — `(גובה 65.2 ס"מ, רוחב 81.3 ס"מ)`
  // — but the list column is a narrow numeric one, so pull just the measures
  // into the index's compact 65.2×81.3 form. A few older records store segment
  // arrays instead of a string; flatten those first.
  function dimensionsOf(art) {
    var listed = LIST_METADATA[art.title];
    if (listed) return listed.dimensions;
    var d = art.dimensions;
    if (!d) return "";
    if (Array.isArray(d)) {
      d = d.map(function (seg) { return (seg && seg.t) || ""; }).join(" ");
    }
    var inner = String(d).replace(/[()]/g, "");
    var diameter = false;
    var nums = [];
    inner.split(",").forEach(function (part) {
      if (/קוטר/.test(part)) diameter = true;
      var m = part.match(/[\d.]+(?:\s*[–-]\s*[\d.]+)?/);
      if (m) nums.push(m[0].replace(/\s+/g, ""));
    });
    if (!nums.length) return "";
    return (diameter && nums.length === 1 ? "⌀" : "") + nums.join("×");
  }

  function urlFor(query) {
    var q = (query || "").trim();
    return q ? "search.html?q=" + encodeURIComponent(q) : "search.html";
  }

  window.MuseumSearch = {
    normalize: normalize,
    FACET_GROUPS: FACET_GROUPS,
    facetFor: facetFor,
    hasTag: hasTag,
    run: run,
    techniqueOf: techniqueOf,
    dateOf: dateOf,
    creatorOf: creatorOf,
    dimensionsOf: dimensionsOf,
    urlFor: urlFor
  };
})();
