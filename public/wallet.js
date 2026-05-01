// Shared wallet utilities used by all pages.
// Requires config.js (for nothing currently, but load order: config → wallet → page).

// ── Global image error handler (replaces onerror inline attributes) ──────────
// Images with data-img-fallback are hidden on load failure.
// Images with data-fallback-src get their src swapped first, then hidden if that also fails.
document.addEventListener('error', function(e) {
  var img = e.target;
  if (!img || img.tagName !== 'IMG' || !img.hasAttribute('data-img-fallback')) return;
  var fallback = img.getAttribute('data-fallback-src');
  if (fallback && img.src !== fallback) {
    img.src = fallback;
  } else {
    img.style.display = 'none';
  }
}, true); // capture phase — error doesn't bubble

// ── Shared click delegation for wallet / navigation actions ──────────────────
document.addEventListener('click', function(e) {
  var el = e.target.closest('[data-action]');
  if (!el) return;
  var action = el.dataset.action;
  var arg = el.dataset.arg;
  switch (action) {
    case 'connect-wallet':
      if (typeof connectWallet === 'function') connectWallet();
      break;
    case 'wallet-button':
      if (typeof walletAddress !== 'undefined' && walletAddress) {
        if (typeof toggleWalletMenu === 'function') toggleWalletMenu();
      } else {
        if (typeof connectWallet === 'function') connectWallet();
      }
      break;
    case 'copy-address':
      if (typeof copyAddress === 'function') copyAddress();
      break;
    case 'disconnect':
      if (typeof disconnect === 'function') disconnect();
      break;
    case 'toggle-mobile-menu':
      if (typeof toggleMobileMenu === 'function') toggleMobileMenu();
      break;
    case 'close-mobile-menu':
      if (typeof closeMobileMenu === 'function') closeMobileMenu(e);
      break;
    case 'navigate':
      if (arg) window.location.href = arg;
      break;
  }
});

/**
 * @param {string} address - Full 0x-prefixed Ethereum address.
 * @returns {string} Shortened form, e.g. "0x1234...5678".
 */
function formatAddr(address) {
  return address.slice(0, 6) + '...' + address.slice(-4);
}

/**
 * Fetches the ENS name for `address` and updates #connect-label if found.
 * @param {string} address
 */
function resolveWalletENS(address) {
  if (!address) return;
  fetch(`/api/ens?address=${address}`)
    .then(r => r.json())
    .then(d => { if (d.name) document.getElementById('connect-label').textContent = d.name; })
    .catch(() => {});
}

/**
 * @typedef {Object} SetupWalletOpts
 * @property {(addr: string) => void} [onConnected]    - Called on auto-connect and accountsChanged (new account).
 * @property {() => void}             [onDisconnected] - Called when accountsChanged fires with empty array.
 * @property {() => void}             [onChainChanged] - Called on chainChanged.
 */

/**
 * Sets up wallet auto-reconnect and MetaMask event listeners.
 * @param {SetupWalletOpts} [opts]
 * @returns {Promise<void>}
 */
async function setupWallet({ onConnected, onDisconnected, onChainChanged } = {}) {
  if (!window.ethereum) return;
  const accs = await window.ethereum.request({ method: 'eth_accounts' });
  if (accs.length > 0 && onConnected) onConnected(accs[0]);
  window.ethereum.on('accountsChanged', a => {
    if (a[0]) { onConnected?.(a[0]); }
    else { onDisconnected?.(); }
  });
  window.ethereum.on('chainChanged', () => onChainChanged?.());
}

/** Removes all sage_* cache entries to free localStorage space. */
function evictSageCache() {
  const toRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('sage_txcache_')) toRemove.push(k);
  }
  toRemove.forEach(k => localStorage.removeItem(k));
  localStorage.removeItem('sage_bridge_times');
  localStorage.removeItem('sage_radar_cache');
}

/**
 * Reads a TTL-wrapped cache entry written by lsSet.
 * @template T
 * @param {string} key
 * @param {number} ttlMs
 * @returns {T | null} The cached value, or null if missing or expired.
 */
function lsGet(key, ttlMs) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry || entry.t == null) return null;
    if (Date.now() - entry.t > ttlMs) { localStorage.removeItem(key); return null; }
    return entry.v;
  } catch { return null; }
}

/**
 * Writes a TTL-wrapped cache entry. Evicts sage caches on QuotaExceededError and retries once.
 * @param {string} key
 * @param {unknown} value
 * @param {number} ttlMs
 */
function lsSet(key, value, ttlMs) {
  const payload = JSON.stringify({ v: value, t: Date.now() });
  try {
    localStorage.setItem(key, payload);
  } catch (e) {
    if (e && e.name === 'QuotaExceededError') {
      try { evictSageCache(); localStorage.setItem(key, payload); } catch {}
    }
  }
}
