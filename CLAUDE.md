# One in a Cupidium — notes for Claude

Browser trivia game where rarer valid answers score more, plus arcade, casino, Daily Cuepon, party modes, duels, Cupidium XC.
Plain HTML/JS, no build step. Friends play from the GitHub link.
Relay (separate repo `lele-io/cupidium-relay`): Cloudflare Worker + one Durable Object `Topic`; the worker file must be `index.js`.

## Rules
- Never read `index.html` (~1.9 MB) or `data/answers.js` whole. Search with grep; list sections with `grep -n "^// =====" index.html`.
- Run `node tools/check.js` after every edit.
- Never write the developer passcode into any file.
- Other sessions may push to main at the same time: `git pull --rebase` before pushing, and push only your own changes.
- Don't add entries to the in-game update log unless asked (it's shared with other work).

## Layout
| Path | What |
|------|------|
| `index.html` | All game code: CSS + two `<script>` blocks |
| `data/prompts.js` | Prompts `OIC_DATA.PROMPTS`, `PROMPT_LIST_1/2` |
| `data/answers.js` | Answer banks (`EXTRA`, `BIG`, `ADDB_1..24`, `RARE_KEEP`, `QNOTE` etc.) |
| `data/words.js` | Daily Cuepon lists `CW_OK`, `CW_BEE` |
| `data/decks.js`, `data/art.js`, `data/maps.js` | Decks, pixel art, Chicken Horse maps |
| `tools/check.js` | Syntax/data check |
| `tools/trmaps.js`, `tools/trsolve.js` | Build / check Chicken Horse maps (`trsolve` needs no installs) |

## Answers
- Tiers `t:[0..4]`: 0 most common … 4 = ONE IN A CUPIDIUM. `|` between answers, `/` between aliases.
- Hand fixes go in the dated block at the very end of script 1, using `put(q,tier,list)`, `set4(q,list)`, `rot(q,pool)`,
  `alias(name,extra)`, `rej(q,list)` (fills `window.AI_REJECT`, enforced by `hardCheck`).
- Final tiers are built at load time by script 1. To inspect real data in Node, run script 1 in a `vm` with the data files loaded
  first (stub `window`, `document`, `localStorage`).
- Dailies need prompts with 8+ answers; category days need `broadP` (50+ answers, 8+ in tiers 0-1).

## Judging answers
1. `matchAns`: exact, then typo, then `completeMatch` (typed words in order inside exactly one answer). Typos/completions = `suggest:true`.
2. `smartJudge` -> `smartJudge0b` -> `smartJudge0c`: Wikipedia, then `judgeAI` (+ one automatic second look before a rejection).
   Invalid -> `globalFix` tries a typo/shortened name across every prompt and asks "did you mean?".
3. Checked answers (AI, Wikipedia, shared bank) are at least tier 2 (tier 3 for 3+ word names), never tier 4 (`ckFloor`/`bankFloor`).
4. Autocorrect ALWAYS asks "did you mean?" unless the player typed the displayed name exactly (`directFix`). Only Rapid modes skip asking.

## Relay usage (Cloudflare free tier: 13,000 GB-s/day of Durable Object awake time)
- Live streams (`sseOpen`) keep a Durable Object awake the whole time they're open. Don't add new always-on streams or short polling;
  close streams when the tab is hidden or idle. Party-room WebSockets already hibernate.

## Ultimate Chicken Horse (UCH) — `// ===== ULTIMATE CHICKEN HORSE` section, all names start with `tr`
- Flow: host runs `trHost*` (pick → place → run → score; solo runs the same host code locally) and broadcasts the whole state
  `{t:"tr",...st}`; every device rebuilds the course with `trBuild(st)` and runs its own racer (`trStep` physics, `trCheck` deaths/flag).
  Clients send `tpk`/`tpl`/`tres`/`tcoin`/`trvote` to the host (routed in the "party room wiring" block at the end of the section).
- Items: `TR_ITEMS` (+ `TR_BOX_W` box weights, `TR_SOLID` tile kinds, `TR_ROT`, `TR_HINT`). Art in `data/art.js` `OIC_DATA.TR_ART` (16×16 rows, `BBPAL` letters).
  Kind numbers in the course grid: 2 solid, 3 ice, 4 spring, 5/6/16/17 conveyors, 7 honey, 8 fan, 9/10/18/19 boost, 11 slime, 20 truss.
- Rules worth knowing: bombs only remove items; the rare `cnuke` adds `st.cor` (chipped/charred tiles, partial collision via `trCorRect`);
  portals pair per owner in placement order (`trPortalPairs`); spikes/honey/ice need support (`trBaseOk`); a racer can never end up
  inside a wall (`trStuck` snaps back to the last clear spot); `st.win` = points to win (`otc.tr.win`); `st.log` = every point scored, for the score bars.
- Maps: edit `tools/trmaps.js` (never hand-edit `data/maps.js`), then `node tools/trmaps.js --print <id>` and `node tools/trsolve.js`
  (plain Node, uses the game's own physics; `START=x,y GOAL=x,y` checks one stretch — y is the row above the tile you stand on).
  The search heads straight for the flag, so maps with long detours need checking stretch by stretch.
  Tile letters: `#` theme rock, s snow, i ice, d teal, v purple, g green, a sand, u dirt, r/b/e crystals, h white highlight, w wood,
  l leaves, k grey trunk, n dark branch, o/p clouds, m metal, y yellow, z coral; `x` map spike (only on solid ground), deco `c P K F`.
  New solid letters must go in BOTH `TR_TILE` (+ `TR_TCOL` colour) in index.html and `SOLID` in trmaps.js. Themes live in `TR_THEMES` + `trDrawSky`.
  The 4 original maps follow the owner's own map recording (`.claude/6f34bc23-…-render-compressed.mp4` in their download folder); space/dream/ocean match the main game's themes.
- Quick logic test without a browser: run the UCH section of index.html in a Node `vm` with stub `$`/canvas/`store`
  (see how `tools/trsolve.js` slices the section out).

## Layout rules (the owner is strict about these)
- No empty bands: boxes hug their content; a lone short label must not sit in a full-width box.
- Rows of cards/buttons are centred, including a leftover last row, and the text inside boxes is centred.
  The CSS block at the end of the first `<style>` turns the card grids (`.landing .modegrid .xdailies .skins .casgrid .bvitems …`)
  into centred flex-wrap rows; add new card grids to it. Leaderboard boards are dealt into columns by `lbMasonry` (no gaps).
- Empty leaderboards show just their title (no "No scores yet" text).

## Testing in a browser
`npm i playwright`, serve the repo with `python3 -m http.server`, hide `#nameGate` with a style tag.
