/* ==========================================================================
 * core.js — script-independent text and number machinery.
 * Part of the Gematria module set (see gematria.js for the layout).
 *
 * Owns: grapheme handling, mark stripping, the tiered value rule,
 * thousands-superscript notation, generic text→values evaluation and the
 * digital root. No alphabet table lives here.
 * ========================================================================== */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else (root.GematriaModules = root.GematriaModules || {}).core = factory();
})(globalThis, function () {
  'use strict';

  function assert(cond, msg) {
    if (!cond) throw new Error('gematria self-check failed: ' + msg);
  }

  // 1..9, 10..90, 100..900 — the tier rule shared by Hebrew, Greek and
  // English isopsephy alphabets.
  const tiered = (i) => (i < 9 ? i + 1 : i < 18 ? (i - 8) * 10 : (i - 17) * 100);

  const stripMarks = (text) =>
    text.normalize('NFD').replace(/\p{M}+/gu, '').normalize('NFC');

  const _seg = typeof Intl !== 'undefined' && Intl.Segmenter
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;
  const graphemes = (text) => {
    const norm = text.normalize('NFC');
    if (_seg) return Array.from(_seg.segment(norm), (s) => s.segment);
    return Array.from(norm);
  };

  // Superscript digits mark thousands notation: a letter followed by a
  // superscript run multiplies its value (א¹⁰⁰⁰ = 1 × 1000 = 1000). The
  // ¹⁰⁰⁰ mark alone is the rabati (רבתי, "large letter") mark — any letter
  // it follows counts ×1000, so ב¹⁰⁰⁰ = 2000.
  const SUPERSCRIPT_DIGITS = {
    '⁰': 0, '¹': 1, '²': 2, '³': 3, '⁴': 4,
    '⁵': 5, '⁶': 6, '⁷': 7, '⁸': 8, '⁹': 9,
  };
  const RABATI_MARK = '¹⁰⁰⁰';
  const ALEPH_SOFIT = 'א' + RABATI_MARK;
  const stripSuperscripts = (s) =>
    Array.from(s).filter((c) => !(c in SUPERSCRIPT_DIGITS)).join('');

  /* Kept graphemes + values for a chunk of text under one cipher map.
   * A letter followed by superscript digits is kept as one token whose
   * value is letter × number (א¹⁰⁰⁰ = 1000). */
  function getValues(text, map) {
    const kept = [];
    const values = [];
    const gs = graphemes(text);
    for (let i = 0; i < gs.length; i++) {
      const key = stripMarks(gs[i]);
      if (!(key in map)) continue;
      let j = i + 1, mult = '';
      while (j < gs.length && gs[j] in SUPERSCRIPT_DIGITS) mult += SUPERSCRIPT_DIGITS[gs[j++]];
      if (mult) {
        kept.push(gs.slice(i, j).join(''));
        values.push(map[key] * Number(mult));
        i = j - 1;
      } else {
        kept.push(gs[i]);
        values.push(map[key]);
      }
    }
    return { kept, values };
  }

  /* Running-sum transform for building-value ciphers (מספר בונה): each
   * letter counts as itself plus all letters before it in the word, so
   * אחד = 1 + (1+8) + (1+8+4) = 23. */
  const cumulative = (values) => {
    let run = 0;
    return values.map((v) => (run += v));
  };

  /* Position-multiplier transform for location ciphers (גימטריה מיקום):
   * each letter's value is multiplied by its 1-based position in the word,
   * so אלהים = 1×1 + 30×2 + 5×3 + 10×4 + 40×5 = 316. */
  const positional = (values) => values.map((v, i) => v * (i + 1));

  const digitalRoot = (n) => {
    n = Math.abs(n);
    while (n > 9) n = String(n).split('').reduce((a, d) => a + +d, 0);
    return n;
  };

  /* ---- load-time validation (fail loudly) --------------------------------- */
  (function validate() {
    assert(tiered(0) === 1 && tiered(9) === 10 && tiered(21) === 400, 'tier rule broken');
    assert(cumulative([1, 8, 4]).join() === '1,9,13' &&
      cumulative([1, 8, 4]).reduce((a, b) => a + b, 0) === 23, 'cumulative rule broken');
    assert(positional([1, 30, 5, 10, 40]).join() === '1,60,15,40,200' &&
      positional([1, 30, 5, 10, 40]).reduce((a, b) => a + b, 0) === 316,
      'positional rule broken');
    assert(digitalRoot(5476) === 4, 'digital root broken');
    const toy = { 'א': 1, 'ב': 2 };
    assert(getValues(ALEPH_SOFIT, toy).values[0] === 1000, 'superscript multiplier broken');
    assert(getValues(ALEPH_SOFIT, toy).kept[0] === ALEPH_SOFIT, 'superscript token not kept whole');
    assert(getValues('ב' + RABATI_MARK, toy).values[0] === 2000, 'rabati bet != 2000');
  })();

  return {
    assert, tiered, stripMarks, graphemes, getValues, cumulative, positional, digitalRoot,
    SUPERSCRIPT_DIGITS, ALEPH_SOFIT, RABATI_MARK, stripSuperscripts,
  };
});
