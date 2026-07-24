/* ==========================================================================
 * app.js — interactive rendering for Gematria Studio.
 * Layout mirrors the matplotlib renderers in gematria-art.py (letter grid)
 * and milui_gematria.py (milui blocks), rebuilt as live SVG.
 * ========================================================================== */
(function () {
  'use strict';
  const G = window.Gematria;
  const $ = (id) => document.getElementById(id);

  /* ---- state --------------------------------------------------------------- */
  const state = {
    text: '',
    textB: '',                           // second phrase for the compare view
    compareSlots: null,                  // null = all ciphers, else Set of slot indices
    view: 'values',                      // 'values' | 'milui' | 'compare'
    shape: 'square',
    scheme: 'standard',
    miluiDepth: 1,                       // 1 = milui, 2 = milui d'milui
    cipher: { ...G.DEFAULT_CIPHER },     // selected cipher key per script
  };

  /* ---- custom milui: persistence ------------------------------------------- */
  const MILUI_LS_KEY = 'gematria-custom-milui';
  try {
    const saved = JSON.parse(localStorage.getItem(MILUI_LS_KEY) || 'null');
    if (saved) G.setCustomMilui(saved);
  } catch (e) { /* corrupt or invalid — keep shipped defaults */ }

  /* ---- art palette (letter grid + milui) ----------------------------------- */
  const ART = {
    bg: '#ffffff',
    letterFill: '#f7f1e3', letterEdge: '#b08d3e', letterText: '#1d1f2b',
    valueFill: '#0c4f42', valueEdge: '#34d399', valueText: '#d8fff1',
    sumFill: '#d9ab4a', sumEdge: '#efd08a', sumText: '#14101f',
    fillCell: '#131f3a', fillEdge: '#5b7bb8', fillText: '#cfe0ff', fillValue: '#3d5a94',
    fill2Cell: '#0d3330', fill2Edge: '#2e8f7f', fill2Text: '#b9f3e4',
    subtotalFill: '#24457f', subtotalText: '#eaf1ff',
    serif: "'Frank Ruhl Libre','Cardo','Times New Roman',serif",
  };

  /* ---- per-cipher accents ---------------------------------------------------- */
  /* Every cipher owns one cool hue; the same concept keeps its color across
   * scripts (ordinal is sky-blue in Hebrew, Greek and English alike), so a
   * value cell's color always says which cipher produced the number. */
  const CIPHER_HUES = {
    he: { hechrachi: 237, gadol: 259, siduri: 200, katan: 174, katanMilim: 152,
          atbash: 188, ayakBachar: 276, boneh: 218, mikum: 291,
          notariqon: 140, preExilic: 120, reversePreExilic: 105 },
    el: { isopsephy: 237, ordinal: 200, building: 218,
          notariqon: 140, preExilic: 120, reversePreExilic: 105 },
    en: { sumerian: 237, ordinal: 200, reverse: 188, reduction: 174,
          isopsephy: 152, building: 218, buildingSumerian: 259 },
  };
  const DEFAULT_SAT = 72;                           // saturation of the stock hues

  /* user color overrides: { 'he:atbash': '#22d3ee', … }, kept on this device */
  const COLOR_LS_KEY = 'gematria-cipher-colors';
  let colorOverrides = {};
  try {
    colorOverrides = JSON.parse(localStorage.getItem(COLOR_LS_KEY) || '{}') || {};
  } catch (e) { colorOverrides = {}; }

  function hexToHsl(hex) {
    const n = parseInt(hex.slice(1), 16);
    const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0;
    if (d) {
      h = max === r ? (g - b) / d + (g < b ? 6 : 0)
        : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
    }
    const l = (max + min) / 2;
    const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
    return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
  }
  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const f = (n) => {
      const k = (n + h / 30) % 12;
      const c = l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
      return Math.round(c * 255).toString(16).padStart(2, '0');
    };
    return '#' + f(0) + f(8) + f(4);
  }

  /* the single swatch a cipher shows in the color panel — its edge color */
  function defaultSwatch(script, key) {
    const h = (CIPHER_HUES[script] || {})[key];
    return h === undefined ? '#888888' : hslToHex(h, DEFAULT_SAT, 60);
  }

  const accentCache = new Map();
  /* shades derived from the cipher's hue and saturation (a user override
   * contributes both, so muted picks stay muted): dark value cell + bright
   * edge + pale text (mirroring the original teal trio), a light sum box
   * that keeps the dark sum text readable, folded-block cell shades, and
   * UI-side tints. Saturation ratios are relative to the stock 72%. */
  function accentFor(script, key) {
    const ck = script + ':' + key;
    let h = (CIPHER_HUES[script] || {})[key], s = DEFAULT_SAT;
    const over = colorOverrides[ck];
    if (over) { const c = hexToHsl(over); h = c.h; s = c.s; }
    if (h === undefined) return null;               // unmapped cipher → ART defaults
    let a = accentCache.get(ck);
    if (!a) {
      const sat = (r) => Math.round(Math.min(100, s * r));
      a = {
        fill: `hsl(${h} ${sat(0.67)}% 19%)`, edge: `hsl(${h} ${sat(1)}% 60%)`,
        text: `hsl(${h} ${sat(1.39)}% 94%)`,
        sumFill: `hsl(${h} ${sat(0.94)}% 66%)`, sumEdge: `hsl(${h} ${sat(1.14)}% 82%)`,
        cell: `hsl(${h} ${sat(0.58)}% 16%)`, cellEdge: `hsl(${h} ${sat(0.63)}% 48%)`,
        cellText: `hsl(${h} ${sat(1.25)}% 88%)`, cellValue: `hsl(${h} ${sat(0.56)}% 55%)`,
        subFill: `hsl(${h} ${sat(0.72)}% 34%)`,
        ui: `hsl(${h} ${sat(0.86)}% 42%)`, uiSoft: `hsl(${h} ${sat(0.97)}% 60% / 0.5)`,
        uiBg: `hsl(${h} ${sat(0.97)}% 60% / 0.12)`,
      };
      accentCache.set(ck, a);
    }
    return a;
  }

  const SVG_NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, children) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) node.setAttribute(k, v);
    (children || []).forEach((c) => node.appendChild(c));
    return node;
  }
  function txt(x, y, content, size, color, weight) {
    return el('text', {
      x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central',
      'font-size': size, fill: color, 'font-weight': weight || 500,
    }, [document.createTextNode(content)]);
  }

  /* ---- shapes (same proportions as the Python SHAPE_RENDERERS) ------------- */
  function shape(type, x, y, w, h, fill, edge, lw) {
    const a = { fill, stroke: edge, 'stroke-width': lw ?? 2 };
    const poly = (pts) => el('polygon', { ...a, points: pts.map((p) => p.join(',')).join(' ') });
    switch (type) {
      case 'circle':
        return el('ellipse', { ...a, cx: x + w / 2, cy: y + h / 2, rx: w / 2, ry: h / 2 });
      case 'triangle':      // apex up (SVG y grows downward)
        return poly([[x, y + h], [x + w, y + h], [x + w / 2, y]]);
      case 'hexagon':
        return poly([[x + .25 * w, y], [x + .75 * w, y], [x + w, y + .5 * h],
                     [x + .75 * w, y + h], [x + .25 * w, y + h], [x, y + .5 * h]]);
      case 'octagon':
        return poly([[x + .3 * w, y], [x + .7 * w, y], [x + w, y + .3 * h], [x + w, y + .7 * h],
                     [x + .7 * w, y + h], [x + .3 * w, y + h], [x, y + .7 * h], [x, y + .3 * h]]);
      default:
        return el('rect', { ...a, x, y, width: w, height: h, rx: w * 0.08 });
    }
  }
  // text centre of a shape (triangle centroid sits lower)
  const shapeCY = (type, y, h) => (type === 'triangle' ? y + h * 0.66 : y + h / 2);

  /* ---- phrase analysis ------------------------------------------------------ */
  /* cipherOf: optional per-script cipher override, e.g. { he: 'siduri' } */
  function analyse(text, cipherOf) {
    const script = G.detectScript(text) || 'en';
    const words = [];
    for (const raw of text.trim().split(/\s+/)) {
      if (!raw) continue;
      const ws = G.detectScript(raw) || script;
      const cipherKey = (cipherOf && cipherOf[ws]) ||
        state.cipher[ws] || G.DEFAULT_CIPHER[ws];
      const spec = G.CIPHERS[ws][cipherKey];
      let { kept, values } = G.getValues(raw, spec.map);
      // notariqon ciphers contract each word to its picked letters (the
      // initial or the final) before any transform — the phrase evaluates
      // as its acronym
      if (spec.pick) {
        const idx = spec.pick(kept);
        kept = idx.map((i) => kept[i]);
        values = idx.map((i) => values[i]);
      }
      const word = { raw, script: ws, kept, values, accent: accentFor(ws, cipherKey) };
      if (spec.transform) word.values = spec.transform(values);
      // word-reduced ciphers contract each word to a single token whose
      // value is the digital root of the letter sum (בראשית → 13 → 4); the
      // pre-fold letters stay on the word for the report's derivation line
      if (spec.fold) {
        word.folded = { kept, values: word.values };
        const f = spec.fold(kept, word.values);
        kept = f.kept;
        word.kept = f.kept;
        word.values = f.values;
      }
      // building ciphers keep the plain per-letter values too: the grid view
      // redraws the word as prefix groups built from them (see expandBuilding)
      if (spec.building) { word.building = true; word.base = values; }
      // cipher-provided labels show how each value arose. Transform steps
      // (י יה יהו / ל×2) replace the letter label; substitution letters
      // (the atbash mirror, the ayak bachar chamber-mate) annotate the
      // original letter instead. Family names (ayak bachar chambers) are a
      // second annotation surfaced in tooltips.
      const bare = kept.map((g) => G.stripMarks(g));
      if (spec.groups) {
        const labels = spec.groups(bare);
        if (spec.substitution) word.subs = labels;
        else word.groups = labels;
      }
      if (spec.families) word.fams = spec.families(bare);
      if (kept.length) words.push(word);
    }
    const total = words.reduce((a, w) => a + w.values.reduce((x, y) => x + y, 0), 0);
    const topCipher = (cipherOf && cipherOf[script]) ||
      state.cipher[script] || G.DEFAULT_CIPHER[script];
    return { script, words, total, accent: accentFor(script, topCipher),
      letters: words.reduce((a, w) => a + w.kept.length, 0) };
  }

  /* the acronym a notariqon phrase contracts to (אגלא, ΙΧΘΥΣ) */
  const notariqonWord = (analysis) =>
    analysis.words.map((w) => w.kept.map((g) => G.stripMarks(g)).join('')).join('');

  /* Cells per line derived from the stage frame width: the artwork (and the
   * exported PNG) wraps to fill the frame at a comfortable cell size instead
   * of a fixed column count. colPx is the on-screen budget per column. */
  function cellsPerLine(colPx) {
    const w = $('stage').clientWidth || 900;
    return Math.max(3, Math.round(w / colPx));
  }

  /* greedy wrap: pack words into lines of at most maxCells letter-cells */
  function wrapWords(words, maxCells) {
    const lines = [];
    let line = [], cells = 0;
    for (const w of words) {
      const need = w.kept.length + (line.length ? 1 : 0);
      if (line.length && cells + need > maxCells) { lines.push(line); line = []; cells = 0; }
      cells += w.kept.length + (line.length ? 1 : 0);
      line.push(w);
    }
    if (line.length) lines.push(line);
    return lines;
  }

  /* Building ciphers draw every prefix of a word as its own letter/value
   * group — ι · ιη · ιησ … each cell carrying the plain letter value — so
   * the word is visibly "built up" step by step. Each prefix becomes a
   * pseudo-word (wrapping and RTL layout come for free), and the grand
   * total is unchanged: the prefix sums add up to the cumulative total.
   * Totals, insights and the text report keep the compact original words. */
  function expandBuilding(analysis) {
    if (!analysis.words.some((w) => w.building)) return analysis;
    const words = analysis.words.flatMap((w) => w.building
      ? w.kept.map((_, i) => ({
          raw: w.groups[i], script: w.script, accent: w.accent,
          kept: w.kept.slice(0, i + 1), values: w.base.slice(0, i + 1),
          fams: w.fams && w.fams.slice(0, i + 1),
        }))
      : [w]);
    return { ...analysis, words };
  }

  /* ---- letter-grid renderer (port of generate_gematria_art) ---------------- */
  /* draw one phrase's wrapped letter/value lines into `parent` starting at
   * y = 0; returns the layout metrics the caller needs to place a sum box */
  function drawGridPhrase(parent, analysis, delay0, maxCells) {
    const S = 60, GAP = S * 0.28, VGAP = S * 0.22, LINEGAP = S * 0.75;
    const WORDGAP = S * 0.8, STEP = S + GAP;
    const rtl = analysis.script === 'he';
    const lines = wrapWords(analysis.words, maxCells);
    const lineH = 2 * S + VGAP;

    let delay = delay0, maxLineW = 0, lastLineW = 0;

    lines.forEach((lineWords, li) => {
      const yTop = li * (lineH + LINEGAP);
      // visual order: RTL phrases place the first word rightmost
      const visual = rtl ? [...lineWords].reverse() : lineWords;
      let x = 0;
      visual.forEach((word, wi) => {
        const AC = word.accent || {};              // cipher hue for the value cells
        // a word always reads in its own direction regardless of line order
        const idx = word.kept.map((_, i) => i);
        const order = word.script === 'he' ? idx.reverse() : idx;
        for (const i of order) {
          const letter = word.kept[i], value = word.values[i];
          const g = el('g', { class: 'cell' });
          g.style.setProperty('--d', `${delay}ms`); delay += 26;
          const label = word.groups ? word.groups[i] : G.stripMarks(letter);
          const glyphs = G.graphemes(label).length;
          g.appendChild(shape(state.shape, x, yTop, S, S, ART.letterFill, ART.letterEdge));
          const cy = shapeCY(state.shape, yTop, S);
          if (word.subs || word.fams) {
            // substitution ciphers: the original letter stays primary, the
            // letter the cipher reads (whose value sits below) shown smaller,
            // and beneath that the letter's family (its ayak bachar chamber)
            // when the cipher names one
            const rows = [[label, word.fams ? S * 0.32 : S * 0.38, ART.letterText]];
            if (word.subs) rows.push([word.subs[i], word.fams ? S * 0.18 : S * 0.2, ART.letterEdge]);
            if (word.fams) rows.push([word.fams[i], S * 0.15, ART.letterEdge]);
            const ys = rows.length === 3 ? [-0.18, 0.1, 0.31] : [-0.1, 0.26];
            rows.forEach(([t, size, fill], r) =>
              g.appendChild(txt(x + S / 2, cy + S * ys[r], t, size, fill, 600)));
          } else if (!word.groups && label !== G.stripSuperscripts(label)) {
            // rabati (×1000) letters are traditionally written oversized:
            // drop the superscript mark and draw the bare letter larger
            g.appendChild(txt(x + S / 2, cy,
              G.stripSuperscripts(label), S * 0.62, ART.letterText, 700));
          } else {
            g.appendChild(txt(x + S / 2, cy,
              label, S * (glyphs > 1 ? Math.min(0.3, 0.9 / glyphs) : 0.44), ART.letterText, 600));
          }
          g.appendChild(shape(state.shape, x, yTop + S + VGAP, S, S,
            AC.fill || ART.valueFill, AC.edge || ART.valueEdge));
          g.appendChild(txt(x + S / 2, shapeCY(state.shape, yTop + S + VGAP, S),
            String(value), S * (String(value).length > 2 ? 0.26 : 0.32),
            AC.text || ART.valueText, 700));
          attachTip(g, word.script, word.groups ? word.groups[i] : letter, value,
            undefined, word.subs && word.subs[i], word.fams && word.fams[i]);
          parent.appendChild(g);
          x += STEP;
        }
        x -= GAP;                                  // trim trailing letter gap
        if (wi < visual.length - 1) x += WORDGAP;  // gap before next word
      });
      maxLineW = Math.max(maxLineW, x);
      lastLineW = x;
    });

    return {
      rtl, lineH, LINEGAP, delay, maxLineW, lastLineW,
      lineCount: lines.length,
      height: (lines.length - 1) * (lineH + LINEGAP) + lineH,
    };
  }

  function renderGrid(analysis) {
    const S = 60;
    const root = el('g', { 'font-family': ART.serif });
    const m = drawGridPhrase(root, expandBuilding(analysis), 0, cellsPerLine(72));
    const { rtl, lineH, LINEGAP } = m;

    // sum box: at the reading end of a single line, centered below when wrapped
    const sumW = S * 1.7, sumH = lineH, sumGap = S * 0.55;
    const multi = m.lineCount > 1;
    const lastTop = multi
      ? m.lineCount * (lineH + LINEGAP)
      : (m.lineCount - 1) * (lineH + LINEGAP);
    const sumX = multi
      ? (m.maxLineW - sumW) / 2
      : (rtl ? -sumGap - sumW : m.lastLineW + sumGap);
    const AC = analysis.accent || {};
    const sg = el('g', { class: 'sum-box' });
    sg.style.setProperty('--d', `${m.delay + 80}ms`);
    sg.appendChild(el('rect', {
      x: sumX, y: lastTop, width: sumW, height: sumH, rx: 14,
      fill: AC.sumFill || ART.sumFill, stroke: AC.sumEdge || ART.sumEdge,
      'stroke-width': 2.5,
    }));
    sg.appendChild(txt(sumX + sumW / 2, lastTop + sumH / 2, String(analysis.total),
      Math.min(S * 0.5, sumW / (String(analysis.total).length * 0.62)), ART.sumText, 800));
    root.appendChild(sg);

    const minX = Math.min(0, sumX), maxX = Math.max(m.maxLineW, sumX + sumW);
    const height = lastTop + lineH;
    return finishSVG(root, minX, maxX, height, S);
  }

  /* ---- compare renderer: phrases stacked per cipher, totals in one column --- */
  /* Cipher sections are paired by position so cross-script compares line up
   * (standard vs isopsephy first, then ordinal vs ordinal, …). */
  function compareSections() {
    const entries = [state.text, state.textB]
      .map((text) => ({ text, base: analyse(text) }))
      .filter((e) => e.base.letters);
    const sections = [];
    if (!entries.length) return { entries, sections };
    const slots = Math.max(...entries.map((e) => Object.keys(G.CIPHERS[e.base.script]).length));
    for (let slot = 0; slot < slots; slot++) {
      const cipherOf = {}, labels = [];
      for (const e of entries) {
        const keys = Object.keys(G.CIPHERS[e.base.script]);
        const key = keys[Math.min(slot, keys.length - 1)];
        cipherOf[e.base.script] = key;
        const label = G.CIPHERS[e.base.script][key].label;
        if (!labels.includes(label)) labels.push(label);
      }
      sections.push({
        label: labels.join(' vs '),
        cipherOf,
        // the first phrase's cipher colors the whole section (cross-script
        // pairings share a slot, and slots share a hue by concept anyway)
        accent: accentFor(entries[0].base.script, cipherOf[entries[0].base.script]),
        results: entries.map((e) => {
          const a = analyse(e.text, cipherOf);
          // each phrase keeps the name of the cipher actually applied to it,
          // so cross-script compares can label every row correctly
          a.cipherLabel = G.CIPHERS[e.base.script][cipherOf[e.base.script]].label;
          return a;
        }),
      });
    }
    return { entries, sections };
  }

  /* apply the user's cipher-pill filter; fall back to all if it empties out */
  function visibleCompareSections(sections) {
    if (!state.compareSlots) return sections;
    const v = sections.filter((_, i) => state.compareSlots.has(i));
    return v.length ? v : sections;
  }

  /* draw one cipher section (both phrases + totals) into `root` starting at
   * y0; returns extents so callers can stack or wrap it.
   * Short phrases keep every total in one aligned side column; once any
   * phrase wraps, the section switches to the values-view treatment — full
   * frame width, wrapped totals centered below their art. */
  function drawCompareSection(root, section, y0, delay0) {
    const S = 60, VGAP = S * 0.22, lineH = 2 * S + VGAP;
    const eqGap = S, boxW = S * 1.9;
    const sumW = S * 1.7, sumGap = S * 0.55;
    const frameCells = cellsPerLine(72);
    const columnCells = Math.max(3, frameCells - 3);  // leave room for the totals column
    const results = section.results.map(expandBuilding);
    // word-reduced phrases draw their folded blocks here too; their narrower
    // cells (and pre-fold letter counts) rescale the grid's cell budget
    const isFolded = (a) => a.words.length && a.words.every((w) => w.folded);
    const foldedCells = (cells) => Math.max(3, Math.round(cells * 72 / 46));
    const wraps = (a, cells) => (isFolded(a)
      ? wrapWords(a.words.map((w) => ({ kept: w.folded.kept })), foldedCells(cells))
      : wrapWords(a.words, cells)).length > 1;
    const wrapped = results.some((a) => wraps(a, columnCells));
    const maxCells = wrapped ? frameCells : columnCells;
    let y = y0, delay = delay0, minX = 0, maxX = 0;
    // cross-script compare applies a different cipher to each phrase; label
    // every row with its own cipher so nothing is misattributed
    const rowLabels = results.some(
      (r) => r.cipherLabel !== results[0].cipherLabel);

    const drawn = [];
    for (const a of results) {
      if (rowLabels) y += S * 0.62;               // headroom for the row label
      const g = el('g');
      const m = isFolded(a)
        ? drawFoldedPhrase(g, a, delay, foldedCells(maxCells))
        : drawGridPhrase(g, a, delay, maxCells);
      delay = m.delay;
      root.appendChild(g);
      const multi = m.lineCount > 1;
      drawn.push({ g, m, a, y, multi });
      // a wrapped phrase's total sits on its own row below the art
      y += m.height + (wrapped && multi ? m.LINEGAP + lineH : 0) + S * 0.55;
    }
    y -= S * 0.55;

    const equal = drawn.length > 1 && drawn.every((d) => d.a.total === drawn[0].a.total);
    // right-align RTL phrases so cross-script sections share one right edge
    const right = Math.max(0, ...drawn.map((d) => (d.m.rtl ? 0 : d.m.maxLineW)));
    for (const d of drawn) {
      const dx = d.m.rtl ? right - d.m.maxLineW : 0;
      d.g.setAttribute('transform', `translate(${dx} ${d.y})`);
      minX = Math.min(minX, dx);
      maxX = Math.max(maxX, dx + d.m.maxLineW);

      if (rowLabels) {
        root.appendChild(el('text', {
          x: d.m.rtl ? right : dx, y: d.y - S * 0.34,
          'text-anchor': d.m.rtl ? 'end' : 'start',
          'dominant-baseline': 'central',
          'font-size': S * 0.3, fill: '#8a90a6', 'font-weight': 600,
        }, [document.createTextNode(d.a.cipherLabel)]));
      }

      let bx, by, bw;
      if (!wrapped) {
        bw = boxW;
        bx = right + eqGap;
        by = d.y + (d.m.height - lineH) / 2;
      } else if (d.multi) {
        // centered below the art, like the values view; the phrase's own
        // metrics place it correctly for grid and folded blocks alike
        bw = sumW;
        bx = dx + (d.m.maxLineW - sumW) / 2;
        by = d.y + d.m.height + d.m.LINEGAP;
      } else {
        // single line: total at the reading end, like the values view
        bw = sumW;
        bx = d.m.rtl ? dx - sumGap - sumW : dx + d.m.lastLineW + sumGap;
        by = d.y;
      }
      const AC = d.a.accent || {};
      const sg = el('g', { class: 'sum-box' });
      sg.style.setProperty('--d', `${d.m.delay + 80}ms`);
      if (!wrapped) {
        sg.appendChild(txt(right + eqGap / 2, by + lineH / 2, '=', S * 0.55, ART.letterText, 700));
      }
      sg.appendChild(el('rect', {
        x: bx, y: by, width: bw, height: lineH, rx: 14,
        fill: AC.sumFill || ART.sumFill,
        stroke: equal ? ART.valueEdge : (AC.sumEdge || ART.sumEdge),
        'stroke-width': equal ? 3.5 : 2.5,
      }));
      sg.appendChild(txt(bx + bw / 2, by + lineH / 2, String(d.a.total),
        Math.min(S * 0.5, bw / (String(d.a.total).length * 0.62)), ART.sumText, 800));
      root.appendChild(sg);
      minX = Math.min(minX, bx);
      maxX = Math.max(maxX, bx + bw);
    }
    return { minX, maxX, y, delay, equal };
  }

  /* on-screen compare: one card per cipher so each section scales up alone */
  function renderCompareCards() {
    const sections = visibleCompareSections(compareSections().sections);
    return sections.map((section) => {
      const root = el('g', { 'font-family': ART.serif });
      const r = drawCompareSection(root, section, 0, 0);
      return {
        label: section.label, equal: r.equal, accent: section.accent,
        svg: finishSVG(root, r.minX, r.maxX, r.y, 60),
      };
    });
  }

  /* combined single-SVG compare (titles included) — used for the PNG export */
  function renderCompare() {
    const S = 60;
    const sections = visibleCompareSections(compareSections().sections);
    if (!sections.length) return null;

    const root = el('g', { 'font-family': ART.serif });
    const titles = [];
    let y = 0, delay = 0, minX = 0, maxX = 0, titleW = 0;

    for (const section of sections) {
      const title = txt(0, y + S * 0.35, section.label, S * 0.42,
        (section.accent && section.accent.ui) || ART.letterText, 700);
      titles.push(title);
      root.appendChild(title);
      titleW = Math.max(titleW, section.label.length * S * 0.42 * 0.58);
      y += S * 1.05;

      const r = drawCompareSection(root, section, y, delay);
      y = r.y; delay = r.delay;
      minX = Math.min(minX, r.minX);
      maxX = Math.max(maxX, r.maxX);
      y += S * 1.15;                                // section gap
    }
    y -= S * 1.15;

    // center titles over the final extent, widening it if a title overhangs
    const cx = (minX + maxX) / 2;
    minX = Math.min(minX, cx - titleW / 2);
    maxX = Math.max(maxX, cx + titleW / 2);
    titles.forEach((t) => t.setAttribute('x', cx));
    return finishSVG(root, minX, maxX, y, S);
  }

  /* ---- milui renderer (port of MiluiLayout + MiluiRenderer) ----------------- */
  /* depth 1 draws each letter's filling; depth 2 (milui d'milui) draws one
   * row per filling letter with that letter's own filling and value. */
  function renderMilui(analysis) {
    const S = 60, SP = S * 0.28;
    const deep = state.miluiDepth === 2;
    const hebWords = analysis.words.filter((w) => w.script === 'he');

    // depth 2: block height follows the longest first-level spelling in the
    // phrase, so grand subtotals align across blocks
    const ROW = S * 0.64;
    let maxK = 2;
    if (deep) {
      for (const w of hebWords) for (const letter of w.kept) {
        const sp = G.chooseSpelling(letter, state.scheme);
        if (sp) maxK = Math.max(maxK, Array.from(sp).length);
      }
    }
    const blockW = deep ? S * 2.3 : S;
    const COL = deep ? blockW + S * 0.3 : S + SP;
    const BLOCK_H = deep ? S * 1.82 + maxK * ROW : S * 2.7;
    const LINEGAP = S * 0.5;
    const LINESTEP = BLOCK_H + LINEGAP + S * 0.6;
    // milui blocks are tall, so long phrases stack into a very vertical card;
    // aim for a wide ~2.4:1 banner instead, capped at 2× the frame's natural
    // column count so blocks stay legible in the viewport
    const letterCount = hebWords.reduce((a, w) => a + w.kept.length, 0);
    const frameCols = cellsPerLine(deep ? 235 : 95);
    const aspectCols = Math.ceil(Math.sqrt(3.2 * letterCount * LINESTEP / COL));
    const lines = wrapWords(hebWords, Math.min(Math.max(frameCols, aspectCols), frameCols * 2));

    const root = el('g', { 'font-family': ART.serif });
    let delay = 0, total = 0, minX = Infinity, maxX = -Infinity;

    lines.forEach((lineWords, li) => {
      const yTop = li * LINESTEP;
      let cx = 0;                                   // columns advance leftward (RTL)
      for (const word of lineWords) {
        for (const letter of word.kept) {
          const spelling = G.chooseSpelling(letter, state.scheme);
          if (!spelling) continue;
          total += deep
            ? G.miluiDmiluiValue(letter, state.scheme)
            : G.spellingValue(spelling);
          const g = el('g', { class: 'cell' });
          g.style.setProperty('--d', `${delay}ms`); delay += 45;
          if (deep) drawMiluiBlock2(g, cx, yTop, letter, spelling, S, maxK);
          else drawMiluiBlock(g, cx, yTop, letter, spelling, S, SP);
          attachTip(g, 'he', letter, G.getValues(letter, G.HEBREW_VALUES).values[0], spelling);
          root.appendChild(g);
          minX = Math.min(minX, cx - blockW / 2 - SP);
          maxX = Math.max(maxX, cx + blockW / 2 + SP);
          cx -= COL;
        }
        cx -= S * 0.6;                              // word gap
      }
    });

    // phrase total box: at the RTL end of a single line, centered below when wrapped
    const bw = S * 1.9, bh = BLOCK_H;
    const multi = lines.length > 1;
    const lastTop = multi
      ? (lines.length - 1) * LINESTEP + BLOCK_H + LINEGAP
      : (lines.length - 1) * LINESTEP;
    const xLeft = multi
      ? (minX + maxX) / 2 - bw / 2
      : minX - S * 0.5 - bw;
    const sg = el('g', { class: 'sum-box' });
    sg.style.setProperty('--d', `${delay + 80}ms`);
    sg.appendChild(el('rect', {
      x: xLeft, y: lastTop, width: bw, height: bh, rx: 14,
      fill: ART.sumFill, stroke: ART.sumEdge, 'stroke-width': 2.5,
    }));
    sg.appendChild(txt(xLeft + bw / 2, lastTop + bh / 2, String(total),
      Math.min(S * 0.5, bw / (String(total).length * 0.62)), ART.sumText, 800));
    root.appendChild(sg);
    minX = Math.min(minX, xLeft);
    maxX = Math.max(maxX, xLeft + bw);

    const height = lastTop + BLOCK_H;
    return { svg: finishSVG(root, minX, maxX, height, S), total };
  }

  /* one milui block: parent cell, nested spelling cluster, subtotal box */
  function drawMiluiBlock(g, cx, yTop, letter, spelling, S, SP) {
    g.appendChild(el('rect', {
      x: cx - S / 2, y: yTop, width: S, height: S, rx: S * 0.08,
      fill: ART.letterFill, stroke: ART.letterEdge, 'stroke-width': 2,
    }));
    const label = G.stripMarks(letter);
    g.appendChild(txt(cx, yTop + S / 2, label,
      S * (G.graphemes(label).length > 1 ? 0.32 : 0.5), ART.letterText, 600));

    const fillTop = yTop + S + S * 0.22;
    const chars = Array.from(spelling);
    const k = chars.length;
    const mh = S * 0.5;
    const cw = Math.min(S * 0.6, (S + SP * 0.6) / k);
    const cellGap = cw * 0.14, cellW = cw - cellGap;
    const valGap = S * 0.22;
    const startLeft = cx - (k * cw) / 2;
    chars.forEach((c, j) => {
      const xL = startLeft + (k - 1 - j) * cw + cellGap / 2;   // RTL: first char right
      const cxj = xL + cellW / 2;
      g.appendChild(el('rect', {
        x: xL, y: fillTop, width: cellW, height: mh, rx: cellW * 0.12,
        fill: ART.fillCell, stroke: ART.fillEdge, 'stroke-width': 1,
      }));
      g.appendChild(txt(cxj, fillTop + mh / 2, c, S * 0.3, ART.fillText, 500));
      g.appendChild(txt(cxj, fillTop + mh + valGap, String(G.HEBREW_VALUES[c]),
        S * 0.18, ART.fillValue, 600));
    });
    const subTop = fillTop + mh + valGap + S * 0.24;
    const sw = S * 0.82, sh = S * 0.5;
    g.appendChild(el('rect', {
      x: cx - sw / 2, y: subTop, width: sw, height: sh, rx: 8,
      fill: ART.subtotalFill,
    }));
    g.appendChild(txt(cx, subTop + sh / 2, String(G.spellingValue(spelling)),
      S * 0.26, ART.subtotalText, 700));
  }

  /* one milui-d'milui block: parent cell, then one row per filling letter —
   * that letter at the right (RTL), its own filling beside it, the row's
   * milui value at the left — and the letter's grand subtotal below */
  function drawMiluiBlock2(g, cx, yTop, letter, spelling, S, maxK) {
    const W = S * 2.3;
    g.appendChild(el('rect', {
      x: cx - S / 2, y: yTop, width: S, height: S, rx: S * 0.08,
      fill: ART.letterFill, stroke: ART.letterEdge, 'stroke-width': 2,
    }));
    const label = G.stripMarks(letter);
    g.appendChild(txt(cx, yTop + S / 2, label,
      S * (G.graphemes(label).length > 1 ? 0.32 : 0.5), ART.letterText, 600));

    const ROW = S * 0.64, rowH = S * 0.5;
    const right = cx + W / 2;
    const rowsTop = yTop + S + S * 0.22;
    Array.from(spelling).forEach((c, j) => {
      const y = rowsTop + j * ROW;
      const cw = S * 0.5;
      g.appendChild(el('rect', {
        x: right - cw, y, width: cw, height: rowH, rx: cw * 0.12,
        fill: ART.fillCell, stroke: ART.fillEdge, 'stroke-width': 1,
      }));
      g.appendChild(txt(right - cw / 2, y + rowH / 2, c, S * 0.28, ART.fillText, 500));

      const sp2 = G.chooseSpelling(c, state.scheme);
      const tc = S * 0.36, tGap = tc * 0.12;
      Array.from(sp2).forEach((c2, j2) => {
        const xL = right - cw - S * 0.12 - (j2 + 1) * tc + tGap / 2;
        g.appendChild(el('rect', {
          x: xL, y: y + rowH * 0.06, width: tc - tGap, height: rowH * 0.88,
          rx: tc * 0.12,
          fill: ART.fill2Cell, stroke: ART.fill2Edge, 'stroke-width': 1,
        }));
        g.appendChild(txt(xL + (tc - tGap) / 2, y + rowH / 2, c2, S * 0.24, ART.fill2Text, 500));
      });
    });

    // grand subtotal, aligned across blocks via the phrase-wide maxK
    const subTop = rowsTop + maxK * ROW - (ROW - rowH) + S * 0.24;
    const sw = S, sh = S * 0.5;
    g.appendChild(el('rect', {
      x: cx - sw / 2, y: subTop, width: sw, height: sh, rx: 8,
      fill: ART.subtotalFill,
    }));
    g.appendChild(txt(cx, subTop + sh / 2,
      String(G.miluiDmiluiValue(letter, state.scheme)), S * 0.26, ART.subtotalText, 700));
  }

  /* ---- word-reduced renderer: milui-style blocks, one per word --------------- */
  /* Each word draws like a milui block: the whole word as the parent cell,
   * its letters beneath with their reduced values (the first step), and a
   * subtotal box where the sum contracts to its digital root (13 → 4).
   * The phrase total box adds the word roots, so the art stays sum-true. */
  /* draw the folded word blocks into `parent` starting at y = 0, wrapping on
   * the pre-fold letter count (maxCells is in folded-cell units); returns the
   * same layout metrics as drawGridPhrase, so the compare view can stack and
   * align folded phrases exactly like grid phrases */
  function drawFoldedPhrase(parent, analysis, delay0, maxCells) {
    const S = 60, cw = S * 0.62, WORDGAP = S * 0.55;
    const words = analysis.words.filter((w) => w.folded && w.folded.kept.length);
    const wordW = (w) => Math.max(S * 1.15, w.folded.kept.length * cw);
    const BLOCK_H = S * 2.68, LINEGAP = S * 1.1;

    const lines = wrapWords(
      words.map((w) => ({ ...w, kept: w.folded.kept, word: w })),
      maxCells).map((line) => line.map((x) => x.word));
    const lineW = (line) =>
      line.reduce((a, w) => a + wordW(w), 0) + (line.length - 1) * WORDGAP;
    const maxLineW = Math.max(...lines.map(lineW));

    let delay = delay0;
    lines.forEach((lineWords, li) => {
      const yTop = li * (BLOCK_H + LINEGAP);
      let right = maxLineW;                     // RTL: lines share the right edge
      for (const word of lineWords) {
        const bw = wordW(word);
        const g = el('g', { class: 'cell' });
        g.style.setProperty('--d', `${delay}ms`); delay += 45;
        drawFoldedBlock(g, right - bw / 2, yTop, word, S, bw);
        parent.appendChild(g);
        right -= bw + WORDGAP;
      }
    });

    return {
      rtl: true, lineH: BLOCK_H, LINEGAP, delay, maxLineW,
      lastLineW: lineW(lines[lines.length - 1]),
      lineCount: lines.length,
      height: (lines.length - 1) * (BLOCK_H + LINEGAP) + BLOCK_H,
    };
  }

  function renderFolded(analysis) {
    const S = 60;
    const root = el('g', { 'font-family': ART.serif });
    const m = drawFoldedPhrase(root, analysis, 0, cellsPerLine(46));

    // phrase total box: at the RTL end of a single line, centered below when wrapped
    const bw = S * 1.9, multi = m.lineCount > 1;
    const lastTop = multi ? m.height + S * 0.5 : 0;
    const xLeft = multi
      ? (m.maxLineW - bw) / 2
      : -S * 0.5 - bw;
    const AC = analysis.accent || {};
    const sg = el('g', { class: 'sum-box' });
    sg.style.setProperty('--d', `${m.delay + 80}ms`);
    sg.appendChild(el('rect', {
      x: xLeft, y: lastTop, width: bw, height: m.lineH, rx: 14,
      fill: AC.sumFill || ART.sumFill, stroke: AC.sumEdge || ART.sumEdge,
      'stroke-width': 2.5,
    }));
    sg.appendChild(txt(xLeft + bw / 2, lastTop + m.lineH / 2, String(analysis.total),
      Math.min(S * 0.5, bw / (String(analysis.total).length * 0.62)), ART.sumText, 800));
    root.appendChild(sg);

    const minX = Math.min(0, xLeft), maxX = Math.max(m.maxLineW, xLeft + bw);
    return finishSVG(root, minX, maxX, lastTop + m.lineH, S);
  }

  /* one word-reduced block: word cell, reduced-letter cluster, subtotal box */
  function drawFoldedBlock(g, cx, yTop, word, S, bw) {
    const AC = word.accent || {};
    g.appendChild(el('rect', {
      x: cx - bw / 2, y: yTop, width: bw, height: S, rx: S * 0.08,
      fill: ART.letterFill, stroke: ART.letterEdge, 'stroke-width': 2,
    }));
    g.appendChild(txt(cx, yTop + S / 2, G.stripMarks(word.kept.join('')),
      S * 0.42, ART.letterText, 600));

    const chars = word.folded.kept, vals = word.folded.values;
    const k = chars.length;
    const fillTop = yTop + S + S * 0.22;
    const mh = S * 0.5, valGap = S * 0.22;
    const colW = bw / k, cellW = colW * 0.86;
    chars.forEach((c, j) => {
      const xL = cx + bw / 2 - (j + 1) * colW + (colW - cellW) / 2;  // RTL
      const cxj = xL + cellW / 2;
      // per-letter group so each letter carries its own tooltip
      const lg = el('g');
      lg.appendChild(el('rect', {
        x: xL, y: fillTop, width: cellW, height: mh, rx: cellW * 0.12,
        fill: AC.cell || ART.fillCell, stroke: AC.cellEdge || ART.fillEdge,
        'stroke-width': 1,
      }));
      lg.appendChild(txt(cxj, fillTop + mh / 2, G.stripMarks(c), S * 0.3,
        AC.cellText || ART.fillText, 500));
      lg.appendChild(txt(cxj, fillTop + mh + valGap, String(vals[j]),
        S * 0.18, AC.cellValue || ART.fillValue, 600));
      attachTip(lg, word.script, c, vals[j]);
      g.appendChild(lg);
    });

    // the sum of the reduced letters contracting to the word's root
    const subTop = fillTop + mh + valGap + S * 0.24;
    const sum = vals.reduce((a, b) => a + b, 0);
    const label = sum === word.values[0] ? String(sum) : `${sum} → ${word.values[0]}`;
    const sw = Math.max(S * 0.82, label.length * S * 0.17), sh = S * 0.5;
    g.appendChild(el('rect', {
      x: cx - sw / 2, y: subTop, width: sw, height: sh, rx: 8,
      fill: AC.subFill || ART.subtotalFill,
    }));
    g.appendChild(txt(cx, subTop + sh / 2, label, S * 0.26, ART.subtotalText, 700));
  }

  function finishSVG(root, minX, maxX, height, S) {
    const m = S * 0.4;
    const w = maxX - minX + 2 * m, h = height + 2 * m;
    const svg = el('svg', {
      xmlns: SVG_NS,
      viewBox: `${minX - m} ${-m} ${w} ${h}`,
    });
    // real aspect ratio lets the stylesheet scale the art to the largest
    // size that fits both the frame width and the viewport height, instead
    // of letterboxing tall drawings inside a full-width box
    svg.style.aspectRatio = `${w} / ${h}`;
    svg.appendChild(root);
    return svg;
  }

  /* ---- tooltip --------------------------------------------------------------- */
  const tooltip = $('tooltip');
  function attachTip(g, script, letter, value, spelling, sub, family) {
    g.addEventListener('pointerenter', () => {
      const key = G.stripMarks(letter);
      const base = script === 'he' ? G.baseLetter(key) : key.toLowerCase();
      const name = script === 'he' ? G.HEBREW_NAMES[base]
        : script === 'el' ? G.GREEK_NAMES[base] : key.toUpperCase();
      let html = `<span class="t-letter">${key}</span> <span class="t-name">${name || ''}</span>`;
      // substitution ciphers: the value belongs to the letter it reads as
      html += sub
        ? `<div class="t-sub">reads as <b>${sub}</b> ` +
          `${(script === 'he' && G.HEBREW_NAMES[G.baseLetter(sub)]) || ''}` +
          ` — value <b>${value}</b></div>`
        : `<div class="t-sub">value <b>${value}</b></div>`;
      if (family) html += `<div class="t-sub">chamber <b>${family}</b></div>`;
      if (script === 'he') {
        const sp = spelling || G.chooseSpelling(key, state.scheme);
        if (sp) {
          const parts = Array.from(sp).map((c) => `${c}‏(${G.HEBREW_VALUES[c]})`).join(' + ');
          html += `<div class="t-sub">milui <span class="t-milui">${sp}</span> = ` +
            `${parts} = <b>${G.spellingValue(sp)}</b></div>`;
          if (state.view === 'milui' && state.miluiDepth === 2) {
            const parts2 = Array.from(sp).map((c) => {
              const s2 = G.chooseSpelling(c, state.scheme);
              return `${s2}‏(${G.spellingValue(s2)})`;
            }).join(' + ');
            html += `<div class="t-sub">milui² ${parts2} = ` +
              `<b>${G.miluiDmiluiValue(key, state.scheme)}</b></div>`;
          }
        }
      }
      tooltip.innerHTML = html;
      tooltip.classList.add('show');
    });
    g.addEventListener('pointermove', (e) => {
      const pad = 16;
      const w = tooltip.offsetWidth, h = tooltip.offsetHeight;
      let x = e.clientX + pad, y = e.clientY + pad;
      if (x + w > innerWidth - 8) x = e.clientX - w - pad;
      if (y + h > innerHeight - 8) y = e.clientY - h - pad;
      tooltip.style.left = x + 'px';
      tooltip.style.top = y + 'px';
    });
    g.addEventListener('pointerleave', () => tooltip.classList.remove('show'));
  }

  /* ---- UI sync ----------------------------------------------------------------- */
  function syncCipherSelect(script) {
    const sel = $('cipher-select');
    sel.innerHTML = '';
    for (const [key, spec] of Object.entries(G.CIPHERS[script])) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = spec.label;
      const a = accentFor(script, key);
      if (a) opt.style.color = a.ui;
      sel.appendChild(opt);
    }
    sel.value = state.cipher[script] || G.DEFAULT_CIPHER[script];
    // the closed select wears the chosen cipher's color as a swatch
    const a = accentFor(script, sel.value);
    sel.style.color = a ? a.ui : '';
    sel.style.borderColor = a ? a.uiSoft : '';
  }

  /* compare view: one pill per cipher pairing, with both totals at a glance */
  function buildComparePills(box) {
    const { sections } = compareSections();
    if (!sections.length) return;
    const all = document.createElement('button');
    all.className = 'scheme-pill' + (state.compareSlots ? '' : ' active');
    all.innerHTML = '<span class="s-name">All</span><span class="s-heb">הכל</span>';
    all.addEventListener('click', () => { state.compareSlots = null; render(); });
    box.appendChild(all);

    sections.forEach((s, i) => {
      const b = document.createElement('button');
      const on = state.compareSlots && state.compareSlots.has(i);
      b.className = 'scheme-pill' + (on ? ' active' : '');
      const totals = s.results.map((r) => r.total.toLocaleString());
      const equal = s.results.length > 1 &&
        s.results.every((r) => r.total === s.results[0].total);
      b.innerHTML = `<span class="s-name">${s.label}</span>` +
        `<span class="s-total">${totals.join(equal ? ' = ' : ' · ')}</span>`;
      if (s.accent) {
        b.style.borderColor = on ? s.accent.ui : s.accent.uiSoft;
        if (on) {
          b.style.background = s.accent.uiBg;
          b.style.boxShadow = `0 0 0 3px ${s.accent.uiBg}`;
        }
        b.querySelector('.s-total').style.color = s.accent.ui;
      }
      b.addEventListener('click', () => {
        if (!state.compareSlots) state.compareSlots = new Set([i]);
        else if (state.compareSlots.has(i)) {
          state.compareSlots.delete(i);
          if (!state.compareSlots.size) state.compareSlots = null;
        } else state.compareSlots.add(i);
        render();
      });
      box.appendChild(b);
    });
  }

  function syncSchemes(analysis) {
    const box = $('schemes');
    const show = state.view === 'milui' || state.view === 'compare';
    box.classList.toggle('visible', show);
    box.innerHTML = '';
    if (!show) return;
    if (state.view === 'compare') { buildComparePills(box); return; }
    for (const [key, spec] of Object.entries(G.SCHEMES)) {
      const b = document.createElement('button');
      b.className = 'scheme-pill' + (key === state.scheme ? ' active' : '');
      const t = state.miluiDepth === 2
        ? G.miluiDmiluiTotal(state.text, key)
        : G.miluiTotal(state.text, key);
      b.innerHTML = `<span class="s-name">${spec.name}</span>` +
        `<span class="s-heb">${spec.heb}</span>` +
        `<span class="s-total">${t.toLocaleString()}</span>`;
      b.addEventListener('click', () => { state.scheme = key; render(); });
      box.appendChild(b);
    }
    const edit = document.createElement('button');
    edit.className = 'scheme-pill edit-pill';
    edit.title = 'Edit the Custom milui spellings';
    edit.innerHTML = '<span class="s-name">✎ Edit</span>' +
      '<span class="s-heb">מילוי מים</span>';
    edit.addEventListener('click', () => toggleConfig());
    box.appendChild(edit);
  }

  /* ---- cipher color config panel --------------------------------------------- */
  const SCRIPT_TITLES = { he: 'Hebrew עברית', el: 'Greek Ελληνικά', en: 'English' };

  function persistColors() {
    if (Object.keys(colorOverrides).length) {
      localStorage.setItem(COLOR_LS_KEY, JSON.stringify(colorOverrides));
    } else {
      localStorage.removeItem(COLOR_LS_KEY);
    }
  }

  function toggleColors(force) {
    const card = $('colors-card');
    const show = force !== undefined ? force : card.hidden;
    if (show) {
      buildColorsGrid();
      card.hidden = false;
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      card.hidden = true;
    }
  }

  function buildColorsGrid() {
    const grid = $('colors-grid');
    grid.innerHTML = '';
    $('colors-msg').textContent = '';
    for (const [script, ciphers] of Object.entries(G.CIPHERS)) {
      const head = document.createElement('div');
      head.className = 'colors-script';
      head.textContent = SCRIPT_TITLES[script] || script;
      grid.appendChild(head);
      for (const [key, spec] of Object.entries(ciphers)) {
        const ck = script + ':' + key;
        const row = document.createElement('div');
        row.className = 'color-row';

        const input = document.createElement('input');
        input.type = 'color';
        input.value = colorOverrides[ck] || defaultSwatch(script, key);

        const label = document.createElement('span');
        label.className = 'c-label';
        label.dir = 'auto';
        label.textContent = spec.label;

        const reset = document.createElement('button');
        reset.className = 'c-reset';
        reset.title = 'Back to the default color';
        reset.textContent = '↺';

        const applyTint = () => {
          const a = accentFor(script, key);
          label.style.color = a ? a.ui : '';
          reset.hidden = !colorOverrides[ck];
        };
        // live: the art recolors while the picker is being dragged
        input.addEventListener('input', () => {
          colorOverrides[ck] = input.value;
          accentCache.delete(ck);
          persistColors();
          applyTint();
          clearTimeout(debounce);
          debounce = setTimeout(render, 120);
        });
        reset.addEventListener('click', () => {
          delete colorOverrides[ck];
          accentCache.delete(ck);
          persistColors();
          input.value = defaultSwatch(script, key);
          applyTint();
          render();
        });

        row.append(input, label, reset);
        grid.appendChild(row);
        applyTint();
      }
    }
  }

  $('colors-reset').addEventListener('click', () => {
    colorOverrides = {};
    accentCache.clear();
    persistColors();
    buildColorsGrid();
    $('colors-msg').textContent = 'Defaults restored ✓';
    render();
  });

  $('cipher-colors-btn').addEventListener('click', () => toggleColors());

  /* ---- custom milui config panel -------------------------------------------- */
  function toggleConfig(force) {
    const card = $('config-card');
    const show = force !== undefined ? force : card.hidden;
    if (show) {
      buildConfigGrid();
      card.hidden = false;
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      card.hidden = true;
    }
  }

  function buildConfigGrid() {
    const grid = $('milui-grid');
    grid.innerHTML = '';
    $('cfg-msg').textContent = '';
    const table = G.getCustomMilui();
    for (const L of G.HEBREW_ORDER) {
      const row = document.createElement('div');
      row.className = 'milui-row';
      row.dataset.letter = L;

      const letter = document.createElement('span');
      letter.className = 'm-letter';
      letter.textContent = L;

      const name = document.createElement('span');
      name.className = 'm-name';
      name.textContent = G.HEBREW_NAMES[L];

      const input = document.createElement('input');
      input.type = 'text';
      input.dir = 'rtl';
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.value = table[L];

      const val = document.createElement('span');
      val.className = 'm-value';

      input.addEventListener('input', () => refreshRow(row, L, input, val));
      row.append(letter, name, input, val);
      grid.appendChild(row);
      refreshRow(row, L, input, val);
    }
  }

  function refreshRow(row, L, input, val) {
    const err = G.validateSpelling(L, input.value);
    row.classList.toggle('invalid', !!err);
    input.title = err || '';
    val.textContent = err ? '—' : G.spellingValue(G.stripMarks(input.value).trim());
  }

  function readConfigGrid() {
    const table = {};
    let bad = 0;
    for (const row of $('milui-grid').querySelectorAll('.milui-row')) {
      const L = row.dataset.letter;
      const input = row.querySelector('input');
      if (G.validateSpelling(L, input.value)) bad++;
      else table[L] = G.stripMarks(input.value).trim();
    }
    return { table, bad };
  }

  $('cfg-save').addEventListener('click', () => {
    const { table, bad } = readConfigGrid();
    const msg = $('cfg-msg');
    if (bad) {
      msg.textContent = 'Fix the highlighted spelling' + (bad > 1 ? 's' : '') + ' first.';
      msg.classList.add('error');
      return;
    }
    G.setCustomMilui(table);
    localStorage.setItem(MILUI_LS_KEY, JSON.stringify(table));
    msg.textContent = 'Saved ✓';
    msg.classList.remove('error');
    render();
  });

  $('cfg-reset').addEventListener('click', () => {
    G.setCustomMilui(G.DEFAULT_CUSTOM_MILUI);
    localStorage.removeItem(MILUI_LS_KEY);
    buildConfigGrid();
    const msg = $('cfg-msg');
    msg.textContent = 'Restored defaults ✓';
    msg.classList.remove('error');
    render();
  });

  /* ---- number insights: what kind of number each total is -------------------- */
  const fmtFactors = (factors) =>
    factors.map(([p, e]) => (e > 1 ? p + G.toSuperscript(e) : String(p))).join(' × ');

  // one flat description of an insight card, shared by the DOM renderer and
  // the combined PNG export so both always show the same content
  function factModel(label, value) {
    const a = G.analyzeNumber(value);
    const m = { label, value: value.toLocaleString(), prime: false, pairs: [], tags: [] };
    if (!a) { m.kind = '—'; return m; }
    if (a.n === 1) m.kind = 'unity — the multiplicative identity';
    else if (a.isPrime) {
      m.prime = true;
      m.kind = 'prime' + (a.primeIndex ? ` — the ${G.ordinal(a.primeIndex)} prime` : '');
    } else m.kind = fmtFactors(a.factors);
    const MAX = 14;
    m.pairs = a.pairs.slice(0, MAX).map(([x, y]) => `${x} × ${y}`);
    if (a.pairs.length > MAX) m.pairs.push(`+${a.pairs.length - MAX} more`);
    m.tags = a.props.map((p) => ({ text: p, dr: false }));
    m.tags.push({ text: `digital root ${a.digitalRoot}`, dr: true });
    return m;
  }

  function factBlock(label, value) {
    const m = factModel(label, value);
    const d = document.createElement('div');
    d.className = 'fact-block';

    const head = document.createElement('div');
    head.className = 'fact-head';
    const lab = document.createElement('span');
    lab.className = 'fact-label';
    lab.dir = 'auto';
    lab.textContent = m.label;
    const val = document.createElement('span');
    val.className = 'fact-value';
    val.textContent = m.value;
    head.append(lab, val);
    d.appendChild(head);

    const kind = document.createElement('div');
    kind.className = 'fact-kind' + (m.prime ? ' prime' : '');
    kind.textContent = m.kind;
    d.appendChild(kind);

    if (m.pairs.length) {
      const row = document.createElement('div');
      row.className = 'fact-pairs';
      for (const p of m.pairs) {
        const c = document.createElement('span');
        c.className = 'fact-chip';
        c.textContent = p;
        row.appendChild(c);
      }
      d.appendChild(row);
    }

    if (m.tags.length) {
      const tags = document.createElement('div');
      tags.className = 'fact-tags';
      for (const t of m.tags) {
        const s = document.createElement('span');
        s.className = 'fact-tag' + (t.dr ? ' dr' : '');
        s.textContent = t.text;
        tags.appendChild(s);
      }
      d.appendChild(tags);
    }
    return d;
  }

  let lastFacts = []; // what the insights card currently shows, for the PNG export

  function renderFacts(entries) {
    const box = $('facts');
    box.innerHTML = '';
    const list = (entries || [])
      .filter((e) => Number.isInteger(e.value) && e.value > 0)
      .slice(0, 9);
    lastFacts = list;
    $('facts-card').hidden = !list.length;
    for (const e of list) box.appendChild(factBlock(e.label, e.value));
  }

  /* ---- atbash mapping: how each letter was transformed ------------------------ */
  const BASE_TO_FINAL = Object.fromEntries(
    Object.entries(G.FINAL_TO_BASE).map(([fin, base]) => [base, fin]));

  function atbashWord(kept) {
    const mapped = kept.map((L) =>
      G.HEBREW_ATBASH_LETTER[G.baseLetter(G.stripMarks(L))] || G.stripMarks(L));
    // the mirror of the last letter takes its final form when one exists
    const last = mapped.length - 1;
    if (last >= 0 && BASE_TO_FINAL[mapped[last]]) mapped[last] = BASE_TO_FINAL[mapped[last]];
    return mapped;
  }

  function renderAtbash(analysis) {
    const card = $('atbash-card'), box = $('atbash');
    const show = state.view === 'values' && analysis.script === 'he' && !!analysis.letters &&
      (state.cipher.he || G.DEFAULT_CIPHER.he) === 'atbash';
    card.hidden = !show;
    box.innerHTML = '';
    if (!show) return;
    for (const word of analysis.words) {
      if (word.script !== 'he') continue;
      const mapped = atbashWord(word.kept);
      const row = document.createElement('div');
      row.className = 'atbash-row';

      const head = document.createElement('div');
      head.className = 'atbash-words';
      head.dir = 'rtl';
      const src = document.createElement('span');
      src.className = 'a-src';
      src.textContent = word.raw;
      const arrow = document.createElement('span');
      arrow.className = 'a-arrow';
      arrow.textContent = '⇄';
      const dst = document.createElement('span');
      dst.className = 'a-dst';
      dst.textContent = mapped.join('');
      head.append(src, arrow, dst);
      row.appendChild(head);

      const chips = document.createElement('div');
      chips.className = 'atbash-chips';
      chips.dir = 'rtl';
      word.kept.forEach((L, i) => {
        const c = document.createElement('span');
        c.className = 'fact-chip atbash-chip';
        c.textContent = `${G.stripMarks(L)} ↔ ${mapped[i]} = ${word.values[i]}`;
        chips.appendChild(c);
      });
      row.appendChild(chips);
      box.appendChild(row);
    }
  }

  /* ---- main render --------------------------------------------------------------- */
  function setBadge(node, analysis) {
    if (analysis.letters) {
      node.textContent = { he: 'עברית Hebrew', el: 'Ελληνικά Greek', en: 'English' }[analysis.script];
      node.className = 'script-badge ' + analysis.script;
    } else {
      node.textContent = '—';
      node.className = 'script-badge';
    }
  }

  function render() {
    const stage = $('stage');
    // the art under the pointer is about to be replaced — no pointerleave
    // will fire, so drop any lingering tooltip explicitly
    tooltip.classList.remove('show');
    const analysis = analyse(state.text);
    const isHe = analysis.script === 'he';
    const compare = state.view === 'compare';

    // milui tab availability
    const miluiTab = $('milui-tab');
    miluiTab.disabled = !isHe;
    if (!isHe && state.view === 'milui') state.view = 'values';
    document.querySelectorAll('#view-seg button').forEach((b) =>
      b.classList.toggle('active', b.dataset.view === state.view));
    $('cipher-group').style.display = state.view === 'milui' || compare ? 'none' : '';
    $('shape-group').style.display = state.view === 'milui' ? 'none' : '';
    $('depth-group').style.display = state.view === 'milui' ? '' : 'none';
    if (state.view !== 'milui') $('config-card').hidden = true;

    // second phrase input only in compare view
    $('phrase-b-box').hidden = !compare;

    // script badges
    setBadge($('script-badge'), analysis);
    setBadge($('script-badge-b'), analyse(state.textB));
    syncCipherSelect(analysis.script);
    syncSchemes(analysis);

    // stage
    stage.innerHTML = '';
    let art = null, title = '', facts = [];
    if (compare) {
      const cards = renderCompareCards();
      if (cards.length) {
        art = document.createElement('div');
        art.className = 'compare-cards';
        for (const c of cards) {
          const card = document.createElement('div');
          card.className = 'compare-card' + (c.equal ? ' equal' : '');
          const h = document.createElement('div');
          h.className = 'compare-card-title';
          h.textContent = c.label;
          if (c.accent) {
            h.style.color = c.accent.ui;
            // the emerald equal-totals border still outranks the cipher tint
            if (!c.equal) card.style.borderColor = c.accent.uiSoft;
          }
          card.appendChild(h);
          card.appendChild(c.svg);
          art.appendChild(card);
        }
        title = 'Comparison · השוואה';
        // one insight block per distinct total; a total reached by several
        // phrase/cipher pairings lists them all in its label
        const byValue = new Map();
        for (const s of visibleCompareSections(compareSections().sections)) {
          s.results.forEach((r, i) => {
            const tag = `${String.fromCharCode(65 + i)} — ${r.cipherLabel.split(' / ').pop()}`;
            const tags = byValue.get(r.total) || [];
            if (!tags.includes(tag)) tags.push(tag);
            byValue.set(r.total, tags);
          });
        }
        facts = [...byValue].map(([value, tags]) => ({ label: tags.join(' · '), value }));
      }
    } else if (analysis.letters && state.view === 'milui') {
      const mil = renderMilui(analysis);
      art = mil.svg;
      title = (state.miluiDepth === 2 ? "מילוי דמילוי · Milui d'Milui" : 'מילוי · Milui') +
        ` — ${G.SCHEMES[state.scheme].name} ${G.SCHEMES[state.scheme].heb}`;
      facts = [{
        label: `${state.miluiDepth === 2 ? 'Milui² total' : 'Milui total'} · ${G.SCHEMES[state.scheme].name}`,
        value: mil.total,
      }];
    } else if (analysis.letters) {
      const cipherKey = state.cipher[analysis.script] || G.DEFAULT_CIPHER[analysis.script];
      const spec = G.CIPHERS[analysis.script][cipherKey];
      // word-reduced phrases draw milui-style word blocks (letters, sum,
      // root); mixed-script phrases fall back to the plain grid, which
      // shows folded words as single word/root cells
      art = spec.fold && analysis.words.every((w) => w.folded)
        ? renderFolded(analysis)
        : renderGrid(analysis);
      title = spec.label;
      facts = [{ label: 'Total', value: analysis.total }];
      if (spec.pick) {
        const acronym = notariqonWord(analysis);
        title += ' — ' + acronym;
        facts[0].label = 'Notariqon ' + acronym;
      }
      if (analysis.words.length > 1) {
        for (const w of analysis.words) {
          facts.push({ label: w.raw, value: w.values.reduce((x, y) => x + y, 0) });
        }
      }
    }
    if (!art) {
      stage.appendChild($('empty-state') || buildEmpty());
      $('art-title').textContent = '';
      $('art-title').style.color = '';
      renderFacts([]);
      renderAtbash(analysis);
      return;
    }
    stage.appendChild(art);
    $('art-title').textContent = title;
    $('art-title').style.color =
      (state.view === 'values' && analysis.accent) ? analysis.accent.ui : '';
    renderFacts(facts);
    renderAtbash(analysis);
  }

  function buildEmpty() {
    const d = document.createElement('div');
    d.className = 'empty-state';
    d.id = 'empty-state';
    d.innerHTML = '<div class="big-glyphs">א · ω · A</div>' +
      '<p style="margin-top:14px">Every letter carries a number.<br/>Start typing to reveal the pattern.</p>';
    return d;
  }

  /* ---- export --------------------------------------------------------------------- */
  function currentSVGString() {
    // compare shows one card per cipher; export composes them into one image
    const svg = state.view === 'compare'
      ? renderCompare()
      : $('stage').querySelector('svg');
    if (!svg) return null;
    const clone = svg.cloneNode(true);
    // freeze entrance animation + drop hover affordances for export
    clone.querySelectorAll('.cell,.sum-box').forEach((n) => {
      n.removeAttribute('class');
      n.removeAttribute('style');
    });
    const vb = clone.getAttribute('viewBox').split(' ').map(Number);
    // stamp the on-screen caption (cipher / scheme name) above the art;
    // compare art already carries its per-section titles
    const label = state.view === 'compare' ? '' : $('art-title').textContent;
    if (label) {
      const size = 25, titleH = size * 1.9;
      const tw = label.length * size * 0.58;
      const cx = vb[0] + vb[2] / 2;
      if (tw > vb[2]) { vb[0] = cx - tw / 2; vb[2] = tw; }
      vb[1] -= titleH; vb[3] += titleH;
      const exportAccent = state.view === 'values' ? analyse(state.text).accent : null;
      const t = txt(cx, vb[1] + titleH / 2, label, size,
        (exportAccent && exportAccent.ui) || ART.letterText, 700);
      t.setAttribute('font-family', ART.serif);
      clone.appendChild(t);
      clone.setAttribute('viewBox', vb.join(' '));
    }
    clone.insertBefore(el('rect', {
      x: vb[0], y: vb[1], width: vb[2], height: vb[3], fill: ART.bg,
    }), clone.firstChild);
    clone.setAttribute('width', vb[2]);
    clone.setAttribute('height', vb[3]);
    return new XMLSerializer().serializeToString(clone);
  }
  function download(name, blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  const safeName = () =>
    'gematria_' + (state.text.trim().replace(/\s+/g, '_').slice(0, 40) || 'art');

  /* ---- text report ----------------------------------------------------------- */
  /* number-insight lines for the text report */
  function numberLines(n) {
    const a = G.analyzeNumber(n);
    if (!a || a.n === 1) return [];
    const lines = [];
    if (a.isPrime) {
      lines.push('Number: prime' +
        (a.primeIndex ? ` (the ${G.ordinal(a.primeIndex)} prime)` : ''));
    } else {
      lines.push(`Factors: ${fmtFactors(a.factors)}`);
      if (a.pairs.length) {
        lines.push('Products: ' + a.pairs.map(([x, y]) => `${x}×${y}`).join(' = '));
      }
    }
    for (const p of a.props) lines.push(`Form: ${p}`);
    return lines;
  }

  /* the cipher's letter→value key, appended to every report as a plain
   * sequence (א=1 ב=2 …); finals and the stigma variant appear only when
   * the cipher values them differently from their base letter */
  function cipherKeyLines(script, spec) {
    const pair = (L) => `${L}=${spec.map[L]}`;
    let seq;
    if (script === 'he') {
      seq = G.HEBREW_ORDER.map(pair);
      for (const [fin, base] of Object.entries(G.FINAL_TO_BASE)) {
        if (spec.map[fin] !== spec.map[base]) seq.push(pair(fin));
      }
    } else if (script === 'el') {
      seq = G.GREEK_ORDER.map(pair);
      if (spec.map['ϛ'] !== spec.map['ϝ']) seq.push(pair('ϛ'));
    } else {
      seq = G.ENGLISH_ORDER.map(pair);
    }
    return [`${spec.label} — letter values:`, seq.join(' ')];
  }

  function buildTextReport(analysis) {
    const rule = '-'.repeat(46);
    if (state.view === 'compare') {
      const both = compareSections();
      const entries = both.entries;
      const sections = visibleCompareSections(both.sections);
      const lines = [rule];
      entries.forEach((e, i) =>
        lines.push(`${String.fromCharCode(65 + i)}: ${e.text.trim()}`));
      lines.push(rule);
      for (const s of sections) {
        lines.push(s.label);
        const mixed = s.results.some((r) => r.cipherLabel !== s.results[0].cipherLabel);
        s.results.forEach((r, i) => lines.push(
          `  ${String.fromCharCode(65 + i)} = ${r.total}` +
          ` (digital root ${G.digitalRoot(r.total)})` +
          (mixed ? ` — ${r.cipherLabel}` : '')));
        if (s.results.length > 1) {
          lines.push(s.results.every((r) => r.total === s.results[0].total)
            ? '  → equal totals' : '  → different totals');
        }
        lines.push('');
      }
      // letter-value key for every distinct cipher the visible sections used
      const seen = new Set();
      for (const s of sections) {
        for (const r of s.results) {
          const key = `${r.script}:${s.cipherOf[r.script]}`;
          if (seen.has(key)) continue;
          seen.add(key);
          lines.push(rule, ...cipherKeyLines(r.script,
            G.CIPHERS[r.script][s.cipherOf[r.script]]));
        }
      }
      return lines.join('\r\n');
    }
    const lines = [rule,
      `Phrase: ${state.text.trim()}`];

    if (state.view === 'milui') {
      const scheme = G.SCHEMES[state.scheme];
      const deep = state.miluiDepth === 2;
      lines.push(`View: ${deep ? "Milui d'Milui מילוי דמילוי" : 'Milui מילוי'}` +
        ` — scheme ${scheme.name} ${scheme.heb}`, rule);
      let total = 0;
      for (const word of analysis.words.filter((w) => w.script === 'he')) {
        const rows = [];
        let sub = 0;
        for (const letter of word.kept) {
          const key = G.stripMarks(letter);
          const sp = G.chooseSpelling(key, state.scheme);
          if (!sp) continue;
          if (deep) {
            const v = G.miluiDmiluiValue(key, state.scheme);
            sub += v;
            rows.push(`  ${key} → ${sp} — milui² ${v}`);
            for (const c of sp) {
              const sp2 = G.chooseSpelling(c, state.scheme);
              const parts = Array.from(sp2).map((x) => `${x}(${G.HEBREW_VALUES[x]})`).join(' + ');
              rows.push(`    ${c} → ${sp2} = ${parts} = ${G.spellingValue(sp2)}`);
            }
          } else {
            const parts = Array.from(sp).map((c) => `${c}(${G.HEBREW_VALUES[c]})`).join(' + ');
            const v = G.spellingValue(sp);
            sub += v;
            rows.push(`  ${key} → ${sp} = ${parts} = ${v}`);
          }
        }
        total += sub;
        lines.push(`${word.raw} — ${deep ? 'milui²' : 'milui'} ${sub}`, ...rows, '');
      }
      lines.push(`${deep ? "Milui d'milui" : 'Milui'} total: ${total}`,
        ...numberLines(total),
        `Digital root: ${G.digitalRoot(total)}`);
    } else {
      const cipherKey = state.cipher[analysis.script] || G.DEFAULT_CIPHER[analysis.script];
      const spec = G.CIPHERS[analysis.script][cipherKey];
      lines.push(`Cipher: ${spec.label}`);
      if (spec.pick) lines.push(`Notariqon: ${notariqonWord(analysis)}`);
      lines.push(rule);
      for (const word of analysis.words) {
        const sum = word.values.reduce((a, b) => a + b, 0);
        // building words list just the construction steps: 72 = י יה יהו יהוה
        if (word.building) {
          lines.push(`${sum} = ${word.groups.join(' ')}`);
          continue;
        }
        // word-reduced words show the full derivation: reduced letters,
        // their sum, and the digital root the word contracts to
        if (word.folded) {
          const pre = word.folded.values.reduce((a, b) => a + b, 0);
          lines.push(`${word.raw} = ` + word.folded.kept.map((letter, i) =>
            `${G.stripMarks(letter)}(${word.folded.values[i]})`).join(' + ') +
            ` = ${pre}` + (pre === sum ? '' : ` → ${sum}`));
          continue;
        }
        const labels = word.subs || word.groups;
        // same parts format as the milui rows: label(value) + … = total;
        // substitution ciphers first show the word the math is done on
        // ← so the arrow points from the original toward the substituted
        // word when the line renders right-to-left
        lines.push(`${word.raw} ` + (word.subs ? `← ${word.subs.join('')} ` : '') + '= ' +
          word.kept.map((letter, i) =>
            `${labels ? labels[i] : G.stripMarks(letter)}(${word.values[i]})`)
            .join(' + ') + ` = ${sum}`);
      }
      // building ciphers also give the whole phrase as one iterated run
      if (analysis.words.some((w) => w.building)) {
        lines.push('', analysis.words.map((w) =>
          (w.building ? w.groups : [w.raw]).join(' ')).join(' ') +
          ` = ${analysis.total}`);
      }
      lines.push('');
      lines.push(`Total: ${analysis.total}`,
        ...numberLines(analysis.total),
        `Digital root: ${G.digitalRoot(analysis.total)}`);
    }
    lines.push(`Letters: ${analysis.letters} · Words: ${analysis.words.length}`);
    // milui spellings are summed with the standard table, so its key applies
    const keyScript = state.view === 'milui' ? 'he' : analysis.script;
    const keySpec = state.view === 'milui' ? G.CIPHERS.he.hechrachi
      : G.CIPHERS[keyScript][state.cipher[keyScript] || G.DEFAULT_CIPHER[keyScript]];
    lines.push(rule, ...cipherKeyLines(keyScript, keySpec));
    return lines.join('\r\n');
  }

  $('dl-png').addEventListener('click', () => {
    const s = currentSVGString();
    if (!s) return;
    const img = new Image();
    const url = URL.createObjectURL(new Blob([s], { type: 'image/svg+xml' }));
    img.onload = () => {
      const scale = 3;
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => download(safeName() + '.png', b), 'image/png');
    };
    img.src = url;
  });

  /* ---- combined export: art + number insights in one PNG ---------------------- */
  // palette mirrors the .fact-* rules in styles.css
  const PANEL = {
    sans: "'Inter',system-ui,-apple-system,'Segoe UI',sans-serif",
    text: '#1d1f2b', muted: '#6a7086', teal: '#0d9488',
    gold: '#9c7827', indigo: '#4f5ed9',
    line: 'rgba(20,16,42,0.12)', blockBg: 'rgba(20,16,42,0.04)',
    chipBg: 'rgba(20,16,42,0.05)',
    tagBg: 'rgba(79,94,217,0.08)', tagEdge: 'rgba(79,94,217,0.25)',
  };

  function roundedRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function fitText(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    while (text.length && ctx.measureText(text + '…').width > maxW) text = text.slice(0, -1);
    return text + '…';
  }

  // chips wrap onto new lines like the flex rows on screen; returns the bottom y
  function paintChips(ctx, chips, x0, y, maxW, paint) {
    const h = 24, gap = 6, padX = 10;
    ctx.font = `600 13px ${PANEL.sans}`;
    let x = x0;
    for (const chip of chips) {
      const w = ctx.measureText(chip.text).width + padX * 2;
      if (x > x0 && x + w > x0 + maxW) { x = x0; y += h + gap; }
      if (paint) {
        roundedRect(ctx, x, y, w, h, h / 2);
        ctx.fillStyle = chip.bg;
        ctx.fill();
        ctx.strokeStyle = chip.edge;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = chip.color;
        ctx.fillText(chip.text, x + padX, y + h / 2 + 1);
      }
      x += w + gap;
    }
    return y + h;
  }

  // paint=false runs the same layout without drawing, to measure the height
  // before the canvas is sized; returns the bottom y of the block
  function paintFactBlock(ctx, m, x, y, w, paint) {
    const pad = 16, gap = 8, innerW = w - pad * 2;
    if (paint) {
      const h = paintFactBlock(ctx, m, x, y, w, false) - y;
      roundedRect(ctx, x, y, w, h, 14);
      ctx.fillStyle = PANEL.blockBg;
      ctx.fill();
      ctx.strokeStyle = PANEL.line;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    let cy = y + pad;

    ctx.font = `800 24px ${PANEL.sans}`;
    const valW = ctx.measureText(m.value).width;
    if (paint) {
      ctx.fillStyle = PANEL.teal;
      ctx.fillText(m.value, x + w - pad - valW, cy + 12);
      ctx.font = `500 15px ${ART.serif}`;
      ctx.fillStyle = PANEL.muted;
      ctx.fillText(fitText(ctx, m.label, innerW - valW - 12), x + pad, cy + 13);
    }
    cy += 24 + gap;

    if (paint) {
      ctx.font = `700 16px ${PANEL.sans}`;
      ctx.fillStyle = m.prime ? PANEL.gold : PANEL.text;
      ctx.fillText(fitText(ctx, m.kind, innerW), x + pad, cy + 8);
    }
    cy += 16 + gap;

    if (m.pairs.length) {
      cy = paintChips(ctx, m.pairs.map((t) => (
        { text: t, bg: PANEL.chipBg, edge: PANEL.line, color: PANEL.text }
      )), x + pad, cy, innerW, paint) + gap;
    }
    if (m.tags.length) {
      cy = paintChips(ctx, m.tags.map((t) => (t.dr
        ? { text: t.text, bg: PANEL.blockBg, edge: PANEL.line, color: PANEL.muted }
        : { text: t.text, bg: PANEL.tagBg, edge: PANEL.tagEdge, color: PANEL.indigo }
      )), x + pad, cy, innerW, paint) + gap;
    }
    return cy - gap + pad;
  }

  function paintInsights(ctx, facts, x, y, w, paint) {
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const titleSize = 18;
    if (paint) {
      ctx.font = `800 ${titleSize}px ${PANEL.sans}`;
      ctx.fillStyle = PANEL.text;
      ctx.fillText('Number Insights', x, y + titleSize / 2 + 1);
      const tw = ctx.measureText('Number Insights').width;
      ctx.font = `500 ${titleSize}px ${ART.serif}`;
      ctx.fillStyle = PANEL.gold;
      ctx.fillText('מהות המספר', x + tw + 10, y + titleSize / 2 + 1);
    }
    let cy = y + titleSize + 12;
    for (const f of facts) {
      cy = paintFactBlock(ctx, factModel(f.label, f.value), x, cy, w, paint) + 12;
    }
    return cy - 12;
  }

  $('dl-png-all').addEventListener('click', () => {
    const s = currentSVGString();
    if (!s) return;
    const img = new Image();
    const url = URL.createObjectURL(new Blob([s], { type: 'image/svg+xml' }));
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = 3, margin = 26;
      const w = Math.max(img.width, 640);
      const panelW = Math.min(w - margin * 2, 720);
      const panelX = (w - panelW) / 2;
      const scratch = document.createElement('canvas').getContext('2d');
      const panelH = lastFacts.length
        ? paintInsights(scratch, lastFacts, panelX, 0, panelW, false)
        : 0;
      const h = img.height + (panelH ? margin + panelH + margin : 0);
      const canvas = document.createElement('canvas');
      canvas.width = w * scale;
      canvas.height = h * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      ctx.fillStyle = ART.bg;
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, (w - img.width) / 2, 0);
      if (panelH) paintInsights(ctx, lastFacts, panelX, img.height + margin, panelW, true);
      canvas.toBlob((b) => download(safeName() + '.png', b), 'image/png');
    };
    img.src = url;
  });

  $('dl-txt').addEventListener('click', () => {
    const analysis = analyse(state.text);
    const any = analysis.letters ||
      (state.view === 'compare' && analyse(state.textB).letters);
    if (!any) return;
    // BOM so Windows editors detect UTF-8 for the Hebrew/Greek letters
    download(safeName() + '.txt',
      new Blob(['\uFEFF' + buildTextReport(analysis)], { type: 'text/plain;charset=utf-8' }));
  });

  $('copy-txt').addEventListener('click', async (e) => {
    const analysis = analyse(state.text);
    const any = analysis.letters ||
      (state.view === 'compare' && analyse(state.textB).letters);
    if (!any) return;
    const btn = e.currentTarget;
    try {
      await navigator.clipboard.writeText(buildTextReport(analysis));
      btn.textContent = 'Copied!';
    } catch {
      btn.textContent = 'Copy failed';
    }
    setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
  });

  /* ---- events -------------------------------------------------------------------- */
  let debounce = 0;
  $('phrase').addEventListener('input', (e) => {
    state.text = e.target.value;
    clearTimeout(debounce);
    debounce = setTimeout(render, 140);
  });

  $('phrase-b').addEventListener('input', (e) => {
    state.textB = e.target.value;
    clearTimeout(debounce);
    debounce = setTimeout(render, 140);
  });

  // rabati toggle: the selected letter becomes letter × 1000 (ב → ב¹⁰⁰⁰
  // = 2000); selecting a letter that already carries the mark returns it
  // to the original letter. With nothing selected the mark is added or
  // removed at the caret. The range is widened over any superscript run
  // touching it so selecting just the ב of ב¹⁰⁰⁰ still finds its mark.
  const SUP_RE = /[⁰¹²³⁴⁵⁶⁷⁸⁹]/;
  document.querySelectorAll('.insert-rabati').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ta = btn.closest('.phrase-box').querySelector('textarea');
      ta.focus();
      let start = ta.selectionStart ?? ta.value.length;
      let end = ta.selectionEnd ?? start;
      const caret = start === end;
      while (end < ta.value.length && SUP_RE.test(ta.value[end])) end++;
      if (caret) while (start > 0 && SUP_RE.test(ta.value[start - 1])) start--;
      const sel = ta.value.slice(start, end);
      const insert = SUP_RE.test(sel) ? G.stripSuperscripts(sel)
        : sel + G.RABATI_MARK;
      ta.setRangeText(insert, start, end, 'end');
      if (ta.id === 'phrase') state.text = ta.value;
      else state.textB = ta.value;
      render();
    });
  });

  $('chips').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    $('phrase').value = chip.dataset.text;
    state.text = chip.dataset.text;
    render();
  });

  $('view-seg').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    state.view = b.dataset.view;
    render();
  });

  $('depth-seg').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    state.miluiDepth = Number(b.dataset.depth);
    document.querySelectorAll('#depth-seg button').forEach((x) =>
      x.classList.toggle('active', x === b));
    render();
  });

  $('shape-seg').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    state.shape = b.dataset.shape;
    document.querySelectorAll('#shape-seg button').forEach((x) =>
      x.classList.toggle('active', x === b));
    render();
  });

  $('cipher-select').addEventListener('change', (e) => {
    const script = G.detectScript(state.text) || 'en';
    state.cipher[script] = e.target.value;
    render();
  });

  // reflow the artwork when the frame width changes the column count
  let resizeT = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(render, 150);
  });

  /* ---- boot ----------------------------------------------------------------------- */
  const boot = 'יהוה';
  $('phrase').value = boot;
  state.text = boot;
  render();
})();
