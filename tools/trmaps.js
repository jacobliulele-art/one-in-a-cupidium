// Builds the four Ultimate Chicken Horse maps into data/maps.js.  Run: node tools/trmaps.js   (then: node tools/trsolve.js)
// Layouts are hand-planned so each map goes up AND down, not along one line: zig-zag ledge climbs, a wall-jump chimney,
// tree-top routes, tunnels under mesas with a route over the top, and a high flag. Sizes sit between the very big first maps
// (about 130 x 60) and the short one-line ones (about 96 x 25). The seed only changes small details (ice patches, decorations).
// Jumping: about 4 tiles high at most; these maps never ask for more than 3 up with a 2-tile gap, or a 4-tile gap on the level.
const fs = require("fs"), path = require("path");
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function grid(W, H, ch) { return [...Array(H)].map(() => Array(W).fill(ch)); }
const SOLID = "#isdvgarbewl";
function kit(R) {
  const H = R.length, W = R[0].length;
  const set = (x, y, c) => { if (y >= 0 && y < H && x >= 0 && x < W) R[y][x] = c; };
  const get = (x, y) => (y >= 0 && y < H && x >= 0 && x < W ? R[y][x] : "#");
  const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };
  const solid = (x, y) => SOLID.includes(get(x, y));
  return {
    W, H, set, get, rect, solid,
    // ground that goes all the way down
    col: (x0, x1, top, topC, bodyC) => { rect(x0, top, x1, H - 1, bodyC); rect(x0, top, x1, top, topC); },
    // a floating island: one-tile top, body tapering underneath
    island: (x0, x1, top, depth, topC, bodyC) => { for (let k = 0; k < depth; k++) { const a = x0 + Math.floor(k * 0.7), b = x1 - Math.floor(k * 0.7); if (a > b) break; rect(a, top + k, b, top + k, k === 0 ? topC : bodyC); } },
    // a 2-thick ledge
    ledge: (x0, x1, top, topC, bodyC) => { rect(x0, top, x1, top, topC); rect(x0, top + 1, x1, top + 1, bodyC || topC); },
    // map spikes only ever sit on solid ground with air above
    spike: (x, top) => { if (solid(x, top) && get(x, top - 1) === ".") set(x, top - 1, "x"); },
    deco: (x, top, c) => { if (solid(x, top) && get(x, top - 1) === ".") set(x, top - 1, c); },
  };
}
// mark start and flag, then trim empty sky (keep 7 rows above the highest thing)
function finish(R, sx, stop, gx, gtop, keepSky = 7) {
  R[stop - 1][sx] = "S"; R[gtop - 1][gx] = "G"; const rows = R.map(r => r.join(""));
  let y0 = 0; while (y0 < rows.length && /^\.+$/.test(rows[y0])) y0++; const crop = Math.max(0, y0 - keepSky); return { rows: rows.slice(crop), crop };
}

// FROZEN PEAKS: start low, zig-zag up ice ledges, over a ridge, up a wall-jump chimney, down across floating ice, then climb to a high flag
function peaks(seed) {
  const R = grid(118, 48, "."), K = kit(R), r = rng(seed), water = 45;
  const ice = () => (r() < 0.5 ? "i" : "s");
  K.island(0, 11, 40, 7, "s", "#");                                  // start
  K.island(14, 19, 38, 4, "s", "#");
  // zig-zag climb (alternating left/right ledges, 3 up each)
  K.ledge(21, 24, 35, "s", "#"); K.ledge(28, 31, 32, ice(), "s"); K.ledge(21, 24, 29, "s", "#"); K.ledge(28, 32, 26, "s", "#");
  // the ridge, with a chimney on its right side: two walls 3 apart, wall-jump up between them
  K.col(35, 48, 23, "s", "#"); K.rect(47, 15, 48, 22, "#"); K.rect(47, 15, 48, 15, "s");
  K.col(52, 58, 15, "s", "#"); K.rect(49, 23, 51, 23, "s");
  K.spike(41, 23); K.deco(37, 23, "c");
  // down across floating ice (with an upper hop for the brave)
  K.island(62, 67, 18, 4, ice(), "s"); K.rect(64, 22, 65, water + 2, "v");
  K.island(71, 75, 22, 3, "s", "#");
  K.island(79, 86, 26, 4, ice(), "s"); K.spike(83, 26); K.rect(82, 30, 83, water + 2, "v");
  K.ledge(72, 74, 15, "s", "#"); K.ledge(79, 81, 18, "i", "s");      // high hops: a shortcut over the spike
  K.island(89, 94, 30, 4, "s", "#"); K.rect(91, 34, 92, water + 2, "v");
  // final stair up to the flag peak
  K.ledge(96, 99, 28, "s", "#"); K.ledge(101, 104, 25, ice(), "s"); K.ledge(106, 108, 22, "s", "#");
  K.col(110, 117, 19, "s", "#");
  const f = finish(R, 4, 40, 113, 19);
  return { n: "Frozen Peaks", theme: "peaks", liquid: { y: water - f.crop, c: "#3f7fd8", c2: "#cfe8ff", kill: 1 }, rows: f.rows };
}

