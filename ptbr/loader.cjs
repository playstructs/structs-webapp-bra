// Webpack loader: the Brazilian Portuguese overlay for structs-webapp's client sources.
const fs = require('node:fs');
const {translate, upstreamPath} = require('./translate.cjs');

module.exports = function ptbrLoader(source) {
  const rel = upstreamPath(this.resourcePath);
  const {code, stale, dependencies} = translate(rel, source);
  // A file without a twin yet is still watched, so adding one rebuilds.
  dependencies.forEach(file => fs.existsSync(file) ? this.addDependency(file) : this.addMissingDependency(file));
  for (const text of stale) {
    this.emitWarning(new Error(`ptbr: ${rel} no longer contains ${JSON.stringify(text)}`));
  }
  return code;
};
