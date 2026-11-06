# The Brazilian Portuguese overlay

Everything in this directory is applied to the `structs-webapp` submodule as it
is built. Nothing in the submodule is edited.

| Path | What it is |
|---|---|
| `strings/<upstream path>.json` | Portuguese for one upstream file: `{"exact source text": "replacement"}` |
| `patches.cjs` | Changes that are not text: the guild connection, the telemetry name, date locale, translating struct-type data where it is read |
| `runtime/` | Loaded before webapp's entry: `__ptbr.t()` with `terms.json` (Portuguese for game data from the guild API) and `__ptbr.guild` (`guild.js`, which guild the page plays through) |
| `public/` | Static files served over webapp's: `ptbr/ptbr.css` and the accented letters in `ptbr/fonts/`, and the Portuguese banner frames in `lottie/` |
| `art/fonts.py` | Draws those letters on webapp's pixel fonts' grids (needs fonttools, brotli); `fonts.json` records the upstream fonts |
| `art/banners.py` | Draws those banner frames from webapp's (needs Pillow); `banners.json` records which upstream frames they replace |
| `page.cjs` | Renders webapp's Twig page (`templates/`) to `index.html` |
| `loader.cjs`, `translate.cjs` | Apply `patches.cjs` then `strings/` to each source file webpack reads |
| `audit.cjs` | Reports stale entries, English still on screen and translations that don't fit their code |
| `GLOSSARY.md` | The words and voice to use |

## Writing a strings file

`strings/js/view_models/signup/IncomingCall1ViewModel.js.json`:

```json
{
  "'Incoming Call'": "'Chamada Recebida'",
  "<strong>Alert:</strong> Priority Call": "<strong>Alerta:</strong> Chamada Prioritária",
  "$keep": ["SN Corp"]
}
```

- A key is text copied exactly from the upstream file, and every occurrence in
  that file is replaced, in one pass, longest key first. Include enough around
  it (quotes, tags) that it can only match what a player reads, never an id,
  class, selector, event name, storage key or anything compared or sent to the
  guild or the chain.
- Keep `${…}` expressions, tags, attributes and the surrounding quotes; reorder
  them as Portuguese needs. Translate readable attributes (`title`,
  `placeholder`, `alt`, `aria-label`, `data-sui-tooltip`).
- Text that is also used as a value in code (`STRUCT_TYPES` names, for one)
  stays English. Translate it where it is shown instead, calling the runtime:
  `"${structType.type}</div>": "${__ptbr.t(structType.type)}</div>"`, and add
  the word to `runtime/terms.json`. Not in `js/workers/` or what it imports: the
  task worker has no `__ptbr`.
- Upstream text built from fragments, or plural `s`, or a/an: handle it in the
  key so the result is correct Portuguese, agreement included.
- `${…}` must match its key exactly, so the text inside `hl('…')` is translated
  by a key that starts inside the expression (see `js/tutorial/TutorialCopy.js.json`).
- `$keep` lists English left as is on purpose (names, units, and words that are
  the same in both languages such as `Total`), as the audit prints them, so the
  audit stops reporting them. `keep.json` is the same list for every file.
- Only pt-BR letters and `— – … “ ” ‘ ’ º ª °` are drawn for webapp's pixel
  fonts. The audit reports any other new character. To add one, draw it in
  `art/fonts.py` and add it to the `unicode-range` in `public/ptbr/ptbr.css`.

Check a file as you go:

```bash
node ptbr/audit.cjs js/view_models/signup/IncomingCall1ViewModel.js
```

## Game data

`runtime/terms.json` follows the struct-type text guilds serve (structs-pg's
`struct_type` migrations). When a guild sends wording it doesn't have, the page
shows the English and logs `[ptbr] no Portuguese for game data …` once.

## Regenerating the art

Only needed when the audit reports a font or banner frame as stale:

```bash
python3 -m pip install fonttools brotli pillow
python3 ptbr/art/fonts.py
python3 ptbr/art/banners.py
```
