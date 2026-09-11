(function (g) {
  'use strict';

  const SLICE = {};

  function sampleAt(st, x, y, outlineColour) {
    const s = st.size;
    const xi = Math.round(x), yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= s || yi >= s) return -1;
    const i = yi * s + xi;
    if (st.wall[i]) return outlineColour >= 0 ? outlineColour : -1;
    return st.idx[i];
  }

  SLICE.run = (st, opt) => {
    const s = st.size;
    const cx = s / 2, cy = s / 2;
    const rMax = opt.rMax || (s / 2 * 0.94);
    const ds = Math.max(1.5, opt.ds);
    const pitch = Math.max(1.5, opt.pitch);
    const dots = [];

    const push = (x, y) => {
      const c = sampleAt(st, x, y, opt.outlineColour);
      if (c < 0 && opt.skipBg) return;
      dots.push({ x: x, y: y, c: c < 0 ? 0 : c });
    };

    if (opt.mode === 'rings') {
      const nRings = Math.floor(rMax / pitch);
      push(cx, cy);
      for (let k = 1; k <= nRings; k++) {
        const r = k * pitch;
        const count = Math.max(3, Math.round(U.TAU * r / ds));
        const dir = (k % 2) ? 1 : -1;
        for (let j = 0; j < count; j++) {
          const t = dir > 0 ? j : (count - 1 - j);
          const a = U.TAU * t / count;
          push(cx + r * Math.cos(a), cy + r * Math.sin(a));
        }
      }
    } else {

      const b = pitch / U.TAU;
      push(cx, cy);
      let th = 0;
      let guard = 0;
      while (guard++ < 400000) {
        const r = b * th;
        if (r > rMax) break;
        const dth = ds / Math.sqrt(r * r + b * b);
        th += dth;
        const r2 = b * th;
        if (r2 > rMax) break;
        push(cx + r2 * Math.cos(th), cy + r2 * Math.sin(th));
      }
    }

    let travel = 0, changes = 0, last = -99;
    const perColour = {};
    for (let i = 0; i < dots.length; i++) {
      if (i) travel += Math.hypot(dots[i].x - dots[i - 1].x, dots[i].y - dots[i - 1].y);
      if (dots[i].c !== last) { changes++; last = dots[i].c; }
      perColour[dots[i].c] = (perColour[dots[i].c] || 0) + 1;
    }

    return {
      dots: dots, rMax: rMax, cx: cx, cy: cy, size: s,
      mode: opt.mode, ds: ds, pitch: pitch,
      stats: { n: dots.length, travelPx: travel, changes: changes, perColour: perColour }
    };
  };

  SLICE.render = (sl, canvas, palette, bgHex, view, dotScale) => {
    const ctx = U.ctxOf(canvas, {});
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (view === 'path' || view === 'both') {
      ctx.save();
      ctx.strokeStyle = 'rgba(140,120,100,.55)';
      ctx.lineWidth = Math.max(0.6, sl.size / 1400);
      ctx.beginPath();
      sl.dots.forEach((d, i) => { if (i) ctx.lineTo(d.x, d.y); else ctx.moveTo(d.x, d.y); });
      ctx.stroke();
      ctx.restore();
    }

    if (view === 'dots' || view === 'both') {
      const r = sl.ds / 2 * (dotScale == null ? 0.7 : dotScale);

      const ring = r > 2.2;
      ctx.strokeStyle = 'rgba(0,0,0,.18)';
      ctx.lineWidth = 0.6;
      for (const d of sl.dots) {
        ctx.fillStyle = palette[d.c] || '#888';
        ctx.beginPath();
        ctx.arc(d.x, d.y, r, 0, U.TAU);
        ctx.fill();
        if (ring) ctx.stroke();
      }
    }

    ctx.strokeStyle = 'rgba(0,0,0,.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(sl.cx, sl.cy, sl.rMax, 0, U.TAU);
    ctx.stroke();
  };

  g.SLICE = SLICE;
})(window);
