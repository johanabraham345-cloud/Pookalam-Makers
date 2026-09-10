(function () {
  'use strict';

  const $ = U.$, $$ = U.$$;
  const OUT = 1000;
  const RMAX = OUT / 2 * 0.94;

  const S = {
    step: 1,
    srcFull: null,
    crop: null,
    vec: null,
    lineCanvas: null,
    paint: null,
    slice: null,
    gcode: null,
    tool: 'fill',
    sel: 0,
    palette: ['#e2542a', '#f5a524', '#f6efdd', '#7a3fa8'],
    names: ['Marigold red', 'Marigold orange', 'White chrysanth', 'Purple aster'],
    bg: '#faf6ee',
    vecView: 'clean',
    dotView: 'dots',
    pathMode: 'spiral'
  };

  function busy(on, msg) {
    $('#busy').classList.toggle('on', !!on);
    if (msg) $('#busyMsg').textContent = msg;
  }
  const run = async (msg, fn) => {
    busy(true, msg);
    await U.nextFrame();
    try { fn(); }
    catch (e) { console.error(e); alert('Something went wrong: ' + e.message); }
    finally { busy(false); }
  };

  function go(n) {
    if (n >= 2 && !S.srcFull) return;
    if (n >= 3 && !S.vec) return;
    if (n >= 4 && !S.paint) return;
    if (n >= 5 && !S.slice) return;
    S.step = n;
    $$('.panel').forEach(p => p.classList.toggle('on', +p.dataset.panel === n));
    $$('.step').forEach(b => {
      const k = +b.dataset.step;
      b.classList.toggle('on', k === n);
      b.classList.toggle('done', k < n);
    });
  }
  $$('.step').forEach(b => b.addEventListener('click', () => go(+b.dataset.step)));

  function segmented(sel, cb) {
    const root = $(sel);
    root.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      $$('button', root).forEach(x => x.classList.toggle('on', x === b));
      cb(b.dataset);
    });
  }

  function bindRange(id, out, fmt, onInput, onChange) {
    const el = $('#' + id), o = $('#' + out);
    const upd = () => { o.textContent = fmt(+el.value); };
    el.addEventListener('input', () => { upd(); if (onInput) onInput(+el.value); });
    if (onChange) el.addEventListener('change', () => onChange(+el.value));
    upd();
    return el;
  }

  const srcCanvas = $('#srcCanvas');

  async function loadFile(file) {
    if (!file) return;
    let bmp;
    try {
      bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch (e) {
      bmp = await new Promise((res, rej) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = rej;
        im.src = URL.createObjectURL(file);
      });
    }
    const maxD = 1600;
    const k = Math.min(1, maxD / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * k), h = Math.round(bmp.height * k);
    const c = U.mkCanvas(w, h);
    U.ctxOf(c).drawImage(bmp, 0, 0, w, h);
    setSource(c);
  }

  function setSource(canvas) {
    S.srcFull = canvas;
    S.crop = VEC.autoCrop(canvas);
    $('#cropR').value = Math.round(S.crop.r / (Math.min(canvas.width, canvas.height) / 2) * 100);
    $('#cropROut').textContent = $('#cropR').value + '%';
    $('#dzHint').style.display = 'none';
    $('#toStep2').disabled = false;
    drawSource();
  }

  function drawSource() {
    if (!S.srcFull) return;
    const c = S.srcFull;
    const k = Math.min(1, 1000 / Math.max(c.width, c.height));
    srcCanvas.width = Math.round(c.width * k);
    srcCanvas.height = Math.round(c.height * k);
    const ctx = U.ctxOf(srcCanvas, {});
    ctx.drawImage(c, 0, 0, srcCanvas.width, srcCanvas.height);

    const cx = S.crop.cx * k, cy = S.crop.cy * k, r = S.crop.r * k;
    ctx.save();
    ctx.fillStyle = 'rgba(18,16,14,.55)';
    ctx.beginPath();
    ctx.rect(0, 0, srcCanvas.width, srcCanvas.height);
    ctx.arc(cx, cy, r, 0, U.TAU, true);
    ctx.fill();
    ctx.strokeStyle = '#f5a524';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, U.TAU); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 9, cy); ctx.lineTo(cx + 9, cy);
    ctx.moveTo(cx, cy - 9); ctx.lineTo(cx, cy + 9);
    ctx.stroke();
    ctx.restore();
  }

  $('#fileCam').addEventListener('change', e => loadFile(e.target.files[0]));
  $('#fileLib').addEventListener('change', e => loadFile(e.target.files[0]));

  const dz = $('#dropzone');
  ['dragenter', 'dragover'].forEach(t =>
    dz.addEventListener(t, e => { e.preventDefault(); dz.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(t =>
    dz.addEventListener(t, e => { e.preventDefault(); dz.classList.remove('drag'); }));
  dz.addEventListener('drop', e => {
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) loadFile(f);
  });

  let dragging = false;
  const cropAt = e => {
    if (!S.srcFull) return;
    const r = srcCanvas.getBoundingClientRect();
    const k = S.srcFull.width / srcCanvas.width;
    S.crop.cx = (e.clientX - r.left) / r.width * srcCanvas.width * k;
    S.crop.cy = (e.clientY - r.top) / r.height * srcCanvas.height * k;
    drawSource();
  };
  dz.addEventListener('pointerdown', e => {
    if (!S.srcFull) return;
    dragging = true; dz.setPointerCapture(e.pointerId); cropAt(e); e.preventDefault();
  });
  dz.addEventListener('pointermove', e => { if (dragging) cropAt(e); });
  dz.addEventListener('pointerup', () => { dragging = false; });
  dz.addEventListener('pointercancel', () => { dragging = false; });

  bindRange('cropR', 'cropROut', v => v + '%', v => {
    if (!S.srcFull) return;
    S.crop.r = v / 100 * Math.min(S.srcFull.width, S.srcFull.height) / 2;
    drawSource();
  });

  $('#btnAutoCrop').addEventListener('click', () => {
    if (!S.srcFull) return;
    S.crop = VEC.autoCrop(S.srcFull);
    $('#cropR').value = Math.round(S.crop.r / (Math.min(S.srcFull.width, S.srcFull.height) / 2) * 100);
    $('#cropROut').textContent = $('#cropR').value + '%';
    drawSource();
  });

  $('#btnDemo').addEventListener('click', () => setSource(demoSketch()));

  function demoSketch() {
    const N = 900, c = U.mkCanvas(N, N), ctx = U.ctxOf(c, {});
    ctx.fillStyle = '#fdfaf2'; ctx.fillRect(0, 0, N, N);

    const im = ctx.getImageData(0, 0, N, N);
    for (let i = 0; i < im.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 14;
      im.data[i] += n; im.data[i + 1] += n; im.data[i + 2] += n;
    }
    ctx.putImageData(im, 0, 0);

    ctx.strokeStyle = '#2a2622';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const cx = N / 2, cy = N / 2, R = N / 2 * 0.86;
    const wob = (r, a) => {
      const j = 1 + (Math.sin(a * 5.3 + r * 0.06) * 0.006 + (Math.random() - 0.5) * 0.004);
      return [cx + r * j * Math.cos(a), cy + r * j * Math.sin(a)];
    };
    const ring = (rr, w) => {
      ctx.lineWidth = w; ctx.beginPath();
      for (let i = 0; i <= 260; i++) {
        const a = U.TAU * i / 260, p = wob(rr, a);
        if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]);
      }
      ctx.closePath(); ctx.stroke();
    };
    [0.16, 0.32, 0.46, 0.62, 0.78, 0.94, 1.0].forEach(f => ring(R * f, f > 0.99 ? 4 : 2.6));

    const folds = 12;
    ctx.lineWidth = 2.4;
    for (let k = 0; k < folds; k++) {
      const a = U.TAU * k / folds;
      const p0 = wob(R * 0.32, a), p1 = wob(R * 0.94, a);
      ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();

      const mid = (a + U.TAU / folds / 2);
      for (const s of [-1, 1]) {
        ctx.beginPath();
        for (let i = 0; i <= 40; i++) {
          const t = i / 40;
          const rr = U.lerp(R * 0.46, R * 0.78, t);
          const aa = mid + s * Math.sin(t * Math.PI) * (U.TAU / folds) * 0.30;
          const p = wob(rr, aa);
          if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]);
        }
        ctx.stroke();
      }

      const b0 = wob(R * 0.78, mid), b1 = wob(R * 0.94, mid - 0.05), b2 = wob(R * 0.94, mid + 0.05);
      ctx.beginPath();
      ctx.moveTo(b0[0], b0[1]); ctx.lineTo(b1[0], b1[1]); ctx.lineTo(b2[0], b2[1]); ctx.closePath();
      ctx.stroke();
    }
    ctx.lineWidth = 2.6;
    ring(R * 0.08);
    return c;
  }

  $('#toStep2').addEventListener('click', () => { go(2); vectorise(); });

  const vecCanvas = $('#vecCanvas');
  vecCanvas.width = vecCanvas.height = OUT;

  const vOpts = () => ({
    k: +$('#thr').value / 100,
    closeR: +$('#closeR').value,
    minArea: +$('#spec').value * 4,
    tol: +$('#tol').value / 1000,
    folds: +$('#folds').value,
    snap: $('#optSnap').checked,
    sym: $('#optSym').checked,
    mirror: $('#optMirror').checked
  });

  function vectorise() {
    return run('reading the sketch…', () => {
      S.vec = VEC.run(S.srcFull, S.crop, vOpts());
      const st = S.vec.stats;
      $('#vecStat').textContent =
        st.strokes + ' strokes → ' + st.primsBase + ' shapes → ' +
        st.prims + ' after symmetry · ' + st.rings + ' rings · ' + st.ms + ' ms';
      $('#foldGuess').textContent =
        'detected ' + (S.vec.guess.n > 1 ? S.vec.guess.n + '-fold' : 'no') +
        ' symmetry (score ' + S.vec.guess.score.toFixed(2) + ')';
      $('#foldOut').textContent = (+$('#folds').value === 0)
        ? 'auto (' + S.vec.folds + ')' : String(S.vec.folds);
      drawVec();
      S.paint = null; S.slice = null;
    });
  }

  function drawVec() {
    if (!S.vec) return;
    const ctx = U.ctxOf(vecCanvas, {});
    ctx.clearRect(0, 0, OUT, OUT);
    const sw = +$('#sw').value;

    if (S.vecView === 'clean') {
      ctx.drawImage(VEC.renderClean(S.vec.prims, OUT, sw, '#faf6ee', '#2b2119'), 0, 0);
    } else if (S.vecView === 'ink') {
      ctx.drawImage(IM.maskToCanvas(S.vec.mask, '#f2ece3', '#12100e'), 0, 0, OUT, OUT);
    } else if (S.vecView === 'skel') {
      ctx.drawImage(IM.maskToCanvas(S.vec.skel, '#f5a524', '#12100e'), 0, 0, OUT, OUT);
    } else {
      ctx.drawImage(S.vec.work, 0, 0, OUT, OUT);
      ctx.globalAlpha = 0.55;
      ctx.drawImage(tintMask(S.vec.skel, '#e2542a'), 0, 0, OUT, OUT);
      ctx.globalAlpha = 1;
      FIT.strokePrims(ctx, S.vec.prims, OUT / 2, OUT / 2, RMAX, Math.max(1.5, sw * 0.6), '#1f6fd0');
    }
  }

  function tintMask(m, hex) {
    const c = U.mkCanvas(m.w, m.h), ctx = U.ctxOf(c);
    const img = ctx.createImageData(m.w, m.h);
    const F = U.hex2rgb(hex);
    for (let i = 0, j = 0; i < m.d.length; i++, j += 4) {
      if (m.d[i]) { img.data[j] = F[0]; img.data[j + 1] = F[1]; img.data[j + 2] = F[2]; img.data[j + 3] = 255; }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }

  segmented('#vecView', d => { S.vecView = d.v; drawVec(); });

  bindRange('thr', 'thrOut', v => (v / 100).toFixed(2), null, vectorise);
  bindRange('spec', 'specOut', v => String(v), null, vectorise);
  bindRange('closeR', 'closeOut', v => String(v), null, vectorise);
  bindRange('tol', 'tolOut', v => (v / 10).toFixed(1), null, vectorise);
  bindRange('folds', 'foldOut', v => v === 0 ? 'auto' : String(v), null, vectorise);
  bindRange('sw', 'swOut', v => String(v), () => drawVec());
  ['optSnap', 'optSym', 'optMirror'].forEach(id =>
    $('#' + id).addEventListener('change', vectorise));
  $('#btnReVec').addEventListener('click', vectorise);

  $('#btnSvg').addEventListener('click', () => {
    if (!S.vec) return;
    U.download('pookalam.svg',
      FIT.toSVG(S.vec.prims, OUT, +$('#sw').value, '#2b2119', '#faf6ee'),
      'image/svg+xml');
  });

  $('#toStep3').addEventListener('click', () => { if (S.vec) { go(3); startPaint(); } });

  const paintCanvas = $('#paintCanvas');
  paintCanvas.width = paintCanvas.height = OUT;
  let paintVP = null;

  function buildPalette() {
    const root = $('#palette');
    root.innerHTML = '';
    S.palette.forEach((hex, i) => {
      const row = document.createElement('div');
      row.className = 'swatch' + (i === S.sel ? ' on' : '');
      row.innerHTML =
        '<input class="chip" type="color" value="' + hex + '">' +
        '<span class="nm"><input type="text" value="' + S.names[i].replace(/"/g, '&quot;') + '"></span>' +
        '<span class="tno">T' + (i + 1) + '</span>';
      row.addEventListener('click', e => {
        if (e.target.tagName === 'INPUT') return;
        S.sel = i; buildPalette(); $('#outlineNum').textContent = String(i + 1);
      });
      const chip = row.querySelector('.chip');
      chip.addEventListener('input', () => {
        S.palette[i] = chip.value;
        renderPaint();
        if (S.slice) drawDots();
      });
      chip.addEventListener('click', () => { S.sel = i; $('#outlineNum').textContent = String(i + 1); buildPalette(); });
      const nm = row.querySelector('.nm input');
      nm.addEventListener('input', () => { S.names[i] = nm.value; });
      root.appendChild(row);
    });
  }
  buildPalette();

  function startPaint() {
    const sw = +$('#sw').value;
    S.lineCanvas = VEC.renderClean(S.vec.prims, OUT, sw, '#ffffff', '#000000');
    S.paint = PAINT.create(S.lineCanvas);
    if (!paintVP) {
      paintVP = new U.Viewport($('#paintWrap'), paintCanvas, onPaintTap);
    }
    paintVP.reset();
    renderPaint();
    $('#paintStat').textContent = 'tap a region to fill';
  }

  function renderPaint() {
    if (!S.paint) return;
    const ctx = U.ctxOf(paintCanvas, {});
    PAINT.renderTo(S.paint, ctx, S.palette, S.bg);
    FIT.strokePrims(ctx, S.vec.prims, OUT / 2, OUT / 2, RMAX, +$('#sw').value, '#2b2119');
  }

  function onPaintTap(x, y) {
    if (!S.paint) return;
    if (S.tool === 'pick') {
      const k = PAINT.pick(S.paint, x, y);
      if (k >= 0) { S.sel = k; buildPalette(); $('#outlineNum').textContent = String(k + 1); }
      $('#paintStat').textContent = k >= 0 ? 'picked ' + S.names[k] : 'background';
      return;
    }
    const target = S.tool === 'erase' ? PAINT.BG : S.sel;
    const n = PAINT.fill(S.paint, x, y, target);
    renderPaint();
    $('#paintStat').textContent = n ? n.toLocaleString() + ' px filled' : 'nothing to fill there';
  }

  segmented('#toolbar', d => {
    S.tool = d.tool;
    if (paintVP) paintVP.panMode = (d.tool === 'pan');
  });

  $('#bgColor').addEventListener('input', e => {
    S.bg = e.target.value; renderPaint(); if (S.slice) drawDots();
  });
  $('#btnUndo').addEventListener('click', () => { if (PAINT.undo(S.paint)) renderPaint(); });
  $('#btnClearFills').addEventListener('click', () => { PAINT.clear(S.paint); renderPaint(); });
  $('#btnAutoColor').addEventListener('click', () =>
    run('finding regions…', () => {
      const n = PAINT.autoColour(S.paint, S.palette.length);
      renderPaint();
      $('#paintStat').textContent = n + ' bands coloured';
    }));

  $('#toStep4').addEventListener('click', () => { if (S.paint) { go(4); slice(); } });

  const dotCanvas = $('#dotCanvas');
  dotCanvas.width = dotCanvas.height = OUT;
  let dotVP = null;

  const pxPerMM = () => (2 * RMAX) / (+$('#diaMM').value || 900);

  function slice() {
    return run('slicing the spiral…', () => {
      const k = pxPerMM();
      S.slice = SLICE.run(S.paint, {
        mode: S.pathMode,
        ds: +$('#ds').value * k,
        pitch: +$('#pp').value * k,
        skipBg: $('#optSkipBg').checked,
        outlineColour: $('#optOutline').checked ? S.sel : -1,
        rMax: RMAX
      });
      drawDots();
      updateLegend();
      const st = S.slice.stats;
      $('#dotStat').textContent =
        st.n.toLocaleString() + ' drops · ' + st.changes.toLocaleString() +
        ' turret changes · ' + (st.travelPx / pxPerMM() / 1000).toFixed(1) + ' m of driving';
      if (!dotVP) dotVP = new U.Viewport($('#dotWrap'), dotCanvas, null);
      dotVP.panMode = false;
    });
  }

  function drawDots() {
    if (!S.slice) return;
    SLICE.render(S.slice, dotCanvas, S.palette, S.bg, S.dotView, +$('#dotSz').value / 100);
  }

  function updateLegend() {
    const el = $('#legend');
    el.innerHTML = '';
    S.palette.forEach((hex, i) => {
      const n = S.slice.stats.perColour[i] || 0;
      const d = document.createElement('div');
      d.innerHTML = '<i style="background:' + hex + '"></i><span>T' + (i + 1) + ' ' +
                    S.names[i] + '</span><b>' + n.toLocaleString() + '</b>';
      el.appendChild(d);
    });
  }

  segmented('#dotView', d => { S.dotView = d.d; drawDots(); });
  segmented('#pathMode', d => { S.pathMode = d.p; slice(); });
  bindRange('ds', 'dsOut', v => v + ' mm', null, slice);
  bindRange('pp', 'ppOut', v => v + ' mm', null, slice);
  bindRange('dotSz', 'dotSzOut', v => v + '%', () => drawDots());
  $('#diaMM').addEventListener('change', () => { if (S.slice) slice(); });
  $('#optSkipBg').addEventListener('change', slice);
  $('#optOutline').addEventListener('change', slice);
  $('#btnSlice').addEventListener('click', slice);

  $('#toStep5').addEventListener('click', () => { if (S.slice) { go(5); makeGcode(); } });

  const gOpts = () => ({
    diaMM: +$('#diaMM').value || 900,
    feed: +$('#feed').value || 900,
    dwell: +$('#dwell').value || 0.15,
    turretDwell: +$('#tdwell').value || 0,
    comments: $('#optComments').checked,
    useG1: $('#optArcAsG1').checked,
    palette: S.palette,
    names: S.names
  });

  function makeGcode() {
    return run('generating g-code…', () => {
      const opt = gOpts();
      S.gcode = GC.generate(S.slice, opt);
      const txt = S.gcode.text;
      const lines = txt.split('\n');

      $('#gcode').textContent = lines.length > 6000
        ? lines.slice(0, 6000).join('\n') +
          '\n\n; … ' + (lines.length - 6000).toLocaleString() +
          ' more lines. Download the .nc for the complete program.\n'
        : txt;

      const st = S.slice.stats;
      $('#summary').innerHTML = [
        ['Drops', st.n.toLocaleString()],
        ['Turret changes', st.changes.toLocaleString()],
        ['Travel', (S.gcode.travelMM / 1000).toFixed(2) + ' m'],
        ['Est. run time', GC.hms(S.gcode.estSec)],
        ['Scale', S.gcode.mmPerPx.toFixed(3) + ' mm/px'],
        ['Program lines', lines.length.toLocaleString()]
      ].map(r => '<div><span>' + r[0] + '</span><b>' + r[1] + '</b></div>').join('');
    });
  }

  $('#btnRegen').addEventListener('click', makeGcode);
  ['feed', 'dwell', 'tdwell'].forEach(id => $('#' + id).addEventListener('change', makeGcode));
  ['optComments', 'optArcAsG1'].forEach(id => $('#' + id).addEventListener('change', makeGcode));

  $('#btnCopy').addEventListener('click', async () => {
    if (!S.gcode) return;
    try {
      await navigator.clipboard.writeText(S.gcode.text);
      $('#btnCopy').textContent = 'Copied';
      setTimeout(() => { $('#btnCopy').textContent = 'Copy'; }, 1200);
    } catch (e) {
      alert('Clipboard blocked — use the .nc download instead.');
    }
  });
  $('#btnDlNc').addEventListener('click', () => {
    if (S.gcode) U.download('pookalam.nc', S.gcode.text);
  });
  $('#btnDlCsv').addEventListener('click', () => {
    if (S.slice) U.download('pookalam.csv', GC.csv(S.slice, gOpts()), 'text/csv');
  });
  $('#btnDlJson').addEventListener('click', () => {
    if (!S.slice) return;
    const design = S.vec ? {
      folds: S.vec.folds,
      radii: S.vec.grid.radii.map(r => +r.toFixed(4)),
      angular_divisions: S.vec.grid.div,
      angle_offset_deg: +U.deg(S.vec.grid.offset).toFixed(3),
      primitives: S.vec.prims
    } : null;
    U.download('pookalam.json', GC.json(S.slice, gOpts(), design), 'application/json');
  });

  go(1);
})();
