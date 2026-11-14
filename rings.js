/* ==========================================================================
 * rings.js — the Rings page: the milui of every Hebrew word drawn as
 * concentric rings. The word's letters fill the inner ring; each letter
 * opens outward into the letters of its name under the chosen scheme
 * (י → יוד), and with milui d'milui each of those opens once more. A
 * letter's arc spans the arcs of its filling, so the nesting reads along
 * any radius: letter, name, name of the name.
 * Each ring has its own colour: gold for the word, indigo for its milui,
 * teal for the milui d'milui. The first letter of a name is the letter
 * itself — the revealed part — and the rest is the hidden filling it
 * adds; the revealed letters of every ring add up to the plain word, so
 * each wheel closes with revealed + hidden = total. Scheme and letter table are
 * chosen apart: any per-letter table (regular, reduced, ordinal …) can
 * value the rings. Rings run clockwise from twelve o'clock.
 * ========================================================================== */
(function () {
  'use strict';
  const G = window.Gematria;
  const $ = (id) => document.getElementById(id);
  const SVG_NS = 'http://www.w3.org/2000/svg';

  /* palette in the Triangles page's tones: gold for the word, the app's
   * indigo for its milui, teal for the milui d'milui */
  const ART = {
    bg: '#ffffff',
    text: '#1d1f2b', edge: '#b08d3e',
    // one colour per ring: the word, its milui, its milui d'milui
    rings: [
      { fill: '#f7f1e3', edge: '#b08d3e' },
      { fill: '#eef0fb', edge: '#4f5ed9' },
      { fill: '#e4f5f1', edge: '#1f9e89' },
    ],
    hub: '#fffaf0', muted: '#6a7086',
    sumFill: '#d9ab4a', sumEdge: '#efd08a', sumText: '#14101f', prime: '#d63b3b',
    serif: "'Frank Ruhl Libre','Cardo','Times New Roman',serif",
    sans: "'Inter',system-ui,-apple-system,'Segoe UI',sans-serif",
  };

  const state = {
    text: $('phrase').value,
    depth: 1,                 // 1 = milui, 2 = milui d'milui
    scheme: 'standard',
    values: G.DEFAULT_CIPHER.he,
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
  function txt(x, y, content, size, color, weight, family) {
    const t = el('text', {
      x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central',
      'font-size': size, fill: color, 'font-weight': weight || 500,
      'font-family': family || ART.serif,
    });
    t.textContent = content;
    return t;
  }

  /* ---- analysis ------------------------------------------------------------- */
  const sum = (xs) => xs.reduce((a, b) => a + b, 0);
  // letter tables: every Hebrew cipher that values letters one by one
  const valueCiphers = () =>
    Object.entries(G.CIPHERS.he).filter(([, s]) => !s.building && !s.fold && !s.transform);
  const valuesSpec = () => G.CIPHERS.he[state.values] || G.CIPHERS.he[G.DEFAULT_CIPHER.he];
  const letterValue = (letter, spec) => sum(G.getValues(letter, spec.map).values);

  // a letter and, down to `depth`, the letters of its name beneath it.
  // `revealed` holds for the word's own letters and, in every filling, for
  // the first letter of a revealed letter's name — the letter itself.
  function node(letter, depth, revealed, scheme, spec) {
    const n = { letter, revealed, value: letterValue(letter, spec), kids: [], leaves: 1 };
    const sp = depth > 0 && G.chooseSpelling(letter, scheme);
    if (sp) {
      n.kids = Array.from(sp).map((c, i) => node(c, depth - 1, revealed && i === 0, scheme, spec));
      n.leaves = sum(n.kids.map((k) => k.leaves));
    }
    return n;
  }
  // the nodes of ring `level` (0 = the word), in reading order
  const ring = (nodes, level) =>
    (level === 0 ? nodes : ring(nodes.flatMap((n) => n.kids), level - 1));

  function analyse(text, opts = {}) {
    const scheme = opts.scheme || state.scheme;
    const spec = opts.spec || valuesSpec();
    const words = [];
    for (const raw of text.trim().split(/\s+/)) {
      if (!raw || G.detectScript(raw) !== 'he') continue;
      // letters without a spelling (none in the shipped schemes) are skipped
      const letters = G.getValues(raw, spec.map).kept
        .filter((g) => G.chooseSpelling(g, scheme))
        .map((g) => node(g, state.depth, true, scheme, spec));
      if (!letters.length) continue;
      const rings = [];
      for (let lv = 0; lv <= state.depth; lv++) {
        const cells = ring(letters, lv);
        rings.push({ cells, total: sum(cells.map((c) => c.value)) });
      }
      const outer = rings[rings.length - 1];
      const revealed = sum(outer.cells.filter((c) => c.revealed).map((c) => c.value));
      words.push({ raw, letters, rings, total: outer.total, revealed,
        hidden: outer.total - revealed });
    }
    return { words, total: sum(words.map((w) => w.total)), spec, scheme };
  }

  const primeTag = (n) => {
    const a = G.analyzeNumber(n);
    if (!a || !a.isPrime) return '';
    return a.primeIndex ? ` [${G.ordinal(a.primeIndex)} prime]` : ' [prime]';
  };
  const isPrime = (n) => { const a = G.analyzeNumber(n); return !!(a && a.isPrime); };
  const depthName = () => (state.depth === 2 ? "Milui d'Milui" : 'Milui');
  const schemeName = (key) => `${G.SCHEMES[key].name} ${G.SCHEMES[key].heb}`;
  // the table's short name, only said when it is not the regular one
  const tableName = (spec) => (spec === G.CIPHERS.he[G.DEFAULT_CIPHER.he] ? ''
    : ` · ${spec.line || spec.label}`);

  /* ---- drawing -------------------------------------------------------------- */
  const HUB = 54;                  // radius of the centre disc holding the word
  const BAND = 56;                 // thickness of one ring
  const MIN_ARC = 30;              // least arc length of an outer cell
  const TITLE_H = 20, VALUE_H = 86, WORD_GAP = 50, MAX_LINE_W = 1500;

  // clockwise from twelve o'clock
  const pt = (r, a) => [r * Math.sin(a), -r * Math.cos(a)];
  function sector(r0, r1, a0, a1) {
    const span = Math.min(a1 - a0, 2 * Math.PI - 1e-4);
    const big = span > Math.PI ? 1 : 0;
    const [x0, y0] = pt(r1, a0), [x1, y1] = pt(r1, a0 + span);
    const [x2, y2] = pt(r0, a0 + span), [x3, y3] = pt(r0, a0);
    return `M${x0} ${y0}A${r1} ${r1} 0 ${big} 1 ${x1} ${y1}L${x2} ${y2}` +
      `A${r0} ${r0} 0 ${big} 0 ${x3} ${y3}Z`;
  }

  // one word's wheel centred on (cx, cy); k scales it so the outer ring's
  // cells stay wide enough to read
  function wheelScale(word) {
    const outerMid = HUB + BAND * (state.depth + 0.5);
    const n = word.rings[word.rings.length - 1].cells.length;
    return Math.max(1, (n * MIN_ARC) / (2 * Math.PI * outerMid));
  }
  const wheelRadius = (word) => (HUB + BAND * (state.depth + 1)) * wheelScale(word);

  function drawWheel(word, cx, cy, delay) {
    const k = wheelScale(word);
    const g = el('g', { transform: `translate(${cx} ${cy})` });
    const leaves = sum(word.letters.map((n) => n.leaves));
    const unit = (2 * Math.PI) / leaves;

    // where each letter's wedge begins (heavy spokes, hub to rim) and where
    // each letter of a name begins its own filling (lighter spokes across
    // the outer ring), so every expansion can be followed outward
    const spokes = [], subSpokes = [];
    const cell = (n, level, a0, family) => {
      const a1 = a0 + n.leaves * unit;
      if (level === 0) spokes.push(a0);
      else if (level === 1 && n.kids.length && !spokes.includes(a0)) subSpokes.push(a0);
      const r0 = (HUB + BAND * level) * k, r1 = (HUB + BAND * (level + 1)) * k;
      const c = el('g', { class: 'ring-cell' });
      c.style.setProperty('--d', `${delay.n}ms`); delay.n += delay.step;
      c.appendChild(el('path', {
        d: sector(r0, r1, a0, a1),
        fill: ART.rings[level].fill, 'fill-opacity': family % 2 ? 0.4 : 1,
        stroke: ART.rings[level].edge, 'stroke-width': 1.6, 'stroke-linejoin': 'round',
      }));
      const rm = (r0 + r1) / 2, am = (a0 + a1) / 2;
      const arc = (a1 - a0) * rm, band = r1 - r0;
      const size = Math.min(band * 0.46, arc * 0.62, 34);
      const [x, y] = pt(rm, am);
      const room = arc > size * 1.25 && band > size * 1.9;   // room for the value under the letter
      c.appendChild(txt(x, y - (room ? size * 0.3 : 0), n.letter, size, ART.text, 600));
      if (room) {
        c.appendChild(txt(x, y + size * 0.62, String(n.value), size * 0.42, ART.muted, 600, ART.sans));
      }
      const title = el('title');
      title.textContent = `${n.letter} = ${n.value}` +
        (n.kids.length ? ` · ${n.kids.map((kid) => kid.letter).join('')}` : '');
      c.appendChild(title);
      g.appendChild(c);
      let a = a0;
      for (const kid of n.kids) { cell(kid, level + 1, a, family); a += kid.leaves * unit; }
    };
    let a = 0;
    word.letters.forEach((n, i) => { cell(n, 0, a, i); a += n.leaves * unit; });
    const rim = (HUB + BAND * (state.depth + 1)) * k;
    const spoke = (angle, r0, width, color) => {
      const [x0, y0] = pt(r0, angle), [x1, y1] = pt(rim, angle);
      g.appendChild(el('line', { x1: x0, y1: y0, x2: x1, y2: y1,
        stroke: color, 'stroke-width': width, 'stroke-linecap': 'round' }));
    };
    for (const angle of subSpokes) spoke(angle, (HUB + BAND) * k, 3, ART.rings[1].edge);
    if (word.letters.length > 1) for (const angle of spokes) spoke(angle, HUB * k, 4.5, ART.text);

    // hub: the word and its plain value
    const hubR = HUB * k - 4;
    g.appendChild(el('circle', { r: hubR, fill: ART.hub, stroke: ART.edge, 'stroke-width': 1.6 }));
    const wordSize = Math.min(hubR * 0.62, (hubR * 1.7) / (word.letters.length * 0.62));
    g.appendChild(txt(0, -hubR * 0.18, word.raw, wordSize, ART.text, 700));
    g.appendChild(txt(0, hubR * 0.42, String(word.rings[0].total), hubR * 0.3, ART.muted, 700, ART.sans));

    // below the wheel: the outer ring's total, the ring totals from the
    // word outward, and how the total splits into revealed and hidden
    const R = wheelRadius(word);
    g.appendChild(txt(0, R + 30, String(word.total), 26, ART.text, 800, ART.sans));
    g.appendChild(txt(0, R + 54, word.rings.map((r) => r.total).join(' → '), 13, ART.muted, 600, ART.sans));
    g.appendChild(txt(0, R + 72,
      `revealed ${word.revealed} + hidden ${word.hidden}`, 12, ART.muted, 500, ART.sans));
    return g;
  }

  function render() {
    const stage = $('stage');
    const analysis = analyse(state.text);
    syncControls(analysis);
    stage.innerHTML = '';
    if (!analysis.words.length) {
      stage.innerHTML = '<div class="empty-state"><div class="big-glyphs">◎</div>' +
        '<p>Type a Hebrew word or phrase to draw the rings of its milui.</p></div>';
      $('art-title').textContent = '—';
      return analysis;
    }
    const items = analysis.words.map((w) => ({ w, r: wheelRadius(w) }));

    // greedy wrap into lines; Hebrew lays its words right to left
    const lines = [];
    let line = [], lineW = 0;
    for (const item of items) {
      const need = 2 * item.r + (line.length ? WORD_GAP : 0);
      if (line.length && lineW + need > MAX_LINE_W) { lines.push(line); line = []; lineW = 0; }
      line.push(item); lineW += need;
    }
    if (line.length) lines.push(line);

    const root = el('g');
    const cells = sum(analysis.words.map((w) => sum(w.rings.map((r) => r.cells.length))));
    const delay = { n: 0, step: Math.min(26, 1400 / cells) };
    let y = 0, maxW = 0;
    for (const ln of lines) {
      const totalW = sum(ln.map((it) => 2 * it.r)) + (ln.length - 1) * WORD_GAP;
      maxW = Math.max(maxW, totalW);
      const lineR = Math.max(...ln.map((it) => it.r));
      let x = -totalW / 2;
      for (const item of [...ln].reverse()) {
        root.appendChild(drawWheel(item.w, x + item.r, y + TITLE_H + lineR, delay));
        x += 2 * item.r + WORD_GAP;
      }
      y += TITLE_H + 2 * lineR + VALUE_H;
    }

    // the phrase total and the figure's caption
    const multi = analysis.words.length > 1;
    const name = `${depthName()} ${schemeName(state.scheme)}${tableName(analysis.spec)}`;
    let capY = y + 14;
    if (multi) {
      const prime = isPrime(analysis.total);
      const bw = 96, bh = 46;
      const box = el('g', { class: 'sum-box' });
      box.style.setProperty('--d', `${delay.n + 80}ms`);
      box.appendChild(el('rect', {
        x: -bw / 2, y: y + 6, width: bw, height: bh, rx: 12,
        fill: ART.sumFill, stroke: prime ? ART.prime : ART.sumEdge, 'stroke-width': prime ? 4 : 2.5,
      }));
      box.appendChild(txt(0, y + 6 + bh / 2, String(analysis.total),
        Math.min(24, bw / (String(analysis.total).length * 0.62)), ART.sumText, 800, ART.sans));
      root.appendChild(box);
      capY = y + 6 + bh + 26;
    }
    const caption = (multi ? analysis.words.map((w) => w.total).join(' + ') + ' = ' : '') +
      analysis.total + primeTag(analysis.total) + ` — ${name}`;
    root.appendChild(txt(0, capY, caption, 15, ART.muted, 600, ART.sans));
    maxW = Math.max(maxW, caption.length * 8.6);

    const m = 24;
    const w = maxW + 2 * m, h = capY + 20 + m;
    const svg = el('svg', { xmlns: SVG_NS, viewBox: `${-maxW / 2 - m} ${-m} ${w} ${h}` });
    svg.style.aspectRatio = `${w} / ${h}`;
    svg.appendChild(root);
    stage.appendChild(svg);
    $('art-title').textContent = `Hebrew עברית — ${name}`;
    return analysis;
  }

  /* ---- controls -------------------------------------------------------------- */
  function pill(name, heb, total, active, onClick) {
    const b = document.createElement('button');
    b.className = 'scheme-pill' + (active ? ' active' : '') + (isPrime(total) ? ' prime' : '');
    b.innerHTML = `<span class="s-name">${name}</span>` +
      (heb ? `<span class="s-heb">${heb}</span>` : '') +
      `<span class="s-total">${total.toLocaleString()}</span>`;
    b.addEventListener('click', onClick);
    return b;
  }
  function syncControls() {
    $('depth-seg').querySelectorAll('button').forEach((b) =>
      b.classList.toggle('active', Number(b.dataset.depth) === state.depth));

    // one pill per scheme and per letter table, each with the phrase's
    // total at this depth; a prime total gets the studio's red border
    const schemes = $('schemes');
    schemes.innerHTML = '';
    for (const [key, spec] of Object.entries(G.SCHEMES)) {
      schemes.appendChild(pill(spec.name, spec.heb, analyse(state.text, { scheme: key }).total,
        key === state.scheme, () => { state.scheme = key; render(); }));
    }
    const values = $('values');
    values.innerHTML = '';
    const current = valuesSpec();
    for (const [key, spec] of valueCiphers()) {
      const [heb, en] = spec.label.includes(' / ') ? spec.label.split(' / ') : ['', spec.label];
      values.appendChild(pill(en, heb, analyse(state.text, { spec }).total,
        spec === current, () => { state.values = key; render(); }));
    }
  }

  $('depth-seg').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-depth]');
    if (!b) return;
    state.depth = Number(b.dataset.depth);
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
    'rings_' + (state.text.trim().replace(/\s+/g, '_').slice(0, 40) || 'art');
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
    clone.querySelectorAll('.ring-cell,.sum-box').forEach((n) => { n.removeAttribute('class'); n.removeAttribute('style'); });
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

  // the studio's one-line milui form — fillings = total (scheme) - phrase —
  // with the letter count of the outer ring on a second row
  function shortLine(analysis) {
    const spelt = (level) => analysis.words.map((w) => w.letters
      .flatMap((n) => (level === 1 ? [n] : n.kids))
      .map((n) => n.kids.map((kid) => kid.letter).join('')).join(' ')).join(' ');
    const letters = sum(analysis.words.map((w) => w.rings[w.rings.length - 1].cells.length));
    return spelt(1) + (state.depth === 2 ? ` - ${spelt(2)}` : '') +
      ` = ${analysis.total}${primeTag(analysis.total)}` +
      ` (${depthName()} ${schemeName(state.scheme)}${tableName(analysis.spec)}) - ${state.text.trim()}` +
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
