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
    triangle: { label: '△ Triangle', heb: 'אחור', name: 'Mispar HaAchor אחור',
                groups: G.CIPHERS.he.boneh.groups },
    ladder:   { label: '◇ Ladder', heb: 'סלם', name: 'Sulam סלם',
                groups: G.CIPHERS.he.tosefetMigraat.groups },
    pyramid:  { label: '⬠ Out and back', heb: 'רצוא ושוב', name: 'Ratzo VaShov רצוא ושוב',
                groups: G.CIPHERS.he.ratzoVashov.groups },
  };

  const state = {
    text: $('phrase').value,
    shape: 'triangle',
    // one letter-value table per script
    values: { ...G.DEFAULT_CIPHER },
  };

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
    return hit ? (hit.line || hit.label) : `${SHAPES[shape].name} · ${spec.line || spec.label}`;
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
        cell.appendChild(txt(x, y, letter, size, ART.text, 600));
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
      item.width = (widest - 1) * HS + 2 * R + 2 * SIDE;
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
    $('art-title').textContent = `${SCRIPT_NAMES[analysis.script] || ''} — ${name}`;
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
    $('shape-hint').textContent = labels.length > 4
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
    $('phrase').value = chip.dataset.text;
    state.text = chip.dataset.text;
    render();
  });

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
  function shortLine(analysis) {
    const runs = analysis.words.map((w) => w.rows.map((r) => r.label).join(' ')).join(' · ');
    return `${state.text.trim()} - ${runs} = ${analysis.total}${primeTag(analysis.total)} (${analysis.name})`;
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
