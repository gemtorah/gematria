/* ==========================================================================
 * milui-schemes.js — one self-contained declaration per milui scheme.
 * Part of the Gematria module set (see gematria.js for the layout).
 *
 * Each scheme owns its complete rule: display metadata, the signature value
 * of the Name, and an explicit `spellings` table naming the MILUI_OPTIONS
 * variant for exactly the letters it varies. Every letter NOT listed takes
 * its default spelling — no blanket strategy can sweep in an unintended
 * variant (that is how ד once picked up דלית under Yudin schemes; ד is דלת, three
 * letters, under every named scheme). Adding a scheme = adding one entry.
 *
 * The classic schemes are the mater filling policies, each signed by its
 * value on the Name:
 *   Yudin     ע״ב 72 — yod-filled:          יוד הי ויו הי
 *   Yudin-Vav ס״ג 63 — yodin, vav ואו:      יוד הי ואו הי
 *   Alafin    מ״ה 45 — alef-filled:         יוד הא ואו הא
 *   Hehin     ב״ן 52 — heh-filled:          יוד הה וו הה
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

  /* Schemes are named by their alphabet-wide filling policy (yod-filled,
   * alef-filled, heh-filled letter names), since the cipher applies to any
   * word. The classic four keep their received signature — the policy's
   * value on the Name — as the Hebrew label (ע״ב = 72 …); the two
   * non-classical policies carry descriptive labels instead of coined
   * signature abbreviations. */
  const SCHEMES = {
    av:  { name: 'Yudin', heb: 'ע״ב', value: 72,
           spellings: { 'ה': 'yod', 'ו': 'yod', 'פ': 'yod', 'ת': 'yod' } },
    sag: { name: 'Yudin-Vav', heb: 'ס״ג', value: 63,
           spellings: { 'ה': 'yod', 'ו': 'aleph', 'פ': 'yod', 'ת': 'yod' } },
    mah: { name: 'Alafin', heb: 'מ״ה', value: 45,
           spellings: { 'ו': 'aleph', 'ת': 'aleph' } },
    ban: { name: 'Hehin', heb: 'ב״ן', value: 52,
           spellings: { 'ה': 'heh', 'פ': 'heh' } },
    nad: { name: 'Plain-Vav', heb: 'הא–ויו', value: 54,
           spellings: { 'ו': 'yod' } },
    ad:  { name: "Ha'i", heb: 'מילוי האי', value: 74,
           spellings: { 'ה': 'extended', 'ו': 'yod' } },
    standard: { name: 'Standard', heb: 'רגיל', value: null,
                spellings: { 'ו': 'yod', 'פ': 'heh', 'ת': 'yod' } },
    // reads the user's table below instead of choosing a variant
    custom: { name: 'Custom', heb: 'מילוי אישי', value: null, editable: true },
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
