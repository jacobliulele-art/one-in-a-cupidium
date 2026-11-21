// Builds the Ultimate Chicken Horse maps into data/maps.js.  Run: node tools/trmaps.js [--print [map]]   then: node tools/trsolve.js
// The first four follow the owner's own maps (the Party-Chaos-style recording in the project's .claude folder):
//   Frozen Peaks  - snow start, a zig-zag ice staircase, a floating snow island, a huge ice mountain with a cave under it
//                   (brown spire, green pipe, purple pillar), and a snow chimney up to the summit flag by a grey boulder
//   Crystal Cavern- a dark cave open to the night sky: giant leaning red/green/blue crystals, a grey overhang, a tall shaft
//                   on the right, then back left over the top and down to the flag on a red crystal
//   Tropical      - small floating sand islands; climb from palm top to palm top (the fronds step up) to the flag in the tallest palm
//   Sunset Woods  - start bottom right, climb red acacia canopies on grey trunks (and dark twisted branches) to the flag top left
// Three more follow the main game's themes: Moon Base (space, low gravity), Cloud Kingdom (dream) and Coral Reef (ocean, a dive down).
// Jumping: about 4 tiles up at most (more in low gravity); climbs never need more than 3 up with a short gap.
const fs = require("fs"), path = require("path");
function grid(W, H, ch) { return [...Array(H)].map(() => Array(W).fill(ch)); }
// solid tiles (keep in step with TR_TILE in index.html)
const SOLID = "#isdvgarbewlhknuopmyz";
function kit(R) {
  const H = R.length, W = R[0].length;
  const set = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (y >= 0 && y < H && x >= 0 && x < W) R[y][x] = c; };
  const get = (x, y) => (y >= 0 && y < H && x >= 0 && x < W ? R[y][x] : "#");
  const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };
  const solid = (x, y) => SOLID.includes(get(x, y));
  return {
    W, H, set, get, rect, solid,
    col: (x0, x1, top, topC, bodyC, bottom) => { rect(x0, top, x1, bottom == null ? H - 1 : bottom, bodyC); rect(x0, top, x1, top, topC); },
    island: (x0, x1, top, depth, topC, bodyC) => { for (let k = 0; k < depth; k++) { const a = x0 + Math.floor(k * 0.7), b = x1 - Math.floor(k * 0.7); if (a > b) break; rect(a, top + k, b, top + k, k === 0 ? topC : bodyC); } },
    ledge: (x0, x1, top, topC, bodyC) => { rect(x0, top, x1, top, topC); rect(x0, top + 1, x1, top + 1, bodyC || topC); },
    spike: (x, top) => { if (solid(x, top) && get(x, top - 1) === ".") set(x, top - 1, "x"); },
    deco: (x, top, c) => { if (solid(x, top) && get(x, top - 1) === ".") set(x, top - 1, c); },
    // a palm: trunk from the island up, then a canopy whose fronds step down on both sides (you climb tree to tree on them)
    palm: (cx, top, ground, leaf = "l", wood = "w") => { rect(cx, top + 1, cx, ground - 1, wood); rect(cx - 1, top, cx + 1, top, leaf); rect(cx - 3, top + 1, cx + 3, top + 1, leaf);
      rect(cx - 5, top + 2, cx - 4, top + 2, leaf); rect(cx + 4, top + 2, cx + 5, top + 2, leaf); set(cx - 6, top + 3, leaf); set(cx + 6, top + 3, leaf); },
    // a flat-topped acacia: a wide canopy with dark drips underneath, on a grey trunk
    acacia: (x0, x1, top, ground, tx, leaf = "l", trunk = "k", drip = "n") => { rect(x0 + 1, top, x1 - 1, top, leaf); rect(x0, top + 1, x1, top + 1, leaf);
      for (let x = x0 + 1; x < x1; x += 3) set(x, top + 2, drip); if (ground != null) rect(tx, top + 2, tx + 1, ground - 1, trunk); },
    cloud: (x0, x1, y, c = "o", c2 = "p") => { rect(x0 + 1, y, x1 - 1, y, c); rect(x0, y + 1, x1, y + 1, c); rect(x0 + 1, y + 2, x1 - 1, y + 2, c2); },
    // a leaning crystal: a 3-wide band going up, `lean` tiles sideways per row, with a white streak down the middle
    crystal: (x, y, len, lean, c, hi = "h") => { for (let i = 0; i < len; i++) { const cx = Math.round(x + i * lean), w = i > len - 3 ? 0 : 1; rect(cx - w, y - i, cx + w, y - i, c); if (i % 3 !== 2 && w) set(cx, y - i, hi); } },
    // carve a winding tunnel: circles of radius r along a path of points (organic caves, like Crystal Cavern's)
    worm: (pts, r, c = ".") => { for (let i = 0; i + 1 < pts.length; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
      for (let k = 0; k <= n; k++) { const cx = x0 + (x1 - x0) * k / n, cy = y0 + (y1 - y0) * k / n; for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) set(x, y, c); } } },
    // a filled blob (for rock masses, coral heads, clouds)
    blob: (cx, cy, rx, ry, c) => { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) set(x, y, c); },
    // snow masses get an icy checker underneath
    checker: (x0, x1, y0, y1, a = "s", b = "i") => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (SOLID.includes(get(x, y))) set(x, y, (x + y) % 2 ? a : b); },
  };
}
function finish(R, sx, stop, gx, gtop, keepSky = 7) {
  R[stop - 1][sx] = "S"; R[gtop - 1][gx] = "G"; const rows = R.map(r => r.join(""));
  let y0 = 0; while (y0 < rows.length && /^\.+$/.test(rows[y0])) y0++; const crop = Math.max(0, y0 - keepSky); return { rows: rows.slice(crop), crop };
}

