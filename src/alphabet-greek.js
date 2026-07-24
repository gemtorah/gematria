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

  // Greek Pre-Exilic: the "Transposed Hebrew to Greek Biblical Cipher
  // (used in the New Testament)" of shematria.pdf p.5 (endnote viii) —
  // each letter carries a Hebrew pre-exilic value, with τ=3 and υ=4
  // (the Greek analog of ש=3, ת=4). Hand-specified from that table;
  // note ϛ (stigma) reads 200 with sigma here, NOT digamma's 6, and
  // both ϙ and ϡ read 90.
  const GREEK_PRE_EXILIC = {
    'α': 1, 'β': 2, 'γ': 3, 'δ': 4, 'ε': 5, 'ϝ': 6, 'ζ': 7,
    'η': 8, 'θ': 9, 'ι': 10, 'κ': 20, 'λ': 30, 'μ': 40, 'ν': 50,
    'ξ': 60, 'ο': 70, 'π': 80, 'ϙ': 90, 'ρ': 100, 'σ': 200,
    'τ': 3, 'υ': 4, 'φ': 20, 'χ': 40, 'ψ': 50, 'ω': 80, 'ϡ': 90,
  };
  GREEK_ORDER.forEach((L) => {
    GREEK_PRE_EXILIC[L.toUpperCase()] = GREEK_PRE_EXILIC[L];
  });
  GREEK_PRE_EXILIC['ς'] = GREEK_PRE_EXILIC['Σ'] = GREEK_PRE_EXILIC['σ'];
  GREEK_PRE_EXILIC['ϛ'] = GREEK_PRE_EXILIC['Ϛ'] = 200;

  // Greek Reverse Pre-Exilic: the Hebrew Reverse Pre-Exilic transposed —
  // each letter takes the Hebrew reversal value of its pre-exilic value
  // (τ(3)→90, υ(4)→80, φ(20)→10, χ(40)→8, ψ(50)→7, ω(80)→4), matching
  // shematria.com's math (Rev 13:18 notariqon = 1300). VALUE_REVERSAL
  // mirrors the hand-specified HEBREW_REVERSE_PRE_EXILIC ladder; never
  // rebuild as reverse-ordinal, reversed-tier or atbash.
  const VALUE_REVERSAL = {
    1: 100, 2: 200, 3: 90, 4: 80, 5: 70, 6: 60, 7: 50, 8: 40, 9: 30,
    10: 20, 20: 10, 30: 9, 40: 8, 50: 7, 60: 6, 70: 5, 80: 4, 90: 3,
    100: 1, 200: 2,
  };
  const GREEK_REVERSE_PRE_EXILIC = Object.fromEntries(
    Object.entries(GREEK_PRE_EXILIC).map(([L, v]) => [L, VALUE_REVERSAL[v]]));

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
    assert(GREEK_REVERSE_PRE_EXILIC['α'] === 100 && GREEK_REVERSE_PRE_EXILIC['ρ'] === 1 &&
      GREEK_REVERSE_PRE_EXILIC['σ'] === 2 && GREEK_REVERSE_PRE_EXILIC['τ'] === 90 &&
      GREEK_REVERSE_PRE_EXILIC['υ'] === 80, 'greek reverse pre-exilic values broken');
    assert(GREEK_REVERSE_PRE_EXILIC['φ'] === 10 && GREEK_REVERSE_PRE_EXILIC['χ'] === 8 &&
      GREEK_REVERSE_PRE_EXILIC['ψ'] === 7 && GREEK_REVERSE_PRE_EXILIC['ω'] === 4 &&
      GREEK_REVERSE_PRE_EXILIC['ϡ'] === 3, 'greek reverse pre-exilic tail broken');
    assert(GREEK_REVERSE_PRE_EXILIC['ς'] === 2 && GREEK_REVERSE_PRE_EXILIC['ϛ'] === 2 &&
      GREEK_REVERSE_PRE_EXILIC['ϝ'] === 60 && GREEK_REVERSE_PRE_EXILIC['Ω'] === 4,
      'greek reverse pre-exilic variants broken');
    assert(GREEK_PRE_EXILIC['ε'] === 5 && GREEK_PRE_EXILIC['ζ'] === 7 &&
      GREEK_PRE_EXILIC['ρ'] === 100 && GREEK_PRE_EXILIC['σ'] === 200 &&
      GREEK_PRE_EXILIC['τ'] === 3 && GREEK_PRE_EXILIC['υ'] === 4,
      'greek pre-exilic values broken');
    assert(GREEK_PRE_EXILIC['φ'] === 20 && GREEK_PRE_EXILIC['χ'] === 40 &&
      GREEK_PRE_EXILIC['ψ'] === 50 && GREEK_PRE_EXILIC['ω'] === 80 &&
      GREEK_PRE_EXILIC['ϙ'] === 90 && GREEK_PRE_EXILIC['ϡ'] === 90,
      'greek pre-exilic tail values broken');
    assert(GREEK_PRE_EXILIC['ϝ'] === 6 && GREEK_PRE_EXILIC['ϛ'] === 200 &&
      GREEK_PRE_EXILIC['ς'] === 200 && GREEK_PRE_EXILIC['Υ'] === 4,
      'greek pre-exilic variants broken');
  })();

  return { GREEK_ORDER, GREEK_VALUES, GREEK_ORDINALS,
           GREEK_PRE_EXILIC, GREEK_REVERSE_PRE_EXILIC, GREEK_NAMES };
});
