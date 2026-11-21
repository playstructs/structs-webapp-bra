// Recovering the account of a player who belongs to another guild.
//
// webapp recovers an account through the guild it plays through. Guild APIs
// can be shared by several guilds (VitalityDAO's is SN Corp's), so the API
// accepting a login says nothing about which guild the player is in: a player
// of another guild could sign in here and play as that guild's member. So the
// chain is asked first, before webapp's recovery makes any guild API call,
// and recovery goes on only once the chain shows the player in this guild.
//
// A player of another guild is moved here by their own recovery key.
// MsgGuildMembershipJoin, signed by the player's own address, joins a guild
// whose join minimum is 0 without anyone else's consent (the chain asks only
// for the player's own GuildMembership permission, which a recovery key holds),
// leaves the old guild and connects the player to the new guild's entry
// substation. Recovery then waits for the chain to show the move and for the
// guild API to know the player and accept their login (its indexer trails the
// chain by a few blocks).
import {chain} from './guild.js';

const JOIN = '/structs.structs.MsgGuildMembershipJoin';
const POLL_MS = 3000;
const CHAIN_WAIT_MS = 60000;
const API_WAIT_MS = 180000;

function pause(ms, signal) {
  return new Promise((resolve, reject) => {
    signal?.throwIfAborted();
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, ms);
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    signal?.addEventListener('abort', abort, {once: true});
  });
}

/**
 * Asks until `check` answers true or `ms` has passed.
 *
 * @param {function(): Promise<boolean>} check
 * @return {Promise<boolean>} whether it answered true in time
 */
async function until(check, ms, signal) {
  const deadline = Date.now() + ms;
  for (;;) {
    signal?.throwIfAborted();
    try {
      if (await check()) return true;
    } catch (error) {
      console.debug(`[ptbr] recovery: still waiting (${error.message})`);
    }
    if (Date.now() >= deadline) return false;
    await pause(POLL_MS, signal);
  }
}

/**
 * The address's player as the chain has it. An unknown address is answered
 * with an empty playerId; an error means the chain could not be read.
 *
 * @return {Promise<{playerId: string, guildId: string}|null>} null: not a player
 */
async function playerOf(address) {
  const {playerId} = await chain(`/structs/address/${encodeURIComponent(address)}`);
  if (!playerId) return null;
  const {Player} = await chain(`/structs/player/${encodeURIComponent(playerId)}`);
  if (!Player) throw new Error(`player ${playerId} unreadable`);
  return {playerId, guildId: Player.guildId || ''};
}

/**
 * Makes sure a recovered player is in this guild before any guild API call,
 * moving them here from another guild when they can be.
 *
 * @param {AuthManager} authManager webapp's, with the recovery key loaded
 * @param {string} address the recovery key's address
 * @param {AbortSignal} signal
 * @param {function(string): void} say shows progress on the waiting page
 * @return {Promise<boolean>} whether recovery may go on: the chain shows the
 *   player in this guild, or the key is no player's (webapp then reports it)
 */
async function ensureInThisGuild(authManager, address, signal, say = () => {}) {
  const here = authManager.gameState.thisGuild;
  const refuse = reason => {
    console.warn(`[ptbr] recovery stopped: ${reason}`);
    return false;
  };
  if (!here?.id) return refuse('no guild chosen');

  let player;
  try {
    player = await playerOf(address);
  } catch (error) {
    return refuse(`the chain could not be read (${error.message})`);
  }
  signal.throwIfAborted();
  if (!player) return true;
  if (player.guildId === here.id) return true;

  let theirs;
  let ours;
  try {
    [{Guild: theirs}, {Guild: ours}] = await Promise.all([
      player.guildId ? chain(`/structs/guild/${encodeURIComponent(player.guildId)}`) : {Guild: null},
      chain(`/structs/guild/${encodeURIComponent(here.id)}`),
    ]);
  } catch (error) {
    return refuse(`the guilds could not be read (${error.message})`);
  }
  signal.throwIfAborted();
  if (theirs?.owner === player.playerId) {
    // Leaving would leave the guild they own behind.
    return refuse(`${player.playerId} owns guild ${player.guildId}`);
  }
  if (String(ours?.joinInfusionMinimum ?? '') !== '0') {
    // Joining past a minimum means moving the player's stake to this guild's
    // reactor, which recovery does not do on their behalf.
    return refuse(`guild ${here.id} asks a join minimum of ${ours?.joinInfusionMinimum}`);
  }

  const name = here.name || ours?.name || here.id;
  console.info(`[ptbr] recovery: moving ${player.playerId} from guild ${player.guildId || '(none)'} to ${here.id}`);
  say(`Sua conta pertence a outra guilda. Transferindo-a para a ${name}…`);

  const signing = authManager.signingClientManager;
  await signing.initSigningClient();
  signal.throwIfAborted();
  // guildId alone: the player is the signer's own, the substation the guild's entry substation.
  const id = signing.queue.enqueueImmediate(JOIN, {guildId: here.id});
  const tx = await signing.queue.whenSettled(id, signal);
  console.debug(`[ptbr] recovery: join ${tx.status}`, tx.error ?? '');

  // The chain, not the transaction's outcome, decides: a join that landed
  // after its outcome was lost still counts.
  const moved = await until(async () => (await playerOf(address))?.guildId === here.id, CHAIN_WAIT_MS, signal);
  if (!moved) return refuse(`${player.playerId} is still not in guild ${here.id}`);

  say(`Aguardando a ${name} reconhecer sua conta…`);
  const known = await until(async () => {
    await authManager.guildAPI.getPlayerIdByAddressAndGuild(address, here.id);
    return authManager.reauthenticate();
  }, API_WAIT_MS, signal);
  if (!known) {
    // The move is on chain, so webapp's recovery may still try.
    console.warn(`[ptbr] recovery: guild ${here.id}'s API does not accept ${player.playerId} yet`);
  }
  say('Recuperando sua conta.');
  return true;
}

export const recovery = Object.freeze({ensureInThisGuild});
