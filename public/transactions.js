function toggleMobileMenu() { document.getElementById('mobile-menu').classList.toggle('hidden'); }
function closeMobileMenu(e) { if (e.target === document.getElementById('mobile-menu')) document.getElementById('mobile-menu').classList.add('hidden'); }

let walletAddress = null;
let txData = [];
let visibleCount = 10;
const PAGE_SIZE = 10;

const selected = { chain: new Set(), token: new Set(), status: new Set() };
let allChains = [], allTokens = [];

function populateFilters() {
  const chains = new Set();
  const tokens = new Set();
  txData.forEach(tx => {
    if (tx.fromChain) chains.add(tx.fromChain);
    if (tx.toChain) chains.add(tx.toChain);
    if (tx.fromToken) tokens.add(tx.fromToken);
    if (tx.toToken) tokens.add(tx.toToken);
  });
  allChains = [...chains].sort();
  allTokens = [...tokens].sort();
  renderDropdown('chain', allChains);
  renderDropdown('token', allTokens);
  renderDropdown('status', ['filled', 'pending']);
}

function renderDropdown(key, options) {
  const menu = document.getElementById(`dd-${key}-menu`);
  // Use addEventListener on labels so option values can't break out of attribute/JS contexts.
  Safe.setHTML(menu, options.map((o, i) => {
    const checked = selected[key].has(o);
    return Safe.html`<label data-key="${key}" data-value="${o}" data-idx="${i}" class="flex items-center gap-2 px-3 py-2 hover:bg-surface-container-low cursor-pointer transition-colors text-sm">
      <input type="checkbox" ${Safe.raw(checked ? 'checked' : '')} class="rounded border-outline-variant/30 text-primary focus:ring-primary/30"/>
      <span class="text-on-surface">${o}</span>
    </label>`;
  }));
  menu.querySelectorAll('label[data-key]').forEach(lbl => {
    lbl.addEventListener('change', () => toggleFilter(lbl.dataset.key, lbl.dataset.value));
  });
  updateLabel(key);
}

function toggleFilter(key, value) {
  if (selected[key].has(value)) selected[key].delete(value);
  else selected[key].add(value);
  updateLabel(key);
  render();
}

function updateLabel(key) {
  const label = document.getElementById(`dd-${key}-label`);
  const btn = label.parentElement;
  const count = selected[key].size;
  const defaults = { chain: 'All chains', token: 'All tokens', status: 'All status' };
  if (count === 0) {
    label.textContent = defaults[key];
    btn.className = 'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high transition-colors';
  } else if (count === 1) {
    label.textContent = [...selected[key]][0];
    btn.className = 'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold bg-primary text-on-primary transition-colors';
  } else {
    label.textContent = `${count} selected`;
    btn.className = 'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold bg-primary text-on-primary transition-colors';
  }
}

function toggleDrop(key) {
  const menu = document.getElementById(`dd-${key}-menu`);
  const wasHidden = menu.classList.contains('hidden');
  // Close all
  ['chain','token','status'].forEach(k => document.getElementById(`dd-${k}-menu`).classList.add('hidden'));
  if (wasHidden) {
    menu.classList.remove('hidden');
    setTimeout(() => document.addEventListener('click', function close(e) {
      if (!document.getElementById(`dd-${key}`).contains(e.target)) {
        menu.classList.add('hidden');
        document.removeEventListener('click', close);
      }
    }), 0);
  }
}

function updateConnectBtn() {
  const label = document.getElementById('connect-label');
  const btn = document.getElementById('connect-btn');
  if (walletAddress) {
    label.textContent = formatAddr(walletAddress);
    resolveWalletENS(walletAddress);
    btn.className = 'flex items-center gap-2 px-3 py-1.5 bg-surface-container-high text-on-surface rounded-full text-xs font-bold active:scale-95 transition-transform';
  } else {
    label.textContent = 'Connect';
    btn.className = 'flex items-center gap-2 px-3 py-1.5 bg-primary text-on-primary rounded-full text-xs font-bold active:scale-95 transition-transform';
  }
}

async function connectWallet() {
  if (!window.ethereum) { alert('Install MetaMask'); return; }
  const accs = await window.ethereum.request({ method:'eth_requestAccounts' });
  walletAddress = accs[0];
  updateConnectBtn();
  await loadTransactions();
}

