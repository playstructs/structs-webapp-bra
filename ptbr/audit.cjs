// Checks the Brazilian Portuguese overlay against the structs-webapp submodule.
//
//   node ptbr/audit.cjs              report
//   node ptbr/audit.cjs --strict     also exit 1 if anything is reported
//   node ptbr/audit.cjs --json       machine-readable report
//   node ptbr/audit.cjs path/Part    only upstream files whose path contains Part
//
// Reports, after a submodule update or while translating:
//   stale        overlay text that upstream no longer contains
//   orphan       a strings file whose upstream file is gone
//   untranslated English a player would read that the overlay leaves as is
//   mismatch     an entry whose ${…} values, tags or quotes differ from its key
//   broken       source that no longer parses once translated
//
// Portuguese and English share an alphabet, so "still English" means the text
// survives the overlay unchanged: it is found both before and after.
// "Would read" is a heuristic over the parsed source: HTML text and
// alt/title/placeholder/aria-label/data-sui-tooltip values in strings and templates, and
// prose-like string literals, skipping console output, thrown errors, DOM
// lookups and the like. English kept on purpose is listed in ptbr/keep.json
// (everywhere) or under "$keep" in the file's own strings JSON.
const fs = require('node:fs');
const path = require('node:path');
const {UPSTREAM_SRC, STRINGS_DIR, readStringsFile, translate} = require('./translate.cjs');
const acorn = require(require.resolve('acorn', {paths: [UPSTREAM_SRC]}));

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const asJson = args.includes('--json');
const filters = args.filter(arg => !arg.startsWith('--'));

const keep = new Set(JSON.parse(fs.readFileSync(path.join(__dirname, 'keep.json'), 'utf8')));

const SCAN_SKIP = /^js\/(ts|tests|vendor)\//;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const file = path.join(dir, entry.name);
    entry.isDirectory() ? walk(file, out) : out.push(file);
  }
  return out;
}

const rel = file => path.relative(UPSTREAM_SRC, file).split(path.sep).join('/');

const sources = [
  ...walk(path.join(UPSTREAM_SRC, 'js')).filter(file => file.endsWith('.js')),
  ...walk(path.join(UPSTREAM_SRC, 'templates')).filter(file => file.endsWith('.twig')),
].map(rel).filter(file => !SCAN_SKIP.test(file));

// ---- What a player reads ----

const LATIN = /[A-Za-z]{2,}/;

function clean(text) {
  return text.replace(/&nbsp;/g, ' ').replace(/&[a-z]+;|&#\d+;/g, '').replace(/\s+/g, ' ').trim();
}

/** Text nodes and readable attributes of an HTML-ish fragment. */
function fromMarkup(text) {
  const found = [];
  for (const [, , value] of text.matchAll(/\b(alt|title|placeholder|aria-label|data-sui-tooltip)="([^"]*)"/g)) {
    found.push(value);
  }
  const withoutTags = text.replace(/<[^>]*>?/g, '\n').replace(/^[^<]*>/, '\n');
  found.push(...withoutTags.split('\n'));
  return found.map(clean).filter(value => LATIN.test(value));
}

