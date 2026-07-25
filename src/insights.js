/* ==========================================================================
 * insights.js — number insights: factor structure and named forms of a total.
 * Part of the Gematria module set (see gematria.js for the layout).
 * ========================================================================== */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(require('./core.js'));
  } else {
    const M = root.GematriaModules = root.GematriaModules || {};
    M.insights = factory(M.core);
  }
})(globalThis, function (core) {
  'use strict';
  const { assert, digitalRoot } = core;

  const DIGIT_SUP = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
  const toSuperscript = (n) => String(n).split('').map((d) => DIGIT_SUP[+d]).join('');

  const ordinal = (n) => {
    const t = n % 100, d = n % 10;
    const suf = (t >= 11 && t <= 13) ? 'th'
      : d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th';
    return n + suf;
  };

  /* prime factorization as [prime, exponent] pairs, ascending */
  function factorize(n) {
    const out = [];
    let m = n;
    for (let p = 2; p * p <= m; p += p === 2 ? 1 : 2) {
      if (m % p) continue;
      let e = 0;
      while (m % p === 0) { m /= p; e++; }
      out.push([p, e]);
    }
    if (m > 1) out.push([m, 1]);
    return out;
  }

  /* 1-based index of a prime (2 is the 1st); null when p is out of range */
  const PRIME_INDEX_LIMIT = 2000000;
  function primeIndex(p) {
    if (p < 2 || p > PRIME_INDEX_LIMIT) return null;
    const composite = new Uint8Array(p + 1);
    let count = 0;
    for (let i = 2; i <= p; i++) {
      if (composite[i]) continue;
      count++;
      for (let j = i * i; j <= p; j += i) composite[j] = 1;
    }
    return count;
  }

  // exact k such that shape(k) === n; the float seed only narrows the search,
  // the confirmation is integer arithmetic
  const shapeIndex = (n, shape, seed) => {
    const k = Math.round(seed);
    for (const c of [k - 1, k, k + 1]) if (c >= 1 && shape(c) === n) return c;
    return null;
  };

  /* Everything the studio wants to say about one total. */
  function analyzeNumber(n) {
    if (!Number.isInteger(n) || n < 1 || n > Number.MAX_SAFE_INTEGER) return null;
    const factors = factorize(n);
    const isPrime = n > 1 && factors.length === 1 && factors[0][1] === 1;

    // non-trivial divisor pairs a × b (a ≤ b) + aliquot sum for perfection
    const pairs = [];
    let aliquot = n > 1 ? 1 : 0;
    for (let a = 2; a * a <= n; a++) {
      if (n % a) continue;
      const b = n / a;
      pairs.push([a, b]);
      aliquot += a + (a !== b ? b : 0);
    }

    const props = [];
    // perfect powers: report the tightest form (largest exponent)
    for (let e = Math.floor(Math.log2(n)); e >= 2; e--) {
      const k = Math.round(n ** (1 / e));
      const hit = [k - 1, k, k + 1].find((c) => c >= 2 && c ** e === n);
      if (hit) {
        const name = e === 2 ? 'perfect square' : e === 3 ? 'perfect cube' : 'perfect power';
        props.push(`${name} — ${hit}${toSuperscript(e)}`);
        break;
      }
    }
    const tri = shapeIndex(n, (k) => k * (k + 1) / 2, (Math.sqrt(8 * n + 1) - 1) / 2);
    if (tri && tri > 1) props.push(`triangular — T(${tri}) = 1+2+…+${tri}`);
    const star = shapeIndex(n, (k) => 6 * k * (k - 1) + 1, (3 + Math.sqrt(6 * n + 3)) / 6);
    if (star && star > 1) props.push(`star (hexagram) number — the ${ordinal(star)}`);
    const hex = shapeIndex(n, (k) => 3 * k * (k - 1) + 1, (3 + Math.sqrt(12 * n - 3)) / 6);
    if (hex && hex > 1) props.push(`centered hexagonal — the ${ordinal(hex)}`);
    let fa = 1, fb = 1, fi = 2;
    while (fb < n) { const next = fa + fb; fa = fb; fb = next; fi++; }
    if (fb === n && n > 1) props.push(`Fibonacci — F(${fi})`);
    const s = String(n);
    if (n > 10 && s === [...s].reverse().join('')) {
      props.push([...s].every((c) => c === s[0]) ? 'repdigit' : 'palindrome');
    }
    if (n > 1 && aliquot === n) props.push('perfect number — equals the sum of its divisors');

    return {
      n, factors, isPrime,
      primeIndex: isPrime ? primeIndex(n) : null,
      pairs, props,
      digitalRoot: digitalRoot(n),
    };
  }

  /* ---- load-time validation (fail loudly) --------------------------------- */
  (function validate() {
    const a888 = analyzeNumber(888);
    assert(a888.factors.map(([p, e]) => p + '^' + e).join(' ') === '2^3 3^1 37^1',
      '888 factorization broken');
    assert(a888.pairs.some(([a, b]) => a === 8 && b === 111), '888 missing 8 × 111');
    assert(a888.pairs.some(([a, b]) => a === 24 && b === 37), '888 missing 24 × 37');
    assert(a888.props.includes('repdigit'), '888 not seen as repdigit');
    const a37 = analyzeNumber(37);
    assert(a37.isPrime && a37.primeIndex === 12, '37 not the 12th prime');
    assert(a37.props.some((p) => p.includes('star')), '37 not a star number');
    assert(analyzeNumber(5476).props.some((p) => p.includes('74²')), '5476 != 74²');
    assert(analyzeNumber(2701).props.some((p) => p.startsWith('triangular — T(73)')),
      '2701 not T(73)');
    assert(analyzeNumber(1).props.length === 0 && analyzeNumber(1).pairs.length === 0,
      'unity over-decorated');
  })();

  return { toSuperscript, ordinal, factorize, primeIndex, analyzeNumber };
});
