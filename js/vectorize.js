(function (g) {
  'use strict';

  const VEC = {};
  VEC.WORK = 700;

  VEC.cropToWork = (srcCanvas, crop, work) => {
    work = work || VEC.WORK;
    const c = U.mkCanvas(work, work);
    const ctx = U.ctxOf(c);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, work, work);
    const s = crop.r * 2;
    ctx.drawImage(srcCanvas, crop.cx - crop.r, crop.cy - crop.r, s, s, 0, 0, work, work);
    return c;
  };

  VEC.autoCrop = srcCanvas => {
    const W = 260;
    const h = Math.max(1, Math.round(srcCanvas.height / srcCanvas.width * W));
    const small = U.mkCanvas(W, h);
    const sctx = U.ctxOf(small);
    sctx.drawImage(srcCanvas, 0, 0, W, h);
    const img = sctx.getImageData(0, 0, W, h);
    const grey = IM.boxBlur(IM.toGray(img), W, h, 1);
    let mask = IM.adaptiveThreshold(grey, W, h, 0.12);
    mask = IM.despeckle(mask, 4);

    let x0 = W, y0 = h, x1 = -1, y1 = -1, n = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < W; x++) {
        if (!mask.d[y * W + x]) continue;
        n++;
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    const k = srcCanvas.width / W;
    if (n < 30 || x1 < x0) {
      const r = Math.min(srcCanvas.width, srcCanvas.height) * 0.45;
      return { cx: srcCanvas.width / 2, cy: srcCanvas.height / 2, r: r };
    }
    const cx = (x0 + x1) / 2 * k, cy = (y0 + y1) / 2 * k;
    const r = Math.max(x1 - x0, y1 - y0) / 2 * k * 1.06;
    return { cx: cx, cy: cy, r: Math.max(r, 20) };
  };

  VEC.inkMask = (workCanvas, opt) => {
    const w = workCanvas.width, h = workCanvas.height;
    const img = U.ctxOf(workCanvas).getImageData(0, 0, w, h);
    const grey = IM.boxBlur(IM.toGray(img), w, h, 1);
    let m = IM.adaptiveThreshold(grey, w, h, opt.k);
    if (opt.closeR > 0) m = IM.close(m, opt.closeR);
    if (opt.minArea > 1) m = IM.despeckle(m, opt.minArea);

    const cx = w / 2, cy = h / 2, R = w / 2 * 0.995;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (Math.hypot(x - cx, y - cy) > R) m.d[y * w + x] = 0;
      }
    }
    return m;
  };

  function classifyPath(ptsN, tol) {
    const whole = FIT.classify(ptsN, tol);

    let split = null;
    const idx = TR.simplifyIdx(ptsN, tol * 1.3);
    if (idx.length >= 3 && idx.length <= 26) {
      const parts = [];
      let worst = 0;
      for (let i = 1; i < idx.length; i++) {
        const seg = ptsN.slice(idx[i - 1], idx[i] + 1);
        if (seg.length < 2) continue;
        const f = FIT.classify(seg, tol);
        if (!f) continue;
        parts.push(f);
        if (f.rms > worst) worst = f.rms;
      }
      if (parts.length) split = { parts: parts, worst: worst };
    }

    if (!whole) return split ? split.parts : [];
    if (whole.kind === 'poly') return split ? split.parts : [whole];
    if (split && split.worst * 3 < whole.rms) return split.parts;
    return [whole];
  }

  function centreFromArcs(fits, tol) {
    const xs = [], ys = [], ws = [];
    for (const f of fits) {
      if (f.kind !== 'arc') continue;
      if (!(f.r > 0.05 && f.r < 1.3)) continue;
      if (f.rms > tol * 2.5) continue;
      const sweep = Math.min(U.TAU, Math.abs(f.e - f.s));
      if (sweep < 0.9) continue;
      xs.push(f.cx); ys.push(f.cy); ws.push(f.r * sweep);
    }
    if (xs.length < 2) return null;
    return { dx: U.wMedian(xs, ws), dy: U.wMedian(ys, ws), n: xs.length };
  }

  VEC.run = (srcCanvas, crop, opt) => {
    const t0 = performance.now();
    const work = VEC.cropToWork(srcCanvas, crop);
    const W = work.width;
    const mask = VEC.inkMask(work, opt);

    let cx = W / 2, cy = W / 2;
    const R = W / 2 * 0.94;

    const skel = TR.pruneSpurs(IM.cleanSkeleton(IM.thin(mask)), Math.max(6, R * 0.02), 4);
    const raw = TR.tracePaths(skel);
    const joined = TR.stitch(raw, U.rad(55), 5);

    const minLen = Math.max(5, R * 0.025);
    const paths = [];
    for (const p of joined) {
      if (TR.pathLength(p) < minLen) continue;
      paths.push(TR.resample(p, 1.2));
    }

    const fitAbout = (px, py) => {
      const norm = paths.map(p => p.map(q => [(q[0] - px) / R, (q[1] - py) / R]));
      const out = [];
      for (const p of norm) {
        for (const f of classifyPath(p, opt.tol)) out.push(f);
      }
      return out;
    };

    let fits = fitAbout(cx, cy);
    let shifted = 0;
    for (let pass = 0; pass < 3; pass++) {
      const c = centreFromArcs(fits, opt.tol);
      if (!c) break;
      const move = Math.hypot(c.dx, c.dy);
      if (move < 0.004) break;
      if (move > 0.45) break;
      cx += c.dx * R; cy += c.dy * R;
      shifted += move;
      fits = fitAbout(cx, cy);
    }

    const guess = IM.guessFolds(mask, cx, cy, W / 2 * 0.9);
    const folds = opt.folds > 0 ? opt.folds : guess.n;

    const grid = FIT.makeGrid(fits, folds, opt.tol);

    let prims = [];
    for (const f of fits) {
      const p = FIT.toPolar(f, grid, opt.snap);
      if (p) prims.push(p);
    }
    prims = FIT.merge(FIT.dedupe(prims), grid);

    const before = prims.length;
    if (opt.sym && folds > 1) {
      prims = FIT.symmetrise(prims, folds, grid.offset, opt.mirror ? grid.offset : null);
    } else if (opt.mirror) {
      prims = FIT.symmetrise(prims, 1, grid.offset, grid.offset);
    }

    prims = FIT.merge(prims, grid);

    const minW = Math.max(0.015, opt.tol * 1.5);
    prims = prims.filter(p => FIT.weight(p) >= minW);

    return {
      work: work, mask: mask, skel: skel,
      centre: { x: cx, y: cy, R: R, movedBy: shifted },
      paths: paths, prims: prims, grid: grid,
      folds: folds, guess: guess,
      stats: {
        ms: Math.round(performance.now() - t0),
        traced: raw.length,
        strokes: paths.length,
        recentred: +(shifted * 100).toFixed(1),
        fitted: fits.length,
        prims: prims.length,
        primsBase: before,
        rings: grid.radii.length,
        div: grid.div
      }
    };
  };

  VEC.renderClean = (prims, size, strokePx, bg, ink) => {
    const c = U.mkCanvas(size, size);
    const ctx = U.ctxOf(c);
    ctx.fillStyle = bg || '#ffffff';
    ctx.fillRect(0, 0, size, size);
    FIT.strokePrims(ctx, prims, size / 2, size / 2, size / 2 * 0.94, strokePx, ink || '#000000');
    return c;
  };

  g.VEC = VEC;
})(window);
