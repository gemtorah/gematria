/* ==========================================================================
 * alphabet-greek.js — Greek isopsephy tables.
 * Part of the Gematria module set (see gematria.js for the layout).
 * ========================================================================== */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(require('./core.js'));
  } else {
    const M = root.GematriaModules = root.GematriaModules || {};
    M.greek = factory(M.core);
  }
})(globalThis, function (core) {
  'use strict';
  const { assert, tiered } = core;

  // 27-letter numeric alphabet: digamma (6), koppa (90), sampi (900) included.
  const GREEK_ORDER = Array.from('αβγδεϝζηθικλμνξοπϙρστυφχψωϡ');
  const GREEK_EQUIV = { 'ς': 'σ', 'ϛ': 'ϝ' };            // final sigma, stigma

  const GREEK_VALUES = {};
  const GREEK_ORDINALS = {};
  GREEK_ORDER.forEach((L, i) => {
    GREEK_VALUES[L] = tiered(i);
    GREEK_ORDINALS[L] = i + 1;
    const up = L.toUpperCase();
    GREEK_VALUES[up] = GREEK_VALUES[L];
    GREEK_ORDINALS[up] = GREEK_ORDINALS[L];
  });
  for (const [variant, base] of Object.entries(GREEK_EQUIV)) {
    GREEK_VALUES[variant] = GREEK_VALUES[base];
    GREEK_ORDINALS[variant] = GREEK_ORDINALS[base];
    const up = variant.toUpperCase();
    GREEK_VALUES[up] = GREEK_VALUES[base];
    GREEK_ORDINALS[up] = GREEK_ORDINALS[base];
  }

  const GREEK_NAMES = {
    'α': 'Alpha', 'β': 'Beta', 'γ': 'Gamma', 'δ': 'Delta', 'ε': 'Epsilon',
    'ϝ': 'Digamma', 'ζ': 'Zeta', 'η': 'Eta', 'θ': 'Theta', 'ι': 'Iota',
    'κ': 'Kappa', 'λ': 'Lambda', 'μ': 'Mu', 'ν': 'Nu', 'ξ': 'Xi',
    'ο': 'Omicron', 'π': 'Pi', 'ϙ': 'Koppa', 'ρ': 'Rho', 'σ': 'Sigma',
    'τ': 'Tau', 'υ': 'Upsilon', 'φ': 'Phi', 'χ': 'Chi', 'ψ': 'Psi',
    'ω': 'Omega', 'ϡ': 'Sampi', 'ς': 'Sigma', 'ϛ': 'Stigma',
  };

  /* ---- load-time validation (fail loudly) --------------------------------- */
  (function validate() {
    assert(GREEK_VALUES['ω'] === 800 && GREEK_VALUES['Ω'] === 800, 'omega != 800');
    assert(GREEK_VALUES['ϡ'] === 900, 'sampi != 900');
    assert(GREEK_VALUES['ς'] === 200, 'final sigma != 200');
  })();

  return { GREEK_ORDER, GREEK_VALUES, GREEK_ORDINALS, GREEK_NAMES };
});
