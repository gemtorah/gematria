/* ==========================================================================
 * triangles.js — the Triangles page: every word of a phrase drawn as a
 * close-packed triangle of letter circles. Row N holds step N of a
 * building cipher, so מספר האחור / Building Gematria fills a triangle
 * pointing up (the first N letters in row N — T(n) circles in all), and
 * the ladder ciphers (סלם · תוספת ומגרעת) carry on down through the
 * suffixes, so the shape turns back into a diamond. Rows are the cipher's
 * own step labels, so whatever the registry says a run is, that is what
 * gets drawn. The shape and the letter values are chosen apart: any
 * per-letter table (regular, reduced, ordinal, atbash …) can fill the
 * circles, so the ladder of בראשית under Reduced Gematria sums to 441 the
 * same way the studio does when the run is written out with the סלם key.
 * A row's value is the sum of its letters and the rows add up to the
 * total. Hebrew rows fill right to left.
 * ========================================================================== */
(function () {
  'use strict';
  const G = window.Gematria;
  const $ = (id) => document.getElementById(id);
  const SVG_NS = 'http://www.w3.org/2000/svg';

  /* palette mirrors the studio's letter cells: the ascent in the gold
   * letter tones, the descent (suffix rows) in the indigo of the app's
   * accent so the two legs of a ladder read apart at a glance */
  const ART = {
    bg: '#ffffff',
    fill: '#f7f1e3', edge: '#b08d3e', text: '#1d1f2b',
    downFill: '#eef0fb', downEdge: '#4f5ed9',
    rowValue: '#6a7086', title: '#1d1f2b',
    sumFill: '#d9ab4a', sumEdge: '#efd08a', sumText: '#14101f', prime: '#d63b3b',
    serif: "'Frank Ruhl Libre','Cardo','Times New Roman',serif",
    sans: "'Inter',system-ui,-apple-system,'Segoe UI',sans-serif",
  };
  const SCRIPT_NAMES = { he: 'Hebrew עברית', el: 'Greek Ελληνικά', en: 'English' };

  // the three runs, borrowed from the Hebrew building ciphers' own step
  // functions (they slice letter arrays, so they serve every script)
  const SHAPES = {
    triangle: { label: '△ Triangle', heb: 'אחור', name: 'Mispar HaAchor אחור', en: 'Building',
                groups: G.CIPHERS.he.boneh.groups },
    ladder:   { label: '◇ Ladder', heb: 'סלם', name: 'Sulam סלם', en: 'Ladder',
                groups: G.CIPHERS.he.tosefetMigraat.groups },
    // the ladder opened into its two triangles: the full word closes the
    // climb and opens the descent, so they fill an (n+1) × n rectangle
    ladderSplit: { label: '▭ Rectangle', heb: 'סלם', name: 'Sulam סלם', en: 'Ladder',
                groups: G.CIPHERS.he.tosefetMigraat.groups, aligned: true },
    // the out-and-back run as a square of two triangles: the run out
    // expands down one side of the diagonal while the way back collapses
    // on the other, with the two movements as arrows between them (see
    // drawSpans)
    aligned:  { label: '◩ Square', heb: 'רצוא ושוב', name: 'Ratzo VaShov רצוא ושוב', en: 'Run and Return',
                groups: G.CIPHERS.he.ratzoVashov.groups, aligned: true },
  };

  const state = {
    text: $('phrase').value,
    shape: 'triangle',
    // one letter-value table per script
    values: { ...G.DEFAULT_CIPHER },
    // milui scheme the מילוי key spells with
    scheme: 'standard',
  };

  // the Custom scheme reads the table the studio saved, if any
  try {
    const saved = JSON.parse(localStorage.getItem('gematria-custom-milui') || 'null');
    if (saved) G.setCustomMilui(saved);
  } catch (e) { /* corrupt or invalid — keep shipped defaults */ }

  /* ---- svg helpers ------------------------------------------------------------ */
  function el(tag, attrs = {}, children = []) {
    const n = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    for (const c of children) n.appendChild(c);
    return n;
  }
  function txt(x, y, content, size, color, weight, family, anchor) {
    const t = el('text', {
      x, y, 'text-anchor': anchor || 'middle', 'dominant-baseline': 'central',
      'font-size': size, fill: color, 'font-weight': weight || 500,
      'font-family': family || ART.serif,
    });
    t.textContent = content;
    return t;
  }

  /* ---- analysis ------------------------------------------------------------- */
  // graphemes with a rabati superscript run kept on its letter (ב¹⁰⁰⁰ is one circle)
  const tokens = (word) => {
    const out = [];
    for (const g of G.graphemes(word)) {
      if (g in G.SUPERSCRIPT_DIGITS && out.length) out[out.length - 1] += g;
      else out.push(g);
    }
    return out;
  };
  // letter tables: every cipher that values letters one by one (substitution
  // ciphers included); runs, folds and transforms are shapes, not values
  const valueCiphers = (script) =>
    Object.entries(G.CIPHERS[script]).filter(([, s]) => !s.building && !s.fold && !s.transform);
  const sum = (xs) => xs.reduce((a, b) => a + b, 0);
  const valuesSpec = (script) =>
    G.CIPHERS[script][state.values[script]] || G.CIPHERS[script][G.DEFAULT_CIPHER[script]];

  // the registry cipher this shape + table pair already is, if any
  // (ladder + regular values = תוספת ומגרעת), for the studio's own name
  const registryName = (script, shape, spec) => {
    const hit = Object.values(G.CIPHERS[script]).find((c) =>
      c.building && c.groups === SHAPES[shape].groups && c.map === spec.map);
    const base = hit ? (hit.line || hit.label) : SHAPES[shape].name;
    // a Hebrew figure always names its letter table by the studio's short
    // tag (רגיל, סדרי, קטן …), the regular one included; the Greek and
    // English registry names already say theirs (Eng. Ladder Ord.)
    if (script === 'he') return `${base} · ${spec.heb || spec.line || spec.label}`;
    if (hit) return base;
    // Greek and English runs without a registry name are named the way
    // the registry names its own — script, run, table (Gr. Building Ord.)
    const line = spec.line || spec.label, pre = /^(Eng|Gr)\. /.exec(line);
    return pre ? `${pre[0]}${SHAPES[shape].en} ${line.slice(pre[0].length)}`
      : `${SHAPES[shape].en} · ${line}`;
  };

  function analyse(text, override) {
    const script = G.detectScript(text) || 'en';
    const shape = SHAPES[state.shape];
    const words = [];
    for (const raw of text.trim().split(/\s+/)) {
      if (!raw) continue;
      const ws = G.detectScript(raw) || script;
      const spec = (override && override[ws]) || valuesSpec(ws);
      const { kept } = G.getValues(raw, spec.map);
      if (!kept.length) continue;
      const rows = shape.groups(kept.map((g) => G.stripMarks(g))).map((label) => ({
        label, letters: tokens(label), value: sum(G.getValues(label, spec.map).values),
      }));
      // the run has turned back once a row is no wider than the one before it
      let down = false;
      rows.forEach((r, i) => {
        if (i && r.letters.length <= rows[i - 1].letters.length) down = true;
        r.down = down;
      });
      words.push({
        raw, script: ws, spec, rows,
        total: sum(rows.map((r) => r.value)),
        circles: sum(rows.map((r) => r.letters.length)),
      });
    }
    const spec = words.length ? words[0].spec : valuesSpec(script);
    return { script, words, total: sum(words.map((w) => w.total)),
      name: registryName(script, state.shape, spec), spec };
  }

  const primeTag = (n) => {
    const a = G.analyzeNumber(n);
    if (!a || !a.isPrime) return '';
    return a.primeIndex ? ` [${G.ordinal(a.primeIndex)} prime]` : ' [prime]';
  };
  const isPrime = (n) => { const a = G.analyzeNumber(n); return !!(a && a.isPrime); };

  /* ---- drawing -------------------------------------------------------------- */
  const R = 24;                    // circle radius
  const HS = R * 2.2;              // centre-to-centre across a row
  const VS = R * 1.95;             // row pitch (close-packed would be √3·R)
  const TITLE_H = R * 2.2;         // word title above the shape
  const VALUE_H = R * 2.6;         // total + note below the shape
  const WORD_GAP = R * 2.5;
  const SIDE = R * 2.4;            // room beside the widest row for its value
  const MAX_LINE_W = 1500;

  // one word: title, its rows of circles with a running value at the
  // reading end of each row, then the word's total — returns the group and
  // the shape's extent; `delay` staggers the entrance animation
  function drawWord(word, cx, top, delay) {
    const rtl = word.script === 'he';
    const g = el('g');
    g.appendChild(txt(cx, top + TITLE_H / 2, word.raw, R * 1.15, ART.title, 700));
    const rowsTop = top + TITLE_H;
    const aligned = SHAPES[state.shape].aligned;
    const cols = Math.max(...word.rows.map((r) => r.letters.length));
    if (aligned) return drawSpans(word, cx, rowsTop, g, cols, rtl, delay);
    word.rows.forEach((row, i) => {
      const n = row.letters.length;
      const y = rowsTop + i * VS + R;
      const x0 = cx - (n - 1) * HS / 2;
      row.letters.forEach((letter, j) => {
        const x = rtl ? x0 + (n - 1 - j) * HS : x0 + j * HS;
        const cell = el('g', { class: 'cell' });
        cell.style.setProperty('--d', `${delay.n}ms`); delay.n += delay.step;
        cell.appendChild(el('circle', {
          cx: x, cy: y, r: R,
          fill: row.down ? ART.downFill : ART.fill,
          stroke: row.down ? ART.downEdge : ART.edge, 'stroke-width': 2.5,
        }));
        const size = G.graphemes(letter).length > 1 ? R * 0.62 : R * 1.05;
        cell.appendChild(txt(x, y, letter, size, row.down ? ART.downEdge : ART.edge, 700));
        g.appendChild(cell);
      });
      // the row's value sits past its reading end
      const endX = rtl ? x0 - R - R * 0.45 : x0 + (n - 1) * HS + R + R * 0.45;
      g.appendChild(txt(endX, y, String(row.value), R * 0.5, ART.rowValue, 600,
        ART.sans, rtl ? 'end' : 'start'));
    });
    const bottom = rowsTop + word.rows.length * VS;
    g.appendChild(txt(cx, bottom + R * 0.75, String(word.total), R * 0.95, ART.text, 800, ART.sans));
    g.appendChild(txt(cx, bottom + R * 1.75,
      `${word.circles} circles · ${word.rows.length} rows`, R * 0.46, ART.rowValue, 500, ART.sans));
    const widest = Math.max(...word.rows.map((r) => r.letters.length));
    return { g, width: (widest - 1) * HS + 2 * R + 2 * SIDE, height: TITLE_H + word.rows.length * VS + VALUE_H, bottom };
  }

  // the split figure: a run as two triangles facing each other across a
  // stepped diagonal. Each grid row holds a prefix (gold, the way out) and,
  // in the columns it has not reached, a suffix (indigo, the way back), so
  // every row reads the whole word: as the gold triangle expands down the
  // figure the indigo one collapses. רצוא ושוב writes the full word once —
  // T(n) + T(n−1) letters, an n × n square, n × the word; סלם writes it in
  // both runs — two T(n), an (n+1) × n rectangle, (n+1) × the word. The
  // triangles are drawn apart along the diagonal and an arrow walks down
  // the steps of each, in the order its numbered badges give; the full word's rows — where the run turns — are
  // filled deeper, and each triangle's sum is shown under the total.
  const SQ = R * 2;                 // side of one letter cell
  const SPLIT = R * 1.15;           // how far each triangle moves off the diagonal
  const TURN = { out: '#ecd7a2', back: '#d5dbfa' };
  const squareWidth = (n) => n * SQ + 2 * (n > 1 ? SPLIT : 0) + 2 * R * 3.1;
  function drawSpans(word, cx, rowsTop, g, cols, rtl, delay) {
    const m = word.rows.length - cols;      // steps on the way back
    const k = m - (cols - 1);               // 0: full word once, 1: in both runs
    const gridRows = cols + k;
    const gap = m ? SPLIT : 0, sx = rtl ? 1 : -1;
    const left = cx - (cols * SQ) / 2, top = rowsTop + R * 1.1 + gap;
    // x of the boundary before column c, in reading direction
    const bx = (c) => (rtl ? left + (cols - c) * SQ : left + c * SQ);
    const cellX = (c) => Math.min(bx(c), bx(c + 1));
    const letters = word.rows[cols - 1].letters;
    // the gold triangle slides toward the start and down, the indigo one the other way
    const outG = el('g', { transform: `translate(${sx * gap} ${gap})` });
    const backG = el('g', { transform: `translate(${-sx * gap} ${-gap})` });
    // a step's value and its place in the run, past the outer side of its row
    const tag = (group, x, y, dir, value, step, color) => {
      group.appendChild(txt(x + dir * R * 0.45, y, String(value), R * 0.5, color, 700, ART.sans,
        dir > 0 ? 'start' : 'end'));
      const bxc = x + dir * R * 2.45;
      group.appendChild(el('circle', { cx: bxc, cy: y, r: R * 0.36, fill: 'none', stroke: color, 'stroke-width': 1.4 }));
      group.appendChild(txt(bxc, y, String(step), R * 0.36, color, 700, ART.sans));
    };
    for (let y = 0; y < gridRows; y++) {
      const outLen = y - k + 1, yy = top + y * SQ;
      const turnOut = outLen === cols, turnBack = y < m && m - y === cols;
      letters.forEach((letter, c) => {
        const out = c < outLen;       // inside the prefix of this row
        const cell = el('g', { class: 'cell' });
        cell.style.setProperty('--d', `${delay.n}ms`); delay.n += delay.step;
        cell.appendChild(el('rect', {
          x: cellX(c), y: yy, width: SQ, height: SQ,
          fill: out ? (turnOut ? TURN.out : ART.fill) : (turnBack ? TURN.back : ART.downFill),
          stroke: out ? ART.edge : ART.downEdge, 'stroke-width': 1.2,
        }));
        const size = G.graphemes(letter).length > 1 ? R * 0.62 : R * 1.05;
        // letters take the colour of their triangle's arrow
        cell.appendChild(txt(cellX(c) + SQ / 2, yy + SQ / 2, letter, size, out ? ART.edge : ART.downEdge, 700));
        (out ? outG : backG).appendChild(cell);
      });
      if (outLen >= 1) tag(outG, bx(0), yy + SQ / 2, sx, word.rows[outLen - 1].value, outLen, ART.edge);
      if (y < m) tag(backG, bx(cols), yy + SQ / 2, -sx, word.rows[cols + y].value, cols + y + 1, ART.downEdge);
    }
    // each triangle's outline, stepped along the diagonal
    const frame = (d) => el('path', { d, fill: 'none', stroke: ART.text, 'stroke-width': 3, 'stroke-linejoin': 'round' });
    let d = `M${bx(0)} ${top + k * SQ}H${bx(1)}`;
    for (let i = 0; i < cols - 1; i++) d += `V${top + (k + i + 1) * SQ}H${bx(i + 2)}`;
    outG.appendChild(frame(d + `V${top + gridRows * SQ}H${bx(0)}Z`));
    if (m) {
      d = `M${bx(cols)} ${top}V${top + m * SQ}`;
      for (let j = m - 1; j >= 0; j--) d += `H${bx(cols - (m - j))}V${top + j * SQ}`;
      backG.appendChild(frame(d + 'Z'));
    }
    g.appendChild(outG); g.appendChild(backG);

    // the two movements through the opening, each walking the steps of its
    // own triangle in the order of the badges: the way out comes down the
    // gold stairs and runs out along the full word, the way back comes
    // down the indigo stairs to its last letter
    if (m) {
      const lift = gap * 0.58;
      const stairs = (y0, y1, runOut) => {
        const pts = [];
        for (let y = y0; y <= y1; y++) {
          pts.push([bx(y - k + 1), top + y * SQ], [bx(y - k + 1), top + (y + 1) * SQ]);
        }
        if (runOut) pts.push([bx(cols) - sx * R * 0.5, top + (y1 + 1) * SQ]);
        return pts;
      };
      const arrow = (pts, shift, color, label, labelAtEnd) => {
        const q = pts.map(([x, y]) => [x + sx * shift, y + shift]);
        const [ex, ey] = q[q.length - 1], [px, py] = q[q.length - 2];
        const len = Math.hypot(ex - px, ey - py), tx = (ex - px) / len, ty = (ey - py) / len;
        q[q.length - 1] = [ex - tx * 10, ey - ty * 10];
        g.appendChild(el('path', { d: 'M' + q.map((v) => v.join(' ')).join('L'), fill: 'none',
          stroke: color, 'stroke-width': 4.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
        g.appendChild(el('path', {
          d: `M${ex + tx * 4} ${ey + ty * 4}L${ex - tx * 13 - ty * 8} ${ey - ty * 13 + tx * 8}` +
            `L${ex - tx * 13 + ty * 8} ${ey - ty * 13 - tx * 8}Z`,
          fill: color }));
        // named past its head (the way out) or above its start (the way back)
        const [lx, ly] = labelAtEnd ? [ex + tx * R * 1.5, ey + ty * R * 1.5] : [q[0][0] + sx * R * 0.95, q[0][1] - R * 0.55];
        g.appendChild(txt(lx, ly, label, R * 0.55, color, 700));
      };
      const names = word.script !== 'he' ? (k ? ['up', 'down'] : ['run', 'return'])
        : k ? ['תוספת', 'מגרעת'] : ['רצוא', 'ושוב'];
      arrow(stairs(k, gridRows - 2, true), lift, ART.edge, names[0], true);
      arrow(stairs(0, m - 1, false), -lift, ART.downEdge, names[1], false);
    }
    const bottom = top + gridRows * SQ + gap + R * 0.9;
    g.appendChild(txt(cx, bottom + R * 0.75, String(word.total), R * 0.95, ART.text, 800, ART.sans));
    // the two triangles' sums, each in its colour
    const outSum = sum(word.rows.slice(0, cols).map((r) => r.value));
    const sums = txt(cx, bottom + R * 1.8, '', R * 0.55, ART.text, 700, ART.sans);
    [[String(outSum), ART.edge], [' + ', ART.rowValue], [String(word.total - outSum), ART.downEdge],
      [` = ${word.total}`, ART.rowValue]].forEach(([t, fill]) => {
      const span = el('tspan', { fill });
      span.textContent = t;
      sums.appendChild(span);
    });
    if (m) g.appendChild(sums);
    g.appendChild(txt(cx, bottom + R * (m ? 2.75 : 1.75),
      `${gridRows} × ${cols} = ${gridRows * cols} letters · every row is the word`,
      R * 0.46, ART.rowValue, 500, ART.sans));
    return { g, width: squareWidth(cols),
      height: bottom - rowsTop + TITLE_H + VALUE_H + (m ? R : 0), bottom: bottom + (m ? R : 0) };
  }

  function render() {
    const stage = $('stage');
    const analysis = analyse(state.text);
    syncControls(analysis);
    stage.innerHTML = '';
    if (!analysis.words.length) {
      stage.innerHTML = '<div class="empty-state"><div class="big-glyphs">△</div>' +
        '<p>Type a word or phrase to draw its triangles.</p></div>';
      $('art-title').textContent = '—';
      return analysis;
    }
    const rtl = analysis.script === 'he';
    const words = analysis.words.map((w) => ({ w, width: null }));

    // greedy wrap into lines; a Hebrew line lays its words right to left
    const lines = [];
    let line = [], lineW = 0;
    for (const item of words) {
      const widest = Math.max(...item.w.rows.map((r) => r.letters.length));
      // the square carries an arrow beyond each side's values
      item.width = SHAPES[state.shape].aligned ? squareWidth(widest)
        : (widest - 1) * HS + 2 * R + 2 * SIDE;
      const need = item.width + (line.length ? WORD_GAP : 0);
      if (line.length && lineW + need > MAX_LINE_W) { lines.push(line); line = []; lineW = 0; }
      line.push(item); lineW += need;
    }
    if (line.length) lines.push(line);

    const root = el('g');
    // stagger the circles' entrance, but let a long phrase settle within
    // about 1.4s rather than one circle at a time
    const delay = { n: 0, step: Math.min(22, 1400 / sum(analysis.words.map((w) => w.circles))) };
    let y = 0, maxW = 0;
    const bottoms = [];   // [x, y] of each word's shape on the last line, for the connectors
    lines.forEach((ln, li) => {
      const totalW = sum(ln.map((it) => it.width)) + (ln.length - 1) * WORD_GAP;
      maxW = Math.max(maxW, totalW);
      let x = -totalW / 2;
      const placed = rtl ? [...ln].reverse() : ln;
      let lineH = 0;
      for (const item of placed) {
        const cx = x + item.width / 2;
        const d = drawWord(item.w, cx, y, delay);
        root.appendChild(d.g);
        lineH = Math.max(lineH, d.height);
        if (li === lines.length - 1) bottoms.push([cx, d.bottom + R * 2.3]);
        x += item.width + WORD_GAP;
      }
      y += lineH + R;
    });

    // the phrase total: a sum box the shapes of the last line lead into
    const multi = analysis.words.length > 1;
    const sumY = y + R * 1.2;
    const bw = R * 3.4, bh = R * 1.9;
    if (multi && lines.length === 1) {
      for (const [bx, by] of bottoms) {
        root.appendChild(el('line', {
          x1: bx, y1: by, x2: 0, y2: sumY, stroke: ART.edge, 'stroke-width': 2, 'stroke-linecap': 'round',
        }));
      }
    }
    const prime = isPrime(analysis.total);
    if (multi) {
      const box = el('g', { class: 'sum-box' });
      box.style.setProperty('--d', `${delay.n + 80}ms`);
      box.appendChild(el('rect', {
        x: -bw / 2, y: sumY, width: bw, height: bh, rx: 12,
        fill: ART.sumFill, stroke: prime ? ART.prime : ART.sumEdge, 'stroke-width': prime ? 4 : 2.5,
      }));
      box.appendChild(txt(0, sumY + bh / 2, String(analysis.total),
        Math.min(R * 0.95, bw / (String(analysis.total).length * 0.62)), ART.sumText, 800, ART.sans));
      root.appendChild(box);
    }

    // caption, as the figure's own last line — the arithmetic first, then
    // the cipher's name, so a Hebrew name can't pull the punctuation around
    const name = analysis.name;
    const caption = (multi ? analysis.words.map((w) => w.total).join(' + ') + ' = ' : '') +
      analysis.total + primeTag(analysis.total) + ` — ${name}`;
    const capY = multi ? sumY + bh + R * 1.3 : y + R * 0.4;
    root.appendChild(txt(0, capY, caption, R * 0.6, ART.rowValue, 600, ART.sans));
    maxW = Math.max(maxW, caption.length * R * 0.34);

    const m = R;
    const w = maxW + 2 * m, h = capY + R + m;
    const svg = el('svg', { xmlns: SVG_NS, viewBox: `${-maxW / 2 - m} ${-m} ${w} ${h}` });
    svg.style.aspectRatio = `${w} / ${h}`;
    svg.appendChild(root);
    stage.appendChild(svg);
    // the short Greek/English names already say their script (Eng. Ord.,
    // Gr. Ladder), so the title skips the script prefix for them
    const prefixed = /^(Eng|Gr)\. /.test(name);
    $('art-title').textContent = prefixed ? name : `${SCRIPT_NAMES[analysis.script] || ''} — ${name}`;
    return analysis;
  }

  /* ---- controls -------------------------------------------------------------- */
  function syncControls(analysis) {
    const script = analysis.script;
    $('shape-seg').querySelectorAll('button').forEach((b) =>
      b.classList.toggle('active', b.dataset.shape === state.shape));
    const badge = $('script-badge');
    badge.textContent = SCRIPT_NAMES[script] || '—';
    badge.className = 'script-badge ' + script;

    // one pill per letter table, each showing the phrase's total under it
    // with the current shape; a prime total gets the studio's red border
    const box = $('values');
    box.innerHTML = '';
    const current = valuesSpec(script);
    for (const [key, spec] of valueCiphers(script)) {
      const total = analyse(state.text, { [script]: spec }).total;
      const b = document.createElement('button');
      b.className = 'scheme-pill' + (spec === current ? ' active' : '') +
        (isPrime(total) ? ' prime' : '');
      const [heb, en] = spec.label.includes(' / ') ? spec.label.split(' / ') : ['', spec.label];
      b.innerHTML = `<span class="s-name">${en}</span>` +
        (heb ? `<span class="s-heb">${heb}</span>` : '') +
        `<span class="s-total">${total.toLocaleString()}</span>`;
      b.addEventListener('click', () => { state.values[script] = key; render(); });
      box.appendChild(b);
    }

    const labels = SHAPES[state.shape].groups(['1', '2', '3', '4']);
    const circles = sum(labels.map((l) => l.length));
    $('shape-hint').textContent = state.shape === 'aligned'
      ? 'רצוא ושוב as two triangles of a square: the gold triangle is the run out, expanding row by row, and the indigo triangle is the way back, collapsing beside it. The arrows walk down the steps of each triangle in the order of the numbered badges. Every row reads the whole word, so a 4-letter word is worth 4× its value.'
      : state.shape === 'ladderSplit'
      ? 'סלם as two equal triangles of a rectangle: the climb in gold, the descent in indigo, the full word in both. Every row reads the whole word, so a 4-letter word is worth 5× its value.'
      : labels.length > 4
      ? `${SHAPES[state.shape].heb}: a 4-letter word makes ${labels.length} rows, ${circles} circles.`
      : `Row N holds the first N letters: a 4-letter word makes 4 rows, ${circles} circles — the triangular number T(4).`;
  }

  $('shape-seg').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-shape]');
    if (!b) return;
    state.shape = b.dataset.shape;
    render();
  });

  let debounce = 0;
  $('phrase').addEventListener('input', (e) => {
    state.text = e.target.value;
    clearTimeout(debounce);
    debounce = setTimeout(render, 140);
  });
  $('chips').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    remember($('phrase'));
    $('phrase').value = chip.dataset.text;
    commit($('phrase'));
  });

  // Every key press on the phrase box (the word keys, a sample chip) first
  // remembers the text and selection it rewrites, so the undo key can step
  // back through them. Typing by hand does not add to the stack.
  const undoStack = [];
  const remember = (ta) => {
    undoStack.push({ value: ta.value, start: ta.selectionStart, end: ta.selectionEnd });
    if (undoStack.length > 50) undoStack.shift();
    $('phrase').closest('.phrase-box').querySelector('.insert-undo').disabled = false;
  };
  const commit = (ta) => { state.text = ta.value; render(); };
  document.querySelectorAll('.insert-undo').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ta = $('phrase');
      const snap = undoStack.pop();
      if (!snap) return;
      ta.focus();
      ta.value = snap.value;
      ta.setSelectionRange(snap.start, snap.end);
      btn.disabled = !undoStack.length;
      commit(ta);
    });
  });

  // A word key rewrites the selected words (or the whole text when nothing
  // is selected) with `expand`. The result stays selected, so pressing the
  // key again applies the same expansion to every word it just wrote.
  const bindWordKey = (selector, expand) => {
    document.querySelectorAll(selector).forEach((btn) => {
      btn.addEventListener('click', () => {
        const ta = $('phrase');
        ta.focus();
        let start = ta.selectionStart ?? 0;
        let end = ta.selectionEnd ?? start;
        if (start === end) { start = 0; end = ta.value.length; }
        const sel = ta.value.slice(start, end);
        start += sel.length - sel.trimStart().length;
        end -= sel.length - sel.trimEnd().length;
        const words = sel.trim().split(/\s+/).filter(Boolean);
        if (!words.length) return;
        remember(ta);
        ta.setRangeText(words.map(expand).join(' '), start, end, 'select');
        commit(ta);
      });
    });
  };
  // the three runs as text, the same slices the shapes draw: אחור writes
  // each word's prefixes (יהוה → י יה יהו יהוה); רצוא ושוב runs out by the
  // prefixes and back by the suffixes with the full word once at the turn
  // (… יהוה הוה וה ה); סלם is the ladder, the full word in both runs
  const prefixes = (t) => t.map((_, i) => t.slice(0, i + 1).join(''));
  const suffixes = (t) => t.map((_, i) => t.slice(i).join(''));
  const achorExpand = (word) => prefixes(tokens(word)).join(' ');
  const ratzoExpand = (word) => {
    const t = tokens(word);
    return prefixes(t).concat(suffixes(t).slice(1)).join(' ');
  };
  const sulamExpand = (word) => {
    const t = tokens(word);
    return prefixes(t).concat(suffixes(t)).join(' ');
  };
  // מילוי key: every letter is written as its name under the chosen scheme
  // (הודו → הא ויו דלת ויו), so each name becomes its own shape; pressing
  // again spells the names themselves — milui d'milui
  const miluiExpand = (word) =>
    tokens(word).map((t) => G.chooseSpelling(t, state.scheme) || t).join(' ');
  bindWordKey('.insert-achor', achorExpand);
  bindWordKey('.insert-ratzo', ratzoExpand);
  bindWordKey('.insert-sulam', sulamExpand);
  bindWordKey('.insert-milui', miluiExpand);

  // the scheme picker beside the מילוי key
  const schemeSel = $('milui-scheme');
  for (const [key, spec] of Object.entries(G.SCHEMES)) {
    const o = document.createElement('option');
    o.value = key;
    o.textContent = `${spec.name} ${spec.heb}`;
    schemeSel.appendChild(o);
  }
  schemeSel.value = state.scheme;
  schemeSel.addEventListener('change', () => { state.scheme = schemeSel.value; });

  /* ---- export ---------------------------------------------------------------- */
  const safeName = () =>
    'triangles_' + (state.text.trim().replace(/\s+/g, '_').slice(0, 40) || 'art');
  function download(name, blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  $('dl-png').addEventListener('click', () => {
    const svg = $('stage').querySelector('svg');
    if (!svg) return;
    const clone = svg.cloneNode(true);
    clone.querySelectorAll('.cell,.sum-box').forEach((n) => { n.removeAttribute('class'); n.removeAttribute('style'); });
    const vb = clone.getAttribute('viewBox').split(' ').map(Number);
    clone.setAttribute('width', vb[2]);
    clone.setAttribute('height', vb[3]);
    const s = new XMLSerializer().serializeToString(clone);
    const img = new Image();
    const url = URL.createObjectURL(new Blob([s], { type: 'image/svg+xml' }));
    img.onload = () => {
      const scale = 3;
      const canvas = document.createElement('canvas');
      canvas.width = vb[2] * scale;
      canvas.height = vb[3] * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      ctx.fillStyle = ART.bg;
      ctx.fillRect(0, 0, vb[2], vb[3]);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => download(safeName() + '.png', b), 'image/png');
    };
    img.src = url;
  });

  // the studio's one-line form for building ciphers: word - run · run = total (cipher)
  // with a second row counting the letters the run writes out (one per
  // circle), the way the studio's copy line does
  function shortLine(analysis) {
    const runs = analysis.words.map((w) => w.rows.map((r) => r.label).join(' ')).join(' · ');
    const letters = sum(analysis.words.map((w) => w.circles));
    return `${state.text.trim()} - ${runs} = ${analysis.total}${primeTag(analysis.total)} (${analysis.name})` +
      `\nLetters: ${letters}`;
  }
  $('copy-line').addEventListener('click', async (e) => {
    const analysis = analyse(state.text);
    if (!analysis.words.length) return;
    const btn = e.currentTarget;
    try {
      await navigator.clipboard.writeText(shortLine(analysis));
      btn.textContent = 'Copied!';
    } catch {
      btn.textContent = 'Copy failed';
    }
    setTimeout(() => { btn.textContent = 'Copy Line'; }, 1500);
  });

  render();
})();
