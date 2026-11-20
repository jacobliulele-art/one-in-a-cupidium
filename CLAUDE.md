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
| `tools/trmaps.js`, `tools/trsolve.js` | Build / check Chicken Horse maps |

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

## Testing in a browser
`npm i playwright`, serve the repo with `python3 -m http.server`, hide `#nameGate` with a style tag.
