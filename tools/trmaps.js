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
  K.island(39, 41, 28, 2, "s", "i");                                                                                          // a snow chunk to reach the ice face
  // the huge ice mountain: ice face on the left (snow nubs to climb), snow cap, cave underneath
  K.rect(45, 18, 67, 33, "i"); K.rect(45, 18, 67, 19, "s"); K.checker(46, 66, 20, 23); K.set(44, 25, "s"); K.set(43, 22, "s"); K.set(44, 19, "s");
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
  const R = grid(74, 60, "."), K = kit(R);
  K.col(0, 73, 54, "#", "#"); K.rect(0, 0, 3, 53, "#"); K.rect(0, 0, 73, 3, "#"); K.rect(67, 0, 73, 53, "#");    // rock frame
  K.rect(4, 40, 10, 43, "#"); K.rect(4, 44, 5, 53, "#"); K.rect(65, 0, 66, 53, "#");                                // the start pocket's roof, the shaft's right wall
  for (let x = 40; x <= 64; x++) for (let y = Math.max(34, 53 - Math.floor((x - 40) * 0.85)); y <= 53; y++) K.set(x, y, "#");   // ramp up to the shaft
  K.crystal(15, 53, 14, 0.3, "r"); K.crystal(28, 53, 17, 0.25, "b");                                                   // red by the start, tall blue
  for (let i = 0; i < 8; i++) K.rect(22 + Math.round(i * 0.25), 4 + i, 24 + Math.round(i * 0.25), 4 + i, i % 3 === 1 ? "h" : "e");    // green hanging
  for (let x = 46; x <= 53; x++) K.set(x, 52 - Math.floor((x - 40) * 0.85), x % 2 ? "h" : "e");                          // green lying along the ramp
  for (let y = 4; y <= 21; y++) K.rect(36 + Math.max(0, y - 9), y, 53 - Math.max(0, y - 13), y, "#");                  // grey overhang
  // tall shaft: grey pillar with holes on the left, the right wall, nubs to wall-jump on
  K.rect(58, 9, 60, 33, "#"); for (const y of [14, 19, 24, 29]) K.set(59, y, ".");
  [31, 25, 19, 13].forEach(y => K.set(64, y, "#")); [28, 22, 16, 10].forEach(y => K.set(61, y, "#"));
  // across the top and down to the flag
  K.rect(36, 4, 57, 6, "."); K.rect(54, 7, 57, 8, ".");                                                               // a passage back left over the top
  for (let i = 0; i < 6; i++) K.rect(17 - i, 4 + i, 18 - i, 4 + i, i % 2 ? "h" : "b");                                   // blue hanging
  K.ledge(29, 36, 13, "#", "#");
  for (let i = 0; i < 9; i++) K.rect(12 + i, 27 - i, 15 + i, 27 - i, i % 3 === 1 ? "h" : "r");                            // the red crystal with the flag
  K.rect(4, 16, 9, 31, "#");
  K.rect(25, 33, 27, 34, "r"); K.set(26, 32, "h");
  K.spike(45, 54); K.spike(12, 54);
  for (const [x, t] of [[8, 54], [36, 54], [33, 13]]) K.deco(x, t, "c");
  const f = finish(R, 7, 54, 22, 19, 0);
  return { n: "Crystal Cavern", theme: "crystal", rows: f.rows };
}
function tropical() {
  const R = grid(64, 48, "."), K = kit(R), water = 45;
  const isl = (x0, x1, top) => { K.rect(x0, top, x1, top + 1, "a"); for (let k = 2; k < 6; k++) K.rect(x0 + Math.floor(k * 0.6), top + k, x1 - Math.floor(k * 0.6), top + k, "u"); };
  isl(0, 12, 36); K.palm(10, 30, 36);
  isl(17, 26, 40); K.palm(22, 26, 40);
  isl(29, 38, 42); K.palm(34, 22, 42);
  isl(41, 51, 41); K.palm(46, 18, 41);
  isl(54, 62, 37); K.palm(58, 29, 37);
  const f = finish(R, 3, 36, 46, 18);
  return { n: "Tropical Islands", theme: "tropical", liquid: { y: water - f.crop, c: "#2a5fa8", c2: "#ffb46b", kill: 1 }, rows: f.rows };
}
function woods() {
  const R = grid(72, 46, "."), K = kit(R);
  const mound = (x0, x1, top) => { K.rect(x0 + 1, top, x1 - 1, top, "#"); K.rect(x0, top + 1, x1, 45, "#"); };
  mound(52, 71, 40); K.rect(60, 37, 66, 39, "#"); K.rect(61, 36, 65, 36, "#");
  mound(30, 48, 41); mound(0, 26, 39);
  K.rect(61, 33, 64, 33, "n"); K.rect(63, 34, 63, 35, "n");                     // dark twisted branch to step up on
  K.acacia(51, 62, 30, 40, 56); K.acacia(37, 49, 27, 41, 43); K.acacia(23, 35, 24, 41, 28); K.acacia(7, 21, 21, 39, 13);
  K.rect(0, 18, 6, 19, "#"); K.rect(0, 20, 3, 38, "#");                         // the flag ledge top left
  K.acacia(24, 44, 8, null, 0); K.rect(30, 0, 31, 7, "k"); K.rect(38, 0, 39, 7, "k"); K.acacia(48, 66, 11, null, 0); K.rect(56, 0, 57, 10, "k");
  K.spike(40, 41); K.spike(16, 39);
  const f = finish(R, 67, 36, 3, 18);
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
  const R = grid(84, 58, "."), K = kit(R);
  K.col(0, 83, 54, "a", "#"); K.col(0, 13, 12, "a", "#", 20);
  K.ledge(16, 25, 19, "z", "#"); K.ledge(3, 12, 25, "z", "#"); K.ledge(15, 26, 31, "a", "#"); K.ledge(4, 11, 37, "z", "#");
  K.rect(0, 21, 2, 53, "#");
  for (let k = 0; k < 6; k++) K.rect(30 + k, 44 + k, 50 - k, 44 + k, "w"); K.set(30, 43, "w"); K.rect(40, 37, 40, 43, "w"); K.rect(37, 38, 43, 38, "w");
  K.col(55, 56, 51, "a", "#"); K.col(57, 58, 48, "z", "#"); K.col(59, 61, 45, "z", "#"); K.ledge(62, 64, 48, "z", "#");   // a reef wall stepping up
  K.col(68, 83, 48, "a", "#"); K.rect(74, 45, 79, 47, "#"); K.rect(75, 44, 78, 44, "a");
  for (const [x, t] of [[8, 12], [20, 19], [7, 25], [22, 31], [26, 54], [52, 54], [66, 54], [70, 48]]) K.deco(x, t, "K");
  K.spike(20, 31); K.spike(45, 54); K.spike(65, 54);
  const f = finish(R, 4, 12, 77, 44, 4);
  return { n: "Coral Reef", theme: "ocean", grav: 0.8, rows: f.rows };
}

const out = { peaks: peaks(), crystal: crystal(), tropical: tropical(), woods: woods(), space: space(), dream: dream(), ocean: ocean() };
const file = path.join(__dirname, "..", "data", "maps.js");
const head = "// One in a Cupidium game data (maps). Loaded before the game code; read through OIC_DATA.<name>.\n// Edit freely — this is plain data. Keep each value on its own line.\n// Made by tools/trmaps.js. Check them with node tools/trsolve.js.\nvar OIC_DATA = window.OIC_DATA = window.OIC_DATA || {};\n";
fs.writeFileSync(file, head + "OIC_DATA.TR_MAPDATA = " + JSON.stringify(out, null, 1) + ";\n");
for (const k in out) console.log(k, out[k].rows[0].length + "x" + out[k].rows.length);
const pi = process.argv.indexOf("--print");
if (pi >= 0) for (const k in out) if (!process.argv[pi + 1] || process.argv[pi + 1] === k) console.log("\n" + k + "\n" + out[k].rows.map((r, i) => String(i).padStart(2) + " " + r).join("\n"));
