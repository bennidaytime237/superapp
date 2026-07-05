// Shared wallet utilities used by all pages.
// Requires config.js (for nothing currently, but load order: config → wallet → page).

// ── Global image error handler (replaces onerror inline attributes) ──────────
// Images with data-img-fallback are hidden on load failure.
// Images with data-fallback-src get their src swapped first, then hidden if that also fails.
document.addEventListener('error', function(e) {
  var img = e.target;
  if (!img || img.tagName !== 'IMG' || !img.hasAttribute('data-img-fallback')) return;
  var fallback = img.getAttribute('data-fallback-src');
  // The applied-flag (not a src comparison) prevents an infinite error loop when
  // a relative fallback URL never string-matches the absolute img.src property.
  if (fallback && !img.hasAttribute('data-fallback-applied')) {
    img.setAttribute('data-fallback-applied', '1');
    img.src = fallback;
  } else {
    img.style.display = 'none';
  }
}, true); // capture phase — error doesn't bubble

// Selector images get their src swapped as the user picks tokens/chains. If a
// previous src 404'd (image hidden above), a later successful load must bring
// the image back — and re-arm the fallback for the next swap.
document.addEventListener('load', function(e) {
  var img = e.target;
  if (!img || img.tagName !== 'IMG' || !img.hasAttribute('data-img-fallback')) return;
  if (img.style.display === 'none') img.style.display = '';
  img.removeAttribute('data-fallback-applied');
}, true); // capture phase — load on subresources doesn't bubble

// ── Mobile menu (shared by all pages that render #mobile-menu) ───────────────
function toggleMobileMenu() { document.getElementById('mobile-menu').classList.toggle('hidden'); }
function closeMobileMenu(e) { if (e.target === document.getElementById('mobile-menu')) document.getElementById('mobile-menu').classList.add('hidden'); }

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
    case 'toggle-info-menu':
      toggleInfoMenu();
      break;
    case 'navigate':
      if (arg) window.location.href = arg;
      break;
  }
});

function toggleInfoMenu() {
  var menu = document.getElementById('info-menu');
  if (!menu) return;
  menu.classList.toggle('hidden');
}

