// Renders structs-webapp's pages to static HTML, with the Brazilian Portuguese
// overlay applied: the game (templates/game/index.html.twig on
// templates/base.html.twig) and the public Sector Blitz leaderboard
// (templates/sector_blitz/index.html.twig), once for /sector-blitz and once per
// sector, as webapp's routes serve it.
//
// Only what those templates use is understood: blocks, comments, path() of
// their routes, the sector and the webpack asset() call. Anything else Twig-shaped stops the build, so a
// template change upstream is noticed rather than shipped half-rendered.
const fs = require('node:fs');
const path = require('node:path');
const {UPSTREAM_SRC, translate} = require('./translate.cjs');

const BASE = 'templates/base.html.twig';
const GAME = 'templates/game/index.html.twig';
const LEADERBOARD = 'templates/sector_blitz/index.html.twig';
const ROUTES = {app_game: '/', app_sector_blitz: '/sector-blitz'};
const BLOCK = /{%\s*block\s+(\w+)\s*%}([\s\S]*?){%\s*endblock\s*%}/g;

// Google Tag Manager, high in <head> as Google asks.
const TRACKING = `<script async src="https://www.googletagmanager.com/gtm.js?id=GTM-T6BNH7WS"></script>
        <script>
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
        </script>
        `;

function read(rel, stale) {
  const result = translate(rel, fs.readFileSync(path.join(UPSTREAM_SRC, rel), 'utf8'));
  result.stale.forEach(text => stale.push(`${rel} no longer contains ${JSON.stringify(text)}`));
  return result.code.replace(/{#[\s\S]*?#}/g, '');
}

/**
 * @param {string} indexBundle the built entry, relative to the site root
 * @return {{html: string, stale: string[], dependencies: string[]}}
 */
function renderPage(indexBundle) {
  const stale = [];
  const child = read(GAME, stale);
  const blocks = {};
  for (const [, name, body] of child.matchAll(BLOCK)) {
    blocks[name] = body;
  }

  let html = read(BASE, stale)
    .replace(BLOCK, (match, name, fallback) => blocks[name] ?? fallback)
    .replace(/{{\s*asset\('js\/index\.js',\s*'webpack'\)\s*}}/g, '/' + indexBundle)
    .replace('<title>', TRACKING + '<title>')
    .replace('</head>', '    <link rel="stylesheet" href="/ptbr/ptbr.css">\n    </head>');

  return {html: rendered(html), stale, dependencies: [BASE, GAME].map(rel => path.join(UPSTREAM_SRC, rel))};
}

function rendered(html) {
  const leftover = html.match(/{[{%][\s\S]*?[}%]}/);
  if (leftover) {
    throw new Error(`ptbr: page: unrendered Twig ${JSON.stringify(leftover[0])}`);
  }
  return html;
}

/** The scoring sectors, as SectorBlitzConstants lists them (webapp's route allows the same). */
function sectorIds() {
  const constants = fs.readFileSync(path.join(UPSTREAM_SRC, 'js/constants/SectorBlitzConstants.js'), 'utf8');
  const block = constants.match(/export const SECTORS = [\s\S]*?\]\);/)?.[0] ?? '';
  return [...block.matchAll(/\bid:\s*(\d+)/g)].map(([, id]) => id);
}

/**
 * @param {string} bundle the built sectorBlitz entry, relative to the site root
 * @return {{pages: Object<string, string>, stale: string[], dependencies: string[]}} html by output path
 */
function renderLeaderboard(bundle) {
  const stale = [];
  const template = read(LEADERBOARD, stale)
    .replace(/{{\s*path\('(\w+)'\)\s*}}/g, (match, route) => {
      if (!(route in ROUTES)) throw new Error(`ptbr: leaderboard: unknown route ${route}`);
      return ROUTES[route];
    })
    .replace(/{{\s*asset\('js\/sectorBlitz\.js',\s*'webpack'\)\s*}}/g, '/' + bundle)
    .replace('<title>', TRACKING + '<title>')
    .replace('</head>', '    <link rel="stylesheet" href="/ptbr/ptbr.css">\n    </head>');
  const page = sector => rendered(template.replace(/{{\s*sector\s*\?\?\s*''\s*}}/g, sector));
  const pages = {'sector-blitz/index.html': page('')};
  for (const id of sectorIds()) {
    pages[`sector-blitz/${id}/index.html`] = page(id);
  }
  const dependencies = [LEADERBOARD, 'js/constants/SectorBlitzConstants.js'].map(rel => path.join(UPSTREAM_SRC, rel));
  return {pages, stale, dependencies};
}

module.exports = {renderPage, renderLeaderboard};
