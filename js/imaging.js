(function (g) {
  'use strict';

  const IM = {};

  function Mask(w, h) { return { w: w, h: h, d: new Uint8Array(w * h) }; }
  IM.Mask = Mask;

  IM.cloneMask = m => ({ w: m.w, h: m.h, d: Uint8Array.from(m.d) });

  IM.countMask = m => {
    let n = 0;
    for (let i = 0; i < m.d.length; i++) n += m.d[i];
    return n;
  };

  IM.toGray = img => {
    const n = img.width * img.height;
    const out = new Float32Array(n);
    const p = img.data;
    for (let i = 0, j = 0; i < n; i++, j += 4) {
      out[i] = 0.299 * p[j] + 0.587 * p[j + 1] + 0.114 * p[j + 2];
    }
    return out;
  };

  IM.boxBlur = (src, w, h, r) => {
    if (r < 1) return Float32Array.from(src);
    const tmp = new Float32Array(w * h);
    const out = new Float32Array(w * h);
    const win = r * 2 + 1;
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let sum = 0;
      for (let x = -r; x <= r; x++) sum += src[row + U.clamp(x, 0, w - 1)];
      for (let x = 0; x < w; x++) {
        tmp[row + x] = sum / win;
        sum -= src[row + U.clamp(x - r, 0, w - 1)];
        sum += src[row + U.clamp(x + r + 1, 0, w - 1)];
      }
    }
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let y = -r; y <= r; y++) sum += tmp[U.clamp(y, 0, h - 1) * w + x];
      for (let y = 0; y < h; y++) {
        out[y * w + x] = sum / win;
        sum -= tmp[U.clamp(y - r, 0, h - 1) * w + x];
        sum += tmp[U.clamp(y + r + 1, 0, h - 1) * w + x];
      }
    }
    return out;
  };

  IM.adaptiveThreshold = (grey, w, h, k, win) => {
    win = win || Math.max(15, Math.round(Math.min(w, h) / 12) | 1);
    const r = win >> 1;
    const iw = w + 1;
    const integ = new Float64Array(iw * (h + 1));
    for (let y = 0; y < h; y++) {
      let rowSum = 0;
      for (let x = 0; x < w; x++) {
        rowSum += grey[y * w + x];
        integ[(y + 1) * iw + (x + 1)] = integ[y * iw + (x + 1)] + rowSum;
      }
    }
    const m = Mask(w, h);
    for (let y = 0; y < h; y++) {
      const y0 = U.clamp(y - r, 0, h - 1), y1 = U.clamp(y + r, 0, h - 1);
      for (let x = 0; x < w; x++) {
        const x0 = U.clamp(x - r, 0, w - 1), x1 = U.clamp(x + r, 0, w - 1);
        const area = (y1 - y0 + 1) * (x1 - x0 + 1);
        const s = integ[(y1 + 1) * iw + (x1 + 1)] - integ[y0 * iw + (x1 + 1)]
                - integ[(y1 + 1) * iw + x0] + integ[y0 * iw + x0];
        const mean = s / area;
        m.d[y * w + x] = grey[y * w + x] < mean * (1 - k) ? 1 : 0;
      }
    }
    return m;
  };

  IM.dilate = (m, times) => {
    let cur = m;
    for (let t = 0; t < (times || 1); t++) {
      const w = cur.w, h = cur.h, s = cur.d, out = Mask(w, h), o = out.d;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let v = 0;
          for (let dy = -1; dy <= 1 && !v; dy++) {
            const yy = y + dy; if (yy < 0 || yy >= h) continue;
            for (let dx = -1; dx <= 1; dx++) {
              const xx = x + dx; if (xx < 0 || xx >= w) continue;
              if (s[yy * w + xx]) { v = 1; break; }
            }
          }
          o[y * w + x] = v;
        }
      }
      cur = out;
    }
    return cur;
  };

  IM.erode = (m, times) => {
    let cur = m;
    for (let t = 0; t < (times || 1); t++) {
      const w = cur.w, h = cur.h, s = cur.d, out = Mask(w, h), o = out.d;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let v = 1;
          for (let dy = -1; dy <= 1 && v; dy++) {
            const yy = y + dy;
            for (let dx = -1; dx <= 1; dx++) {
              const xx = x + dx;
              if (xx < 0 || yy < 0 || xx >= w || yy >= h || !s[yy * w + xx]) { v = 0; break; }
            }
          }
          o[y * w + x] = v;
        }
      }
      cur = out;
    }
    return cur;
  };

  IM.close = (m, r) => r > 0 ? IM.erode(IM.dilate(m, r), r) : m;

  IM.components = m => {
    const w = m.w, h = m.h, d = m.d;
    const labels = new Int32Array(w * h).fill(-1);
    const sizes = [];
    const stack = new Int32Array(w * h);
    let count = 0;
    for (let i = 0; i < d.length; i++) {
      if (!d[i] || labels[i] !== -1) continue;
      let sp = 0, size = 0;
      stack[sp++] = i;
      labels[i] = count;
      while (sp > 0) {
        const p = stack[--sp];
        size++;
        const px = p % w, py = (p / w) | 0;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = py + dy; if (yy < 0 || yy >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = px + dx; if (xx < 0 || xx >= w) continue;
            const q = yy * w + xx;
            if (d[q] && labels[q] === -1) { labels[q] = count; stack[sp++] = q; }
          }
        }
      }
      sizes.push(size);
      count++;
    }
    return { labels: labels, sizes: sizes, count: count };
  };

  IM.despeckle = (m, minArea) => {
    if (minArea <= 1) return m;
    const cc = IM.components(m);
    const out = Mask(m.w, m.h);
    for (let i = 0; i < m.d.length; i++) {
      const l = cc.labels[i];
      if (l >= 0 && cc.sizes[l] >= minArea) out.d[i] = 1;
    }
    return out;
  };

  IM.thin = mask => {
    const w = mask.w, h = mask.h;
    const d = Uint8Array.from(mask.d);
    const del = [];
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : d[y * w + x];

    let changed = true, guard = 0;
    while (changed && guard++ < 60) {
      changed = false;
      for (let step = 0; step < 2; step++) {
        del.length = 0;
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            if (!d[y * w + x]) continue;
            const p2 = at(x, y - 1), p3 = at(x + 1, y - 1), p4 = at(x + 1, y),
                  p5 = at(x + 1, y + 1), p6 = at(x, y + 1), p7 = at(x - 1, y + 1),
                  p8 = at(x - 1, y), p9 = at(x - 1, y - 1);
            const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
            if (B < 2 || B > 6) continue;
            const seq = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
            let A = 0;
            for (let i = 0; i < 8; i++) if (seq[i] === 0 && seq[i + 1] === 1) A++;
            if (A !== 1) continue;
            if (step === 0) {
              if (p2 * p4 * p6 !== 0) continue;
              if (p4 * p6 * p8 !== 0) continue;
            } else {
              if (p2 * p4 * p8 !== 0) continue;
              if (p2 * p6 * p8 !== 0) continue;
            }
            del.push(y * w + x);
          }
        }
        if (del.length) {
          changed = true;
          for (const i of del) d[i] = 0;
        }
      }
    }
    return { w: w, h: h, d: d };
  };

  IM.cleanSkeleton = m => {
    const w = m.w, h = m.h, d = Uint8Array.from(m.d);
    const NX = [1, 1, 0, -1, -1, -1, 0, 1];
    const NY = [0, 1, 1, 1, 0, -1, -1, -1];
    for (let pass = 0; pass < 6; pass++) {
      let removed = 0;
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = y * w + x;
          if (!d[i]) continue;
          const S = [];
          for (let k = 0; k < 8; k++) {
            const xx = x + NX[k], yy = y + NY[k];
            if (d[yy * w + xx]) S.push([xx, yy]);
          }
          if (S.length < 2) continue;
          for (let qi = 0; qi < S.length; qi++) {
            const q = S[qi];
            let covers = true;
            for (let pi = 0; pi < S.length && covers; pi++) {
              if (pi === qi) continue;
              const p = S[pi];
              if (Math.abs(p[0] - q[0]) > 1 || Math.abs(p[1] - q[1]) > 1) covers = false;
            }
            if (covers) { d[i] = 0; removed++; break; }
          }
        }
      }
      if (!removed) break;
    }
    return { w: w, h: h, d: d };
  };

  IM.maskToCanvas = (m, fg, bg) => {
    const c = U.mkCanvas(m.w, m.h);
    const ctx = U.ctxOf(c);
    const img = ctx.createImageData(m.w, m.h);
    const F = U.hex2rgb(fg || '#f2ece3'), B = U.hex2rgb(bg || '#12100e');
    for (let i = 0, j = 0; i < m.d.length; i++, j += 4) {
      const s = m.d[i] ? F : B;
      img.data[j] = s[0]; img.data[j + 1] = s[1]; img.data[j + 2] = s[2]; img.data[j + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return c;
  };

  IM.centroid = m => {
    let sx = 0, sy = 0, n = 0;
    for (let y = 0; y < m.h; y++) {
      for (let x = 0; x < m.w; x++) {
        if (m.d[y * m.w + x]) { sx += x; sy += y; n++; }
      }
    }
    return n ? { x: sx / n, y: sy / n, n: n } : { x: m.w / 2, y: m.h / 2, n: 0 };
  };

  IM.radiusPct = (m, cx, cy, pct) => {
    const rs = [];
    for (let y = 0; y < m.h; y++) {
      for (let x = 0; x < m.w; x++) {
        if (m.d[y * m.w + x]) rs.push(Math.hypot(x - cx, y - cy));
      }
    }
    if (!rs.length) return Math.min(m.w, m.h) / 2;
    rs.sort((a, b) => a - b);
    return rs[U.clamp(Math.floor(rs.length * pct), 0, rs.length - 1)];
  };

  IM.angularProfile = (m, cx, cy, R, NA, NR) => {
    NA = NA || 720; NR = NR || 72;
    const p = new Float64Array(NA);
    for (let j = 0; j < NA; j++) {
      const a = U.TAU * j / NA, ca = Math.cos(a), sa = Math.sin(a);
      let s = 0;
      for (let i = 1; i <= NR; i++) {
        const r = R * i / NR;
        const x = Math.round(cx + r * ca), y = Math.round(cy + r * sa);
        if (x < 0 || y < 0 || x >= m.w || y >= m.h) continue;
        s += m.d[y * m.w + x];
      }
      p[j] = s;
    }

    const out = new Float64Array(NA);
    for (let j = 0; j < NA; j++) {
      let s = 0;
      for (let d = -2; d <= 2; d++) s += p[(j + d + NA) % NA];
      out[j] = s / 5;
    }
    return out;
  };

  IM.profileCorr = (p, lag) => {
    const NA = p.length;
    let mean = 0;
    for (let i = 0; i < NA; i++) mean += p[i];
    mean /= NA;
    let num = 0, den = 0;
    for (let i = 0; i < NA; i++) {
      const a = p[i] - mean;

      const f = i + lag, j0 = Math.floor(f) % NA, t = f - Math.floor(f);
      const b = (p[j0] * (1 - t) + p[(j0 + 1) % NA] * t) - mean;
      num += a * b;
      den += a * a;
    }
    return den > 1e-9 ? num / den : 0;
  };

  IM.guessFolds = (m, cx, cy, R) => {
    const p = IM.angularProfile(m, cx, cy, R);
    const NA = p.length;
    let mean = 0;
    for (let i = 0; i < NA; i++) mean += p[i];
    mean /= NA;
    let varr = 0;
    for (let i = 0; i < NA; i++) varr += (p[i] - mean) * (p[i] - mean);
    varr /= NA;
    const scores = {};

    if (varr < 1e-6 || mean < 1e-6 || varr / (mean * mean) < 0.004) {
      return { n: 1, score: 0, scores: scores, flat: true };
    }

    for (let n = 2; n <= 26; n++) scores[n] = IM.profileCorr(p, NA / n);

    const M = 0.02;
    let bestN = 1, bestS = 0;
    for (let n = 2; n <= 24; n++) {
      const s = scores[n];
      if (s < 0.5) continue;
      if (s < scores[n - 1] + M || s < scores[n + 1] + M) continue;
      if (n >= bestN) { bestN = n; bestS = s; }
    }
    if (bestN < 2) return { n: 1, score: scores[2] || 0, scores: scores };
    return { n: bestN, score: bestS, scores: scores };
  };

  g.IM = IM;
})(window);
