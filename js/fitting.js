(function (g) {
  'use strict';

  const FIT = {};
  const TAU = U.TAU;

  FIT.fitLine = pts => {
    const n = pts.length;
    let mx = 0, my = 0;
    for (const p of pts) { mx += p[0]; my += p[1]; }
    mx /= n; my /= n;
    let a = 0, b = 0, c = 0;
    for (const p of pts) {
      const dx = p[0] - mx, dy = p[1] - my;
      a += dx * dx; b += dx * dy; c += dy * dy;
    }
    a /= n; b /= n; c /= n;
    const tr = a + c, det = Math.sqrt(Math.max(0, (a - c) * (a - c) + 4 * b * b));
    const l1 = (tr + det) / 2, l2 = (tr - det) / 2;
    let ux, uy;
    if (Math.abs(b) > 1e-12) { ux = l1 - c; uy = b; }
    else if (a >= c) { ux = 1; uy = 0; }
    else { ux = 0; uy = 1; }
    const L = Math.hypot(ux, uy) || 1;
    ux /= L; uy /= L;
    let tmin = Infinity, tmax = -Infinity;
    for (const p of pts) {
      const t = (p[0] - mx) * ux + (p[1] - my) * uy;
      if (t < tmin) tmin = t;
      if (t > tmax) tmax = t;
    }
    return {
      rms: Math.sqrt(Math.max(0, l2)),
      p0: [mx + ux * tmin, my + uy * tmin],
      p1: [mx + ux * tmax, my + uy * tmax],
      dir: [ux, uy]
    };
  };

  FIT.fitCircle = pts => {
    const n = pts.length;
    if (n < 5) return null;
    let Sx = 0, Sy = 0, Sxx = 0, Syy = 0, Sxy = 0, Sz = 0, Sxz = 0, Syz = 0;
    for (const p of pts) {
      const x = p[0], y = p[1], z = x * x + y * y;
      Sx += x; Sy += y; Sxx += x * x; Syy += y * y; Sxy += x * y;
      Sz += z; Sxz += x * z; Syz += y * z;
    }

    const m = [[Sxx, Sxy, Sx], [Sxy, Syy, Sy], [Sx, Sy, n]];
    const v = [Sxz, Syz, Sz];
    const det3 = M =>
      M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1])
    - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0])
    + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
    const D = det3(m);
    if (Math.abs(D) < 1e-14) return null;
    const sub = col => {
      const M = m.map(r => r.slice());
      for (let i = 0; i < 3; i++) M[i][col] = v[i];
      return det3(M) / D;
    };
    const A = sub(0), B = sub(1), C = sub(2);
    const cx = A / 2, cy = B / 2;
    const rr = C + cx * cx + cy * cy;
    if (!(rr > 0)) return null;
    const r = Math.sqrt(rr);
    if (!isFinite(r) || r > 40) return null;
    let s2 = 0;
    for (const p of pts) {
      const dd = Math.hypot(p[0] - cx, p[1] - cy) - r;
      s2 += dd * dd;
    }
    return { cx: cx, cy: cy, r: r, rms: Math.sqrt(s2 / n) };
  };

  FIT.classify = (pts, tol) => {
    if (pts.length < 2) return null;
    const lin = FIT.fitLine(pts);
    const chord = Math.hypot(lin.p1[0] - lin.p0[0], lin.p1[1] - lin.p0[1]);
    if (chord < 1e-6) return null;

    if (lin.rms <= tol) {
      return { kind: 'line', p0: lin.p0, p1: lin.p1, rms: lin.rms };
    }

    const cir = FIT.fitCircle(pts);
    if (cir && cir.rms < lin.rms * 0.8 && cir.rms <= tol * 2.2 && cir.r > tol) {

      let a0 = Math.atan2(pts[0][1] - cir.cy, pts[0][0] - cir.cx);
      let prev = a0, sweep = 0;
      for (let i = 1; i < pts.length; i++) {
        const a = Math.atan2(pts[i][1] - cir.cy, pts[i][0] - cir.cx);
        sweep += U.angDiff(prev, a);
        prev = a;
      }
      const full = Math.abs(sweep) >= TAU * 0.88;
      let s = a0, e = a0 + sweep;
      if (full) { s = 0; e = TAU; }
      else if (e < s) { const t = s; s = e; e = t; }
      return { kind: 'arc', cx: cir.cx, cy: cir.cy, r: cir.r, s: s, e: e, full: full, rms: cir.rms };
    }

    return { kind: 'poly', pts: pts, rms: lin.rms };
  };

  FIT.clusterRadii = (obs, tol) => {
    if (!obs.length) return [0, 1];
    const s = obs.slice().sort((a, b) => a.r - b.r);
    const groups = [];
    let cur = [s[0]];
    for (let i = 1; i < s.length; i++) {
      if (s[i].r - cur[cur.length - 1].r <= tol) cur.push(s[i]);
      else { groups.push(cur); cur = [s[i]]; }
    }
    groups.push(cur);
    const out = groups.map(gr => {
      let sw = 0, sr = 0;
      for (const o of gr) { sw += o.w; sr += o.r * o.w; }
      return sw > 0 ? sr / sw : gr[0].r;
    });
    if (out[0] > tol) out.unshift(0);
    out.sort((a, b) => a - b);
    return out;
  };

  FIT.makeGrid = (prims, folds, tol) => {

    const obs = [];
    const vote = (r, w) => { if (isFinite(r) && r >= 0 && r <= 1.6) obs.push({ r: r, w: Math.max(w, 1e-3) }); };
    for (const p of prims) {
      if (p.kind === 'arc') {
        const d = Math.hypot(p.cx, p.cy);
        const len = p.r * Math.abs(p.e - p.s);
        const conc = p.full ? Math.max(tol * 6, 0.16) : Math.max(tol * 2.5, 0.05);
        if (d <= conc) vote(p.r, len * 3);
        else { vote(d, len); vote(p.r, len * 0.5); }
      } else if (p.kind === 'line') {
        const w = Math.hypot(p.p1[0] - p.p0[0], p.p1[1] - p.p0[1]);
        vote(Math.hypot(p.p0[0], p.p0[1]), w);
        vote(Math.hypot(p.p1[0], p.p1[1]), w);
      }
    }
    const radii = FIT.clusterRadii(obs, Math.max(tol * 1.6, 0.018));
    if (radii[radii.length - 1] < 0.94) radii.push(1);

    const N = Math.max(1, folds | 0);
    const M = N * Math.max(1, Math.ceil(24 / N));

    const angs = [], wts = [];
    const push = (a, w) => { angs.push(U.norm(a) * M); wts.push(w); };
    for (const p of prims) {
      if (p.kind === 'line') {
        const w = Math.hypot(p.p1[0] - p.p0[0], p.p1[1] - p.p0[1]);
        push(Math.atan2(p.p0[1], p.p0[0]), w);
        push(Math.atan2(p.p1[1], p.p1[0]), w);
      } else if (p.kind === 'arc' && Math.hypot(p.cx, p.cy) > tol * 2.5) {
        push(Math.atan2(p.cy, p.cx), p.r * Math.abs(p.e - p.s));
      }
    }
    const offset = angs.length ? U.norm(U.circMean(angs, wts) / M) : 0;

    return {
      radii: radii, folds: N, div: M, step: TAU / M, offset: offset, tol: tol,

      conc: Math.max(tol * 2.5, 0.05),
      concFull: Math.max(tol * 6, 0.16)
    };
  };

  FIT.snapR = (grid, r) => {
    let best = r, bd = Infinity;
    for (const c of grid.radii) {
      const d = Math.abs(c - r);
      if (d < bd) { bd = d; best = c; }
    }
    return bd <= Math.max(grid.tol * 2.2, 0.03) ? best : r;
  };

  FIT.snapA = (grid, a) => {
    const k = Math.round((a - grid.offset) / grid.step);
    return grid.offset + k * grid.step;
  };

  FIT.toPolar = (p, grid, doSnap) => {
    const sr = r => doSnap ? FIT.snapR(grid, r) : r;
    const sa = a => doSnap ? FIT.snapA(grid, a) : a;

    if (p.kind === 'line') {
      let r0 = Math.hypot(p.p0[0], p.p0[1]), a0 = Math.atan2(p.p0[1], p.p0[0]);
      let r1 = Math.hypot(p.p1[0], p.p1[1]), a1 = Math.atan2(p.p1[1], p.p1[0]);
      r0 = sr(r0); r1 = sr(r1); a0 = sa(a0); a1 = sa(a1);
      if (Math.abs(r0 - r1) < 1e-6 && Math.abs(U.angDiff(a0, a1)) < 1e-6) return null;
      return { t: 'line', r0: r0, a0: U.norm(a0), r1: r1, a1: U.norm(a1) };
    }

    if (p.kind === 'arc') {
      const d = Math.hypot(p.cx, p.cy);
      const conc = p.full ? (grid.concFull || 0.16) : (grid.conc || grid.tol * 2.5);
      if (d <= conc) {

        const rad = sr(p.r);
        if (rad < 1e-4) return null;
        if (p.full) return { t: 'arc', cr: 0, ca: 0, rad: rad, s: 0, e: TAU };
        let s = sa(p.s), e = sa(p.e);
        if (e - s < grid.step * 0.5) e = s + grid.step;
        return { t: 'arc', cr: 0, ca: 0, rad: rad, s: s, e: e };
      }

      const cr = sr(d), ca = sa(Math.atan2(p.cy, p.cx));
      const rad = doSnap ? Math.round(p.r * 200) / 200 : p.r;
      if (rad < 1e-4) return null;
      if (p.full) return { t: 'arc', cr: cr, ca: U.norm(ca), rad: rad, s: 0, e: TAU };
      let s = sa(p.s), e = sa(p.e);
      if (e - s < grid.step * 0.5) e = s + grid.step;
      return { t: 'arc', cr: cr, ca: U.norm(ca), rad: rad, s: s, e: e };
    }

    const v = p.pts.map(q => {
      const r = Math.hypot(q[0], q[1]), a = Math.atan2(q[1], q[0]);
      return [sr(r), U.norm(sa(a))];
    });
    const dedup = [v[0]];
    for (let i = 1; i < v.length; i++) {
      const b = dedup[dedup.length - 1];
      if (Math.abs(v[i][0] - b[0]) > 1e-6 || Math.abs(U.angDiff(b[1], v[i][1])) > 1e-6) dedup.push(v[i]);
    }
    return dedup.length >= 2 ? { t: 'poly', v: dedup } : null;
  };

  FIT.rotate = (p, d) => {
    if (p.t === 'line') return { t: 'line', r0: p.r0, a0: U.norm(p.a0 + d), r1: p.r1, a1: U.norm(p.a1 + d) };
    if (p.t === 'arc') {
      const full = p.e - p.s >= TAU - 1e-6;
      return { t: 'arc', cr: p.cr, ca: U.norm(p.ca + d), rad: p.rad,
               s: full ? 0 : p.s + d, e: full ? TAU : p.e + d };
    }
    return { t: 'poly', v: p.v.map(q => [q[0], U.norm(q[1] + d)]) };
  };

  FIT.mirror = (p, ax) => {
    const f = a => U.norm(2 * ax - a);
    if (p.t === 'line') return { t: 'line', r0: p.r0, a0: f(p.a0), r1: p.r1, a1: f(p.a1) };
    if (p.t === 'arc') {
      const full = p.e - p.s >= TAU - 1e-6;
      if (full) return { t: 'arc', cr: p.cr, ca: f(p.ca), rad: p.rad, s: 0, e: TAU };
      const s = 2 * ax - p.e, e = 2 * ax - p.s;
      return { t: 'arc', cr: p.cr, ca: f(p.ca), rad: p.rad, s: s, e: e };
    }
    return { t: 'poly', v: p.v.map(q => [q[0], f(q[1])]) };
  };

  const R4 = x => Math.round(x * 2000) / 2000;
  const A4 = a => Math.round(U.norm(a) * 2000) / 2000;

  FIT.key = p => {
    if (p.t === 'line') {
      let A = [R4(p.r0), A4(p.a0)], B = [R4(p.r1), A4(p.a1)];
      if (A[0] > B[0] || (A[0] === B[0] && A[1] > B[1])) { const t = A; A = B; B = t; }
      return 'L' + A[0] + ',' + A[1] + '|' + B[0] + ',' + B[1];
    }
    if (p.t === 'arc') {
      const full = p.e - p.s >= TAU - 1e-6;
      if (full) return 'C' + R4(p.cr) + ',' + (p.cr < 1e-6 ? 0 : A4(p.ca)) + '|' + R4(p.rad);
      return 'A' + R4(p.cr) + ',' + (p.cr < 1e-6 ? 0 : A4(p.ca)) + '|' + R4(p.rad)
           + '|' + A4(p.s) + ',' + A4(p.e);
    }
    return 'P' + p.v.map(q => R4(q[0]) + ',' + A4(q[1])).join(';');
  };

  FIT.dedupe = prims => {
    const seen = new Set(), out = [];
    for (const p of prims) {
      const k = FIT.key(p);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(p);
    }
    return out;
  };

  FIT.weight = p => {
    if (p.t === 'arc') return p.rad * Math.min(TAU, Math.abs(p.e - p.s));
    if (p.t === 'line') {
      const x0 = p.r0 * Math.cos(p.a0), y0 = p.r0 * Math.sin(p.a0);
      const x1 = p.r1 * Math.cos(p.a1), y1 = p.r1 * Math.sin(p.a1);
      return Math.hypot(x1 - x0, y1 - y0);
    }
    let L = 0;
    for (let i = 1; i < p.v.length; i++) {
      const a = p.v[i - 1], b = p.v[i];
      L += Math.hypot(b[0] * Math.cos(b[1]) - a[0] * Math.cos(a[1]),
                      b[0] * Math.sin(b[1]) - a[0] * Math.sin(a[1]));
    }
    return L;
  };

  function isRing(p) {
    return p.t === 'arc' && p.cr < 1e-6 && (p.e - p.s) >= TAU - 1e-6;
  }

  function repAngle(p) {
    if (p.t === 'arc') return p.cr > 1e-6 ? p.ca : (p.s + p.e) / 2;
    if (p.t === 'line') return p.r0 >= p.r1 ? p.a0 : p.a1;
    let sx = 0, sy = 0;
    for (const q of p.v) { sx += Math.cos(q[1]); sy += Math.sin(q[1]); }
    return Math.atan2(sy, sx);
  }

  FIT.symmetrise = (prims, folds, offset, mirrorAxis) => {
    const N = Math.max(1, folds | 0);
    if (N < 2 && mirrorAxis == null) return FIT.dedupe(prims);
    const sector = TAU / N;
    offset = offset || 0;

    const ringByRad = new Map();
    const folded = [];

    const consider = p => {
      if (isRing(p)) {
        const k = R4(p.rad);
        if (!ringByRad.has(k)) ringByRad.set(k, p);
        return;
      }
      const k = Math.floor(U.norm(repAngle(p) - offset) / sector);
      folded.push(k === 0 ? p : FIT.rotate(p, -k * sector));
    };

    for (const p of prims) {
      consider(p);
      if (mirrorAxis != null) consider(FIT.mirror(p, mirrorAxis));
    }

    const qr = r => Math.round(r / 0.035);
    const qa = a => Math.round(U.norm(a) / (sector / 6));
    const ckey = p => {
      if (p.t === 'arc') {

        return 'A' + qr(p.cr) + ',' + (p.cr < 1e-6 ? 0 : qa(p.ca)) + ',' + qr(p.rad);
      }
      if (p.t === 'line') {
        let A = [qr(p.r0), qa(p.a0)], B = [qr(p.r1), qa(p.a1)];
        if (A[0] > B[0] || (A[0] === B[0] && A[1] > B[1])) { const t = A; A = B; B = t; }
        return 'L' + A + '|' + B;
      }
      const v = p.v;
      const m = v[v.length >> 1];
      return 'P' + v.length + ':' + qr(v[0][0]) + ',' + qa(v[0][1]) + ',' +
             qr(m[0]) + ',' + qa(m[1]) + ',' + qr(v[v.length - 1][0]) + ',' + qa(v[v.length - 1][1]);
    };

    const best = new Map();
    for (const p of folded) {
      const k = ckey(p);
      const cur = best.get(k);
      if (!cur) { best.set(k, p.t === 'arc' ? Object.assign({}, p) : p); continue; }
      if (cur.t === 'arc' && p.t === 'arc') {

        const gap = Math.max(p.s - cur.e, cur.s - p.e);
        const s = Math.min(cur.s, p.s), e = Math.max(cur.e, p.e);
        if (gap < sector / 2 && e - s <= TAU) { cur.s = s; cur.e = e; }
        if (FIT.weight(p) > FIT.weight(cur)) { cur.cr = p.cr; cur.ca = p.ca; cur.rad = p.rad; }
      } else if (FIT.weight(p) > FIT.weight(cur)) {
        best.set(k, p);
      }
    }

    const out = Array.from(ringByRad.values());
    for (const p of best.values()) {
      for (let k = 0; k < N; k++) out.push(k === 0 ? p : FIT.rotate(p, sector * k));
    }
    return FIT.dedupe(out);
  };

  function runsFrom(bins, joinGap) {
    const runs = [];
    let i = 0;
    const n = bins.length;
    while (i < n) {
      if (!bins[i]) { i++; continue; }
      let j = i;
      while (j + 1 < n && bins[j + 1]) j++;
      runs.push([i, j]);
      i = j + 1;
    }

    const out = [];
    for (const r of runs) {
      const last = out[out.length - 1];
      if (last && r[0] - last[1] <= joinGap) last[1] = r[1];
      else out.push(r.slice());
    }
    return out;
  }

  function mergeArcs(arcs, step) {
    const NB = 1440;
    const gap = Math.max(2, Math.round(step / TAU * NB * 0.6));
    const buckets = new Map();
    for (const p of arcs) {
      const k = R4(p.cr) + '|' + (p.cr < 1e-6 ? '0' : A4(p.ca)) + '|' + R4(p.rad);
      if (!buckets.has(k)) buckets.set(k, { cr: p.cr, ca: p.ca, rad: p.rad, bins: new Uint8Array(NB) });
      const b = buckets.get(k);
      const s = p.s, e = p.e;
      const i0 = Math.round(s / TAU * NB), i1 = Math.round(e / TAU * NB);
      for (let i = i0; i <= i1; i++) b.bins[((i % NB) + NB) % NB] = 1;
    }
    const out = [];
    for (const b of buckets.values()) {
      let cov = 0;
      for (let i = 0; i < NB; i++) cov += b.bins[i];
      if (cov >= NB * 0.93) {
        out.push({ t: 'arc', cr: b.cr, ca: b.ca, rad: b.rad, s: 0, e: TAU });
        continue;
      }

      let shift = 0;
      while (shift < NB && b.bins[shift]) shift++;
      const rot = new Uint8Array(NB);
      for (let i = 0; i < NB; i++) rot[i] = b.bins[(i + shift) % NB];
      for (const [i0, i1] of runsFrom(rot, gap)) {
        const s = (i0 + shift) / NB * TAU;
        const e = (i1 + shift + 1) / NB * TAU;
        out.push({ t: 'arc', cr: b.cr, ca: b.ca, rad: b.rad, s: s, e: e });
      }
    }
    return out;
  }

  function mergeLines(lines) {

    const buckets = new Map();
    for (const p of lines) {
      const x0 = p.r0 * Math.cos(p.a0), y0 = p.r0 * Math.sin(p.a0);
      const x1 = p.r1 * Math.cos(p.a1), y1 = p.r1 * Math.sin(p.a1);
      const dx = x1 - x0, dy = y1 - y0;
      const L = Math.hypot(dx, dy);
      if (L < 1e-9) continue;
      let nx = -dy / L, ny = dx / L;
      let ang = Math.atan2(ny, nx);
      if (ang < 0) { ang += Math.PI; nx = -nx; ny = -ny; }
      if (ang >= Math.PI - 1e-9) { ang = 0; nx = -nx; ny = -ny; }
      const d = nx * x0 + ny * y0;
      const qa = Math.round(ang / (Math.PI / 720));
      const qd = Math.round(d / 0.004);
      const k = qa + ':' + qd;
      const ux = ny, uy = -nx;
      const t0 = ux * x0 + uy * y0, t1 = ux * x1 + uy * y1;
      if (!buckets.has(k)) buckets.set(k, { nx: nx, ny: ny, d: d, ux: ux, uy: uy, segs: [] });
      buckets.get(k).segs.push([Math.min(t0, t1), Math.max(t0, t1)]);
    }
    const out = [];
    for (const b of buckets.values()) {
      b.segs.sort((p, q) => p[0] - q[0]);
      const merged = [];
      for (const s of b.segs) {
        const last = merged[merged.length - 1];
        if (last && s[0] - last[1] <= 0.012) last[1] = Math.max(last[1], s[1]);
        else merged.push(s.slice());
      }
      for (const [t0, t1] of merged) {
        if (t1 - t0 < 1e-4) continue;
        const px = b.nx * b.d + b.ux * t0, py = b.ny * b.d + b.uy * t0;
        const qx = b.nx * b.d + b.ux * t1, qy = b.ny * b.d + b.uy * t1;
        out.push({
          t: 'line',
          r0: Math.hypot(px, py), a0: U.norm(Math.atan2(py, px)),
          r1: Math.hypot(qx, qy), a1: U.norm(Math.atan2(qy, qx))
        });
      }
    }
    return out;
  }

  FIT.merge = (prims, grid) => {
    const rings = [], lines = [], rest = [];
    for (const p of prims) {

      if (p.t === 'arc' && p.cr < 1e-6) rings.push(p);
      else if (p.t === 'line') lines.push(p);
      else rest.push(p);
    }
    return FIT.dedupe(
      mergeArcs(rings, grid ? grid.step : TAU / 24)
        .concat(mergeLines(lines))
        .concat(rest)
    );
  };

  FIT.pt = (cx, cy, S, r, a) => [cx + r * S * Math.cos(a), cy + r * S * Math.sin(a)];

  FIT.strokePrims = (ctx, prims, cx, cy, S, width, colour) => {
    ctx.save();
    ctx.strokeStyle = colour || '#000';
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const p of prims) {
      ctx.beginPath();
      if (p.t === 'arc') {
        const ax = cx + p.cr * S * Math.cos(p.ca);
        const ay = cy + p.cr * S * Math.sin(p.ca);

        const e = p.e > p.s ? Math.min(p.e, p.s + TAU) : p.s + TAU;
        ctx.arc(ax, ay, p.rad * S, p.s, e, false);
      } else if (p.t === 'line') {
        const a = FIT.pt(cx, cy, S, p.r0, p.a0), b = FIT.pt(cx, cy, S, p.r1, p.a1);
        ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      } else {
        p.v.forEach((q, i) => {
          const c = FIT.pt(cx, cy, S, q[0], q[1]);
          if (i) ctx.lineTo(c[0], c[1]); else ctx.moveTo(c[0], c[1]);
        });
      }
      ctx.stroke();
    }
    ctx.restore();
  };

  FIT.toSVG = (prims, size, width, stroke, bg) => {
    const cx = size / 2, cy = size / 2, S = size / 2 * 0.94;
    const f = n => (Math.round(n * 1000) / 1000);
    const parts = [];
    parts.push('<?xml version="1.0" encoding="UTF-8"?>');
    parts.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size +
               '" viewBox="0 0 ' + size + ' ' + size + '">');
    if (bg) parts.push('<rect width="100%" height="100%" fill="' + bg + '"/>');
    parts.push('<g fill="none" stroke="' + (stroke || '#111') + '" stroke-width="' + width +
               '" stroke-linecap="round" stroke-linejoin="round">');
    for (const p of prims) {
      if (p.t === 'arc') {
        const ax = cx + p.cr * S * Math.cos(p.ca), ay = cy + p.cr * S * Math.sin(p.ca);
        const R = p.rad * S;
        if (p.e - p.s >= TAU - 1e-6) {
          parts.push('<circle cx="' + f(ax) + '" cy="' + f(ay) + '" r="' + f(R) + '"/>');
        } else {
          const x0 = ax + R * Math.cos(p.s), y0 = ay + R * Math.sin(p.s);
          const x1 = ax + R * Math.cos(p.e), y1 = ay + R * Math.sin(p.e);
          const large = (p.e - p.s) > Math.PI ? 1 : 0;
          parts.push('<path d="M ' + f(x0) + ' ' + f(y0) + ' A ' + f(R) + ' ' + f(R) +
                     ' 0 ' + large + ' 1 ' + f(x1) + ' ' + f(y1) + '"/>');
        }
      } else if (p.t === 'line') {
        const a = FIT.pt(cx, cy, S, p.r0, p.a0), b = FIT.pt(cx, cy, S, p.r1, p.a1);
        parts.push('<line x1="' + f(a[0]) + '" y1="' + f(a[1]) + '" x2="' + f(b[0]) + '" y2="' + f(b[1]) + '"/>');
      } else {
        const d = p.v.map((q, i) => {
          const c = FIT.pt(cx, cy, S, q[0], q[1]);
          return (i ? 'L ' : 'M ') + f(c[0]) + ' ' + f(c[1]);
        }).join(' ');
        parts.push('<path d="' + d + '"/>');
      }
    }
    parts.push('</g></svg>');
    return parts.join('\n');
  };

  g.FIT = FIT;
})(window);
