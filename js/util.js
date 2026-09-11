(function (g) {
  'use strict';

  const U = {};

  U.$  = (s, r) => (r || document).querySelector(s);
  U.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  U.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  U.lerp  = (a, b, t) => a + (b - a) * t;
  U.TAU   = Math.PI * 2;

  U.norm = a => {
    a = a % U.TAU;
    return a < 0 ? a + U.TAU : a;
  };

  U.angDiff = (a, b) => {
    let d = (b - a) % U.TAU;
    if (d > Math.PI) d -= U.TAU;
    if (d <= -Math.PI) d += U.TAU;
    return d;
  };

  U.deg = r => r * 180 / Math.PI;
  U.rad = d => d * Math.PI / 180;

  U.circMean = (angles, weights) => {
    let sx = 0, sy = 0;
    for (let i = 0; i < angles.length; i++) {
      const w = weights ? weights[i] : 1;
      sx += Math.cos(angles[i]) * w;
      sy += Math.sin(angles[i]) * w;
    }
    return Math.atan2(sy, sx);
  };

  U.median = arr => {
    if (!arr.length) return 0;
    const a = Array.from(arr).sort((x, y) => x - y);
    const m = a.length >> 1;
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  };

  U.wMedian = (vals, wts) => {
    if (!vals.length) return 0;
    const idx = vals.map((v, i) => i).sort((a, b) => vals[a] - vals[b]);
    let total = 0;
    for (const w of wts) total += w;
    let run = 0;
    for (const i of idx) {
      run += wts[i];
      if (run >= total / 2) return vals[i];
    }
    return vals[idx[idx.length - 1]];
  };

  U.hex2rgb = h => {
    h = h.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };

  U.rgb2hex = (r, gg, b) =>
    '#' + [r, gg, b].map(v => U.clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');

  U.rgbDist2 = (a, b, c, d, e, f) => {
    const dr = a - d, dg = b - e, db = c - f;
    return dr * dr + dg * dg + db * db;
  };

  U.contrastOn = hex => {
    const [r, gg, b] = U.hex2rgb(hex);
    return (0.299 * r + 0.587 * gg + 0.114 * b) > 150 ? '#231a08' : '#f2ece3';
  };

  U.mkCanvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  };

  U.ctxOf = (c, opts) => c.getContext('2d', opts || { willReadFrequently: true });

  U.download = (name, text, mime) => {
    const blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  U.nextFrame = () => new Promise(res => {
    let done = false;
    const fire = () => { if (!done) { done = true; res(); } };
    requestAnimationFrame(() => setTimeout(fire, 0));
    setTimeout(fire, 80);
  });

  U.Viewport = class {

    constructor(host, canvas, onTap) {
      this.host = host;
      this.canvas = canvas;
      this.onTap = onTap || null;
      this.scale = 1; this.tx = 0; this.ty = 0;
      this.panMode = false;
      this.enabled = true;
      this._pts = new Map();
      this._moved = 0;
      this._t0 = 0;
      this._pinch0 = null;

      const opt = { passive: false };
      host.addEventListener('pointerdown', e => this._down(e), opt);
      host.addEventListener('pointermove', e => this._move(e), opt);
      host.addEventListener('pointerup', e => this._up(e), opt);
      host.addEventListener('pointercancel', e => this._up(e), opt);
      host.addEventListener('wheel', e => this._wheel(e), opt);
    }

    reset() { this.scale = 1; this.tx = 0; this.ty = 0; this.apply(); }

    apply() {
      this.canvas.style.transformOrigin = 'center center';
      this.canvas.style.transform =
        'translate(' + this.tx.toFixed(2) + 'px,' + this.ty.toFixed(2) + 'px) scale(' + this.scale.toFixed(4) + ')';
    }

    toImage(cx, cy) {
      const r = this.canvas.getBoundingClientRect();
      const x = (cx - r.left) / r.width * this.canvas.width;
      const y = (cy - r.top) / r.height * this.canvas.height;
      return [x, y];
    }

    _down(e) {
      if (!this.enabled) return;
      this.host.setPointerCapture(e.pointerId);
      this._pts.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
      if (this._pts.size === 1) { this._moved = 0; this._t0 = performance.now(); }
      if (this._pts.size === 2) {
        const [a, b] = Array.from(this._pts.values());
        this._pinch0 = {
          d: Math.hypot(a.x - b.x, a.y - b.y),
          s: this.scale, tx: this.tx, ty: this.ty
        };
      }
      e.preventDefault();
    }

    _move(e) {
      if (!this.enabled) return;
      const p = this._pts.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      this._moved += Math.abs(dx) + Math.abs(dy);

      if (this._pts.size === 2 && this._pinch0) {
        const [a, b] = Array.from(this._pts.values());
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        this.scale = U.clamp(this._pinch0.s * (d / this._pinch0.d), 0.4, 14);
        this.apply();
      } else if (this._pts.size === 1 && (this.panMode || this.scale > 1.02)) {
        this.tx += dx; this.ty += dy;
        this.apply();
      }
      e.preventDefault();
    }

    _up(e) {
      if (!this.enabled) return;
      const p = this._pts.get(e.pointerId);
      this._pts.delete(e.pointerId);
      if (this._pts.size < 2) this._pinch0 = null;
      if (!p) return;
      const quick = performance.now() - this._t0 < 500;
      if (this.onTap && !this.panMode && this._moved < 10 && quick && this._pts.size === 0) {
        const [ix, iy] = this.toImage(e.clientX, e.clientY);
        this.onTap(ix, iy);
      }
      e.preventDefault();
    }

    _wheel(e) {
      if (!this.enabled) return;
      e.preventDefault();
      const f = Math.exp(-e.deltaY * 0.0016);
      this.scale = U.clamp(this.scale * f, 0.4, 14);
      this.apply();
    }
  };

  g.U = U;
})(window);
