/* ==========================================================================
 * milui-schemes.js — one self-contained declaration per milui scheme.
 * Part of the Gematria module set (see gematria.js for the layout).
 *
 * Each scheme owns its complete rule: display metadata, the signature value
 * of the Name, and an explicit `spellings` table naming the MILUI_OPTIONS
 * variant for exactly the letters it varies. Every letter NOT listed takes
 * its default spelling — no blanket strategy can sweep in an unintended
 * variant (that is how ד once picked up דלית under AV/SaG; ד is דלת, three
 * letters, under every named scheme). Adding a scheme = adding one entry.
 *
 * The classic schemes come from the fillings of the Name:
 *   AV  ע״ב 72 — yodin:            יוד הי ויו הי
 *   SaG ס״ג 63 — yodin, vav ואו:   יוד הי ואו הי
 *   MaH מ״ה 45 — alphin:           יוד הא ואו הא
 *   BaN ב״ן 52 — hehin:            יוד הה וו הה
 * ========================================================================== */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(
      require('./core.js'),
      require('./alphabet-hebrew.js'),
      require('./milui-options.js'));
  } else {
    const M = root.GematriaModules = root.GematriaModules || {};
    M.miluiSchemes = factory(M.core, M.hebrew, M.miluiOptions);
  }
})(globalThis, function (core, hebrew, options) {
  'use strict';
  const { assert, stripMarks } = core;
  const { HEBREW_ORDER, baseLetter } = hebrew;
  const { MILUI_OPTIONS, validateSpelling } = options;

  const SCHEMES = {
    av:  { name: 'AV',  heb: 'ע״ב', value: 72,
           spellings: { 'ה': 'yod', 'ו': 'yod', 'פ': 'yod', 'ת': 'yod' } },
    sag: { name: 'SaG', heb: 'ס״ג', value: 63,
           spellings: { 'ה': 'yod', 'ו': 'aleph', 'פ': 'yod', 'ת': 'yod' } },
    mah: { name: 'MaH', heb: 'מ״ה', value: 45,
           spellings: { 'ו': 'aleph', 'ת': 'aleph' } },
    ban: { name: 'BaN', heb: 'ב״ן', value: 52,
           spellings: { 'ה': 'heh', 'פ': 'heh' } },
    nad: { name: 'NaD', heb: 'נ״ד', value: 54,
           spellings: { 'ו': 'yod' } },
    ad:  { name: 'AD',  heb: 'ע״ד', value: 74,
           spellings: { 'ה': 'extended', 'ו': 'yod' } },
    standard: { name: 'Standard', heb: 'רגיל', value: null,
                spellings: { 'ו': 'yod', 'פ': 'heh', 'ת': 'yod' } },
    // reads the user's table below instead of choosing a variant
    custom: { name: 'Custom', heb: 'מילוי מים', value: null, editable: true },
  };

  /* ---- custom (user-defined) milui ---------------------------------------- */

  // One full spelling per base letter; the 'custom' scheme reads this table
  // directly instead of choosing a MILUI_OPTIONS variant.
  const DEFAULT_CUSTOM_MILUI = {
    'א': 'אלף', 'ב': 'בית', 'ג': 'גמל', 'ד': 'דלת', 'ה': 'האי',
    'ו': 'ויו', 'ז': 'זין', 'ח': 'חית', 'ט': 'טית', 'י': 'יוד',
    'כ': 'כיף', 'ל': 'למד', 'מ': 'מים', 'נ': 'נון', 'ס': 'סמך',
    'ע': 'עין', 'פ': 'פאי', 'צ': 'צדי', 'ק': 'קוף', 'ר': 'ריש',
    'ש': 'שין', 'ת': 'תיו',
  };

  let CUSTOM_MILUI = { ...DEFAULT_CUSTOM_MILUI };

  function setCustomMilui(table) {
    const next = {};
    for (const L of HEBREW_ORDER) {
      const sp = table && table[L];
      const err = validateSpelling(L, sp);
      if (err) throw new Error('custom milui ' + L + ': ' + err);
      next[L] = stripMarks(String(sp)).trim();
    }
    CUSTOM_MILUI = next;
  }

  const getCustomMilui = () => ({ ...CUSTOM_MILUI });

  /* ---- the one place a scheme is applied to a letter ----------------------- */

  function chooseSpelling(letter, scheme) {
    const base = baseLetter(stripMarks(letter));
    if (scheme === 'custom') return CUSTOM_MILUI[base] || null;
    const opts = MILUI_OPTIONS[base];
    if (!opts) return null;
    const spec = SCHEMES[scheme] || SCHEMES.standard;
    const key = (spec.spellings || {})[base] || 'default';
    return opts[key] || opts.default;
  }

  /* ---- load-time validation (fail loudly) --------------------------------- */
  (function validate() {
    // every declared variant exists in the inventory
    for (const [skey, spec] of Object.entries(SCHEMES)) {
      for (const [letter, variant] of Object.entries(spec.spellings || {})) {
        assert(MILUI_OPTIONS[letter] && variant in MILUI_OPTIONS[letter],
          'scheme ' + skey + ': spelling ' + letter + '->' + variant + ' missing');
      }
    }
    // dalet keeps its plain three-letter name under every named scheme —
    // the regression that motivated the explicit tables
    for (const skey of Object.keys(SCHEMES)) {
      if (skey === 'custom') continue;
      assert(chooseSpelling('ד', skey) === 'דלת', skey + ': dalet != דלת');
    }
    // the shipped custom table is itself valid
    for (const L of HEBREW_ORDER) {
      assert(validateSpelling(L, DEFAULT_CUSTOM_MILUI[L]) === null,
        'default custom milui invalid for ' + L);
    }
  })();

  return {
    SCHEMES, DEFAULT_CUSTOM_MILUI,
    setCustomMilui, getCustomMilui, chooseSpelling,
  };
});
