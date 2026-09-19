/* ==========================================================================
 * ciphers.js — the named cipher registry and script detection.
 * Part of the Gematria module set (see gematria.js for the layout).
 *
 * Every cipher is a named entry pointing at a table owned by its alphabet
 * module; adding a cipher = adding one registry line, no logic changes.
 * An optional `transform` reshapes a word's letter values after lookup
 * (e.g. the running sum of מספר האחור / achorayim, or the position
 * multiplier of גימטריה מיקום). An optional `source` cites the text the
 * cipher's name comes from ({ quote, cite }), shown under the artwork
 * title and in the report. An optional `term` names the cipher in
 * Abulafia's own vocabulary (שווי / מגרעת / תוספת, the שמ"ת triad of
 * אוצר עדן הגנוז); the studio shows the three side by side whenever one
 * of them is selected. An optional `groups` maps a word's letters
 * to per-letter labels showing how each value arose: transform steps
 * (י יה יהו / ל×2) or, with `substitution: true`, the letter the cipher
 * actually reads (atbash mirrors יהוה into מצפץ) shown alongside the
 * original rather than replacing it. An optional `families` adds a second
 * per-letter label naming the letter's classification group (its ayak
 * bachar chamber), surfaced in tooltips. An optional
 * `fold` contracts a whole word to a single token/value pair after
 * lookup — the word-reduced cipher folds each word to the digital root
 * of its reduced letter sum. `building: true` marks running-sum
 * ciphers whose grid view draws every prefix of a word as its own
 * letter/value group (י · יה · יהו · יהוה); an optional `steps` gives a
 * building cipher its own run of [from, to) letter slices (the
 * out-and-back run of רצוא ושוב, the up-then-down ladder of תוספת
 * ומגרעת) in place of the plain prefix run.
 * ========================================================================== */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(
      require('./core.js'),
      require('./alphabet-hebrew.js'),
      require('./alphabet-greek.js'),
      require('./alphabet-english.js'));
  } else {
    const M = root.GematriaModules = root.GematriaModules || {};
    M.ciphers = factory(M.core, M.hebrew, M.greek, M.english);
  }
})(globalThis, function (core, hebrew, greek, english) {
  'use strict';
  const { assert, stripMarks } = core;

  // Atbash breakdowns label each letter with its mirror — the letter whose
  // value is actually summed — written in final form at word end (בבל → ששך).
  const BASE_TO_FINAL = Object.fromEntries(
    Object.entries(hebrew.FINAL_TO_BASE).map(([fin, base]) => [base, fin]));
  const atbashLetters = (letters) => letters.map((l, i) => {
    const m = hebrew.HEBREW_ATBASH_LETTER[l] || l;
    return i === letters.length - 1 ? (BASE_TO_FINAL[m] || m) : m;
  });

  // Ayak Bachar breakdowns label each letter with the chamber-mate it is
  // exchanged for — the letter whose value is actually summed (יהוה reads
  // קנסנ) — plus the name of the nine-chambers triad it belongs to.
  const ayakLetters = (letters) =>
    letters.map((l) => hebrew.HEBREW_AYAK_LETTER[l] || l);
  const chamberNames = (letters) =>
    letters.map((l) => hebrew.HEBREW_CHAMBER_OF[l] || l);

  // Building ciphers label each step with the prefix built so far (י יה יהו).
  const runningPrefixes = (letters) => {
    let run = '';
    return letters.map((l) => (run += l));
  };

  // Multi-run building ciphers describe each step as a [from, to) slice of
  // the word's letters; the labels are the slices spelled out.
  const prefixes = (n) => Array.from({ length: n }, (_, i) => [0, i + 1]);
  const suffixes = (n) => Array.from({ length: n }, (_, i) => [i, n]);
  const sliceLabels = (steps) => (letters) =>
    steps(letters.length).map(([from, to]) => letters.slice(from, to).join(''));

  // Out-and-back ciphers run the prefixes up and back down, the full word
  // once at the peak (י יה יהו יהוה יהו יה י).
  const pyramidSteps = (n) => {
    const up = prefixes(n);
    return up.concat(up.slice(0, -1).reverse());
  };
  const outAndBack = sliceLabels(pyramidSteps);

  // Ladder ciphers build the word up by its prefixes, then take it down by
  // its suffixes, the full word written in both runs
  // (י יה יהו יהוה · יהוה הוה וה ה).
  const ladderSteps = (n) => prefixes(n).concat(suffixes(n));
  const upAndDown = sliceLabels(ladderSteps);

  // שווי weights every letter by (n+1)/2, written 2½ rather than 2.5
  const halfLabel = (m) => (m % 2 ? Math.floor(m / 2) + '½' : String(m / 2));

  // Word-reduced gematria treats each word as the counted unit: its reduced
  // (mispar katan) letter values are summed and the sum taken to its digital
  // root, so בראשית = 2+2+1+3+1+4 = 13 → 4. The `fold` rule contracts the
  // word to that single token/value pair, and the phrase total adds the word
  // roots — Genesis 1:1 gives 4+5+5+5+8+2+8 = 37.
  const reduceWord = (kept, values) => (kept.length
    ? { kept: [kept.join('')],
        values: [core.digitalRoot(values.reduce((a, b) => a + b, 0))] }
    : { kept: [], values: [] });

  // the source line shared by the ciphers named from Abulafia's triad
  const ABULAFIA = {
    quote: 'על דרך שווי ומגרעת ותוספת… וכן ענין המספרים כולם',
    cite: 'ר׳ אברהם אבולעפיה, אוצר עדן הגנוז',
  };

  const CIPHERS = {
    he: {
      // `line` is the compact traditional name used by the one-line copy
      hechrachi: { label: 'גימטריה הכרחית / Regular Gematria', short: 'standard', line: 'Mispar Hechrachi', map: hebrew.HEBREW_VALUES },
      gadol:     { label: 'גימטריה סופית / Final Letters Gematria', short: 'sofit', line: 'Mispar Gadol', map: hebrew.HEBREW_SOFIT_VALUES },
      siduri:    { label: 'גימטריה סדרית / Ordinal Gematria',  short: 'ordinal',  line: 'Mispar Siduri', map: hebrew.HEBREW_ORDINALS },
      katan:     { label: 'גימטריה קטנה / Reduced Gematria',   short: 'reduced',  line: 'Mispar Katan', map: hebrew.HEBREW_KATAN },
      katanSofit: { label: 'גימטריה קטנה סופית / Small Finals Gematria', short: 'small finals', line: 'Mispar Katan Sofit',
                   map: hebrew.HEBREW_KATAN_SOFIT },
      katanMilim: { label: 'גימטריה מצומצמת / Word Reduced Gematria', short: 'word reduced', line: 'Mispar Katan Milim',
                   map: hebrew.HEBREW_KATAN, fold: reduceWord },
      atbash:    { label: 'אתב״ש / Atbash Cipher',             short: 'atbash',   line: 'Atbash', map: hebrew.HEBREW_ATBASH,
                   substitution: true, groups: atbashLetters },
      ayakBachar: { label: 'אי״ק בכ״ר / Ayak Bachar',          short: 'nine chambers', line: 'Ayak Bachar', map: hebrew.HEBREW_AYAK_BACHAR,
                   substitution: true, groups: ayakLetters, families: chamberNames },
      // Abulafia's שמ"ת triad (אוצר עדן הגנוז, גנוז חלק ז'): letters and
      // numbers work "על דרך שווי ומגרעת ותוספת", balanced like 1–2–3 with 2
      // as the equalizing middle. For letter values a₁…aₙ:
      //   מגרעת (subtraction, forward)  F = Σ i·aᵢ        — the suffix run
      //   תוספת (addition, backward)   B = Σ (n+1−i)·aᵢ  — the prefix run
      //   שווי  (equivalence, balanced)   E = (F+B)/2 = (n+1)·Σaᵢ / 2
      // so F + B = 2E is the תוספת ומגרעת ladder. יהוה: 58 · 65 · 72.
      // The prefix run is מספר האחור, the achorayim of the Name as the Ari
      // writes it out (י׳ י״ה יה״ו יהו״ה, עץ חיים שער ל״ד פ״ב); the suffix run
      // weights each letter by its position, the familiar גימטריה מיקום.
      boneh:     { label: 'מספר האחור · תוספת / Achorayim Gematria (backward)', short: 'achorayim', line: 'Mispar HaAchor · Tosefet תוספת', map: hebrew.HEBREW_VALUES,
                   term: 'תוספת', termName: 'Tosefet · addition (backward)',
                   source: { quote: 'י׳ י״ה יה״ו יהו״ה', cite: 'האר״י, עץ חיים, שער ל״ד פ״ב' },
                   transform: core.cumulative, building: true, groups: runningPrefixes },
      mikum:     { label: 'גימטריה מיקום · מגרעת / Positional Gematria (forward)', short: 'position', line: 'Mispar Mikum · Migra\'at מגרעת', map: hebrew.HEBREW_VALUES,
                   term: 'מגרעת', termName: 'Migra\'at · subtraction (forward)',
                   transform: core.positional,
                   groups: (letters) => letters.map((l, i) => l + '×' + (i + 1)) },
      shivui:    { label: 'שווי / Equivalence Gematria (balanced)', short: 'equivalence', line: 'Shivui שווי', map: hebrew.HEBREW_VALUES,
                   term: 'שווי', termName: 'Shivui · equivalence (balanced)',
                   source: ABULAFIA,
                   transform: core.balanced,
                   groups: (letters) => letters.map((l) => l + '×' + halfLabel(letters.length + 1)) },
      // Modern construction on the מספר האחור pattern: the prefixes run out
      // and return (the expansion is the attested achorayim of a Name; the
      // name is the רצוא ושוב of Ezekiel 1:14, as the Ya'avetz reads it in
      // ציצים ופרחים).
      ratzoVashov: { label: 'רצוא ושוב / Running and Returning', short: 'out and back', line: 'Ratzo VaShov רצוא ושוב', map: hebrew.HEBREW_VALUES,
                   source: { quote: 'והחיות רצוא ושוב', cite: 'יחזקאל א׳, י״ד · היעב״ץ, ציצים ופרחים' },
                   transform: core.pyramid, building: true, steps: pyramidSteps, groups: outAndBack },
      // Abulafia, אוצר עדן הגנוז, גנוז חלק ז': the Name has three ways, שווי
      // (the Name whole), תוספת (addition: י יה יהו יהוה) and מגרעת
      // (diminution: יהוה הוה וה ה) — "כדמות צורת אור הירח", waxing and
      // waning. Addition and diminution together are 72 + 58 = 130 = סלם;
      // he calls the secret סלם יעקב, "twelve times the Name" (12×26 = 312),
      // and points to Genesis 28:17.
      tosefetMigraat: { label: 'תוספת ומגרעת / Addition and Subtraction', short: 'ladder', line: 'Tosefet uMigra\'at תוספת ומגרעת', map: hebrew.HEBREW_VALUES,
                   source: ABULAFIA,
                   transform: core.ladder, building: true, steps: ladderSteps, groups: upAndDown },
    },
    el: {
      isopsephy: { label: 'Greek Isopsephy',  short: 'isopsephy', map: greek.GREEK_VALUES },
      ordinal:   { label: 'Greek Ordinal',    short: 'ordinal',   map: greek.GREEK_ORDINALS },
      building:  { label: 'Greek Building Gematria', short: 'building', map: greek.GREEK_VALUES,
                   transform: core.cumulative, building: true, groups: runningPrefixes },
      // the Hebrew תוספת ומגרעת ladder read with isopsephy values; named for
      // κλίμαξ, the LXX's word for Jacob's ladder (Genesis 28:12), the
      // figure Abulafia ties the two runs to
      ladder:    { label: 'Greek Ladder Gematria (κλίμαξ)', short: 'ladder', line: 'Greek Ladder κλίμαξ', map: greek.GREEK_VALUES,
                   transform: core.ladder, building: true, steps: ladderSteps, groups: upAndDown },
    },
    en: {
      sumerian:  { label: 'English Sumerian',        short: 'A=6',      map: english.ENGLISH_SUMERIAN },
      ordinal:   { label: 'English Ordinal',         short: 'A=1',      map: english.ENGLISH_ORDINAL },
      reverse:   { label: 'English Reverse Ordinal', short: 'Z=1',      map: english.ENGLISH_REVERSE },
      reduction: { label: 'English Reduction',       short: 'reduced',  map: english.ENGLISH_REDUCTION },
      isopsephy: { label: 'English Isopsephy',       short: 'tiered',   map: english.ENGLISH_ISOPSEPHY },
      building:  { label: 'English Building Ordinal Gematria', short: 'A=1 building', map: english.ENGLISH_ORDINAL,
                   transform: core.cumulative, building: true, groups: runningPrefixes },
      buildingSumerian: { label: 'English Building Sumerian Gematria', short: 'A=6 building', map: english.ENGLISH_SUMERIAN,
                   transform: core.cumulative, building: true, groups: runningPrefixes },
    },
  };
  const DEFAULT_CIPHER = { he: 'hechrachi', el: 'isopsephy', en: 'sumerian' };

  /* ---- script detection (codepoint based) ---------------------------------- */
  function detectScript(text) {
    const s = stripMarks(text);
    if (/[֐-׿]/.test(s)) return 'he';
    if (/[Ͱ-Ͽἀ-῿]/.test(s)) return 'el';
    if (/[A-Za-z]/.test(s)) return 'en';
    return null;
  }

  /* ---- load-time validation (fail loudly) --------------------------------- */
  (function validate() {
    for (const [script, entry] of Object.entries(CIPHERS)) {
      for (const [key, spec] of Object.entries(entry)) {
        assert(spec.label && spec.short && spec.map,
          'cipher ' + script + '.' + key + ' incomplete');
        assert(!spec.transform || typeof spec.transform === 'function',
          'cipher ' + script + '.' + key + ' transform not a function');
        assert(!spec.groups || typeof spec.groups === 'function',
          'cipher ' + script + '.' + key + ' groups not a function');
        assert(!spec.families || typeof spec.families === 'function',
          'cipher ' + script + '.' + key + ' families not a function');
        assert(!spec.fold || typeof spec.fold === 'function',
          'cipher ' + script + '.' + key + ' fold not a function');
        assert(!spec.building || (spec.transform && spec.groups),
          'cipher ' + script + '.' + key + ' building needs transform+groups');
        assert(!spec.steps || (spec.building && typeof spec.steps === 'function'),
          'cipher ' + script + '.' + key + ' steps needs building, as a function');
      }
      assert(DEFAULT_CIPHER[script] in entry,
        'default cipher missing for ' + script);
    }
    assert(detectScript('שלום') === 'he' && detectScript('λόγος') === 'el' &&
      detectScript('word') === 'en', 'script detection broken');
    assert(CIPHERS.he.atbash.groups(Array.from('יהוה')).join('') === 'מצפץ',
      'atbash mirror labels broken');
    assert(CIPHERS.he.atbash.groups(Array.from('בבל')).join('') === 'ששך',
      'atbash final-form label broken');
    assert(CIPHERS.he.ayakBachar.groups(Array.from('יהוה')).join('') === 'קנסנ',
      'ayak bachar exchange labels broken');
    assert(CIPHERS.he.ayakBachar.families(Array.from('יהוה')).join(' ') ===
      'אי״ק הנ״ך וס״ם הנ״ך', 'ayak bachar chamber labels broken');
    assert(core.getValues('יהוה', CIPHERS.he.ayakBachar.map).values
      .reduce((a, b) => a + b, 0) === 260, 'ayak bachar exchange values broken');
    // word-reduced against Genesis 1:1: seven word roots 4+5+5+5+8+2+8 = 37
    const wordReduced = (phrase, spec) => phrase.split(' ').reduce((sum, w) => {
      const { kept, values } = core.getValues(w, spec.map);
      return sum + spec.fold(kept, values).values.reduce((a, b) => a + b, 0);
    }, 0);
    assert(CIPHERS.he.katanMilim.fold(Array.from('בראשית'),
      core.getValues('בראשית', hebrew.HEBREW_KATAN).values).values[0] === 4,
      'word reduced: בראשית != 4');
    assert(wordReduced('בראשית ברא אלהים את השמים ואת הארץ',
      CIPHERS.he.katanMilim) === 37, 'word reduced: Genesis 1:1 != 37');
    // small finals against Genesis 1:1: with ם=6 and ץ=9 the verse sums to
    // 86, the standard value of אלהים
    const phraseSum = (phrase, map) => phrase.split(' ').reduce((sum, w) =>
      sum + core.getValues(w, map).values.reduce((a, b) => a + b, 0), 0);
    assert(phraseSum('בראשית ברא אלהים את השמים ואת הארץ',
      CIPHERS.he.katanSofit.map) === 86, 'small finals: Genesis 1:1 != 86');
    assert(phraseSum('אלהים', CIPHERS.he.hechrachi.map) === 86,
      'small finals witness: אלהים != 86');
    // ratzo vashov landmarks: the Name out-and-back is 118 (72 up + 72 back
    // − 26 at the peak); אלהים lands on 314, the value of שדי
    const ratzo = (word) => {
      const { values } = core.getValues(word, CIPHERS.he.ratzoVashov.map);
      return CIPHERS.he.ratzoVashov.transform(values).reduce((a, b) => a + b, 0);
    };
    assert(ratzo('יהוה') === 118, 'ratzo vashov: יהוה != 118');
    assert(ratzo('אלהים') === 314 && phraseSum('שדי', CIPHERS.he.hechrachi.map) === 314,
      'ratzo vashov witness: אלהים != שדי (314)');
    assert(pyramidSteps(4).map((s) => s.join('-')).join() === '0-1,0-2,0-3,0-4,0-3,0-2,0-1',
      'pyramid steps broken');
    assert(CIPHERS.he.ratzoVashov.groups(Array.from('יהוה')).join(' ') ===
      'י יה יהו יהוה יהו יה י', 'ratzo vashov step labels broken');
    // tosefet u'migra'at landmarks (Abulafia): the Name up and down is
    // 72 + 58 = 130, the value of סלם; the ladder is (n+1)× the plain value
    const ladderSum = (word) => {
      const { values } = core.getValues(word, CIPHERS.he.tosefetMigraat.map);
      return CIPHERS.he.tosefetMigraat.transform(values).reduce((a, b) => a + b, 0);
    };
    assert(ladderSum('יהוה') === 130 && phraseSum('סלם', CIPHERS.he.hechrachi.map) === 130,
      'tosefet migraat: יהוה != סלם (130)');
    assert(ladderSteps(4).map((s) => s.join('-')).join() === '0-1,0-2,0-3,0-4,0-4,1-4,2-4,3-4',
      'ladder steps broken');
    assert(CIPHERS.he.tosefetMigraat.groups(Array.from('יהוה')).join(' ') ===
      'י יה יהו יהוה יהוה הוה וה ה', 'tosefet migraat step labels broken');
    // Abulafia's שמ"ת triad on the Name: מגרעת 58, שווי 65 (= אדני), תוספת
    // 72, and diminution + addition = 130, twice the equality and the ladder
    const triad = (key, word) => {
      const spec = CIPHERS.he[key];
      return spec.transform(core.getValues(word, spec.map).values).reduce((a, b) => a + b, 0);
    };
    assert(triad('mikum', 'יהוה') === 58 && triad('boneh', 'יהוה') === 72 &&
      triad('shivui', 'יהוה') === 65, 'shemet triad on יהוה != 58 · 65 · 72');
    assert(phraseSum('אדני', CIPHERS.he.hechrachi.map) === 65, 'shivui witness: אדני != 65');
    assert(triad('mikum', 'יהוה') + triad('boneh', 'יהוה') === 2 * triad('shivui', 'יהוה') &&
      2 * triad('shivui', 'יהוה') === ladderSum('יהוה'), 'shemet: F + B != 2E != ladder');
    assert(['boneh', 'mikum', 'shivui'].map((k) => CIPHERS.he[k].term).join(' ') === 'תוספת מגרעת שווי',
      'shemet terms broken');
    assert(['boneh', 'ratzoVashov', 'tosefetMigraat', 'shivui'].every((k) =>
      CIPHERS.he[k].source && CIPHERS.he[k].source.quote && CIPHERS.he[k].source.cite),
      'cipher sources missing');
    assert(CIPHERS.he.shivui.groups(Array.from('יהוה')).join(' ') === 'י×2½ ה×2½ ו×2½ ה×2½' &&
      CIPHERS.he.shivui.groups(Array.from('אדני')).join(' ') === 'א×2½ ד×2½ נ×2½ י×2½' &&
      CIPHERS.he.shivui.groups(Array.from('אלהים')).join(' ') === 'א×3 ל×3 ה×3 י×3 ם×3',
      'shivui step labels broken');
    // Greek ladder witness: Ιησους is 888 in isopsephy, so its six-letter
    // ladder is 7 × 888 = 6216
    assert(phraseSum('Ιησους', CIPHERS.el.isopsephy.map) === 888 &&
      CIPHERS.el.ladder.transform(core.getValues('Ιησους', CIPHERS.el.ladder.map).values)
        .reduce((a, b) => a + b, 0) === 6216, 'greek ladder: Ιησους != 6216');
  })();

  // Abulafia's triad in the order the studio lays it out: מגרעת · שווי · תוספת
  const SHEMET = ['mikum', 'shivui', 'boneh'];

  return { CIPHERS, DEFAULT_CIPHER, SHEMET, detectScript };
});
