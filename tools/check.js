// Quick safety check for the game. No installs needed: node tools/check.js
//  1. every inline <script> in index.html and every data/*.js file parses (one typo breaks the whole game)
//  2. every put("<prompt>", tier, "answers") call names a prompt that exists (a misspelled prompt is silently ignored)
//  3. tiers are 0-4, and no answer is listed twice in the same put() call
const fs = require("fs"), path = require("path"), os = require("os"), { execFileSync } = require("child_process");
const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const dataDir = path.join(root, "data");
const dataFiles = fs.existsSync(dataDir) ? fs.readdirSync(dataDir).filter(f => f.endsWith(".js")).map(f => path.join(dataDir, f)) : [];
const problems = [];

// 1. syntax
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "oic-check-"));
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
scripts.forEach((m, i) => {
  const line = html.slice(0, m.index).split("\n").length;
  const f = path.join(tmp, `inline-${i + 1}.js`);
  fs.writeFileSync(f, "\n".repeat(line - 1) + m[1]); // pad so error line numbers match index.html
  try { execFileSync(process.execPath, ["--check", f], { stdio: "pipe" }); }
  catch (e) { problems.push(`index.html (script ${i + 1}):\n` + String(e.stderr).replace(f, "index.html").split("\n").slice(0, 6).join("\n")); }
});
for (const f of dataFiles) {
  try { execFileSync(process.execPath, ["--check", f], { stdio: "pipe" }); }
  catch (e) { problems.push(path.relative(root, f) + ":\n" + String(e.stderr).split("\n").slice(0, 6).join("\n")); }
}
fs.rmSync(tmp, { recursive: true, force: true });

// 2 + 3. put() calls
const all = html + "\n" + dataFiles.map(f => fs.readFileSync(f, "utf8")).join("\n");
const PUT = /\bput\("((?:[^"\\]|\\.)*)",\s*(\d+),\s*"((?:[^"\\]|\\.)*)"\)/g;
const puts = [...html.matchAll(PUT)];
const inPut = {};
for (const m of puts) inPut[m[1]] = (inPut[m[1]] || 0) + 1;
for (const m of puts) {
  const [, q, tier, list] = m;
  const line = html.slice(0, m.index).split("\n").length;
  const total = all.split(JSON.stringify(q)).length - 1;
  if (total - inPut[q] < 1) problems.push(`index.html:${line}: no prompt called "${q}" (check spelling/capitals)`);
  if (+tier > 4) problems.push(`index.html:${line}: tier ${tier} for "${q}" — tiers go 0 (most common) to 4 (rarest)`);
  const seen = new Set();
  for (const a of list.split("|")) {
    const k = a.split("/")[0].trim().toLowerCase();
    if (!k) problems.push(`index.html:${line}: empty answer in "${q}" (look for || or a trailing |)`);
    else if (seen.has(k)) problems.push(`index.html:${line}: "${k}" is listed twice for "${q}"`);
    seen.add(k);
  }
}

if (problems.length) { console.error(problems.join("\n\n")); process.exit(2); }
console.log(`OK: ${scripts.length} inline scripts, ${dataFiles.length} data files, ${puts.length} put() calls checked`);
