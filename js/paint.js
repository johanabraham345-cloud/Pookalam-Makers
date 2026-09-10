(function (g) {
  'use strict';

  const PAINT = {};

  PAINT.BG = -1;

  PAINT.create = (lineCanvas) => {
    const size = lineCanvas.width;
    const img = U.ctxOf(lineCanvas).getImageData(0, 0, size, size);
    const n = size * size;
    const wall = new Uint8Array(n);
    for (let i = 0, j = 0; i < n; i++, j += 4) {
      const lum = 0.299 * img.data[j] + 0.587 * img.data[j + 1] + 0.114 * img.data[j + 2];
      wall[i] = lum < 140 ? 1 : 0;
    }
    const idx = new Int8Array(n).fill(PAINT.BG);
    return {
      size: size, n: n, wall: wall, idx: idx,
      undo: [], regions: null
    };
  };

  PAINT.fill = (st, x, y, colour) => {
    x = Math.round(x); y = Math.round(y);
    const s = st.size;
    if (x < 0 || y < 0 || x >= s || y >= s) return 0;
    const start = y * s + x;
    if (st.wall[start]) return 0;
    const target = st.idx[start];
    if (target === colour) return 0;

    const idx = st.idx, wall = st.wall;
    const changed = [];
    const stack = [[x, y]];

    while (stack.length) {
      const [px, py] = stack.pop();
      let lx = px;
      const row = py * s;
      while (lx >= 0 && !wall[row + lx] && idx[row + lx] === target) lx--;
      lx++;
      let rx = px;
      while (rx < s && !wall[row + rx] && idx[row + rx] === target) rx++;
      rx--;
      if (lx > rx) continue;

      for (let i = lx; i <= rx; i++) {
        if (idx[row + i] === colour) continue;
        idx[row + i] = colour;
        changed.push(row + i);
      }
      for (const ny of [py - 1, py + 1]) {
        if (ny < 0 || ny >= s) continue;
        const nrow = ny * s;
        let i = lx;
        while (i <= rx) {
          while (i <= rx && (wall[nrow + i] || idx[nrow + i] !== target)) i++;
          if (i > rx) break;
          const runStart = i;
          while (i <= rx && !wall[nrow + i] && idx[nrow + i] === target) i++;
          stack.push([runStart, ny]);
        }
      }
    }

    if (changed.length) {
      st.undo.push({ px: Int32Array.from(changed), prev: target });
      if (st.undo.length > 15) st.undo.shift();
    }
    return changed.length;
  };

  PAINT.undo = st => {
    const u = st.undo.pop();
    if (!u) return false;
    for (let i = 0; i < u.px.length; i++) st.idx[u.px[i]] = u.prev;
    return true;
  };

  PAINT.clear = st => {
    st.idx.fill(PAINT.BG);
    st.undo.length = 0;
  };

  PAINT.pick = (st, x, y) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= st.size || y >= st.size) return PAINT.BG;
    return st.idx[y * st.size + x];
  };

  PAINT.findRegions = st => {
    if (st.regions) return st.regions;
    const s = st.size, n = st.n;
    const lab = new Int32Array(n).fill(-1);
    const list = [];
    const stack = new Int32Array(n);
    const c = s / 2;
    for (let i = 0; i < n; i++) {
      if (st.wall[i] || lab[i] !== -1) continue;
      const id = list.length;
      let sp = 0, size = 0, sr = 0, touchesEdge = false;
      stack[sp++] = i; lab[i] = id;
      while (sp > 0) {
        const p = stack[--sp];
        const px = p % s, py = (p / s) | 0;
        size++;
        sr += Math.hypot(px - c, py - c);
        if (px === 0 || py === 0 || px === s - 1 || py === s - 1) touchesEdge = true;
        if (px > 0 && !st.wall[p - 1] && lab[p - 1] === -1) { lab[p - 1] = id; stack[sp++] = p - 1; }
        if (px < s - 1 && !st.wall[p + 1] && lab[p + 1] === -1) { lab[p + 1] = id; stack[sp++] = p + 1; }
        if (py > 0 && !st.wall[p - s] && lab[p - s] === -1) { lab[p - s] = id; stack[sp++] = p - s; }
        if (py < s - 1 && !st.wall[p + s] && lab[p + s] === -1) { lab[p + s] = id; stack[sp++] = p + s; }
      }
      list.push({ id: id, size: size, r: sr / size, seed: i, outside: touchesEdge });
    }
    st.regions = { lab: lab, list: list };
    return st.regions;
  };

  PAINT.invalidateRegions = st => { st.regions = null; };

  PAINT.autoColour = (st, nColours) => {
    const rg = PAINT.findRegions(st);
    const minSize = st.n * 0.00012;
    const good = rg.list.filter(r => !r.outside && r.size >= minSize);
    good.sort((a, b) => a.r - b.r);

    const bands = [];
    const tolR = st.size * 0.018;
    for (const r of good) {
      const last = bands[bands.length - 1];
      if (last && Math.abs(r.r - last.r) <= tolR) { last.items.push(r); last.r = (last.r + r.r) / 2; }
      else bands.push({ r: r.r, items: [r] });
    }
    st.undo.length = 0;
    st.idx.fill(PAINT.BG);
    bands.forEach((b, i) => {
      const col = i % nColours;
      for (const r of b.items) {
        for (let p = 0; p < st.n; p++) if (rg.lab[p] === r.id) st.idx[p] = col;
      }
    });
    return bands.length;
  };

  PAINT.renderTo = (st, ctx, palette, bgHex) => {
    const s = st.size;
    const img = ctx.createImageData(s, s);
    const d = img.data;
    const bg = U.hex2rgb(bgHex);
    const pal = palette.map(U.hex2rgb);
    for (let i = 0, j = 0; i < st.n; i++, j += 4) {
      const k = st.idx[i];
      const c = (k >= 0 && k < pal.length && !st.wall[i]) ? pal[k] : bg;
      d[j] = c[0]; d[j + 1] = c[1]; d[j + 2] = c[2]; d[j + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  };

  PAINT.counts = (st, nColours) => {
    const out = new Array(nColours).fill(0);
    let bg = 0;
    for (let i = 0; i < st.n; i++) {
      const k = st.idx[i];
      if (k >= 0 && k < nColours) out[k]++; else bg++;
    }
    return { colours: out, bg: bg };
  };

  g.PAINT = PAINT;
})(window);
