/* ==========================================================================
 * alphabet-hebrew.js — every Hebrew value table, derived from letter order.
 * Part of the Gematria module set (see gematria.js for the layout).
 *
 * Standard, ordinal, sofit (mispar gadol), atbash and katan tables are all
 * DERIVED from HEBREW_ORDER via the shared tier rule, never hand-duplicated.
 * ========================================================================== */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(require('./core.js'));
  } else {
    const M = root.GematriaModules = root.GematriaModules || {};
    M.hebrew = factory(M.core);
  }
})(globalThis, function (core) {
  'use strict';
  const { assert, tiered, getValues, ALEPH_SOFIT, stripSuperscripts } = core;

  const HEBREW_ORDER = Array.from('אבגדהוזחטיכלמנסעפצקרשת');   // 22 letters
  const FINAL_TO_BASE = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };

  const HEBREW_VALUES = {};
  const HEBREW_ORDINALS = {};
  HEBREW_ORDER.forEach((L, i) => {
    HEBREW_VALUES[L] = tiered(i);
    HEBREW_ORDINALS[L] = i + 1;
  });
  for (const [fin, base] of Object.entries(FINAL_TO_BASE)) {
    HEBREW_VALUES[fin] = HEBREW_VALUES[base];
    HEBREW_ORDINALS[fin] = HEBREW_ORDINALS[base];
  }

  // Mispar gadol (sofit): finals continue the hundreds tier — ך=500 … ץ=900 —
  // the same series the aleph-sofit token (א¹⁰⁰⁰ = 1000) completes.
  const FINAL_ORDER = Array.from('ךםןףץ');
  const HEBREW_SOFIT_VALUES = { ...HEBREW_VALUES };
  FINAL_ORDER.forEach((L, i) => { HEBREW_SOFIT_VALUES[L] = tiered(22 + i); });

  // Atbash (אתב״ש): each letter takes the value of its mirror (א↔ת, ב↔ש …).
  // Mispar katan (מספר קטן): the tier value reduced to one digit (כ=2, ת=4);
  // within each tier of nine that is position + 1.
  const HEBREW_ATBASH = {};
  const HEBREW_ATBASH_LETTER = {};        // letter → its mirror letter
  const HEBREW_KATAN = {};
  HEBREW_ORDER.forEach((L, i) => {
    HEBREW_ATBASH[L] = HEBREW_VALUES[HEBREW_ORDER[21 - i]];
    HEBREW_ATBASH_LETTER[L] = HEBREW_ORDER[21 - i];
    HEBREW_KATAN[L] = (i % 9) + 1;
  });
  for (const [fin, base] of Object.entries(FINAL_TO_BASE)) {
    HEBREW_ATBASH[fin] = HEBREW_ATBASH[base];
    HEBREW_ATBASH_LETTER[fin] = HEBREW_ATBASH_LETTER[base];
    HEBREW_KATAN[fin] = HEBREW_KATAN[base];
  }

  // Ayak Bachar (אי״ק בכ״ר, also spelled Ayak Bakar or Aiq Bekher), the nine
  // chambers: letters share a chamber when
  // their values share a leading digit — א(1) י(10) ק(100) … — with the five
  // final forms extending the last five chambers into 500–900 (ה נ ך = 5·50·500).
  // The cipher is a temurah: each letter is exchanged for the next member of
  // its chamber (א→י→ק→א) and takes that mate's value on the 27-letter sofit
  // scale (נ→ך = 500).
  const HEBREW_AYAK_CHAMBERS = [];       // nine [unit, ten, hundred] triads
  for (let d = 0; d < 9; d++) {
    HEBREW_AYAK_CHAMBERS.push([
      HEBREW_ORDER[d], HEBREW_ORDER[d + 9],
      d < 4 ? HEBREW_ORDER[d + 18] : FINAL_ORDER[d - 4],
    ]);
  }
  const HEBREW_AYAK_BACHAR = {};         // letter → its exchanged mate's value
  const HEBREW_AYAK_LETTER = {};         // letter → next letter in its chamber
  const HEBREW_CHAMBER_OF = {};         // letter → chamber name (אי״ק …)
  HEBREW_AYAK_CHAMBERS.forEach((triad) => {
    const name = triad[0] + triad[1] + '״' + triad[2];
    triad.forEach((L, j) => {
      const mate = triad[(j + 1) % 3];
      HEBREW_AYAK_LETTER[L] = mate;
      HEBREW_AYAK_BACHAR[L] = HEBREW_SOFIT_VALUES[mate];
      HEBREW_CHAMBER_OF[L] = name;
    });
  });

  // Pre-Exilic: the standard table except ש and ת restart the units at 3
  // and 4; finals keep their base values (ך=20 … ץ=90).
  const HEBREW_PRE_EXILIC = { ...HEBREW_VALUES, 'ש': 3, 'ת': 4 };

  // Reverse Pre-Exilic: reverses the pre-exilic ladder — in which ש=3 and
  // ת=4 — pairing {1,2}↔{100,200} and 3↔90 … 10↔20, so ש(3)→90, ת(4)→80.
  // Hand-specified, NOT derived from letter order — it is neither atbash
  // nor a mirrored ladder, so never rebuild it from HEBREW_ORDER. Finals
  // keep their base values.
  const HEBREW_REVERSE_PRE_EXILIC = {
    'א': 100, 'ב': 200, 'ג': 90, 'ד': 80, 'ה': 70, 'ו': 60, 'ז': 50,
    'ח': 40, 'ט': 30, 'י': 20, 'כ': 10, 'ל': 9, 'מ': 8, 'נ': 7,
    'ס': 6, 'ע': 5, 'פ': 4, 'צ': 3, 'ק': 1, 'ר': 2, 'ש': 90, 'ת': 80,
  };
  for (const [fin, base] of Object.entries(FINAL_TO_BASE)) {
    HEBREW_REVERSE_PRE_EXILIC[fin] = HEBREW_REVERSE_PRE_EXILIC[base];
  }

  const HEBREW_NAMES = {
    'א': 'Aleph', 'ב': 'Bet', 'ג': 'Gimel', 'ד': 'Dalet', 'ה': 'Heh',
    'ו': 'Vav', 'ז': 'Zayin', 'ח': 'Chet', 'ט': 'Tet', 'י': 'Yod',
    'כ': 'Kaf', 'ל': 'Lamed', 'מ': 'Mem', 'נ': 'Nun', 'ס': 'Samekh',
    'ע': 'Ayin', 'פ': 'Peh', 'צ': 'Tsadi', 'ק': 'Qof', 'ר': 'Resh',
    'ש': 'Shin', 'ת': 'Tav',
  };

  const baseLetter = (L) => {
    const b = stripSuperscripts(L);
    return FINAL_TO_BASE[b] || b;
  };
  const spellingValue = (spelling) =>
    Array.from(spelling).reduce((a, c) => a + HEBREW_VALUES[c], 0);

  /* ---- load-time validation (fail loudly) --------------------------------- */
  (function validate() {
    assert(HEBREW_VALUES['ת'] === 400, 'tav != 400');
    assert(HEBREW_VALUES['ץ'] === 90, 'final tsadi != 90');
    assert(HEBREW_ORDINALS['ת'] === 22, 'tav ordinal != 22');
    assert(HEBREW_SOFIT_VALUES['ך'] === 500, 'sofit kaf != 500');
    assert(HEBREW_SOFIT_VALUES['ץ'] === 900, 'sofit tsadi != 900');
    assert(HEBREW_SOFIT_VALUES['ת'] === 400, 'sofit tav != 400');
    assert(getValues(ALEPH_SOFIT, HEBREW_SOFIT_VALUES).values[0] === 1000,
      'sofit aleph-sofit != 1000');
    assert(HEBREW_ATBASH['א'] === 400 && HEBREW_ATBASH['ת'] === 1, 'atbash mirror broken');
    assert(HEBREW_ATBASH['ם'] === 10, 'atbash final mem != yod value');
    assert(HEBREW_ATBASH_LETTER['א'] === 'ת' && HEBREW_ATBASH_LETTER['ם'] === 'י',
      'atbash letter map broken');
    // the classic cryptogram: בבל reads as ששך under atbash
    assert(getValues('בבל', HEBREW_ATBASH).values.reduce((a, b) => a + b, 0) ===
      getValues('ששך', HEBREW_VALUES).values.reduce((a, b) => a + b, 0),
      'atbash: בבל != ששך');
    assert(HEBREW_KATAN['י'] === 1 && HEBREW_KATAN['כ'] === 2 && HEBREW_KATAN['ת'] === 4,
      'katan reduction broken');
    assert(HEBREW_KATAN['ץ'] === 9, 'katan final tsadi != 9');
    assert(HEBREW_PRE_EXILIC['ר'] === 200 &&
      HEBREW_PRE_EXILIC['ש'] === 3 && HEBREW_PRE_EXILIC['ת'] === 4,
      'pre-exilic shin/tav broken');
    assert(HEBREW_PRE_EXILIC['ך'] === 20 && HEBREW_PRE_EXILIC['ץ'] === 90,
      'pre-exilic finals broken');
    assert(HEBREW_REVERSE_PRE_EXILIC['א'] === 100 &&
      HEBREW_REVERSE_PRE_EXILIC['ק'] === 1 && HEBREW_REVERSE_PRE_EXILIC['ר'] === 2 &&
      HEBREW_REVERSE_PRE_EXILIC['ש'] === 90 && HEBREW_REVERSE_PRE_EXILIC['ת'] === 80,
      'reverse pre-exilic values broken');
    assert(HEBREW_REVERSE_PRE_EXILIC['ך'] === 10 && HEBREW_REVERSE_PRE_EXILIC['ם'] === 8 &&
      HEBREW_REVERSE_PRE_EXILIC['ץ'] === 3, 'reverse pre-exilic finals broken');
    assert(Object.keys(HEBREW_REVERSE_PRE_EXILIC).length === 27,
      'reverse pre-exilic table incomplete');
    assert(HEBREW_AYAK_CHAMBERS.length === 9 &&
      HEBREW_AYAK_CHAMBERS.every((t) => t.length === 3) &&
      Object.keys(HEBREW_AYAK_BACHAR).length === 27, 'nine chambers incomplete');
    assert(HEBREW_AYAK_LETTER['א'] === 'י' && HEBREW_AYAK_LETTER['ק'] === 'א' &&
      HEBREW_AYAK_LETTER['נ'] === 'ך' && HEBREW_AYAK_LETTER['ץ'] === 'ט',
      'ayak bachar exchange broken');
    assert(HEBREW_AYAK_BACHAR['א'] === 10 && HEBREW_AYAK_BACHAR['י'] === 100 &&
      HEBREW_AYAK_BACHAR['ק'] === 1, 'ayak bachar first chamber values broken');
    assert(HEBREW_AYAK_BACHAR['ע'] === 700 && HEBREW_AYAK_BACHAR['נ'] === 500 &&
      HEBREW_AYAK_BACHAR['ך'] === 5 && HEBREW_AYAK_BACHAR['ם'] === 6,
      'ayak bachar sofit-tier values broken');
    assert(HEBREW_CHAMBER_OF['א'] === 'אי״ק' && HEBREW_CHAMBER_OF['ר'] === 'בכ״ר' &&
      HEBREW_CHAMBER_OF['ם'] === 'וס״ם', 'ayak bachar chamber names broken');

    // thousands notation against the standard table
    assert(getValues(ALEPH_SOFIT, HEBREW_VALUES).values[0] === 1000,
      'aleph sofit != 1000');
    assert(getValues('ת¹⁰⁰⁰', HEBREW_VALUES).values[0] === 400000,
      'tav thousands != 400000');
    assert(getValues(ALEPH_SOFIT + 'היה', HEBREW_VALUES)
      .values.reduce((a, b) => a + b, 0) === 1020, 'aleph-sofit ehyeh != 1020');
    assert(baseLetter(ALEPH_SOFIT) === 'א', 'aleph sofit base != aleph');
  })();

  return {
    HEBREW_ORDER, FINAL_TO_BASE, HEBREW_VALUES, HEBREW_ORDINALS,
    HEBREW_SOFIT_VALUES, HEBREW_ATBASH, HEBREW_ATBASH_LETTER, HEBREW_KATAN,
    HEBREW_PRE_EXILIC, HEBREW_REVERSE_PRE_EXILIC,
    HEBREW_AYAK_CHAMBERS, HEBREW_AYAK_BACHAR, HEBREW_AYAK_LETTER, HEBREW_CHAMBER_OF,
    HEBREW_NAMES, baseLetter, spellingValue,
  };
});