async function initWallet() {
  if (window.ethereum) {
    const accs = await window.ethereum.request({ method:'eth_accounts' });
    if (accs.length > 0) {
      walletAddress = accs[0];
      updateConnectBtn();
      await loadTransactions();
    } else {
      showEmpty('Connect wallet to view transactions');
    }
    window.ethereum.on('accountsChanged', async (accs) => {
      walletAddress = accs[0] || null;
      updateConnectBtn();
      if (walletAddress) await loadTransactions();
      else { txData = []; showEmpty('Connect wallet to view transactions'); }
    });
    window.ethereum.on('chainChanged', async () => { if (walletAddress) await loadTransactions(); });
  } else {
    showEmpty('Install MetaMask to view transactions');
  }
}

function showEmpty(msg) {
  document.getElementById('tx-list').innerHTML = `<div class="text-center py-16">
    <span class="material-symbols-outlined text-5xl text-on-surface-variant/20 mb-3">receipt_long</span>
    <p class="text-on-surface-variant">${msg}</p>
    <a href="bridge.html" class="inline-block mt-4 px-6 py-3 bg-primary text-on-primary rounded-full font-bold text-sm">Make your first bridge</a>
  </div>`;
}

function cacheKey() { return 'sage_txcache_' + (walletAddress||'').toLowerCase(); }

async function loadTransactions() {
  visibleCount = PAGE_SIZE;
  const list = document.getElementById('tx-list');

  // Show cached data instantly
  const cached = lsGet(cacheKey(), 5 * 60 * 1000);
  if (cached && cached.length > 0) {
    txData = cached;
    populateFilters();
    render();
  } else {
    list.innerHTML = '<div class="flex items-center justify-center gap-2 py-16 text-sm text-on-surface-variant"><div class="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>Loading transactions...</div>';
  }

  // Fetch fresh in background
  try {
    const res = await fetch(`/api/transactions?address=${walletAddress}`);
    const data = await res.json();
    txData = data.deposits || [];
    lsSet(cacheKey(), txData, 5 * 60 * 1000);
    populateFilters();
    render();
  } catch (e) {
    console.error('Failed to load transactions:', e);
    if (!txData.length) {
      list.innerHTML = '<div class="text-center py-16"><p class="text-on-surface-variant">Failed to load transactions</p><button data-action="load-transactions" class="mt-4 px-6 py-3 bg-primary text-on-primary rounded-full font-bold text-sm">Retry</button></div>';
    }
  }
}

function showMore() {
  visibleCount += PAGE_SIZE;
  render(false);
}

const EXP = {
  1:'https://etherscan.io/tx/',42161:'https://arbiscan.io/tx/',8453:'https://basescan.org/tx/',
  10:'https://optimistic.etherscan.io/tx/',137:'https://polygonscan.com/tx/',324:'https://explorer.zksync.io/tx/',
  59144:'https://lineascan.build/tx/',34443:'https://explorer.mode.network/tx/',81457:'https://blastscan.io/tx/',
  534352:'https://scrollscan.com/tx/',7777777:'https://explorer.zora.energy/tx/',
};

function shortAddr(a) { return a ? a.slice(0,6)+'…'+a.slice(-4) : '--'; }

