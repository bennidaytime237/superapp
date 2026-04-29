// Shared wallet utilities used by all pages.
// Requires config.js (for nothing currently, but load order: config → wallet → page).

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
