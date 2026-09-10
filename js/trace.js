(function (g) {
  'use strict';

  const TR = {};

  const NX = [1, 1, 0, -1, -1, -1, 0, 1];
  const NY = [0, 1, 1, 1, 0, -1, -1, -1];

  function neighbours(d, w, h, x, y, out) {
    let n = 0;
    for (let k = 0; k < 8; k++) {
      const xx = x + NX[k], yy = y + NY[k];
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      if (d[yy * w + xx]) { out[n++] = yy * w + xx; }
    }
    return n;
  }

  TR.tracePaths = skel => {
    const w = skel.w, h = skel.h, d = skel.d;
    const deg = new Uint8Array(w * h);
    const buf = new Int32Array(8);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (d[i]) deg[i] = neighbours(d, w, h, x, y, buf);
      }
    }

    const usedEdge = new Set();
    const key = (a, b) => a < b ? a + ':' + b : b + ':' + a;
    const paths = [];

    const walk = (start, first) => {
      const pts = [[start % w, (start / w) | 0]];
      let prev = start, cur = first;
      usedEdge.add(key(prev, cur));
      for (let guard = 0; guard < w * h; guard++) {
        pts.push([cur % w, (cur / w) | 0]);
        if (deg[cur] !== 2) break;
        const n = neighbours(d, w, h, cur % w, (cur / w) | 0, buf);
        let nxt = -1;
        for (let k = 0; k < n; k++) if (buf[k] !== prev) { nxt = buf[k]; break; }
        if (nxt < 0) break;
        const kk = key(cur, nxt);
        if (usedEdge.has(kk)) break;
        usedEdge.add(kk);
        prev = cur; cur = nxt;
      }
      return pts;
    };

    for (let i = 0; i < d.length; i++) {
      if (!d[i] || deg[i] === 2) continue;
      const n = neighbours(d, w, h, i % w, (i / w) | 0, buf);
      for (let k = 0; k < n; k++) {
        if (usedEdge.has(key(i, buf[k]))) continue;
        const p = walk(i, buf[k]);
        if (p.length > 1) paths.push(p);
      }
    }

    for (let i = 0; i < d.length; i++) {
      if (!d[i] || deg[i] !== 2) continue;
      const n = neighbours(d, w, h, i % w, (i / w) | 0, buf);
      let fresh = -1;
      for (let k = 0; k < n; k++) if (!usedEdge.has(key(i, buf[k]))) { fresh = buf[k]; break; }
      if (fresh < 0) continue;
      const p = walk(i, fresh);
      if (p.length > 2) { p.push([i % w, (i / w) | 0]); paths.push(p); }
    }

    return paths;
  };

  TR.pruneSpurs = (skel, spurLen, rounds) => {
    let cur = { w: skel.w, h: skel.h, d: Uint8Array.from(skel.d) };
    const buf = new Int32Array(8);
    for (let round = 0; round < (rounds || 3); round++) {
      const w = cur.w, h = cur.h, d = cur.d;
      const deg = new Uint8Array(w * h);
      for (let i = 0; i < d.length; i++) {
        if (d[i]) deg[i] = neighbours(d, w, h, i % w, (i / w) | 0, buf);
      }
      const paths = TR.tracePaths(cur);
      let removed = 0;
      for (const p of paths) {
        if (p.length > spurLen) continue;
        const a = p[0], b = p[p.length - 1];
        const ia = a[1] * w + a[0], ib = b[1] * w + b[0];
        const da = deg[ia], db = deg[ib];

        const spur = (da === 1 && db >= 3) || (db === 1 && da >= 3) || (da === 1 && db === 1);
        if (!spur) continue;
        for (let j = 0; j < p.length; j++) {
          const idx = p[j][1] * w + p[j][0];
          if (deg[idx] >= 3) continue;
          d[idx] = 0;
          removed++;
        }
      }
      if (!removed) break;
    }
    return cur;
  };

  function unit(ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
    return [dx / L, dy / L];
  }

  function inward(p, atStart) {
    const k = Math.min(8, p.length - 1);
    return atStart
      ? unit(p[0][0], p[0][1], p[k][0], p[k][1])
      : unit(p[p.length - 1][0], p[p.length - 1][1], p[p.length - 1 - k][0], p[p.length - 1 - k][1]);
  }

  TR.stitch = (paths, angTol, distTol) => {
    if (paths.length < 2) return paths;
    const thr = -Math.cos(angTol == null ? Math.PI / 4 : angTol);
    const dTol = distTol == null ? 3.5 : distTol;

    const ends = [];
    paths.forEach((p, i) => {
      ends.push({ id: i * 2, i: i, e: 0, p: p[0], t: inward(p, true) });
      ends.push({ id: i * 2 + 1, i: i, e: 1, p: p[p.length - 1], t: inward(p, false) });
    });

    const cell = Math.max(4, Math.ceil(dTol));
    const grid = new Map();
    const key = (x, y) => Math.floor(x / cell) + ',' + Math.floor(y / cell);
    for (const en of ends) {
      const k = key(en.p[0], en.p[1]);
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push(en);
    }

    const cand = [];
    const seenPair = new Set();
    for (const a of ends) {
      const gx = Math.floor(a.p[0] / cell), gy = Math.floor(a.p[1] / cell);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const bucket = grid.get((gx + dx) + ',' + (gy + dy));
          if (!bucket) continue;
          for (const b of bucket) {
            if (b.id <= a.id) continue;
            if (b.i === a.i && paths[a.i].length < 12) continue;
            const pk = a.id + '-' + b.id;
            if (seenPair.has(pk)) continue;
            seenPair.add(pk);
            if (Math.hypot(a.p[0] - b.p[0], a.p[1] - b.p[1]) > dTol) continue;
            const dot = a.t[0] * b.t[0] + a.t[1] * b.t[1];
            if (dot > thr) continue;
            cand.push({ a: a.id, b: b.id, dot: dot });
          }
        }
      }
    }
    cand.sort((x, y) => x.dot - y.dot);

    const partner = new Int32Array(paths.length * 2).fill(-1);
    for (const c of cand) {
      if (partner[c.a] !== -1 || partner[c.b] !== -1) continue;
      partner[c.a] = c.b;
      partner[c.b] = c.a;
    }

    const used = new Uint8Array(paths.length);
    const out = [];

    const chainFrom = startId => {
      const pts = [];
      let cur = startId;
      const startPath = startId >> 1;
      let closed = false;
      for (let guard = 0; guard < paths.length + 2; guard++) {
        const i = cur >> 1, e = cur & 1;
        if (used[i]) break;
        used[i] = 1;
        const seg = e === 1 ? paths[i].slice().reverse() : paths[i];
        for (let j = pts.length ? 1 : 0; j < seg.length; j++) pts.push(seg[j]);
        const nxt = partner[i * 2 + (1 - e)];
        if (nxt === -1) break;
        if ((nxt >> 1) === startPath) { closed = true; break; }
        if (used[nxt >> 1]) break;
        cur = nxt;
      }
      if (closed && pts.length > 2) pts.push(pts[0]);
      return pts;
    };

    for (const en of ends) {
      if (used[en.i]) continue;
      if (partner[en.id] !== -1) continue;
      const pts = chainFrom(en.id);
      if (pts.length > 1) out.push(pts);
    }

    for (let i = 0; i < paths.length; i++) {
      if (used[i]) continue;
      const pts = chainFrom(i * 2);
      if (pts.length > 1) out.push(pts);
    }
    return out;
  };

  function perpDist(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const L = Math.hypot(dx, dy);
    if (L < 1e-9) return Math.hypot(p[0] - a[0], p[1] - a[1]);
    return Math.abs(dy * (p[0] - a[0]) - dx * (p[1] - a[1])) / L;
  }

  TR.simplifyIdx = (pts, eps) => {
    if (pts.length < 3) return pts.map((_, i) => i);
    const keep = new Uint8Array(pts.length);
    keep[0] = keep[pts.length - 1] = 1;
    const stack = [[0, pts.length - 1]];
    while (stack.length) {
      const [i0, i1] = stack.pop();
      let far = -1, fd = eps;
      for (let i = i0 + 1; i < i1; i++) {
        const dd = perpDist(pts[i], pts[i0], pts[i1]);
        if (dd > fd) { fd = dd; far = i; }
      }
      if (far > 0) {
        keep[far] = 1;
        stack.push([i0, far], [far, i1]);
      }
    }
    const out = [];
    for (let i = 0; i < pts.length; i++) if (keep[i]) out.push(i);
    return out;
  };

  TR.simplify = (pts, eps) => {
    if (pts.length < 3) return pts.slice();
    const keep = new Uint8Array(pts.length);
    keep[0] = keep[pts.length - 1] = 1;
    const stack = [[0, pts.length - 1]];
    while (stack.length) {
      const [i0, i1] = stack.pop();
      let far = -1, fd = eps;
      for (let i = i0 + 1; i < i1; i++) {
        const dd = perpDist(pts[i], pts[i0], pts[i1]);
        if (dd > fd) { fd = dd; far = i; }
      }
      if (far > 0) {
        keep[far] = 1;
        stack.push([i0, far], [far, i1]);
      }
    }
    const out = [];
    for (let i = 0; i < pts.length; i++) if (keep[i]) out.push(pts[i]);
    return out;
  };

  TR.resample = (pts, step) => {
    if (pts.length < 2) return pts.slice();
    const out = [pts[0]];
    let carry = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (seg < 1e-9) continue;
      let t = step - carry;
      while (t <= seg) {
        out.push([a[0] + (b[0] - a[0]) * t / seg, a[1] + (b[1] - a[1]) * t / seg]);
        t += step;
      }
      carry = (carry + seg) % step;
    }
    const last = pts[pts.length - 1];
    const prev = out[out.length - 1];
    if (Math.hypot(last[0] - prev[0], last[1] - prev[1]) > step * 0.3) out.push(last);
    return out;
  };

  TR.pathLength = pts => {
    let L = 0;
    for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    return L;
  };

  g.TR = TR;
})(window);