// CRYSTAL CAVERN: a cave you climb. Start at the bottom left, wind right through a tunnel, up a tall crystal shaft (zig-zag ledges),
// along an upper tunnel with a hump, then up a second chamber to the flag near the top right.
function crystal(seed) {
  const R = grid(96, 58, "#"), K = kit(R), r = rng(seed);
  const air = (x0, y0, x1, y1) => K.rect(x0, y0, x1, y1, ".");
  air(1, 45, 21, 51);                         // start chamber, floor at 52
  air(22, 46, 27, 51); air(28, 44, 34, 49); air(35, 42, 40, 47);   // tunnel stepping up 2 at a time (floors 52, 50, 48)
  air(41, 14, 62, 47);                        // the tall shaft, floor 48
  const cc = () => "rbe"[Math.floor(r() * 3)];
  // zig-zag crystal ledges up the shaft (left ones touch the left wall, right ones the right wall)
  [[42, 48, 45], [52, 58, 42], [42, 48, 39], [52, 58, 36], [42, 48, 33], [52, 58, 30], [42, 48, 27], [52, 62, 24]].forEach(([a, b, t]) => { const c = cc(); K.ledge(a, b, t, c, c); });
  air(59, 18, 66, 23); air(67, 16, 72, 21); air(73, 18, 80, 25);    // upper tunnel: floor 24, a hump to 22, then down to 26
  K.rect(67, 22, 72, 23, "#");
  air(81, 9, 94, 29);                          // last chamber, floor 30
  [[89, 94, 27], [82, 86, 24], [89, 94, 21], [82, 86, 18]].forEach(([a, b, t]) => { const c = cc(); K.ledge(a, b, t, c, c); });
  K.ledge(89, 94, 15, "#", "#");               // the flag ledge
  // shards on long flat floors, crystal veins in the walls, little crystal clusters
  K.spike(12, 52); K.spike(31, 50); K.spike(76, 26);
  for (let i = 0; i < 90; i++) { const vx = 1 + Math.floor(r() * 94), vy = 1 + Math.floor(r() * 56), c = "rbe"[i % 3];
    if (K.get(vx, vy) === "#" && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => K.get(vx + a, vy + b) === ".")) { K.set(vx, vy, c); if (K.get(vx + 1, vy) === "#") K.set(vx + 1, vy, c); } }
  for (const [x, t] of [[8, 52], [17, 52], [25, 52], [44, 48], [50, 48], [60, 48], [63, 24], [78, 26], [84, 30], [92, 30]]) if (r() < 0.8) K.deco(x, t, "c");
  const f = finish(R, 4, 52, 92, 15, 0);
  // drop solid rock rows beyond 2 above the top room and 2 below the floor
  let y0 = 0, y1 = f.rows.length - 1; while (y0 < y1 && /^#+$/.test(f.rows[y0 + 2])) y0++; while (y1 > y0 && /^[#rbe]+$/.test(f.rows[y1 - 2])) y1--;
  return { n: "Crystal Cavern", theme: "crystal", rows: f.rows.slice(y0, y1 + 1) };
}

