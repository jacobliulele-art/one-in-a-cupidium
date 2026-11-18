// Builds the four Ultimate Chicken Horse maps into data/maps.js.  Run: node tools/trmaps.js
// Every map is made of platforms a racer can actually reach (jumps up at most 3 tiles, gaps the jump can clear),
// decorations only stand on ground, and the solver in the game (see HANDOFF) checks each map is beatable with nothing placed.
const fs = require("fs"), path = require("path");
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function grid(W, H, ch) { return [...Array(H)].map(() => Array(W).fill(ch)); }
const set = (R, x, y, c) => { if (y >= 0 && y < R.length && x >= 0 && x < R[0].length) R[y][x] = c; };
const get = (R, x, y) => (y >= 0 && y < R.length && x >= 0 && x < R[0].length ? R[y][x] : "#");
const rect = (R, x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(R, x, y, c); };
const solid = c => "#isdvgarbewl".includes(c);
// safe next platform: how far and how high the next one can be from here
function nextHop(r, lastTop) {
  const dy = Math.round((r() - 0.55) * 6); // -3 .. +3 (negative = higher)
  const up = Math.max(0, -dy), gap = up >= 3 ? 2 : up === 2 ? 3 : dy > 2 ? 4 + Math.floor(r() * 2) : 3 + Math.floor(r() * 2);
  return { top: lastTop + dy, gap };
}
// a floating island: top row of one tile, body tapering underneath
function island(R, x0, x1, top, depth, topC, bodyC) {
  for (let k = 0; k < depth; k++) { const a = x0 + Math.floor(k * 0.7), b = x1 - Math.floor(k * 0.7); if (a > b) break; rect(R, a, top + k, b, top + k, k === 0 ? topC : bodyC); }
}
function spikeOn(R, x, top) { if (solid(get(R, x, top)) && get(R, x, top - 1) === ".") set(R, x, top - 1, "x"); }
function deco(R, x, top, c) { if (solid(get(R, x, top)) && get(R, x, top - 1) === ".") set(R, x, top - 1, c); }
function finish(R, sx, stop, gx, gtop) { set(R, sx, stop - 1, "S"); set(R, gx, gtop - 1, "G"); const rows = R.map(r => r.join(""));
  // keep 7 empty rows of sky above the highest thing, drop the rest so the map isn't taller than it needs to be
  let y0 = 0; while (y0 < rows.length && /^\.+$/.test(rows[y0])) y0++; finish.crop = Math.max(0, y0 - 9); return rows.slice(finish.crop); }

