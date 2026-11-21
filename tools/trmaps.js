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
  K.rect(45, 18, 67, 33, "i"); K.rect(45, 18, 67, 19, "s"); K.checker(46, 66, 20, 23);
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
  // Savanna Canyon: off the mesa onto acacia tops, down to the canyon floor, climb up INSIDE a giant hollow baobab,
  // out of its window onto a branch, hop the acacias and reach the flag on top of a rock arch
  const R = grid(98, 52, "."), K = kit(R);
  K.col(0, 14, 30, "#", "#");                                              // start mesa
  K.col(15, 43, 44, "#", "#"); K.col(53, 83, 46, "#", "#"); K.rect(53, 44, 54, 45, "#");   // canyon floors
  K.acacia(16, 26, 33, 44, 21); K.acacia(29, 39, 37, 44, 34);
  K.spike(25, 44); K.spike(38, 44); K.spike(62, 46); K.spike(70, 46); K.spike(78, 46);
  // the baobab: thick wood walls, hollow inside, doors at the bottom, ledges inside, a window at the top right, crown on top
  K.rect(44, 15, 52, 43, "w"); K.rect(46, 15, 50, 43, "."); K.rect(44, 44, 52, 51, "#"); K.rect(44, 41, 45, 43, "."); K.rect(51, 41, 52, 43, ".");
  [41, 35, 29, 23, 17].forEach(y => K.rect(49, y, 50, y, "n")); [38, 32, 26, 20].forEach(y => K.rect(46, y, 47, y, "n"));
  K.rect(51, 15, 52, 16, "."); K.rect(53, 17, 60, 17, "n");               // the window and the branch outside
  K.rect(40, 13, 58, 14, "l"); K.rect(42, 12, 56, 12, "l"); for (let x = 41; x < 58; x += 3) K.set(x, 15, "n");
  K.acacia(62, 70, 19, 46, 66); K.acacia(73, 80, 22, 46, 76);
  // the rock arch with the flag
  K.rect(83, 24, 97, 27, "#"); K.rect(83, 28, 85, 51, "#"); K.rect(94, 28, 97, 51, "#");
  for (const x of [5, 10]) K.deco(x, 30, "P");
  const f = finish(R, 5, 30, 91, 24);
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
  const R = grid(96, 50, "."), K = kit(R);
  K.island(0, 16, 40, 6, "g", "u"); for (const x of [3, 9, 13]) K.deco(x, 40, "F");
  K.cloud(19, 24, 37); K.cloud(25, 30, 34); K.cloud(19, 23, 30);
  const cols = ["r", "y", "g", "b", "v"];
  for (let x = 27; x <= 73; x++) { const y = Math.round(14 + Math.pow((x - 50) / 23, 2) * 15); cols.forEach((c, i) => K.set(x, y + i, c)); }
  K.cloud(74, 80, 31); K.island(82, 95, 36, 4, "p", "o");
  K.rect(84, 30, 85, 35, "p"); K.rect(92, 30, 93, 35, "p"); K.rect(84, 29, 93, 29, "p"); for (let x = 84; x <= 93; x += 2) K.set(x, 28, "p");
  K.rect(87, 26, 90, 28, "o"); K.rect(87, 25, 90, 25, "p");
  K.ledge(80, 82, 29, "o", "p");
  K.cloud(40, 46, 28); K.cloud(56, 62, 26);
  K.spike(50, 14); K.spike(11, 40);
  const f = finish(R, 5, 40, 89, 25);
  return { n: "Cloud Kingdom", theme: "dream", rows: f.rows };
}
function ocean() {
  // Sunken Temple: jump off the boat, dive past coral shelves and kelp, drop through the temple's broken roof,
  // out its far door into a tunnel through the reef (down, along, up) to the treasure chamber with the flag
  const R = grid(92, 62, "."), K = kit(R);
  for (let k = 0; k < 3; k++) K.rect(2 + k, 8 + k, 14 - k, 8 + k, "w"); K.rect(8, 3, 8, 7, "w"); K.rect(5, 4, 11, 4, "w");   // the boat
  K.ledge(16, 28, 16, "z", "#"); K.ledge(2, 12, 22, "z", "#"); K.ledge(14, 30, 28, "a", "#");
  // the sunken temple: a roof with a hole, sandstone pillars, a floor, a door on the right
  K.rect(33, 26, 61, 27, "y"); K.rect(46, 26, 48, 27, "."); for (const x of [36, 41, 53, 58]) { K.rect(x, 28, x, 32, "y"); K.rect(x, 38, x, 39, "y"); }   // broken pillars: stumps to hop over
  K.rect(33, 28, 33, 39, "y"); K.rect(61, 28, 61, 35, "y"); K.rect(33, 40, 61, 41, "#");
  // the reef: solid rock with a tunnel carved through it
  K.rect(62, 30, 91, 61, "#"); K.rect(0, 42, 61, 61, "#"); K.rect(0, 41, 32, 41, "a");
  K.rect(62, 36, 70, 39, "."); K.rect(68, 40, 71, 48, "."); K.rect(68, 45, 82, 48, "."); K.rect(80, 37, 82, 44, "."); K.rect(80, 34, 89, 41, ".");
  K.rect(82, 45, 82, 45, "#"); K.set(80, 42, "#");
  K.spike(22, 28); K.spike(50, 40); K.spike(75, 49);
  for (const [x, t] of [[20, 16], [26, 16], [6, 22], [18, 28], [38, 40], [44, 40], [56, 40], [72, 49], [10, 41], [24, 41]]) K.deco(x, t, "K");
  const f = finish(R, 6, 8, 86, 42, 3);
  return { n: "Coral Reef", theme: "ocean", grav: 0.8, rows: f.rows };
}

const out = { peaks: peaks(), crystal: crystal(), tropical: tropical(), woods: woods(), space: space(), dream: dream(), ocean: ocean() };
const file = path.join(__dirname, "..", "data", "maps.js");
const head = "// One in a Cupidium game data (maps). Loaded before the game code; read through OIC_DATA.<name>.\n// Edit freely — this is plain data. Keep each value on its own line.\n// Made by tools/trmaps.js. Check them with node tools/trsolve.js.\nvar OIC_DATA = window.OIC_DATA = window.OIC_DATA || {};\n";
fs.writeFileSync(file, head + "OIC_DATA.TR_MAPDATA = " + JSON.stringify(out, null, 1) + ";\n");
for (const k in out) console.log(k, out[k].rows[0].length + "x" + out[k].rows.length);
const pi = process.argv.indexOf("--print");
if (pi >= 0) for (const k in out) if (!process.argv[pi + 1] || process.argv[pi + 1] === k) console.log("\n" + k + "\n" + out[k].rows.map((r, i) => String(i).padStart(2) + " " + r).join("\n"));