// ---------------- the owner's maps ----------------
function peaks() {
  const R = grid(86, 56, "."), K = kit(R), water = 53;
  K.col(0, 9, 46, "s", "s"); K.col(10, 12, 45, "s", "s"); K.col(13, 14, 44, "s", "s"); K.checker(0, 14, 50, 55);   // snowy start with little steps
  K.col(17, 27, 47, "d", "d"); K.rect(20, 44, 25, 46, "#"); K.rect(21, 43, 24, 43, "#"); K.checker(17, 27, 49, 55, "d", "s");   // teal rock + grey boulder
  for (let k = 0; k < 8; k++) K.rect(15 + k, 41 - 2 * k, 16 + k, 42 - 2 * k, "i");                                           // zig-zag ice staircase
  K.col(29, 30, 44, "s", "s"); K.checker(29, 30, 48, 55); K.island(34, 37, 45, 3, "s", "i");                                  // white snow column, an ice floe (the low road)
  K.island(26, 36, 30, 6, "s", "s"); K.checker(26, 36, 32, 36); K.rect(29, 27, 33, 29, "#"); K.rect(30, 26, 32, 26, "#");    // floating snow island + boulder
  // the huge ice mountain (its sheer ice face can't be climbed, so the only way is the cave and the chimney), snow cap, cave underneath
  // it reaches the top of the map: no getting over it (its face can be climbed by wall-jumping), so the only way on is the cave and chimney
  // the top curves inward (steep low down, gentler near the top), so climbers can get up on its shoulder and try something
  // clever there (a portal to the far side?), but the thin spire still reaches the sky, so there's no walking over;
  // the right edge slants in too, so the top is a spire rather than a cliff over the chimney
  K.rect(45, 18, 67, 33, "i"); for (let y = 0; y < 18; y++) K.rect(45 + Math.round(13 * ((17 - y) / 17) ** 2), y, 67 - Math.round(8 * ((17 - y) / 17) ** 2), y, "i"); K.checker(46, 66, 0, 23);
  for (const [x, l] of [[48, 3], [52, 2], [56, 4]]) K.rect(x, 34, x + 1, 33 + l, "i");                                       // icicles into the cave
  K.rect(60, 34, 60, 38, "v");                                                                                                // purple pillar
  K.col(43, 71, 46, "d", "d"); K.checker(43, 71, 48, 55, "d", "s"); K.rect(49, 43, 54, 45, "#"); K.rect(50, 42, 53, 42, "#"); // cave floor + boulder
  K.rect(62, 41, 64, 45, "w"); K.rect(63, 38, 64, 40, "w"); K.rect(63, 36, 63, 37, "w");                                     // brown spire
  K.rect(65, 34, 67, 34, "g"); K.rect(66, 35, 66, 39, "g");                                                                   // green pipe
  // the chimney: up between the mountain and the snow wall, little snow ledges to rest on
  K.col(72, 85, 20, "s", "s"); K.checker(72, 85, 24, 44); K.rect(68, 20, 71, 45, "."); K.rect(68, 46, 71, 46, "d");
  K.set(71, 41, "s"); K.set(68, 36, "s"); K.set(71, 31, "s"); K.set(68, 26, "s");
  K.rect(78, 17, 82, 19, "#"); K.rect(79, 16, 81, 16, "#");                                                                  // summit boulder
  K.spike(58, 46);
  const f = finish(R, 3, 46, 75, 20);
  return { n: "Frozen Peaks", theme: "peaks", liquid: { y: water - f.crop, c: "#3f7fd8", c2: "#cfe8ff", kill: 1 }, rows: f.rows };
}
function crystal() {
  // two chambers in a rock blob (the owner's screenshot): start bottom left, cross the lower chamber past a red spike, big green crystals
  // hanging from the shelf and a blue cluster; climb the open right side to the upper chamber, cross the twin red crystals under the
  // hanging blue ones, and reach the flag top left beside a leaning red crystal
  const R = grid(80, 60, "#"), K = kit(R);
  const air = (x0, y0, x1, y1) => K.rect(x0, y0, x1, y1, ".");
  const blob = (cx, cy, rx, ry) => { for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) K.set(x, y, "."); };
  const hang = (x, y, len, lean, c) => { for (let i = 0; i < len; i++) { const cx = Math.round(x + i * lean), w = i > len - 3 ? 0 : 1; K.rect(cx - w, y + i, cx + w, y + i, c); if (i % 3 !== 2 && w) K.set(cx, y + i, "h"); } };
  blob(36, 46, 32, 11); air(6, 40, 66, 55); blob(12, 48, 9, 8);            // lower chamber (floor row 56)
  air(62, 22, 74, 55); blob(68, 36, 8, 16);                                 // the open right side
  blob(36, 16, 23, 13); air(16, 8, 56, 28); air(54, 16, 66, 28);            // upper chamber and the way in from the right
  K.rect(0, 56, 79, 59, "#");                                              // solid floor (the cave outline must not dip through it)
  K.rect(14, 29, 61, 34, "#"); for (let y = 35; y <= 41; y++) K.rect(46 + (y - 35), y, 61, y, "#");   // the shelf, with its rock lobe hanging down
  // climb the right side: ledges on alternate sides
  [51, 45, 39, 33].forEach(y => K.rect(70, y, 74, y, "#")); [48, 42, 36, 30].forEach(y => K.rect(63, y, 66, y, "#"));
  // lower chamber crystals
  K.crystal(14, 55, 11, 0.5, "r");                                          // red spike (climb its left side)
  hang(25, 35, 13, 0.25, "e"); hang(26, 35, 12, 0.35, "e"); hang(36, 35, 6, 0.5, "e");   // green hanging from the shelf
  K.crystal(41, 55, 13, 0.4, "b"); K.crystal(48, 55, 9, 0.7, "b");          // blue cluster
  K.crystal(73, 55, 4, 0.3, "e");                                           // little green by the opening
  // upper chamber: blue hanging from the ceiling, a red one top right, twin reds on the shelf, the flag's red crystal
  hang(30, 4, 9, 0.1, "b"); hang(35, 3, 11, -0.1, "b"); hang(40, 4, 8, 0.15, "b"); hang(51, 5, 6, -0.2, "r");
  K.crystal(45, 28, 10, -0.35, "r"); K.crystal(39, 28, 8, -0.35, "r");
  K.crystal(25, 28, 9, -0.5, "r"); K.rect(14, 20, 20, 20, "#"); K.rect(14, 21, 16, 28, "#");
  K.spike(30, 56); K.spike(58, 56); K.spike(32, 29);
  for (const [x, t] of [[10, 56], [22, 56], [60, 56], [52, 29], [20, 29]]) K.deco(x, t, "c");
  const f = finish(R, 8, 56, 17, 20, 0);
  let y0 = 0, y1 = f.rows.length - 1; while (y0 < y1 && /^#+$/.test(f.rows[y0 + 1])) y0++; while (y1 > y0 && /^[#rbe]+$/.test(f.rows[y1 - 1])) y1--;
  return { n: "Crystal Cavern", theme: "crystal", rows: f.rows.slice(y0, y1 + 1) };
}
function tropical() {
  // Pirate Cove: hop palm tops up from the beach, climb a sea stack, cross a broken rope bridge to the cliffs,
  // drop into the cove and climb the inside of the lighthouse to the flag on its balcony
  const R = grid(102, 50, "."), K = kit(R), water = 47;
  const sandIsl = (x0, x1, top) => { K.rect(x0, top, x1, top + 1, "a"); for (let k = 2; k < 7; k++) K.rect(x0 + Math.floor(k * 0.6), top + k, x1 - Math.floor(k * 0.6), top + k, "u"); };
  sandIsl(0, 12, 40); K.deco(3, 40, "P");
  K.palm(17, 36, water + 2); K.palm(29, 32, water + 2); K.palm(41, 28, water + 2);
  // the sea stack: ledges up its side
  K.col(46, 52, 22, "a", "#"); K.rect(44, 25, 45, 25, "a");
  // the broken rope bridge
  for (const [a, b] of [[53, 56], [58, 61], [63, 66]]) K.rect(a, 22, b, 22, "w");
  // the cliffs and the cove
  K.col(67, 80, 22, "a", "#"); K.spike(74, 22); K.deco(70, 22, "P");
  K.col(82, 88, 32, "a", "#");
  // the lighthouse: striped walls, a door at the bottom, ledges inside, a window out onto the balcony
  for (let y = 14; y <= water + 2; y++) { const c = Math.floor((y - 14) / 3) % 2 ? "o" : "r"; K.set(90, y, c); K.set(95, y, c); }
  K.rect(90, 13, 95, 13, "r"); K.rect(91, 32, 94, water + 2, "#"); K.rect(90, 29, 90, 31, ".");
  [[91, 29], [93, 26], [91, 23], [93, 20]].forEach(([x, y]) => K.rect(x, y, x + 1, y, "w"));
  K.rect(95, 15, 95, 16, "."); K.rect(96, 17, 101, 17, "w"); K.rect(101, 14, 101, 16, "w");
  const f = finish(R, 4, 40, 98, 17);
  return { n: "Tropical Islands", theme: "tropical", liquid: { y: water - f.crop, c: "#2a5fa8", c2: "#ffb46b", kill: 1 }, rows: f.rows };
}
function woods() {
  // Savanna Canyon: off the mesa onto acacia tops, down to the canyon floor, then through a winding cave inside a great red rock
  // (bowls and ramps, dark roots to step on) and out of its top, across two acacias to the flag on the rock arch
  const R = grid(100, 52, "."), K = kit(R);
  K.col(0, 14, 30, "#", "#");                                              // start mesa
  K.col(15, 43, 44, "#", "#");                                             // canyon floor
  K.acacia(16, 26, 33, 44, 21); K.acacia(29, 39, 37, 44, 34);
  K.spike(25, 44); K.spike(38, 44);
  // the great rock: a rounded massif with a cave winding up through it
  K.blob(58, 30, 15, 17, "#"); K.rect(44, 30, 72, 51, "#");
  K.worm([[43, 41], [49, 41], [55, 39], [60, 35], [62, 30], [58, 26], [53, 23], [55, 19], [61, 16], [66, 13], [70, 11]], 2.6);
  K.rect(44, 44, 46, 51, "#");                                             // the cave mouth's sill
  // roots and ledges inside the cave to step up on
  K.rect(57, 38, 59, 38, "n"); K.rect(60, 31, 61, 31, "n"); K.rect(54, 26, 56, 26, "n"); K.rect(57, 19, 58, 19, "n");
  // little scrub on top of the rock, the rock's grassy crown
  K.acacia(48, 56, 11, null, 0); K.rect(51, 13, 52, 14, "k");
  K.acacia(75, 82, 17, null, 0); K.rect(78, 19, 79, 51, "k");
  // the rock arch with the flag
  K.rect(85, 22, 99, 25, "#"); K.rect(85, 26, 87, 51, "#"); K.rect(96, 26, 99, 51, "#"); K.spike(90, 22);
  for (const x of [5, 10]) K.deco(x, 30, "P");
  const f = finish(R, 5, 30, 93, 22);
  return { n: "Sunset Woods", theme: "woods", rows: f.rows };
}
// ---------------- new themed maps ----------------
function space() {
  const R = grid(92, 50, "."), K = kit(R);
  K.col(0, 21, 42, "#", "#"); K.rect(5, 42, 8, 42, "."); K.rect(13, 42, 14, 42, "."); K.rect(0, 41, 11, 41, "m");   // moon + launch pad
  K.rect(19, 30, 20, 41, "m"); for (const y of [38, 35, 32, 29]) K.rect(16, y, 18, y, "m");                       // gantry: climb the platforms, hop over the tower
  K.island(23, 28, 30, 3, "#", "#"); K.island(31, 35, 26, 3, "#", "#"); K.island(24, 28, 22, 3, "#", "#"); K.island(31, 37, 18, 3, "#", "#");
  K.ledge(41, 66, 15, "m", "m"); K.rect(51, 11, 55, 14, "m"); K.ledge(43, 49, 9, "b", "b"); K.ledge(57, 63, 9, "b", "b"); K.rect(52, 10, 54, 10, "m");
  K.island(69, 73, 21, 3, "#", "#"); K.island(75, 79, 26, 3, "#", "#");
  K.col(81, 91, 29, "#", "#"); K.rect(84, 26, 88, 28, "m"); K.rect(85, 25, 87, 25, "m");
  K.spike(9, 42); K.spike(61, 15); K.spike(35, 15);
  const f = finish(R, 3, 41, 90, 29);
  return { n: "Moon Base", theme: "space", grav: 0.72, rows: f.rows };
}
function dream() {
  // Cloud Kingdom: meadow → cloud steps → a short rainbow bridge → ride under a hot-air balloon → drop to the low cloud bank
  // → up a diagonal cloud staircase → over the castle's towers and battlements to the flag
  const R = grid(112, 52, "."), K = kit(R);
  K.island(0, 15, 40, 6, "g", "u"); for (const x of [3, 8, 12]) K.deco(x, 40, "F");
  K.cloud(17, 22, 37); K.cloud(24, 29, 34); K.cloud(30, 36, 31);
  // the rainbow: a short arch over a gap
  const cols = ["r", "y", "g", "b", "v"];
  for (let x = 37; x <= 55; x++) { const y = Math.round(25 + Math.pow((x - 46) / 9, 2) * 6); cols.forEach((c, i) => K.set(x, y + i, c)); }
  // the hot-air balloon: a striped envelope with a basket hanging under it (stand in the basket, duck under the balloon)
  for (let y = 18; y <= 28; y++) for (let x = 55; x <= 65; x++) if (((x - 60) / 5.5) ** 2 + ((y - 23) / 5.5) ** 2 <= 1) K.set(x, y, (x % 2) ? "p" : "o");
  K.rect(58, 32, 62, 33, "w"); K.set(58, 31, "w"); K.set(62, 31, "w");
  // the low cloud bank, puffy on top, with a thorn
  K.blob(72, 41, 9, 3, "o"); K.blob(68, 39, 4, 2, "o"); K.blob(77, 39, 4, 2, "o"); K.rect(63, 42, 81, 43, "p"); K.spike(72, 38);
  // the cloud staircase, rising to the right
  K.cloud(82, 85, 36); K.cloud(86, 89, 33); K.cloud(90, 93, 30); K.cloud(93, 96, 27);
  // the castle: a left tower, the keep with battlements, a tall right tower with the flag
  K.island(96, 111, 33, 5, "p", "o");
  K.rect(97, 25, 99, 32, "p"); for (const x of [97, 99]) K.set(x, 24, "p");
  K.rect(100, 27, 106, 32, "o"); K.rect(100, 27, 106, 27, "p"); for (let x = 100; x <= 106; x += 2) K.set(x, 26, "p"); K.rect(102, 30, 104, 32, ".");
  K.rect(107, 23, 110, 32, "p"); K.rect(107, 23, 110, 23, "o");
  const f = finish(R, 5, 40, 109, 23);
  return { n: "Cloud Kingdom", theme: "dream", rows: f.rows };
}
function ocean() {
  // Coral Reef: off the boat onto the reef shelf, under (or over) a coral arch, through the inside of a sunken ship
  // (its broken mast is a high road), across a trench on tube-coral pillars, then down a winding reef cave to the treasure
  const R = grid(98, 66, "."), K = kit(R);
  for (let k = 0; k < 3; k++) K.rect(2 + k, 8 + k, 14 - k, 8 + k, "w"); K.rect(8, 3, 8, 7, "w"); K.rect(5, 4, 11, 4, "w");   // the boat
  // the reef shelf under the boat: rock with brain-coral bumps
  K.col(0, 13, 20, "#", "#", 65); K.blob(4, 19, 2, 1.5, "z"); K.blob(10, 19, 2.5, 1.5, "z");
  // the sandy floor, the coral arch (walk under it, or over the top)
  K.col(14, 40, 36, "a", "#", 65); K.rect(16, 22, 34, 24, "z"); K.rect(16, 25, 18, 35, "z"); K.rect(32, 25, 34, 35, "z"); K.rect(19, 25, 31, 25, "z");
  K.blob(25, 21, 4, 1.5, "z"); K.blob(14, 26, 1.5, 4, "y");
  K.spike(24, 36); K.spike(37, 36);
  // the sunken ship: a hull you go through (holes at both ends), its mast leaning over as a high road
  K.rect(41, 30, 63, 41, "w"); K.rect(43, 33, 61, 38, "."); K.rect(41, 34, 42, 37, "."); K.rect(62, 34, 63, 37, "."); K.rect(41, 42, 63, 65, "#");
  for (let i = 0; i < 9; i++) K.rect(50 + i, 29 - i, 51 + i, 29 - i, "w"); K.rect(57, 20, 61, 20, "w");
  K.rect(48, 38, 49, 38, "y"); K.rect(55, 38, 56, 38, "y");                                       // crates in the hold
  // the trench, crossed on tube-coral pillars (fall in and you swim back up the far wall)
  K.rect(64, 60, 73, 65, "#"); K.col(66, 67, 38, "y", "y", 59); K.col(70, 71, 36, "y", "y", 59);
  K.spike(65, 60); K.spike(68, 60); K.spike(72, 60);
  for (let y = 58; y >= 40; y -= 4) K.set(73, y, "z");
  // the reef cave: a big rock with a mouth on its left, winding down to the treasure chamber
  K.rect(74, 30, 97, 65, "#"); K.blob(86, 30, 12, 4, "z");
  K.worm([[72, 35], [78, 35], [83, 38], [86, 43], [82, 48], [80, 53], [85, 57], [90, 57]], 2.4);
  K.blob(91, 56, 5, 3.2, "."); K.rect(86, 60, 96, 61, "a");
  K.set(84, 45, "h"); K.set(79, 50, "h"); K.set(87, 40, "h"); K.set(92, 52, "h");             // pearls in the walls
  // kelp and coral sprigs
  for (const [x, t] of [[6, 20], [11, 20], [20, 36], [27, 36], [30, 36], [39, 36], [46, 39], [59, 39], [83, 30]]) K.deco(x, t, "K");
  for (const [x, t] of [[3, 20], [17, 36], [36, 36], [53, 39], [88, 30], [91, 60]]) K.deco(x, t, "c");
  const f = finish(R, 6, 8, 93, 60, 3);
  return { n: "Coral Reef", theme: "ocean", grav: 0.8, rows: f.rows };
}

const out = { peaks: peaks(), crystal: crystal(), tropical: tropical(), woods: woods(), space: space(), dream: dream(), ocean: ocean() };
const file = path.join(__dirname, "..", "data", "maps.js");
const head = "// One in a Cupidium game data (maps). Loaded before the game code; read through OIC_DATA.<name>.\n// Edit freely — this is plain data. Keep each value on its own line.\n// Made by tools/trmaps.js. Check them with node tools/trsolve.js.\nvar OIC_DATA = window.OIC_DATA = window.OIC_DATA || {};\n";
fs.writeFileSync(file, head + "OIC_DATA.TR_MAPDATA = " + JSON.stringify(out, null, 1) + ";\n");
for (const k in out) console.log(k, out[k].rows[0].length + "x" + out[k].rows.length);
const pi = process.argv.indexOf("--print");
if (pi >= 0) for (const k in out) if (!process.argv[pi + 1] || process.argv[pi + 1] === k) console.log("\n" + k + "\n" + out[k].rows.map((r, i) => String(i).padStart(2) + " " + r).join("\n"));
