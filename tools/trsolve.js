// Checks every Ultimate Chicken Horse map can be finished with nothing placed, using the game's own physics.
// No installs needed: node tools/trsolve.js [maps] [max steps]
// It loads data/maps.js and the UCH physics straight out of index.html into a sandbox, then searches short input bursts
// (left / none / right × no jump / tap / hold) for a way from the start to the flag.
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8").replace(/\r\n/g, "\n");
const a = html.indexOf("const TR_TS=16"), b = html.indexOf("// ---------- drawing (all pixel art, no emoji) ----------");
if (a < 0 || b < 0) throw new Error("couldn't find the UCH physics in index.html");
const ctx = { window: {}, console, Math, JSON, performance: { now: () => 0 }, sfx: { ok() {}, bad() {}, whoosh() {}, go() {} }, burst() {}, store: { get: (k, d) => d } };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, "data", "maps.js"), "utf8"), ctx);
vm.runInContext(html.slice(a, b) + "\n;trSendRes=()=>{};trSend=()=>{};trPub=()=>{};trDie=(P)=>{P.st='dead';};this.__api={trSetMap,trBuild,trStep,trCheck,get TRM(){return TRM},get START(){return TR_START},get GOAL(){return TR_GOAL},get W(){return TR_W},get H(){return TR_H},TRP,TR_TS};", ctx);
const A = ctx.__api, TS = A.TR_TS;
function solve(id, LIM) {
  A.trSetMap(id); const C = A.trBuild({ items: [], holes: [], map: id }), g = A.GOAL; let S = A.START; if (process.env.START) { const [sx, sy] = process.env.START.split(",").map(Number); S = { x: sx, y: sy }; }// START=x,y tests from another spot
  const P0 = { coins: {}, x: S.x * TS + 2, y: S.y * TS + 16 - A.TRP.h - 1, vx: 0, vy: 0, w: A.TRP.w, h: A.TRP.h, f: 1, st: "run", t: 0, coy: 0, buf: 0 };
  const acts = []; for (const h of [-1, 0, 1]) for (const j of [0, 1, 2]) acts.push({ h, j });
  const key = P => [Math.round(P.x / 6), Math.round(P.y / 6), Math.round(P.vx / 80), Math.round(P.vy / 140), P.coy > 0 ? 1 : 0].join(",");
  const gx = (g.x0 + 1.5) * TS, gy = g.y1 * TS, dist = P => Math.hypot(P.x - gx, (P.y - gy) * 1.3);
  const Hp = [], push = (P, d) => { Hp.push([d, P]); let i = Hp.length - 1; while (i > 0) { const j = (i - 1) >> 1; if (Hp[j][0] <= Hp[i][0]) break; [Hp[i], Hp[j]] = [Hp[j], Hp[i]]; i = j; } },
    pop = () => { const top = Hp[0], last = Hp.pop(); if (Hp.length) { Hp[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < Hp.length && Hp[l][0] < Hp[m][0]) m = l; if (r < Hp.length && Hp[r][0] < Hp[m][0]) m = r; if (m === i) break; [Hp[i], Hp[m]] = [Hp[m], Hp[i]]; i = m; } } return top[1]; };
  const seen = new Set([key(P0)]); push(P0, dist(P0)); let n = 0, best = P0;
  while (Hp.length && n < LIM) { const St = pop();
    for (const ac of acts) { const P = JSON.parse(JSON.stringify(St)); const inp = { l: ac.h < 0, r: ac.h > 0, j: false, jp: false }; let t = P.t;
      for (let f = 0; f < 8; f++) { inp.j = ac.j === 2 || (ac.j === 1 && f < 4); if (f === 0 && ac.j) inp.jp = true; A.trStep(P, C, inp, 1 / 60, t); t += 1 / 60; A.trCheck(P, C, t); if (P.st !== "run") break; }
      n++; if (P.st === "win") return { id, ok: true, steps: n, time: +P.t.toFixed(1), size: A.W + "x" + A.H };
      if (P.st !== "run") continue; const k = key(P); if (seen.has(k)) continue; seen.add(k); push(P, dist(P) + P.t * 4); if (dist(P) < dist(best)) best = P; } }
  return { id, ok: false, steps: n, closest: [Math.floor(best.x / TS), Math.floor(best.y / TS)], start: [S.x, S.y], goal: [g.x0 + 1, g.y1], size: A.W + "x" + A.H };
}
const maps = (process.argv[2] || Object.keys(ctx.OIC_DATA.TR_MAPDATA).join(",")).split(",");
let bad = 0; for (const id of maps) { const r = solve(id, +process.argv[3] || 400000); if (!r.ok) bad++; console.log(JSON.stringify(r)); }
process.exit(bad ? 1 : 0);
