// The Brazilian Portuguese overlay's runtime, loaded ahead of structs-webapp's entry.
//
// Most of webapp's text is in its own source, which ptbr/strings/ translates at
// build time. Game data is not: struct classes, weapon names and the like come
// from the guild API in English, and some of it (structType.type) is also
// what webapp's code compares against. Such text is translated where it is
// shown, by overlay entries that call these helpers, never where it is read.
//
// __ptbr.guild is the guild this page plays through (guild.js), and
// __ptbr.recovery moves a recovered player of another guild into it (recovery.js),
// and __ptbr.player makes a new player's account and saves its key (player.js).
import terms from './terms.json';
import {guild} from './guild.js';
import {recovery} from './recovery.js';
import {player} from './player.js';

const lookup = new Map(Object.entries(terms));
const reported = new Set();

globalThis.__ptbr = Object.freeze({

  guild,

  recovery,

  player,

  /**
   * @param {*} text English game data
   * @return {*} its Portuguese, or the value as it was
   */
  t(text) {
    if (typeof text !== 'string') {
      return text;
    }
    const portuguese = lookup.get(text);
    // A guild's wording that terms.json lacks is shown in English, and said once.
    if (portuguese === undefined && /[A-Za-z]{2}/.test(text) && !reported.has(text)) {
      reported.add(text);
      console.warn(`[ptbr] no Portuguese for game data ${JSON.stringify(text)}: add it to ptbr/runtime/terms.json`);
    }
    return portuguese ?? text;
  },

  /**
   * Replaces the named text fields of a display-only copy in place.
   *
   * @param {object} obj
   * @param {string[]} names
   * @return {object} obj
   */
  fields(obj, names) {
    for (const name of names) {
      obj[name] = this.t(obj[name]);
    }
    return obj;
  },
});
