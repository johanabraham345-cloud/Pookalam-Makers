# Pookalam Studio

Sketch on paper → photograph it → clean CAD-style vector drawing → fill the
regions with four flower colours → dotted flower pattern → G-code for the robot.

Open `web/index.html`. No build step, no install, no API key, no network calls.
Works on a phone browser; step 1 uses the camera directly.

To run it from a phone on the same Wi-Fi, serve the folder:

```bash
python -m http.server 8777
```

then open `http://<your-computer-ip>:8777/` on the phone.

---

## Why there is no AI in here

The original plan had Gemini turn the sketch into a design. It could not do it,
and that is not a prompting problem — it is the wrong tool for the job. Reading
a photo and emitting exact coordinates asks a language model to be a measuring
instrument. It will give you a *plausible* pookalam, slightly different every
time, with ring radii it invented.

Everything in this app is deterministic image processing and least-squares
geometry. The same photo always produces the same drawing, and the drawing is
measured off your actual pen strokes rather than imagined.

This keeps the split you wanted in the robot itself — fuzzy interpretation in
one box, exact numbers in another — it just moves the boundary. There is nothing
in this pipeline that needs the fuzzy box.

---

## The five steps

### 1. Capture

Take a photo or pick a file (drag and drop works too). **Use a demo sketch**
generates a wobbly hand-drawn pookalam so you can try the whole pipeline without
paper.

Drag on the image to move the crop circle and use the slider to size it.
**The edge of that circle becomes the outer rim of the pookalam** — everything
outside it is discarded. *Auto-detect* takes a guess from the ink.

Shoot straight down, fill the frame, and avoid a hard shadow across the page.

### 2. Vectorise — sketch to CAD

This is the step that replaces Gemini. In order:

| Stage | What it does |
|---|---|
| Local adaptive threshold | Compares each pixel to the mean of its own neighbourhood, so a shadow across the page doesn't swallow half the drawing |
| Close gaps + despeckle | Bridges breaks in a biro line, drops paper grain |
| Zhang–Suen thinning | Erodes each stroke to a 1-pixel centreline |
| Skeleton cleanup | Removes redundant pixels from diagonal staircases (without this, nearly every pixel looks like a junction) |
| Spur pruning | Deletes the whiskers thinning leaves at junctions |
| Graph trace | Walks the skeleton into ordered polylines |
| **Stitch** | Rejoins strokes that continue smoothly through a junction — this is what lets a ring crossed by twelve spokes be recognised as *one circle* instead of twelve stubs |
| Fit | Each stroke gets a total-least-squares line fit and a Kåsa circle fit; the better one wins, otherwise it stays a polyline |
| Snap | Ring radii are clustered and every radius snaps to a cluster; every angle snaps to an N-fold grid |
| Symmetrise | Folds all shapes into one sector, merges the near-duplicates that pile up there, then stamps the result back around the circle |
| Merge | Welds co-circular arcs and collinear segments back into whole circles and full-length lines |

Fold count is detected by correlating the ink's angular profile with a rotated
copy of itself. Comparing thin strokes pixel-to-pixel fails — one pixel of
misalignment scores zero — so the ink is collapsed to a 1-D signal first.

Controls worth knowing:

- **Sensitivity** — raise it if faint pencil is being missed, lower it if the
  paper texture is coming through as ink.
- **Symmetry folds** — leave on *auto*, or force it if the guess is wrong.
- **Enforce rotational symmetry** — on by default. Faint or broken strokes get
  filled in by their twelve siblings. Turn it off to keep the sketch as drawn.
- **Snap to polar grid** — turn it off to see the raw fits.
- **Line tolerance** — how much wobble is forgiven before a stroke stops being
  a straight line.

The *Ink mask*, *Skeleton* and *Overlay* views show what each stage saw, which is
the fastest way to work out why something didn't come through.

**Export SVG** gives you the clean drawing as real circles, arcs and lines.

### 3. Colour

A paint bucket, bounded by the vector lines. Tap any enclosed region to fill it.

- Four palette slots = the four containers on the turret. Tap a swatch to select
  it; tap its colour chip to change the colour; the name is editable and follows
  through to the G-code comments.
- **Pick** samples a colour, **Erase** clears back to background, **Pan** drags
  the canvas (pinch to zoom on a phone; scroll wheel on a desktop).
- **Auto-colour rings** fills concentric bands in palette order as a starting
  point.
- **Unfilled areas** is the floor colour — the slicer drops no flowers there
  unless you turn off *Skip background*.

The lines live in their own layer, so re-colouring never erodes the drawing.

### 4. Dots

Set the real **diameter in mm** first — everything downstream is scaled from it.

- **Spiral** walks an Archimedean spiral out from the centre, stepped by equal
  arc length. This is the path the robot actually drives.
- **Rings** lays concentric circles instead, alternating direction.
- **Dot spacing** is the distance between drops along the path; **track pitch**
  is the gap between successive turns of the spiral.

Each dot samples the colour underneath it and takes the matching container.
*Lay outlines with the selected colour* puts flowers along the drawn lines
themselves.

### 5. G-code

```gcode
G21           ; millimetres
G90           ; absolute coordinates
G92 X0 Y0     ; call the starting point the centre
T1 M6         ; turret -> Marigold red
G4 P0.60      ; let the turret settle
G1 X12.000 Y0.000
M3            ; gate open, one flower drops
G4 P0.15
M5            ; gate closed
```

Origin is the centre of the pookalam, X right, Y up. `Tn M6` indexes the turret
to container *n*; `M3`/`M5` open and close the gate under it.

Downloads: `.nc` (the program), `.csv` (one row per drop), `.json` (the whole
design — grid, primitives, palette and every drop, for your firmware to consume
directly instead of parsing G-code).

Watch the **turret changes** number. A spiral through a busy design changes
colour often, and each change costs the turret dwell. Wider track pitch, or
colouring in broader bands, brings it down.

---

## Files

```
web/
  index.html      five-step UI
  style.css
  js/
    util.js       maths, colour, download, pan/pinch/tap viewport
    imaging.js    threshold, morphology, thinning, skeleton cleanup, fold detection
    trace.js      spur pruning, skeleton -> polylines, stitching, RDP
    fitting.js    line/circle fits, polar grid, snapping, symmetry, merging, SVG
    vectorize.js  runs the whole raster -> primitive pipeline
    paint.js      flood fill, regions, auto-colour
    slicer.js     spiral / ring dot generation
    gcode.js      coordinates, G-code, CSV, JSON
    app.js        wiring
```

Every file is a plain `<script>` with one global. No bundler, no dependencies.

---

## Known limits

- The vectoriser assumes a **round, roughly centred** design. A square rangoli
  will vectorise, but the polar snapping won't help it.
- Very light pencil on textured paper needs the sensitivity slider.
- Shapes that fit neither a line nor an arc are kept as polylines. They still
  fill, slice and export — they just aren't reduced to exact geometry.
- Flood fill needs regions that are actually closed. If colour leaks across the
  whole drawing, a boundary has a gap: raise *Close gaps* or *Stroke width* in
  step 2.
