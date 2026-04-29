// Shared wallet utilities used by all pages.
// Requires config.js (for nothing currently, but load order: config → wallet → page).

// Returns a shortened address like 0x1234...5678.
function formatAddr(address) {
  return address.slice(0, 6) + '...' + address.slice(-4);
}

// Fetches the ENS name for `address` and updates #connect-label if found.
function resolveWalletENS(address) {
  if (!address) return;
  fetch(`/api/ens?address=${address}`)
    .then(r => r.json())
    .then(d => { if (d.name) document.getElementById('connect-label').textContent = d.name; })
    .catch(() => {});
}

// Sets up wallet auto-reconnect and MetaMask event listeners.
// opts.onConnected(addr)  — called on auto-connect and accountsChanged (new account)
// opts.onDisconnected()   — called when accountsChanged fires with empty array
// opts.onChainChanged()   — called on chainChanged
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

// Removes all sage_* cache entries to free localStorage space.
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

// Reads a TTL-wrapped cache entry. Returns the value if fresh, null if expired or missing.
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

// Writes a TTL-wrapped cache entry. Evicts sage caches on QuotaExceededError and retries once.
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
