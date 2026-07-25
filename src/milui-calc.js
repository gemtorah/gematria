/* ==========================================================================
 * milui-calc.js — milui, milui d'milui and full-spectrum calculations.
 * Part of the Gematria module set (see gematria.js for the layout).
 *
 * Pure consumers of milui-schemes: given a phrase and a scheme key they
 * total the fillings; no scheme knowledge lives here.
 * ========================================================================== */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(
      require('./core.js'),
      require('./alphabet-hebrew.js'),
      require('./milui-options.js'),
      require('./milui-schemes.js'));
  } else {
    const M = root.GematriaModules = root.GematriaModules || {};
    M.miluiCalc = factory(M.core, M.hebrew, M.miluiOptions, M.miluiSchemes);
  }
})(globalThis, function (core, hebrew, options, schemes) {
  'use strict';
  const { assert, graphemes, stripMarks } = core;
  const { baseLetter, spellingValue } = hebrew;
  const { MILUI_OPTIONS } = options;
  const { SCHEMES, chooseSpelling } = schemes;

  /* Milui total of a phrase under one scheme (Hebrew letters only). */
  function miluiTotal(text, scheme) {
    let total = 0;
    for (const g of graphemes(text)) {
      const sp = chooseSpelling(g, scheme);
      if (sp) total += spellingValue(sp);
    }
    return total;
  }

  /* ---- milui d'milui: the filling of the filling --------------------------
   * Each letter of a letter's own spelling is itself spelled out under the
   * same scheme, and those spelling values are summed. */

  /* Milui-d'milui value of one letter; null for non-Hebrew input. */
  function miluiDmiluiValue(letter, scheme) {
    const sp = chooseSpelling(letter, scheme);
    if (!sp) return null;
    let total = 0;
    for (const c of sp) total += spellingValue(chooseSpelling(c, scheme));
    return total;
  }

  /* Milui-d'milui total of a phrase under one scheme (Hebrew letters only). */
  function miluiDmiluiTotal(text, scheme) {
    let total = 0;
    for (const g of graphemes(text)) {
      const v = miluiDmiluiValue(g, scheme);
      if (v) total += v;
    }
    return total;
  }

  /* Full milui spectrum: every reachable total via Minkowski sums —
   * stays small even when `combos` is astronomically large. */
  function enumerateMilui(text) {
    let combos = 1n;
    const valueSets = [];
    const perLetter = [];
    for (const g of graphemes(text)) {
      const base = baseLetter(stripMarks(g));
      const opts = MILUI_OPTIONS[base];
      if (!opts) continue;
      const spellings = Object.values(opts);
      const vals = [...new Set(spellings.map(spellingValue))].sort((a, b) => a - b);
      combos *= BigInt(spellings.length);
      valueSets.push(vals);
      perLetter.push({ letter: base, values: vals });
    }
    let totals = new Set([0]);
    for (const set of valueSets) {
      const next = new Set();
      for (const a of totals) for (const b of set) next.add(a + b);
      totals = next;
    }
    const distinct = [...totals].sort((a, b) => a - b);
    return {
      combos,
      distinct,
      nDistinct: distinct.length,
      min: distinct[0] ?? 0,
      max: distinct[distinct.length - 1] ?? 0,
      perLetter,
      hasLetters: valueSets.length > 0,
    };
  }

  /* ---- load-time validation (fail loudly) --------------------------------- */
  (function validate() {
    // the Name spells to each scheme's signature value
    const NAME = 'יהוה';
    for (const [skey, spec] of Object.entries(SCHEMES)) {
      if (spec.value != null) {
        assert(miluiTotal(NAME, skey) === spec.value,
          skey + ': ' + NAME + ' != ' + spec.value);
      }
    }
    // dalet's plain name: ד+ל+ת = 434 under the schemes that once mis-spelled it
    assert(miluiTotal('ד', 'sag') === 434, 'sag: dalet milui != 434');
    assert(miluiTotal('ד', 'av') === 434, 'av: dalet milui != 434');

    // milui d'milui: hand-computed landmark (א → אלף → אלף,למד,פא under MaH
    // = 111+74+81) plus the defining identity — the filling of the filling
    // equals the plain milui of the concatenated first filling
    assert(miluiDmiluiValue('א', 'mah') === 266, 'aleph milui² MaH != 266');
    for (const skey of Object.keys(SCHEMES)) {
      const filled = graphemes(NAME).map((g) => chooseSpelling(g, skey)).join('');
      assert(miluiDmiluiTotal(NAME, skey) === miluiTotal(filled, skey),
        skey + ": milui² != milui of the filling");
    }
  })();

  return { miluiTotal, miluiDmiluiValue, miluiDmiluiTotal, enumerateMilui };
});
