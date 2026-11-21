# estrut.net — Structs in Brazilian Portuguese

The [structs-webapp](https://github.com/playstructs/structs-webapp) game client,
in Brazilian Portuguese. structs-webapp is a git submodule (`structs-webapp/`,
following its `main`) and its client is built as it is: its own JavaScript,
page, styles and art, with its webpack configuration as the starting point. What
this repository adds is the overlay in [`ptbr/`](ptbr/README.md), applied while
webpack reads webapp's sources. Nothing in the submodule is edited, so a newer
structs-webapp builds with the same overlay.

Only the client side is used. This site hosts no guild API of its own: the page
talks straight to a guild's API, its GRASS feed and its chain node, wherever the
guild runs them.

Onboarding and tutorial telemetry is reported with the interface name
`estrut.net`, so these runs can be told apart from other clients' in a guild's
reports (`?interface_name=estrut.net`).

## Setup

```bash
git clone --recurse-submodules <this repository>
npm install          # also installs structs-webapp/src's own dependencies
npm run dev          # http://localhost:5181
```

## Updating structs-webapp

```bash
npm run update:webapp
```

This moves the submodule to the latest `main`, installs its dependencies and
runs the audit, which lists what the update touched:

| Report | Meaning | What to do |
|---|---|---|
| `stale` | an entry's English changed upstream, or its art source did | fix the key and translation in `ptbr/strings/`, or run the script it names |
| `untranslated` | new English a player would read | add it to `ptbr/strings/` |
| `orphan` | the upstream file is gone | move or delete the strings file |
| `broken`, `mismatch` | a translation no longer fits its code | fix the entry |

`npm test` fails while any remain. The build shows stale entries as warnings.
Commit the submodule pointer together with the overlay. See
[`ptbr/README.md`](ptbr/README.md).

## Which guild

The site is VitalityDAO's: its guild is `0-7`, fixed in `webpack.config.js`
(`GUILD_ID`), and never looked up. Webapp normally asks its guild API which
guild it is (`/guild/this`), but VitalityDAO shares SN Corp's API, so the page
asks for `/guild/0-7` instead.

Before webapp's code starts, the page reads `0-7`'s `guild.json` (the
endpoint the guild set on chain) for its `guild_api`, `grass_nats_websocket`
and `client_websocket` (`ptbr/runtime/guild.js`). If it can't be read, it uses
what it last read, then the fallback in `webpack.config.js`. Requests carry a
bearer token from the guild's `/api/auth/token` (the same signed login as
`/api/auth/login`), since a guild's session cookie would be third-party here.

Account recovery asks the chain which guild the key's player is in before
it calls the guild API, since a shared API may log in another guild's player.
A player of another guild is moved here first: the key signs
`MsgGuildMembershipJoin` for this guild (allowed when its join minimum is 0),
and recovery goes on once the chain shows the move and the guild API knows
the player. Recovery stops instead when the player owns their guild, the
guild asks a join minimum, or the chain can't be read
(`ptbr/runtime/recovery.js`).

| Variable (build time) | Default | |
|---|---|---|
| `PTBR_LCD_URL` | `https://public.testnet.structs.network` | the chain node the guild is read from |
| `PTBR_GUILD_API` | — | a fixed guild API (a local guild in development), skipping guild.json |
| `PTBR_GRASS_URL`, `PTBR_CHAIN_WS` | — | override what the guild publishes |

## Building and serving

```bash
npm run build        # dist/
```

`dist/` is a static site: `index.html` (webapp's game page), the bundles in
`js/` and webapp's `css/`, `img/`, `lottie/` and fonts. It uses absolute paths,
so serve it from the root of its domain; it needs nothing else on that domain.
`.github/workflows/pages.yml` publishes it to GitHub Pages.

## Licences

structs-webapp is Apache-2.0 (Slow Ninja Inc). The accented letters in
`ptbr/public/ptbr/fonts/` and the banner frames in `ptbr/public/lottie/` are
derived from webapp's own fonts and art by the scripts in `ptbr/art/`.