// TROPICAL ISLANDS: hop across palm-tree tops, drop onto a ship (stand on the mast's crossbar for a high line),
// island-hop, then climb ledges up the side of a big cliff to the flag
function tropical(seed) {
  const R = grid(116, 44, "."), K = kit(R), r = rng(seed), water = 41;
  const sand = (x0, x1, top) => { for (let y = top; y <= water + 1; y++) { const d = y - top > 2 ? 1 : 0; K.rect(x0 + d, y, x1 - d, y, "a"); } };
  const tree = (x0, x1, top, tx) => { K.rect(x0, top, x1, top, "l"); K.rect(x0 + 1, top - 1, x1 - 1, top - 1, "l"); K.rect(tx, top + 1, tx, water + 2, "w"); };
  sand(0, 13, 35); K.deco(9, 35, "P");
  tree(16, 20, 33, 18); tree(23, 27, 30, 25); tree(30, 35, 27, 32);           // tree tops, each one higher
  K.rect(34, 37, 37, 37, "a");
  // the ship: a deck you run along, rails at both ends, a mast with a crossbar
  const deck = 33, x0 = 40, x1 = 59;
  for (let k = 0; k <= water + 1 - deck; k++) K.rect(x0 + Math.min(4, k), deck + k, x1 - Math.min(4, k), deck + k, "w");
  K.set(x0, deck - 1, "w"); K.set(x1, deck - 1, "w"); K.rect(49, deck - 3, 49, deck - 1, "w"); K.rect(46, deck - 4, 52, deck - 4, "w"); K.set(44, deck - 1, "w"); K.set(54, deck - 1, "w"); // crates either side to climb onto the crossbar
  sand(63, 69, 30); K.deco(67, 30, "P");
  K.island(72, 76, 27, 3, "a", "#"); K.rect(74, 30, 74, water + 1, "w");
  sand(80, 86, 33); K.spike(83, 33);
  // ledges up the cliff face, then the cliff top with the flag
  K.island(88, 91, 30, 2, "a", "#"); K.island(83, 86, 27, 2, "a", "#"); K.island(89, 92, 24, 2, "a", "#");
  for (let y = 21; y <= water + 1; y++) K.rect(95, y, 115, y, y === 21 ? "a" : "#");
  K.deco(100, 21, "P"); K.deco(114, 21, "P");
  // a high line of floating leaves from the crossbar back toward the islands (optional)
  K.rect(56, 24, 58, 24, "l"); K.rect(62, 22, 64, 22, "l");
  const f = finish(R, 4, 35, 109, 21);
  return { n: "Tropical Islands", theme: "tropical", liquid: { y: water - f.crop, c: "#2a5fa8", c2: "#ffb46b", kill: 1 }, rows: f.rows };
}

// SUNSET WOODS: a valley under an acacia, a mesa with a tunnel through it (or go over the top), tree tops up to a tall mesa,
// then a pillar hop over a bottomless gap to the flag
function woods(seed) {
  const R = grid(114, 44, "."), K = kit(R), r = rng(seed);
  const tree = (x0, x1, top, tx, ground) => { K.rect(x0, top, x1, top, "l"); K.rect(x0 + 1, top - 1, x1 - 1, top - 1, "l"); K.rect(tx, top + 1, tx, ground - 1, "w"); };
  K.col(0, 12, 34, "#", "#");                                  // start plateau
  K.col(13, 26, 37, "#", "#"); K.spike(24, 37);                // valley
  tree(15, 21, 31, 18, 37);                                    // acacia over the valley
  K.ledge(23, 25, 28, "#", "#");                               // stepping rock up to the mesa
  // the mesa: walk over the top, or through the tunnel underneath (rows 31-36)
  K.col(27, 44, 27, "#", "#"); K.rect(27, 31, 44, 36, ".");
  K.spike(35, 27);
  K.col(45, 49, 37, "#", "#"); K.col(50, 52, 34, "#", "#");    // tunnel exit, a boulder to climb
  K.col(53, 78, 38, "#", "#"); K.spike(60, 38); K.spike(71, 38);
  tree(54, 59, 31, 56, 38); tree(62, 67, 28, 64, 38); tree(70, 75, 25, 72, 38);
  K.col(79, 95, 22, "#", "#"); K.spike(87, 22);
  K.col(100, 102, 25, "#", "#");                               // pillar over the drop
  K.col(105, 113, 23, "#", "#");
  if (r() < 0.5) K.ledge(96, 97, 19, "l", "l");                 // sometimes a leafy hop above the gap
  return { n: "Sunset Woods", theme: "woods", rows: finish(R, 4, 34, 110, 23).rows };
}

const seeds = Object.assign({ peaks: 7, tropical: 11, crystal: 5, woods: 3 }, JSON.parse(process.argv.slice(2).find(a => a.startsWith("{")) || "{}"));
const out = { crystal: crystal(seeds.crystal), peaks: peaks(seeds.peaks), tropical: tropical(seeds.tropical), woods: woods(seeds.woods) };
const file = path.join(__dirname, "..", "data", "maps.js");
const head = "// One in a Cupidium game data (maps). Loaded before the game code; read through OIC_DATA.<name>.\n// Edit freely — this is plain data. Keep each value on its own line.\n// Made by tools/trmaps.js (node tools/trmaps.js '{\"peaks\":7}' picks other seeds). Check them with node tools/trsolve.js.\nvar OIC_DATA = window.OIC_DATA = window.OIC_DATA || {};\n";
fs.writeFileSync(file, head + "OIC_DATA.TR_MAPDATA = " + JSON.stringify(out, null, 1) + ";\n");
for (const k in out) console.log(k, out[k].rows[0].length + "x" + out[k].rows.length);
if (process.argv.includes("--print")) for (const k in out) console.log("\n" + k + "\n" + out[k].rows.join("\n"));
