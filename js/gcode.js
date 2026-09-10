(function (g) {
  'use strict';

  const GC = {};

  const f3 = n => (Math.abs(n) < 5e-4 ? 0 : n).toFixed(3);

  GC.mapper = (sl, diaMM) => {
    const mmPerPx = diaMM / (2 * sl.rMax);
    return {
      mmPerPx: mmPerPx,
      x: px => (px - sl.cx) * mmPerPx,
      y: py => -(py - sl.cy) * mmPerPx
    };
  };

  GC.generate = (sl, opt) => {
    const M = GC.mapper(sl, opt.diaMM);
    const L = [];
    const c = s => { if (opt.comments) L.push(s); };
    const move = opt.useG1 ? 'G1' : 'G0';

    const travelMM = sl.stats.travelPx * M.mmPerPx;
    const estSec = travelMM / Math.max(1, opt.feed) * 60
                 + sl.stats.n * opt.dwell
                 + sl.stats.changes * opt.turretDwell;

    c('; ---------------------------------------------------------------');
    c('; Pookalam Studio  -  generated ' + new Date().toISOString());
    c('; ---------------------------------------------------------------');
    c('; diameter      : ' + opt.diaMM.toFixed(1) + ' mm');
    c('; path          : ' + sl.mode + '   dot spacing ' + (sl.ds * M.mmPerPx).toFixed(2) +
      ' mm   track pitch ' + (sl.pitch * M.mmPerPx).toFixed(2) + ' mm');
    c('; scale         : 1 px = ' + M.mmPerPx.toFixed(4) + ' mm');
    c('; drops         : ' + sl.stats.n);
    c('; turret changes: ' + sl.stats.changes);
    c('; travel        : ' + (travelMM / 1000).toFixed(2) + ' m');
    c('; est. run time : ' + GC.hms(estSec));
    c(';');
    c('; turret containers');
    for (let i = 0; i < opt.palette.length; i++) {
      c('; T' + (i + 1) + ' = ' + (opt.names[i] || ('colour ' + (i + 1))) +
        '  ' + opt.palette[i] + '   drops: ' + (sl.stats.perColour[i] || 0));
    }
    c('; M3 = gate open (drop one flower)   M5 = gate closed');
    c('; origin = centre of the pookalam, +X right, +Y up');
    c(';');

    const line = (code, note) =>
      L.push(opt.comments && note ? code.padEnd(14) + '; ' + note : code);

    line('G21', 'millimetres');
    line('G90', 'absolute coordinates');
    line('G94', 'feed in units/min');
    line('M5', 'make sure every gate is shut');
    line('G92 X0 Y0', 'call the starting point the centre');
    line('F' + Math.round(opt.feed), 'travel feed rate');

    let cur = -1;
    for (const d of sl.dots) {
      if (d.c !== cur) {
        cur = d.c;
        line('T' + (cur + 1) + ' M6', 'turret -> ' + (opt.names[cur] || ('container ' + (cur + 1))));
        if (opt.turretDwell > 0) line('G4 P' + opt.turretDwell.toFixed(2), 'let the turret settle');
      }
      L.push(move + ' X' + f3(M.x(d.x)) + ' Y' + f3(M.y(d.y)));
      L.push('M3');
      L.push('G4 P' + opt.dwell.toFixed(2));
      L.push('M5');
    }

    line(move + ' X0.000 Y0.000', 'back to the centre');
    line('M2', 'end of program');

    return { text: L.join('\n') + '\n', estSec: estSec, travelMM: travelMM, mmPerPx: M.mmPerPx };
  };

  GC.hms = sec => {
    sec = Math.round(sec);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return (h ? h + 'h ' : '') + (h || m ? m + 'm ' : '') + s + 's';
  };

  GC.csv = (sl, opt) => {
    const M = GC.mapper(sl, opt.diaMM);
    const rows = ['i,x_mm,y_mm,container,colour,hex'];
    sl.dots.forEach((d, i) => {
      rows.push([
        i,
        M.x(d.x).toFixed(3),
        M.y(d.y).toFixed(3),
        d.c + 1,
        JSON.stringify(opt.names[d.c] || ('colour ' + (d.c + 1))),
        opt.palette[d.c] || ''
      ].join(','));
    });
    return rows.join('\n') + '\n';
  };

  GC.json = (sl, opt, design) => {
    const M = GC.mapper(sl, opt.diaMM);
    return JSON.stringify({
      generator: 'Pookalam Studio',
      created: new Date().toISOString(),
      machine: {
        diameter_mm: opt.diaMM,
        feed_mm_min: opt.feed,
        gate_dwell_s: opt.dwell,
        turret_dwell_s: opt.turretDwell,
        mm_per_px: M.mmPerPx
      },
      palette: opt.palette.map((hex, i) => ({ container: i + 1, name: opt.names[i], hex: hex })),
      path: { mode: sl.mode, dot_spacing_mm: sl.ds * M.mmPerPx, track_pitch_mm: sl.pitch * M.mmPerPx },
      design: design || null,
      stats: {
        drops: sl.stats.n,
        turret_changes: sl.stats.changes,
        travel_mm: sl.stats.travelPx * M.mmPerPx,
        per_container: opt.palette.map((_, i) => sl.stats.perColour[i] || 0)
      },
      drops: sl.dots.map(d => [
        +M.x(d.x).toFixed(3), +M.y(d.y).toFixed(3), d.c + 1
      ])
    }, null, 1);
  };

  g.GC = GC;
})(window);