/** A plain string that reads as words rather than an identifier. */
function isProse(text) {
  const value = clean(text);
  if (!LATIN.test(value) || /^(https?:|\/|\.\/|#|data:)/.test(value)) {
    return false;
  }
  if (/\s/.test(value)) {
    // Selectors, class lists and CSS values have spaces but no sentence shape.
    return !/^[a-z0-9_\-.#:\[\]=(),>*'"\s]+$/.test(value) && !/^[\w-]+(\s[\w-]+)*$/.test(value) || /[A-Z]/.test(value);
  }
  // A lone capitalised word; all-caps words are enum values.
  return /^[A-Z][a-z]+[.!?:]?$/.test(value);
}

const QUIET_CALLEES = /^(console\.\w+|document\.(getElementById|querySelector|querySelectorAll|createElement|getElementsByClassName)|.*\.(getElementById|querySelector|querySelectorAll|closest|matches|addEventListener|removeEventListener|dispatchEvent|getItem|setItem|removeItem|add|remove|toggle|contains|getAttribute|setAttribute|removeAttribute|hasAttribute|startsWith|endsWith|includes|split|replace|replaceAll|indexOf|padStart|padEnd|join|test|match|postMessage|tap|debug|info|log|warn|error|trace|fetchJson|get|post|put|delete|send|goto|register|registerController|on|off|emit)|require|setTimeout|Symbol|CustomEvent|Event|RegExp)$/;

function calleeName(node) {
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression') {
    const property = node.computed ? '[]' : node.property.name;
    return `${calleeName(node.object)}.${property}`;
  }
  if (node.type === 'ThisExpression') return 'this';
  return '?';
}

/** True when a string in this position is code, not something shown. */
function quietPosition(node, parent, grandparent) {
  if (!parent) return false;
  switch (parent.type) {
    case 'ImportDeclaration':
    case 'ExportNamedDeclaration':
    case 'ExportAllDeclaration':
    case 'ImportExpression':
    case 'SwitchCase':
    case 'ThrowStatement':
      return true;
    case 'Property':
    case 'PropertyDefinition':
    case 'MethodDefinition':
      return parent.key === node;
    case 'MemberExpression':
      return parent.property === node;
    case 'BinaryExpression':
      return ['===', '!==', '==', '!=', 'in', 'instanceof'].includes(parent.operator);
    case 'CallExpression':
      return parent.callee !== node && QUIET_CALLEES.test(calleeName(parent.callee));
    case 'NewExpression':
      return /Error$|^(RegExp|URL|Worker|CustomEvent|Event|WebSocket)$/.test(calleeName(parent.callee));
    case 'TaggedTemplateExpression':
      return true;
    case 'TemplateLiteral':
      return grandparent && quietPosition(parent, grandparent, null);
    default:
      return false;
  }
}

function strings(code) {
  const found = [];
  let ast;
  try {
    ast = acorn.parse(code, {ecmaVersion: 'latest', sourceType: 'module', locations: true, allowAwaitOutsideFunction: true, allowHashBang: true});
  } catch (error) {
    return [{line: error.loc?.line ?? 0, text: `(could not parse: ${error.message})`}];
  }
  const visit = (node, parent, grandparent) => {
    if (!node || typeof node.type !== 'string') return;
    const quiet = quietPosition(node, parent, grandparent);
    if (node.type === 'Literal' && typeof node.value === 'string' && !quiet) {
      const texts = /<\/?[a-z][^>]*>/i.test(node.value) ? fromMarkup(node.value) : (isProse(node.value) ? [clean(node.value)] : []);
      texts.forEach(text => found.push({line: node.loc.start.line, text}));
    }
    if (node.type === 'TemplateLiteral' && !quiet) {
      // Read whole, with each ${…} as a break, so a tag split by one is still a tag.
      const whole = node.quasis.map(quasi => quasi.value.cooked ?? quasi.value.raw).join('\u0000');
      const markup = /<\/?[a-z][^>]*>/i.test(whole);
      const lineOf = text => node.loc.start.line + (whole.slice(0, Math.max(0, whole.indexOf(text))).match(/\n/g)?.length ?? 0);
      if (markup) {
        fromMarkup(whole)
          .flatMap(text => text.split('\u0000'))
          .map(clean)
          .filter(text => LATIN.test(text))
          .forEach(text => found.push({line: lineOf(text), text}));
      } else {
        // A sentence with values in it reads as prose even between the ${…}.
        const sentence = node.expressions.length > 0 && /[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(whole) && /[A-Z]/.test(whole);
        whole.split('\u0000')
          .filter(value => isProse(value) || (sentence && LATIN.test(value)))
          .map(clean)
          .filter(text => LATIN.test(text))
          .forEach(text => found.push({line: lineOf(text), text}));
      }
    }
    for (const key of Object.keys(node)) {
      if (key === 'loc') continue;
      const child = node[key];
      if (Array.isArray(child)) child.forEach(item => visit(item, node, parent));
      else if (child && typeof child.type === 'string') visit(child, node, parent);
    }
  };
  visit(ast, null, null);
  return found;
}

function markup(code) {
  const found = [];
  code.split('\n').forEach((line, index) => fromMarkup(line).forEach(text => found.push({line: index + 1, text})));
  return found;
}

// ---- Report ----

const report = {stale: [], untranslated: [], orphans: [], mismatches: [], broken: []};

const scan = (file, code) => file.endsWith('.twig') ? markup(code.replace(/{#[\s\S]*?#}/g, '')) : strings(code);

const multiset = values => [...values].sort().join('\u0000');
const expressions = text => multiset([...text.matchAll(/\$\{(?:[^{}]|\{[^{}]*\})*\}/g)]
  .map(([value]) => value.replace(/__ptbr\.t\((.*)\)\}$/, '$1}').replace(/\s+/g, '')));
const tags = text => multiset([...text.matchAll(/<(\/?[a-zA-Z][\w-]*)/g)].map(([, name]) => name.toLowerCase()));
const edge = text => /^['"`]/.test(text) ? text[0] : '';
const tail = text => /['"`]$/.test(text) ? text.at(-1) : '';

const DRAWN = 'ÁÀÂÃÉÊÍÓÔÕÚÜÇáàâãéêíóôõúüç‘’“”–—…ºª°';

/** What a translation has to carry over from its key. */
function mismatch(from, to) {
  if (expressions(from) !== expressions(to)) return '${…} values differ';
  if (tags(from) !== tags(to)) return 'tags differ';
  if (edge(from) !== edge(to) || tail(from) !== tail(to)) return 'quotes differ';
  const undrawn = [...to].find(char => char > '~' && !DRAWN.includes(char) && !from.includes(char));
  if (undrawn) return `${undrawn} is not in the pixel fonts (ptbr/art/fonts.py)`;
  return null;
}

for (const file of sources) {
  if (filters.length && !filters.some(filter => file.includes(filter))) continue;
  const source = fs.readFileSync(path.join(UPSTREAM_SRC, file), 'utf8');
  const {code, stale} = translate(file, source);
  stale.forEach(text => report.stale.push({file, text}));
  const entries = readStringsFile(file);
  const kept = new Set(entries.$keep ?? []);
  const english = new Set(scan(file, source).map(({text}) => text));
  for (const {line, text} of scan(file, code)) {
    if (text.startsWith('(could not parse')) report.broken.push({file, line, text});
    else if (english.has(text) && !keep.has(text) && !kept.has(text)) report.untranslated.push({file, line, text});
  }
  for (const [from, to] of Object.entries(entries)) {
    const problem = from !== '$keep' && mismatch(from, to);
    if (problem) report.mismatches.push({file, text: from, problem});
  }
}

// Overlay files whose upstream file is gone.
if (fs.existsSync(STRINGS_DIR) && !filters.length) {
  for (const file of walk(STRINGS_DIR)) {
    const upstream = path.relative(STRINGS_DIR, file).split(path.sep).join('/').replace(/\.json$/, '');
    if (!fs.existsSync(path.join(UPSTREAM_SRC, upstream))) report.orphans.push(upstream);
  }
}

// Art drawn from upstream's (ptbr/art/): stale once upstream changes what it was drawn from.
if (!filters.length) {
  const crypto = require('node:crypto');
  for (const [record, script] of [['banners.json', 'banners.py'], ['fonts.json', 'fonts.py']]) {
    const recorded = JSON.parse(fs.readFileSync(path.join(__dirname, 'art', record), 'utf8'));
    for (const [file, hash] of Object.entries(recorded)) {
      const upstream = path.join(UPSTREAM_SRC, file);
      const now = fs.existsSync(upstream) && crypto.createHash('sha256').update(fs.readFileSync(upstream)).digest('hex');
      if (now !== hash) report.stale.push({file, text: `changed upstream: run ptbr/art/${script} again`});
    }
  }
}

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  for (const {file, text} of report.stale) console.log(`stale        ${file}: ${JSON.stringify(text)}`);
  for (const file of report.orphans) console.log(`orphan       ptbr/strings/${file}.json (upstream file removed)`);
  for (const {file, line, text} of report.broken) console.log(`broken       ${file}:${line}: ${text}`);
  for (const {file, text, problem} of report.mismatches) console.log(`mismatch     ${file}: ${problem}: ${JSON.stringify(text)}`);
  for (const {file, line, text} of report.untranslated) console.log(`untranslated ${file}:${line}: ${text}`);
  console.log(`\n${report.stale.length} stale, ${report.orphans.length} orphaned, ${report.broken.length} broken, ${report.mismatches.length} mismatched, ${report.untranslated.length} untranslated`);
}

const failed = Object.values(report).some(list => list.length > 0);
process.exit(strict && failed ? 1 : 0);
