/* ==========================================================================
 * alphabet-english.js — English cipher tables (ordinal, Sumerian, reverse,
 * tiered isopsephy). Part of the Gematria module set (see gematria.js).
 * ========================================================================== */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(require('./core.js'));
  } else {
    const M = root.GematriaModules = root.GematriaModules || {};
    M.english = factory(M.core);
  }
})(globalThis, function (core) {
  'use strict';
  const { assert, tiered } = core;

  const ENGLISH_ORDER = Array.from('abcdefghijklmnopqrstuvwxyz');
  const _enMap = (fn) => {
    const m = {};
    ENGLISH_ORDER.forEach((L, i) => {
      m[L] = fn(i);
      m[L.toUpperCase()] = m[L];
    });
    return m;
  };
  const ENGLISH_ORDINAL = _enMap((i) => i + 1);
  const ENGLISH_SUMERIAN = _enMap((i) => (i + 1) * 6);
  const ENGLISH_REVERSE = _enMap((i) => 26 - i);
  const ENGLISH_ISOPSEPHY = _enMap(tiered);
  // Digital root of the ordinal value: a–i = 1–9, j–r = 1–9, s–z = 1–8.
  const ENGLISH_REDUCTION = _enMap((i) => (i % 9) + 1);

  /* ---- load-time validation (fail loudly) --------------------------------- */
  (function validate() {
    assert(ENGLISH_SUMERIAN['z'] === 156, 'sumerian z != 156');
    assert(ENGLISH_ISOPSEPHY['z'] === 800, 'isopsephy z != 800');
    assert(ENGLISH_REVERSE['A'] === 26, 'reverse A != 26');
    assert(ENGLISH_REDUCTION['i'] === 9 && ENGLISH_REDUCTION['j'] === 1 &&
      ENGLISH_REDUCTION['z'] === 8, 'reduction i/j/z != 9/1/8');
  })();

  return {
    ENGLISH_ORDER, ENGLISH_ORDINAL, ENGLISH_SUMERIAN,
    ENGLISH_REVERSE, ENGLISH_ISOPSEPHY, ENGLISH_REDUCTION,
  };
});