function render(resetPage) {
  if (resetPage !== false) visibleCount = PAGE_SIZE;
  const list = document.getElementById('tx-list');
  const q = (document.getElementById('search-input').value || '').toLowerCase().trim();

  let history = txData.filter(tx => {
    if (selected.chain.size && !selected.chain.has(tx.fromChain) && !selected.chain.has(tx.toChain)) return false;
    if (selected.token.size && !selected.token.has(tx.fromToken) && !selected.token.has(tx.toToken)) return false;
    if (selected.status.size && !selected.status.has(tx.status)) return false;
    if (q) {
      const hay = `${tx.fromToken} ${tx.toToken} ${tx.fromChain} ${tx.toChain} ${tx.recipient||''} ${tx.depositor||''} ${tx.depositTxHash||''} ${tx.amount} ${tx.outputAmount||''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  if (history.length === 0) {
    showEmpty('No transactions yet');
    return;
  }

  const cards = history.map(tx => {
    const date = new Date(tx.timestamp);
    const dateStr = date.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
    const timeStr = date.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });

    const depositUrl = tx.depositTxHash && tx.fromChainId ? (EXP[tx.fromChainId] || 'https://etherscan.io/tx/') + tx.depositTxHash : null;
    const fillUrl = tx.fillTxHash && tx.toChainId ? (EXP[tx.toChainId] || 'https://etherscan.io/tx/') + tx.fillTxHash : null;

    let statusBadge = Safe.html``;
    if (tx.status === 'filled') {
      const dur = tx.fillDuration;
      const durLabel = dur ? ' · ' + (dur < 60 ? dur + 's' : Math.floor(dur/60) + 'm ' + (dur%60) + 's') : '';
      statusBadge = Safe.html`<span class="text-[10px] font-bold text-primary bg-primary-container px-2 py-0.5 rounded-full">Filled${durLabel}</span>`;
    } else if (tx.status === 'pending') {
      statusBadge = Safe.html`<span class="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Pending</span>`;
    }

    const sageBadge = tx.isSage
      ? Safe.html`<span class="text-[10px] font-bold text-on-primary bg-primary px-2 py-0.5 rounded-full">Sage</span>`
      : Safe.html``;

    const recipientShort = shortAddr(tx.recipient);
    const isHL = tx.toChain === 'Hyperliquid';
    const recipientLabel = isHL ? 'Hyperliquid Bridge2' : recipientShort;

    const feeStr = tx.totalFeeUsd ? '$' + parseFloat(tx.totalFeeUsd).toFixed(2) : '--';

    const depositLink = depositUrl
      ? Safe.html`<a href="${Safe.url(depositUrl)}" target="_blank" rel="noopener" class="text-xs text-primary font-bold hover:underline inline-flex items-center gap-0.5">Deposit <span class="material-symbols-outlined text-[10px]">open_in_new</span></a>`
      : Safe.html`<span class="text-xs text-on-surface-variant">--</span>`;
    const fillLink = fillUrl
      ? Safe.html`<a href="${Safe.url(fillUrl)}" target="_blank" rel="noopener" class="text-xs text-primary font-bold hover:underline inline-flex items-center gap-0.5">Fill <span class="material-symbols-outlined text-[10px]">open_in_new</span></a>`
      : Safe.html``;

    return Safe.html`<div class="bg-surface-container-lowest rounded-xl border border-outline-variant/10 mb-3 overflow-hidden">
      <div class="flex items-center justify-between px-5 pt-4 pb-2">
        <div class="flex items-center gap-2">
          <p class="text-xs text-on-surface-variant">${dateStr} · ${timeStr}</p>
          ${sageBadge}
        </div>
        <div class="flex items-center gap-2">
          ${statusBadge}
        </div>
      </div>

      <div class="px-5 pb-4">
        <div class="flex items-center gap-3 mb-3">
          <div class="flex-1">
            <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-0.5">Sent</p>
            <p class="text-lg font-black text-on-background">${tx.amount} <span class="text-sm font-bold text-on-surface-variant">${tx.fromToken}</span></p>
            <p class="text-xs text-on-surface-variant">${tx.fromChain}</p>
          </div>
          <span class="material-symbols-outlined text-on-surface-variant/40 text-xl flex-shrink-0">arrow_forward</span>
          <div class="flex-1">
            <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-0.5">Received</p>
            <p class="text-lg font-black text-on-background">${tx.outputAmount || '--'} <span class="text-sm font-bold text-on-surface-variant">${tx.toToken}</span></p>
            <p class="text-xs text-on-surface-variant">${tx.toChain}</p>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3 pt-3 border-t border-outline-variant/10">
          <div>
            <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-0.5">Recipient</p>
            <p class="text-xs font-mono text-on-surface truncate" title="${tx.recipient || ''}">${recipientLabel}</p>
          </div>
          <div>
            <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-0.5">Transactions</p>
            <div class="flex flex-col gap-0.5">
              ${depositLink}
              ${fillLink}
            </div>
          </div>
          <div>
            <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-0.5">Net Fee</p>
            <p class="text-xs font-bold text-on-surface">${feeStr}</p>
          </div>
        </div>
      </div>
    </div>`;
  });

  const visible = cards.slice(0, visibleCount);
  const remaining = cards.length - visibleCount;

  const moreBtn = remaining > 0
    ? Safe.html`<button id="show-more-btn" class="w-full py-3 mt-2 bg-surface-container-low text-on-surface-variant rounded-xl font-bold text-sm hover:bg-surface-container-high transition-colors">Show ${Math.min(remaining, PAGE_SIZE)} more of ${remaining} remaining</button>`
    : Safe.html``;
  Safe.setHTML(list, Safe.html`${visible}${moreBtn}`);
  const smb = document.getElementById('show-more-btn');
  if (smb) smb.addEventListener('click', showMore);
}

initWallet();

// ── Event delegation & input listeners ──────────────────────────────────────
document.addEventListener('click', function(e) {
  var el = e.target.closest('[data-action]');
  if (!el) return;
  var action = el.dataset.action;
  var arg = el.dataset.arg;
  switch (action) {
    case 'toggle-drop':       toggleDrop(arg); break;
    case 'load-transactions': loadTransactions(); break;
  }
});
document.addEventListener('DOMContentLoaded', function() {
  var si = document.getElementById('search-input');
  if (si) si.addEventListener('input', render);
});