function peaks(seed) {
  const W = 96, H = 36, R = grid(W, H, "."), r = rng(seed), water = H - 3;
  let x = 0, top = 26, sx = 3, stop = 26; island(R, 0, 12, top, 6, "s", "#"); x = 13;
  let n = 0;
  while (x < W - 22) {
    const h = nextHop(r, top); let t = Math.max(12, Math.min(29, h.top)); if (t < top - 3) t = top - 3;
    const g = t < top ? Math.min(h.gap, top - t >= 3 ? 2 : 3) : h.gap, len = 6 + Math.floor(r() * 6), x0 = x + g, x1 = Math.min(W - 20, x0 + len);
    const ice = r() < 0.35; island(R, x0, x1, t, 3 + Math.floor(r() * 3), ice ? "i" : "s", ice ? "s" : "#");
    if (n % 3 === 1) { const px = Math.floor((x0 + x1) / 2); rect(R, px, t + 3, px + 1, water + 2, "v"); }
    if (len >= 9 && r() < 0.5) spikeOn(R, Math.floor((x0 + x1) / 2) + 1, t);
    x = x1 + 1; top = t; n++;
  }
  const gt = Math.max(12, top - 2), gx0 = x + 3; island(R, gx0, W - 1, gt, 5, "s", "#"); rect(R, gx0 + 1, gt + 5, gx0 + 2, water + 2, "v");
  const rows = finish(R, sx, stop, W - 6, gt);return { n: "Frozen Peaks", theme: "peaks", liquid: { y: water - finish.crop, c: "#3f7fd8", c2: "#cfe8ff", kill: 1 }, rows };
}
function tropical(seed) {
  const W = 98, H = 32, R = grid(W, H, "."), r = rng(seed), water = H - 4;
  let top = 22; island(R, 0, 13, top, 9, "a", "a"); deco(R, 9, top, "P");
  let x = 14, n = 0, ship = false;
  while (x < W - 22) {
    if (!ship && x > 36 && x < 60) {
      // the ship: a low deck you run along, a short mast with a crossbar you can stand on
      ship = true; const deck = Math.min(24, top + 1), x0 = x + 3, x1 = x0 + 18;
      for (let k = 0; k <= water + 1 - deck; k++) rect(R, x0 + Math.min(4, k), deck + k, x1 - Math.min(4, k), deck + k, "w");
      set(R, x0, deck - 1, "w"); set(R, x1, deck - 1, "w"); // bow and stern rails, one tile high
      const mx = Math.floor((x0 + x1) / 2); rect(R, mx, deck - 2, mx, deck - 1, "w"); rect(R, mx - 2, deck - 3, mx + 2, deck - 3, "w");
      x = x1 + 1; top = deck; continue;
    }
    const h = nextHop(r, top); let t = Math.max(10, Math.min(24, h.top)); if (t < top - 3) t = top - 3;
    const g = t < top ? Math.min(h.gap, top - t >= 3 ? 2 : 3) : h.gap, len = 5 + Math.floor(r() * 6), x0 = x + g, x1 = Math.min(W - 20, x0 + len);
    if (n % 2 === 0) { // sand island down into the sea
      for (let y = t; y <= water + 1; y++) rect(R, x0 + (y - t > 2 ? 1 : 0), y, x1 - (y - t > 2 ? 1 : 0), y, "a");
      if (len >= 7) deco(R, x0 + 2, t, "P");
    } else { island(R, x0, x1, t, 3, "a", "#"); rect(R, Math.floor((x0 + x1) / 2), t + 3, Math.floor((x0 + x1) / 2), water + 1, "w"); }
    if (len >= 9 && r() < 0.45) spikeOn(R, x1 - 3, t);
    x = x1 + 1; top = t; n++;
  }
  const gt = Math.max(10, top - 1), gx0 = x + 3; for (let y = gt; y <= water + 1; y++) rect(R, gx0, y, W - 1, y, y === gt ? "a" : "#"); deco(R, W - 3, gt, "P");
  const rows = finish(R, 4, 22, W - 8, gt);return { n: "Tropical Islands", theme: "tropical", liquid: { y: water - finish.crop, c: "#2a5fa8", c2: "#ffb46b", kill: 1 }, rows };
}
function crystal(seed) {
  const W = 100, H = 40, R = grid(W, H, "#"), r = rng(seed);
  // a winding tunnel: the floor goes up and down (never more than 3 tiles at once), the ceiling stays 6-8 tiles above it
  let floor = 14, x = 1;
  const floors = [];
  const hs = [];let hgt = 7;
  while (x < W - 1) { const run = 4 + Math.floor(r() * 6); hgt = 6 + Math.floor(r() * 3); for (let k = 0; k < run && x < W - 1; k++, x++) { floors[x] = floor; hs[x] = hgt; }
    const want = 10 + Math.round((Math.sin(x / 13) * 0.5 + 0.5) * 22), d = Math.max(-3, Math.min(3, want - floor + Math.round((r() - 0.5) * 2))); floor = Math.max(10, Math.min(34, floor + d)); }
  floors[0] = floors[1]; floors[W - 1] = floors[W - 2];
  hs[0] = hs[1]; hs[W - 1] = hs[W - 2];
  for (let x2 = 1; x2 < W - 1; x2++) { const f = floors[x2]; rect(R, x2, f - hs[x2], x2, f - 1, "."); }
  // widen around big steps so there's room to jump
  for (let x2 = 2; x2 < W - 2; x2++) { const f = floors[x2]; for (const d of [-1, 1]) { const g = floors[x2 + d]; if (g < f) rect(R, x2, g - 6, x2, f - 1, "."); } }
  // crystal veins in the walls and shards on the floor
  for (let i = 0; i < 70; i++) { const vx = 2 + Math.floor(r() * (W - 4)), vy = 1 + Math.floor(r() * (H - 2)), c = "rbe"[i % 3];
    if (get(R, vx, vy) === "#" && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => get(R, vx + a, vy + b) === ".")) { set(R, vx, vy, c); if (get(R, vx + 1, vy) === "#") set(R, vx + 1, vy, c); } }
  for (let x2 = 6; x2 < W - 8; x2++) { const f = floors[x2]; if (floors[x2 - 1] === f && floors[x2 + 1] === f && floors[x2 - 2] === f && floors[x2 + 2] === f && r() < 0.09) spikeOn(R, x2, f); else if (r() < 0.06) deco(R, x2, f, "c"); }
  // a few floating crystal ledges in tall spots (supported ones only touch the ceiling or floor)
  const rows = finish(R, 3, floors[3], W - 5, floors[W - 5]);let y0 = 0, y1 = rows.length - 1;
  while (y0 < y1 && /^#+$/.test(rows[y0 + 2])) y0++; while (y1 > y0 && /^[#rbe]+$/.test(rows[y1 - 2])) y1--;
  return { n: "Crystal Cavern", theme: "crystal", rows: rows.slice(y0, y1 + 1) };
}
function woods(seed) {
  const W = 96, H = 34, R = grid(W, H, "."), r = rng(seed);
  let top = 24, x = 0; rect(R, 0, top, 12, H - 1, "#"); x = 13; let n = 0;
  while (x < W - 20) {
    const h = nextHop(r, top); let t = Math.max(10, Math.min(28, h.top)); if (t < top - 3) t = top - 3;
    const g = t < top ? Math.min(h.gap, top - t >= 3 ? 2 : 3) : (r() < 0.4 ? 0 : h.gap), len = 6 + Math.floor(r() * 7), x0 = x + g, x1 = Math.min(W - 18, x0 + len);if (x1 - x0 < 4) break;
    rect(R, x0, t, x1, H - 1, "#");
    // a tree: trunk on the ground, canopy resting on the trunk (you can stand on it)
    if (len >= 8 && r() < 0.6) { const tx = x0 + 2 + Math.floor(r() * (len - 4)), th = 3 + Math.floor(r() * 2); rect(R, tx, t - th, tx, t - 1, "w"); rect(R, tx - 2, t - th - 2, tx + 2, t - th - 1, "l"); }
    else if (len >= 8 && r() < 0.6) spikeOn(R, Math.floor((x0 + x1) / 2), t);
    x = x1 + 1; top = t; n++;
  }
  const gt = Math.max(10, top - 2), gx0 = x + 3; rect(R, gx0, gt, W - 1, H - 1, "#");
  return { n: "Sunset Woods", theme: "woods", rows: finish(R, 4, 24, W - 6, gt) };
}
const seeds = Object.assign({ peaks: 7, tropical: 11, crystal: 5, woods: 3 }, JSON.parse(process.argv[2] || "{}"));
const out = { crystal: crystal(seeds.crystal), peaks: peaks(seeds.peaks), tropical: tropical(seeds.tropical), woods: woods(seeds.woods) };
const file = path.join(__dirname, "..", "data", "maps.js");
const head = "// One in a Cupidium game data (maps). Loaded before the game code; read through OIC_DATA.<name>.\n// Edit freely — this is plain data. Keep each value on its own line.\n// Made by tools/trmaps.js (node tools/trmaps.js '{\"peaks\":7}' picks other seeds).\nvar OIC_DATA = window.OIC_DATA = window.OIC_DATA || {};\n";
fs.writeFileSync(file, head + "OIC_DATA.TR_MAPDATA = " + JSON.stringify(out, null, 1) + ";\n");
for (const k in out) console.log(k, out[k].rows.length + "x" + out[k].rows[0].length);
