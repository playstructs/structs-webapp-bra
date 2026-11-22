// The player's key, on estrut.net.
//
// webapp's signup walks a new player through a recovery key (what it is,
// its words, typing them back) before the account is made. estrut.net skips
// all of that: once the player has a name, the account is made, and the key
// is the player file the Account page downloads (download()).
//
// The key is gameState.mnemonic, the key of this browser's signing account:
// for a player who signed up here, the key the account was made with; for a
// recovered or added device, that device's own key, which logs in as the
// same player.

/**
 * Makes the account, as webapp's recovery key confirmation does once the
 * words match, on a page of its own.
 *
 * @param {GameState} gameState with signupRequest filled in
 * @param {AuthManager} authManager
 * @param {{MenuPage: object, PageHeader: Function}} ui webapp's, from the caller
 */
function createAccount(gameState, authManager, {MenuPage, PageHeader}) {
  const pageHeader = new PageHeader();
  pageHeader.pageLabel = 'Criando Conta';

  MenuPage.hideAndClearNav();

  MenuPage.setBodyContent(`
    <div class="full-screen-content-container">

      ${pageHeader.render()}

      <div class="common-layout-col">
        <div class="common-group-col">
          <div>Criando sua conta. Isso pode levar alguns instantes.</div>
        </div>
        <div>
          <button id="create-account-btn" class="sui-screen-btn sui-mod-disabled" disabled>Criando...</button>
        </div>
        <div class="common-inline-text-input-error-container">
          <div id="signup-error" class="sui-input-text-warning" role="alert">
            Não foi possível concluir seu cadastro. A guilda pode estar temporariamente indisponível. Tente novamente em instantes.
          </div>
        </div>
      </div>

    </div>
  `);

  MenuPage.hideAndClearDialoguePanel();

  pageHeader.init();

  const signal = MenuPage.router.navigationSignal;
  const button = document.getElementById('create-account-btn');
  const error = document.getElementById('signup-error');
  let inFlight = false;

  const setSubmitting = (submitting) => {
    button.disabled = submitting;
    button.textContent = submitting ? 'Criando...' : 'Tentar Novamente';
    button.classList.toggle('sui-mod-disabled', submitting);
    button.classList.toggle('sui-mod-primary', !submitting);
  };

  const failed = (reason) => {
    if (reason) console.error('[Signup] signup request failed:', reason);
    inFlight = false;
    if (signal.aborted) return;
    setSubmitting(false);
    error.classList.add('sui-mod-show');
  };

  const submit = () => {
    if (inFlight) return;
    inFlight = true;
    error.classList.remove('sui-mod-show');
    setSubmitting(true);
    authManager.signup(gameState.mnemonic).then((success) => {
      if (!success) {
        failed(null);
        return;
      }
      gameState.save();
      if (!signal.aborted) MenuPage.router.goto('Auth', 'signupSuccess');
    }).catch(failed);
  };

  button.addEventListener('click', submit);
  submit();
}

/**
 * @param {string} text
 * @return {string} text fit for a file name
 */
function fileNamePart(text) {
  return String(text ?? '').normalize('NFD').replace(/[^A-Za-z0-9_-]+/g, '');
}

/**
 * Saves the player's key as a text file.
 *
 * @param {string|null} mnemonic
 * @param {Player} player
 * @return {boolean} whether there was a key to save
 */
function download(mnemonic, player) {
  if (!mnemonic) return false;
  const name = ['estrut-net', fileNamePart(player?.getUsername?.()), fileNamePart(player?.id)]
    .filter(Boolean)
    .join('-');
  const url = URL.createObjectURL(new Blob([`${mnemonic}\n`], {type: 'text/plain'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${name}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return true;
}

export const player = Object.freeze({createAccount, download});