document.addEventListener('click', function(e) {
  var menu = document.getElementById('info-menu');
  if (!menu || menu.classList.contains('hidden')) return;
  if (!e.target.closest('[data-action="toggle-info-menu"]') && !e.target.closest('#info-menu')) {
    menu.classList.add('hidden');
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
  fetch(`/api/ens?address=${encodeURIComponent(address)}`)
    .then(r => r.json())
    .then(d => {
      // Ignore stale responses that land after the user switched accounts.
      if (typeof walletAddress !== 'undefined' && walletAddress && walletAddress !== address) return;
      var lbl = document.getElementById('connect-label');
      if (d.name && lbl) lbl.textContent = d.name;
    })
    .catch(() => {});
}

/**
 * Shows a dismissible banner when no EIP-1193 wallet is detected.
 * On mobile it offers a deep-link to open the current page inside
 * MetaMask's built-in browser. On desktop it links to the extension
 * download page. No third-party library required.
 */
function showNoWalletMessage() {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const existing = document.getElementById('no-wallet-banner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'no-wallet-banner';
  banner.setAttribute('style',
    'position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);' +
    'z-index:9999;width:min(360px,calc(100vw - 2rem));' +
    'background:#1c1c1e;border:1px solid rgba(255,255,255,0.12);' +
    'border-radius:16px;padding:1rem 2.5rem 1rem 1.25rem;' +
    'color:#fff;box-shadow:0 8px 32px rgba(0,0,0,0.4);' +
    'display:flex;flex-direction:column;gap:0.5rem'
  );

  const closeBtn = document.createElement('button');
  closeBtn.setAttribute('style',
    'position:absolute;top:0.75rem;right:0.75rem;background:none;border:none;' +
    'color:rgba(255,255,255,0.5);cursor:pointer;font-size:1.1rem;line-height:1;padding:0'
  );
  closeBtn.textContent = '✕';
  closeBtn.onclick = () => banner.remove();

  const title = document.createElement('span');
  title.setAttribute('style', 'font-weight:600;font-size:0.875rem');
  title.textContent = 'No wallet detected';

  const subtitle = document.createElement('span');
  subtitle.setAttribute('style', 'font-size:0.8rem;color:rgba(255,255,255,0.55)');

  const link = document.createElement('a');
  link.setAttribute('style',
    'margin-top:0.25rem;background:#f6851b;color:#fff;text-align:center;' +
    'padding:0.5rem 1rem;border-radius:999px;font-size:0.8rem;font-weight:600;text-decoration:none'
  );

  if (isMobile) {
    subtitle.textContent = 'Open this page inside a wallet browser to connect.';
    link.href = 'https://metamask.app.link/dapp/' + location.href.replace(/^https?:\/\//, '');
    link.textContent = 'Open in MetaMask';
  } else {
    subtitle.textContent = 'Install the MetaMask extension to connect your wallet.';
    link.href = 'https://metamask.io/download';
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Get MetaMask →';
  }

  banner.append(closeBtn, title, subtitle, link);
  document.body.appendChild(banner);
  setTimeout(() => { if (banner.isConnected) banner.remove(); }, 8000);
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

/** Updates the sidebar wallet section to show connected state. */
function updateSidebarWallet(address) {
  const disc = document.getElementById('sidebar-disconnected');
  const conn = document.getElementById('sidebar-connected');
  const addr = document.getElementById('sidebar-addr');
  if (disc) disc.classList.add('hidden');
  if (conn) conn.classList.remove('hidden');
  if (addr) addr.textContent = formatAddr(address);
}

/** Resets the sidebar wallet section to disconnected state. */
function clearSidebarWallet() {
  const disc = document.getElementById('sidebar-disconnected');
  const conn = document.getElementById('sidebar-connected');
  if (disc) disc.classList.remove('hidden');
  if (conn) conn.classList.add('hidden');
}

/**
 * Default connectWallet implementation — pages that need more (balance fetch, etc.)
 * define their own async function connectWallet() which overrides this one.
 */
async function connectWallet() {
  if (!window.ethereum) { showNoWalletMessage(); return; }
  try {
    const accs = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (accs[0]) {
      localStorage.removeItem('sage_disconnected');
      updateSidebarWallet(accs[0]);
      const lbl = document.getElementById('connect-label');
      if (lbl) lbl.textContent = formatAddr(accs[0]);
    }
  } catch (e) {
    // 4001 = user dismissed the wallet prompt; not an error worth surfacing
    if (e && e.code !== 4001) console.warn('Wallet connect failed:', e.message || e);
  }
}

// Auto-sync sidebar wallet state on every page that has the sidebar.
document.addEventListener('DOMContentLoaded', async () => {
  if (!window.ethereum) return;
  try {
    // The listener registers unconditionally — only the initial resurrect is
    // skipped when the user explicitly disconnected, so the sidebar still
    // follows account switches after a later reconnect.
    window.ethereum.on('accountsChanged', a => {
      if (a[0] && localStorage.getItem('sage_disconnected') !== '1') updateSidebarWallet(a[0]);
      else clearSidebarWallet();
    });
    if (localStorage.getItem('sage_disconnected') === '1') return;
    const accs = await window.ethereum.request({ method: 'eth_accounts' });
    if (accs[0]) updateSidebarWallet(accs[0]);
  } catch {}
});

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
    // code 22 covers older Safari's QUOTA_EXCEEDED_ERR
    if (e && (e.name === 'QuotaExceededError' || e.code === 22)) {
      try { evictSageCache(); localStorage.setItem(key, payload); } catch {}
    }
  }
}
