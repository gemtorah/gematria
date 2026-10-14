/* ==========================================================================
 * milui-options.js — the inventory of Hebrew letter-name spellings.
 * Part of the Gematria module set (see gematria.js for the layout).
 *
 * This module only says which spellings EXIST for each letter; it never
 * decides which one a scheme uses — that choice belongs to milui-schemes.js.
 * Keys name the mater the variant adds, so a mistake is visible on the line;
 * validated below. A variant listed here (e.g. דלית) is available to the
 * spectrum enumeration and to the custom table without any scheme using it.
 * ========================================================================== */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(require('./core.js'), require('./alphabet-hebrew.js'));
  } else {
    const M = root.GematriaModules = root.GematriaModules || {};
    M.miluiOptions = factory(M.core, M.hebrew);
  }
})(globalThis, function (core, hebrew) {
  'use strict';
  const { assert, stripMarks } = core;
  const { HEBREW_VALUES, baseLetter } = hebrew;

  const MILUI_OPTIONS = {
    'א': { default: 'אלף' },
    'ב': { default: 'בית', defective: 'בת' },
    'ג': { default: 'גימל', defective: 'גמל' },
    'ד': { default: 'דלת', yod: 'דלית' },
    'ה': { default: 'הא', yod: 'הי', heh: 'הה', extended: 'האי' },
    'ו': { default: 'וו', yod: 'ויו', aleph: 'ואו' },
    'ז': { default: 'זין' },
    'ח': { default: 'חית', defective: 'חת' },
    'ט': { default: 'טית', defective: 'טת' },
    'י': { default: 'יוד' },
    'כ': { default: 'כף' },
    'ל': { default: 'למד' },
    'מ': { default: 'מם' },
    'נ': { default: 'נון' },
    'ס': { default: 'סמך' },
    'ע': { default: 'עין' },
    'פ': { default: 'פא', yod: 'פי', heh: 'פה' },
    'צ': { default: 'צדי', extended: 'צדיק' },
    'ק': { default: 'קוף' },
    'ר': { default: 'ריש', defective: 'רש' },
    'ש': { default: 'שין', defective: 'שן' },
    'ת': { default: 'תו', yod: 'תיו', aleph: 'תאו' },
  };

  const MATER_KEY = { 'י': 'yod', 'א': 'aleph', 'ה': 'heh' };

  /* Returns null if `spelling` is a valid milui for `letter`, else a reason. */
  function validateSpelling(letter, spelling) {
    const s = stripMarks(String(spelling || '')).trim();
    if (!s) return 'empty spelling';
    const chars = Array.from(s);
    if (!chars.every((c) => c in HEBREW_VALUES)) return 'non-Hebrew character';
    if (baseLetter(chars[0]) !== letter) return 'must start with ' + letter;
    return null;
  }

  /* ---- load-time validation (fail loudly) --------------------------------- */
  (function validate() {
    // named keys only, mater variants carry their mater
    const known = new Set([...Object.values(MATER_KEY), 'default', 'defective', 'extended']);
    for (const [letter, variants] of Object.entries(MILUI_OPTIONS)) {
      assert('default' in variants, letter + ": missing 'default'");
      for (const [name, spelling] of Object.entries(variants)) {
        assert(known.has(name), letter + ': unknown variant ' + name);
        assert(Array.from(spelling).every((c) => c in HEBREW_VALUES),
          letter + ': non-Hebrew char in ' + spelling);
      }
      for (const [mater, key] of Object.entries(MATER_KEY)) {
        if (key in variants) {
          const tail = Array.from(variants[key]).slice(1);
          assert(tail.includes(mater),
            letter + ': ' + key + ' variant lacks mater ' + mater);
        }
      }
    }
  })();

  return { MILUI_OPTIONS, MATER_KEY, validateSpelling };
});
