/* ==========================================================================
 * ciphers.js — the named cipher registry and script detection.
 * Part of the Gematria module set (see gematria.js for the layout).
 *
 * Every cipher is a named entry pointing at a table owned by its alphabet
 * module; adding a cipher = adding one registry line, no logic changes.
 * An optional `transform` reshapes a word's letter values after lookup
 * (e.g. the running sum of מספר בונה / building value, or the position
 * multiplier of גימטריה מיקום). An optional `groups` maps a word's letters
 * to per-letter labels showing how each value arose: transform steps
 * (י יה יהו / ל×2) or, with `substitution: true`, the letter the cipher
 * actually reads (atbash mirrors יהוה into מצפץ) shown alongside the
 * original rather than replacing it. An optional `families` adds a second
 * per-letter label naming the letter's classification group (its ayak
 * bachar chamber), surfaced in tooltips. An optional `pick` selects which
 * of a word's letters count at all — notariqon keeps only each word's
 * initial or final, so the phrase evaluates as its acronym. An optional
 * `fold` contracts a whole word to a single token/value pair after
 * lookup — the word-reduced cipher folds each word to the digital root
 * of its reduced letter sum. `building: true` marks running-sum
 * ciphers whose grid view draws every prefix of a word as its own
 * letter/value group (י · יה · יהו · יהוה).
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

  // Notariqon (נוטריקון) reads a phrase as an acronym: a `pick` rule keeps
  // only each word's initial (ראשי תיבות) and the phrase total is the
  // acronym's value (אתה גבור לעולם אדני → אגלא = 35).
  const firstLetter = (kept) => (kept.length ? [0] : []);

  // Word-reduced gematria treats each word as the counted unit: its reduced
  // (mispar katan) letter values are summed and the sum taken to its digital
  // root, so בראשית = 2+2+1+3+1+4 = 13 → 4. The `fold` rule contracts the
  // word to that single token/value pair, and the phrase total adds the word
  // roots — Genesis 1:1 gives 4+5+5+5+8+2+8 = 37.
  const reduceWord = (kept, values) => (kept.length
    ? { kept: [kept.join('')],
        values: [core.digitalRoot(values.reduce((a, b) => a + b, 0))] }
    : { kept: [], values: [] });

  const CIPHERS = {
    he: {
      hechrachi: { label: 'גימטריה הכרחית / Regular Gematria', short: 'standard', map: hebrew.HEBREW_VALUES },
      gadol:     { label: 'גימטריה סופית / Final Letters Gematria', short: 'sofit', map: hebrew.HEBREW_SOFIT_VALUES },
      siduri:    { label: 'גימטריה סדרית / Ordinal Gematria',  short: 'ordinal',  map: hebrew.HEBREW_ORDINALS },
      katan:     { label: 'גימטריה קטנה / Reduced Gematria',   short: 'reduced',  map: hebrew.HEBREW_KATAN },
      katanMilim: { label: 'גימטריה מצומצמת / Word Reduced Gematria', short: 'word reduced',
                   map: hebrew.HEBREW_KATAN, fold: reduceWord },
      atbash:    { label: 'אתב״ש / Atbash Cipher',             short: 'atbash',   map: hebrew.HEBREW_ATBASH,
                   substitution: true, groups: atbashLetters },
      ayakBachar: { label: 'אי״ק בכ״ר / Ayak Bachar',          short: 'nine chambers', map: hebrew.HEBREW_AYAK_BACHAR,
                   substitution: true, groups: ayakLetters, families: chamberNames },
      boneh:     { label: 'מספר בונה / Building Gematria',     short: 'building', map: hebrew.HEBREW_VALUES,
                   transform: core.cumulative, building: true, groups: runningPrefixes },
      mikum:     { label: 'גימטריה מיקום / Positional Gematria', short: 'position', map: hebrew.HEBREW_VALUES,
                   transform: core.positional,
                   groups: (letters) => letters.map((l, i) => l + '×' + (i + 1)) },
      notariqon: { label: 'נוטריקון ראשי תיבות / Notariqon (Initials)', short: 'initials',
                   map: hebrew.HEBREW_VALUES, pick: firstLetter },
      preExilic: { label: 'גימטריה קדם־גלותית / Pre-Exilic Cipher', short: 'pre-exilic',
                   map: hebrew.HEBREW_PRE_EXILIC },
      reversePreExilic: { label: 'גימטריה קדם־גלותית הפוכה / Reverse Pre-Exilic Cipher', short: 'reverse',
                   map: hebrew.HEBREW_REVERSE_PRE_EXILIC },
    },
    el: {
      isopsephy: { label: 'Greek Isopsephy',  short: 'isopsephy', map: greek.GREEK_VALUES },
      ordinal:   { label: 'Greek Ordinal',    short: 'ordinal',   map: greek.GREEK_ORDINALS },
      building:  { label: 'Greek Building Gematria', short: 'building', map: greek.GREEK_VALUES,
                   transform: core.cumulative, building: true, groups: runningPrefixes },
      notariqon: { label: 'Greek Notariqon (Initials)', short: 'initials',
                   map: greek.GREEK_VALUES, pick: firstLetter },
      preExilic: { label: 'Greek Pre-Exilic Cipher', short: 'pre-exilic',
                   map: greek.GREEK_PRE_EXILIC },
      reversePreExilic: { label: 'Greek Reverse Pre-Exilic Cipher', short: 'reverse',
                   map: greek.GREEK_REVERSE_PRE_EXILIC },
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
        assert(!spec.pick || typeof spec.pick === 'function',
          'cipher ' + script + '.' + key + ' pick not a function');
        assert(!spec.fold || typeof spec.fold === 'function',
          'cipher ' + script + '.' + key + ' fold not a function');
        assert(!spec.building || (spec.transform && spec.groups),
          'cipher ' + script + '.' + key + ' building needs transform+groups');
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
    // notariqon against its classic identities: the kabbalistic acronym
    // אגלא (35) and the fish acrostic ΙΧΘΥΣ (1219)
    const notariqon = (phrase, spec) => phrase.split(' ').reduce((sum, w) => {
      const { kept, values } = core.getValues(w, spec.map);
      return sum + spec.pick(kept).reduce((a, i) => a + values[i], 0);
    }, 0);
    assert(notariqon('אתה גבור לעולם אדני', CIPHERS.he.notariqon) === 35,
      'notariqon initials: אגלא != 35');
    assert(notariqon('Ἰησοῦς Χριστὸς Θεοῦ Υἱὸς Σωτήρ', CIPHERS.el.notariqon) === 1219,
      'notariqon initials: ΙΧΘΥΣ != 1219');
    // pre-exilic wraps the last two letters: שת reads 3+4, not 700
    assert(core.getValues('שת', CIPHERS.he.preExilic.map).values
      .reduce((a, b) => a + b, 0) === 7, 'pre-exilic: שת != 7');
    // greek pre-exilic wraps like the hebrew one: τυ reads 3+4, mirroring שת
    assert(core.getValues('τυ', CIPHERS.el.preExilic.map).values
      .reduce((a, b) => a + b, 0) === 7, 'greek pre-exilic: τυ != 7');
    // greek reverse pre-exilic against its anchors: Λόγος = 9+5+90+5+2 = 111,
    // and shematria.com's Rev 13:18 notariqon (the word initials) = 1300
    assert(core.getValues('Λόγος', CIPHERS.el.reversePreExilic.map).values
      .reduce((a, b) => a + b, 0) === 111, 'greek reverse pre-exilic: Λόγος != 111');
    assert(core.getValues('ωησεοενψτατθαγαεκοααεεε', CIPHERS.el.reversePreExilic.map)
      .values.reduce((a, b) => a + b, 0) === 1300,
      'greek reverse pre-exilic: Rev 13:18 notariqon != 1300');
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
  })();

  return { CIPHERS, DEFAULT_CIPHER, detectScript };
});
