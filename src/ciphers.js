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
 * title and in the report. An optional `heb` is the cipher's short Hebrew
 * tag (רגיל / קטן / אתב״ש), the name a Hebrew phrase's one-line copy
 * closes with; Greek and English ciphers give `line` the same job
 * (Eng. Ord., Eng. Atbash, Gr. Ladder). An optional `term` names the cipher in
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

  // English atbash labels each letter with its mirror, case kept (Genesis
  // reads Tvmvhrh).
  const enAtbashLetters = (letters) =>
    letters.map((l) => english.ENGLISH_ATBASH_LETTER[l] || l);

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

  // Out-and-back ciphers run the word out by its prefixes and back by its
  // suffixes, the full word written once at the turn
  // (י יה יהו יהוה הוה וה ה).
  const pyramidSteps = (n) => prefixes(n).concat(suffixes(n).slice(1));
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
      hechrachi: { label: 'גימטריה הכרחית / Regular Gematria', short: 'standard', line: 'Mispar Hechrachi', heb: 'רגיל', map: hebrew.HEBREW_VALUES },
      gadol:     { label: 'גימטריה סופית / Final Letters Gematria', short: 'sofit', line: 'Mispar Gadol', heb: 'סופי', map: hebrew.HEBREW_SOFIT_VALUES },
      siduri:    { label: 'גימטריה סדרית / Ordinal Gematria',  short: 'ordinal',  line: 'Mispar Siduri', heb: 'סדרי', map: hebrew.HEBREW_ORDINALS },
      katan:     { label: 'גימטריה קטנה / Reduced Gematria',   short: 'reduced',  line: 'Mispar Katan', heb: 'קטן', map: hebrew.HEBREW_KATAN },
      katanSofit: { label: 'גימטריה קטנה סופית / Small Finals Gematria', short: 'small finals', line: 'Mispar Katan Sofit', heb: 'קטן סופי',
                   map: hebrew.HEBREW_KATAN_SOFIT },
      katanMilim: { label: 'גימטריה מצומצמת / Word Reduced Gematria', short: 'word reduced', line: 'Mispar Katan Milim', heb: 'מצומצם',
                   map: hebrew.HEBREW_KATAN, fold: reduceWord },
      atbash:    { label: 'אתב״ש / Atbash Cipher',             short: 'atbash',   line: 'Atbash', heb: 'אתב״ש', map: hebrew.HEBREW_ATBASH,
                   substitution: true, groups: atbashLetters },
      ayakBachar: { label: 'אי״ק בכ״ר / Ayak Bachar',          short: 'nine chambers', line: 'Ayak Bachar', heb: 'אי״ק בכ״ר', map: hebrew.HEBREW_AYAK_BACHAR,
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
      boneh:     { label: 'מספר האחור · תוספת / Achorayim Gematria (backward)', short: 'achorayim', line: 'Mispar HaAchor Tosefet תוספת', heb: 'אחור', map: hebrew.HEBREW_VALUES,
                   term: 'תוספת', termName: 'Tosefet · addition (backward)',
                   source: { quote: 'י׳ י״ה יה״ו יהו״ה', cite: 'האר״י, עץ חיים, שער ל״ד פ״ב' },
                   transform: core.cumulative, building: true, groups: runningPrefixes },
      mikum:     { label: 'גימטריה מיקום · מגרעת / Positional Gematria (forward)', short: 'position', line: 'Mispar Mikum Migra\'at מגרעת', heb: 'מיקום', map: hebrew.HEBREW_VALUES,
                   term: 'מגרעת', termName: 'Migra\'at · subtraction (forward)',
                   transform: core.positional,
                   groups: (letters) => letters.map((l, i) => l + '×' + (i + 1)) },
      shivui:    { label: 'שווי / Equivalence Gematria (balanced)', short: 'equivalence', line: 'Shivui שווי', heb: 'שווי', map: hebrew.HEBREW_VALUES,
                   term: 'שווי', termName: 'Shivui · equivalence (balanced)',
                   source: ABULAFIA,
                   transform: core.balanced,
                   groups: (letters) => letters.map((l) => l + '×' + halfLabel(letters.length + 1)) },
      // The word runs out by its prefixes and returns by its suffixes, the
      // full word written once at the turn — the "run and return" of
      // "Mathematics in Yitro" (inner.org): צ צב צבא צבאו צבאות באות אות
      // ות ת = 2495 = 5 × 499, the value of the first commandment, אנכי
      // יהוה אלהיך אשר הוצאתיך מארץ מצרים מבית עבדים. It is Abulafia's
      // ladder with the repeated full word removed, so it comes to n× the
      // plain value, one word short of the ladder's (n+1)×. The name is
      // the רצוא ושוב of Ezekiel 1:14.
      ratzoVashov: { label: 'רצוא ושוב / Running and Returning', short: 'out and back', line: 'Ratzo VaShov רצוא ושוב', heb: 'רצוא ושוב', map: hebrew.HEBREW_VALUES,
                   source: { quote: 'והחיות רצוא ושוב', cite: 'יחזקאל א׳, י״ד · Mathematics in Yitro, inner.org' },
                   transform: core.pyramid, building: true, steps: pyramidSteps, groups: outAndBack },
      // Abulafia, אוצר עדן הגנוז, גנוז חלק ז': the Name has three ways, שווי
      // (the Name whole), תוספת (addition: י יה יהו יהוה) and מגרעת
      // (diminution: יהוה הוה וה ה) — "כדמות צורת אור הירח", waxing and
      // waning. Addition and diminution together are 72 + 58 = 130 = סלם;
      // he calls the secret סלם יעקב, "twelve times the Name" (12×26 = 312),
      // and points to Genesis 28:17.
      tosefetMigraat: { label: 'תוספת ומגרעת / Addition and Subtraction', short: 'ladder', line: 'Tosefet uMigra\'at תוספת ומגרעת', heb: 'תוספת ומגרעת', map: hebrew.HEBREW_VALUES,
                   source: ABULAFIA,
                   transform: core.ladder, building: true, steps: ladderSteps, groups: upAndDown },
      // each letter's ordinal value (א=1 … ת=22) squared on its own, the squares
      // summed: יהוה = 10² + 5² + 6² + 5² = 186, שלום = 21² + 12² + 6² + 13² = 790
      pratiSiduri: { label: 'מספר פרטי סדרי / Ordinal Square Gematria', short: 'ordinal squared', line: 'Mispar Prati Siduri', heb: 'פרטי סדרי', map: hebrew.HEBREW_ORDINALS,
                   transform: core.squared, groups: (letters) => letters.map((l) => l + '²') },
    },
    el: {
      isopsephy: { label: 'Greek Isopsephy',  short: 'isopsephy', line: 'Gr. Isop.', map: greek.GREEK_VALUES },
      ordinal:   { label: 'Greek Ordinal',    short: 'ordinal', line: 'Gr. Ord.',   map: greek.GREEK_ORDINALS },
      building:  { label: 'Greek Building Gematria', short: 'building', line: 'Gr. Building', map: greek.GREEK_VALUES,
                   transform: core.cumulative, building: true, groups: runningPrefixes },
      // the Hebrew תוספת ומגרעת ladder read with isopsephy values; named for
      // κλίμαξ, the LXX's word for Jacob's ladder (Genesis 28:12), the
      // figure Abulafia ties the two runs to
      ladder:    { label: 'Greek Ladder Gematria (κλίμαξ)', short: 'ladder', line: 'Gr. Ladder', map: greek.GREEK_VALUES,
                   transform: core.ladder, building: true, steps: ladderSteps, groups: upAndDown },
    },
    en: {
      sumerian:  { label: 'English Sumerian',        short: 'A=6', line: 'Eng. Sumer.',      map: english.ENGLISH_SUMERIAN },
      ordinal:   { label: 'English Ordinal',         short: 'A=1', line: 'Eng. Ord.',      map: english.ENGLISH_ORDINAL },
      reverse:   { label: 'English Reverse Ordinal', short: 'Z=1', line: 'Eng. Rev. Ord.',      map: english.ENGLISH_REVERSE },
      // the Hebrew אתב״ש read on the Latin alphabet (a↔z, b↔y …): each letter
      // is summed as the ordinal of its mirror, Genesis → Tvmvhrh = 111
      atbash:    { label: 'English Atbash Ordinal',  short: 'atbash', line: 'Eng. Atbash',   map: english.ENGLISH_ATBASH,
                   substitution: true, groups: enAtbashLetters },
      // the digital root of each ordinal value, the Pythagorean numerology
      // table (a–i 1–9, j–r 1–9, s–z 1–8): Genesis = 33
      reduction: { label: 'English Small (Pythagorean)', short: 'reduced', line: 'Eng. Small',
                   map: english.ENGLISH_REDUCTION },
      isopsephy: { label: 'English Isopsephy',       short: 'tiered', line: 'Eng. Isop.',   map: english.ENGLISH_ISOPSEPHY },
      building:  { label: 'English Building Ordinal Gematria', short: 'A=1 building', line: 'Eng. Building Ord.', map: english.ENGLISH_ORDINAL,
                   transform: core.cumulative, building: true, groups: runningPrefixes },
      buildingSumerian: { label: 'English Building Sumerian Gematria', short: 'A=6 building', line: 'Eng. Building Sumer.', map: english.ENGLISH_SUMERIAN,
                   transform: core.cumulative, building: true, groups: runningPrefixes },
      // the תוספת ומגרעת ladder read with English values, in the same two
      // forms as the building ciphers: the word climbs by its prefixes and
      // descends by its suffixes, so the result is (n+1)× the plain value
      ladder:    { label: 'English Ladder Ordinal Gematria', short: 'A=1 ladder', line: 'Eng. Ladder Ord.', map: english.ENGLISH_ORDINAL,
                   transform: core.ladder, building: true, steps: ladderSteps, groups: upAndDown },
      ladderSumerian: { label: 'English Ladder Sumerian Gematria', short: 'A=6 ladder', line: 'Eng. Ladder Sumer.', map: english.ENGLISH_SUMERIAN,
                   transform: core.ladder, building: true, steps: ladderSteps, groups: upAndDown },
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
    assert(Object.values(CIPHERS.he).every((spec) => spec.heb && !/[A-Za-z]/.test(spec.heb)),
      'hebrew ciphers need a short Hebrew tag');
    assert(['el', 'en'].every((sc) => Object.values(CIPHERS[sc]).every((spec) =>
      spec.line && spec.line.length <= 20)), 'greek/english ciphers need a short line name');
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
    // ratzo vashov landmarks: the run is n× the plain value, so the Name
    // out-and-back is 4 × 26 = 104 and אלהים lands on 5 × 86 = 430, the
    // value of נפש; the sequence for צבאות is the nine steps of inner.org
    const ratzo = (word) => {
      const { values } = core.getValues(word, CIPHERS.he.ratzoVashov.map);
      return CIPHERS.he.ratzoVashov.transform(values).reduce((a, b) => a + b, 0);
    };
    assert(ratzo('יהוה') === 104, 'ratzo vashov: יהוה != 104');
    assert(ratzo('אלהים') === 430 && phraseSum('נפש', CIPHERS.he.hechrachi.map) === 430,
      'ratzo vashov witness: אלהים != נפש (430)');
    assert(pyramidSteps(4).map((s) => s.join('-')).join() === '0-1,0-2,0-3,0-4,1-4,2-4,3-4',
      'pyramid steps broken');
    assert(CIPHERS.he.ratzoVashov.groups(Array.from('יהוה')).join(' ') ===
      'י יה יהו יהוה הוה וה ה', 'ratzo vashov step labels broken');
    assert(CIPHERS.he.ratzoVashov.groups(Array.from('צבאות')).join(' ') ===
      'צ צב צבא צבאו צבאות באות אות ות ת', 'ratzo vashov: צבאות sequence broken');
    assert(ratzo('צבאות') === 5 * 499, 'ratzo vashov: צבאות != 2495');
    assert(phraseSum('אנכי יהוה אלהיך אשר הוצאתיך מארץ מצרים מבית עבדים',
      CIPHERS.he.hechrachi.map) === 2495, 'ratzo vashov witness: first commandment != 2495');
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
    assert(ladderSum('יהוה') === ratzo('יהוה') + 26, 'ladder != out-and-back + the word');
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
    // the three states of the Name together: 58 + 65 + 72 = 195 = 3 × 65 = 3 × 5 × 13
    assert(triad('mikum', 'יהוה') + triad('shivui', 'יהוה') + triad('boneh', 'יהוה') === 195 &&
      195 === 3 * 5 * 13, 'shemet: three states of יהוה != 195');
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
    // מספר פרטי סדרי (ordinal square) on the Name: 100 + 25 + 36 + 25 = 186,
    // and on שלום, where ordinal and standard part ways: 441 + 144 + 36 + 169 = 790
    assert(triad('pratiSiduri', 'יהוה') === 186 && triad('pratiSiduri', 'שלום') === 790,
      'prati siduri: יהוה != 186 or שלום != 790');
    assert(CIPHERS.he.pratiSiduri.groups(Array.from('יהוה')).join(' ') === 'י² ה² ו² ה²',
      'prati siduri step labels broken');
    // Greek ladder witness: Ιησους is 888 in isopsephy, so its six-letter
    // ladder is 7 × 888 = 6216
    assert(phraseSum('Ιησους', CIPHERS.el.isopsephy.map) === 888 &&
      CIPHERS.el.ladder.transform(core.getValues('Ιησους', CIPHERS.el.ladder.map).values)
        .reduce((a, b) => a + b, 0) === 6216, 'greek ladder: Ιησους != 6216');
    // English ladder witness: Jesus is 74 in ordinal and 444 in Sumerian, so
    // its five-letter ladders are 6 × 74 = 444 (the Sumerian value) and
    // 6 × 444 = 2664; the steps read J Je Jes Jesu Jesus · Jesus esus sus us s
    const enLadder = (key, word) => {
      const spec = CIPHERS.en[key];
      return spec.transform(core.getValues(word, spec.map).values).reduce((a, b) => a + b, 0);
    };
    assert(phraseSum('Jesus', CIPHERS.en.ordinal.map) === 74 &&
      phraseSum('Jesus', CIPHERS.en.sumerian.map) === 444, 'english ladder witness: Jesus != 74 / 444');
    assert(enLadder('ladder', 'Jesus') === 444 && enLadder('ladderSumerian', 'Jesus') === 2664,
      'english ladder: Jesus != 444 / 2664');
    assert(CIPHERS.en.ladder.groups(Array.from('Jesus')).join(' ') ===
      'J Je Jes Jesu Jesus Jesus esus sus us s', 'english ladder step labels broken');
    // English atbash and small witnesses: Genesis reads Tvmvhrh = 111 under
    // atbash ordinal and 7+5+5+5+1+9+1 = 33 under the Pythagorean table
    assert(CIPHERS.en.atbash.groups(Array.from('Genesis')).join('') === 'Tvmvhrh',
      'english atbash mirror labels broken');
    assert(phraseSum('Genesis', CIPHERS.en.atbash.map) === 111, 'english atbash: Genesis != 111');
    assert(phraseSum('Genesis', CIPHERS.en.reduction.map) === 33, 'english small: Genesis != 33');
  })();

  // Abulafia's triad in the order the studio lays it out: מגרעת · שווי · תוספת
  const SHEMET = ['mikum', 'shivui', 'boneh'];

  return { CIPHERS, DEFAULT_CIPHER, SHEMET, detectScript };
});
