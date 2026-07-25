/* ==========================================================================
 * gematria.js — assembles the Gematria facade from the src/ modules.
 *
 * Module layout (one calculation per file, loaded in dependency order):
 *   src/core.js              script-independent text/number machinery
 *   src/alphabet-hebrew.js   Hebrew value tables (standard, sofit, atbash, katan)
 *   src/alphabet-greek.js    Greek isopsephy tables
 *   src/alphabet-english.js  English cipher tables
 *   src/ciphers.js           named cipher registry + script detection
 *   src/insights.js          number insights (factors, primes, named forms)
 *   src/milui-options.js     inventory of letter-name spellings
 *   src/milui-schemes.js     one self-contained declaration per milui scheme
 *   src/milui-calc.js        milui, milui d'milui and spectrum calculations
 *
 * Each module validates its own tables at load; cross-scheme identities
 * (the Name's signature totals, the milui² identity) live in milui-calc.js.
 * The assembled facade keeps the original flat `Gematria` API, so app.js
 * and any Node consumer (`require('./gematria.js')`) are unaffected.
 * ========================================================================== */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(
      require('./src/core.js'),
      require('./src/alphabet-hebrew.js'),
      require('./src/alphabet-greek.js'),
      require('./src/alphabet-english.js'),
      require('./src/ciphers.js'),
      require('./src/insights.js'),
      require('./src/milui-options.js'),
      require('./src/milui-schemes.js'),
      require('./src/milui-calc.js'));
  } else {
    const M = root.GematriaModules || {};
    const order = ['core', 'hebrew', 'greek', 'english', 'ciphers',
      'insights', 'miluiOptions', 'miluiSchemes', 'miluiCalc'];
    for (const name of order) {
      if (!M[name]) {
        throw new Error('gematria.js: module "' + name +
          '" not loaded — check the src/ script tags in index.html');
      }
    }
    root.Gematria = factory(M.core, M.hebrew, M.greek, M.english,
      M.ciphers, M.insights, M.miluiOptions, M.miluiSchemes, M.miluiCalc);
  }
})(globalThis, function (core, hebrew, greek, english, ciphers, insights,
                         miluiOptions, miluiSchemes, miluiCalc) {
  'use strict';
  const Gematria = Object.assign({}, core, hebrew, greek, english,
    ciphers, insights, miluiOptions, miluiSchemes, miluiCalc);
  delete Gematria.assert;                 // internal self-check helper
  return Gematria;
});
