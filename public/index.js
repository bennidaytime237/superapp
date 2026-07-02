
// ── Config ──
const CHAINS = {
  1:     { name:'Ethereum',  slug:'ethereum' },
  42161: { name:'Arbitrum',  slug:'arbitrum' },
  8453:  { name:'Base',      slug:'base' },
  10:    { name:'Optimism',  slug:'optimism' },
  137:   { name:'Polygon',   slug:'polygon' },
  56:    { name:'BNB Chain', slug:'bsc' },
  324:   { name:'zkSync Era',slug:'zksync%20era' },
  59144: { name:'Linea',     slug:'linea' },
  34443: { name:'Mode',      slug:'mode' },
  1135:  { name:'Lisk',      slug:'lisk' },
  480:   { name:'World Chain',slug:'world%20chain' },
  81457: { name:'Blast',     slug:'blast' },
  534352:{ name:'Scroll',    slug:'scroll' },
  7777777:{ name:'Zora',     slug:'zora' },
  130:   { name:'Unichain',  slug:'unichain' },
  57073: { name:'Ink',       slug:'ink' },
  1868:  { name:'Soneium',   slug:'soneium' },
  999:   { name:'HyperEVM',  slug:'hyperliquid%20evm' },
  232:   { name:'Lens',      slug:'lens%20network' },
};
function tokenIcon(symbol) {
  if (TOKEN_ICON_MAP[symbol]) return TOKEN_ICON_MAP[symbol];
  const ethAddr = TOKEN_ADDRS[symbol]?.[1];
  if (ethAddr) return `${TW}/ethereum/assets/${ethAddr}/logo.png`;
  return '';
}
const TOKEN_ADDRS = {
  USDC: { 1:'0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 42161:'0xaf88d065e77c8cC2239327C5EDb3A432268e5831', 8453:'0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', 10:'0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', 137:'0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' },
  WETH: { 1:'0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 42161:'0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', 8453:'0x4200000000000000000000000000000000000006', 10:'0x4200000000000000000000000000000000000006' },
  WBTC: { 1:'0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', 42161:'0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f' },
  DAI:  { 1:'0x6B175474E89094C44Da98b954EedeAC495271d0F', 42161:'0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1' },
  USDT: { 1:'0xdAC17F958D2ee523a2206206994597C13D831ec7' },
};
const TOKEN_META = {
  ETH:  { label:'Ethereum',    stable:false },
  WETH: { label:'Wrapped ETH', stable:false },
  USDC: { label:'USD Coin',    stable:true },
  USDT: { label:'Tether',      stable:true },
  DAI:  { label:'Dai',         stable:true },
  WBTC: { label:'Wrapped BTC', stable:false },
  POL:  { label:'Polygon',     stable:false },
  MATIC:{ label:'Polygon',     stable:false },
  BNB:  { label:'BNB',         stable:false },
  'USDC.e':{ label:'Bridged USDC', stable:true },
  USDB: { label:'Blast USD',   stable:true },
};

let walletAddress = null;
let prices = {};

// ── Wallet Connect ──
function toggleWalletMenu() {
  const menu = document.getElementById('wallet-menu');
  menu.classList.toggle('hidden');
  if (!menu.classList.contains('hidden')) {
    setTimeout(() => document.addEventListener('click', closeWalletMenu, { once: true }), 0);
  }
}
function closeWalletMenu() { document.getElementById('wallet-menu').classList.add('hidden'); }

function toggleDepositMenu() {
  const menu = document.getElementById('deposit-menu');
  document.getElementById('more-menu').classList.add('hidden');
  menu.classList.toggle('hidden');
  if (!menu.classList.contains('hidden')) {
    setTimeout(() => document.addEventListener('click', () => menu.classList.add('hidden'), { once: true }), 0);
  }
}
function toggleMoreMenu() {
  const menu = document.getElementById('more-menu');
  document.getElementById('deposit-menu').classList.add('hidden');
  menu.classList.toggle('hidden');
  if (!menu.classList.contains('hidden')) {
    setTimeout(() => document.addEventListener('click', () => menu.classList.add('hidden'), { once: true }), 0);
  }
}

function copyAddress() {
  navigator.clipboard.writeText(walletAddress).catch(() => {});
  closeWalletMenu();
  const label = document.getElementById('connect-label');
  const prev = label.textContent;
  label.textContent = 'Copied!';
  setTimeout(() => { label.textContent = prev; }, 1500);
}

function disconnect() {
  closeWalletMenu();
  walletAddress = null;
  localStorage.setItem('sage_disconnected', '1');
  // Reset header button (click handling stays with the data-action delegation —
  // assigning onclick here too would fire connectWallet twice per click)
  document.getElementById('connect-label').textContent = 'Connect Wallet';
  document.getElementById('connect-btn').className = 'flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-full text-sm font-bold tracking-wide active:scale-95 transition-transform';
  // Reset sidebar
  document.getElementById('sidebar-disconnected').classList.remove('hidden');
  document.getElementById('sidebar-connected').classList.add('hidden');
  // Reset hero
  document.getElementById('hero-balance').innerHTML = '<span class="text-on-surface-variant text-2xl tracking-wide">Connect wallet to view</span>';
  document.getElementById('hero-change').textContent = '';
  document.getElementById('hero-chain-count').classList.add('hidden');
  document.getElementById('chain-breakdown').innerHTML = '<p class="text-sm text-on-surface-variant px-2 py-3">Connect wallet to view chain balances</p>';
  document.getElementById('assets-grid').innerHTML = '<p class="text-sm text-on-surface-variant col-span-2">Connect wallet to view your assets</p>';
  renderActivity();
}

async function connectWallet() {
  if (!window.ethereum) {
    alert('Please install MetaMask to connect your wallet.');
    return;
  }
  try {
    localStorage.removeItem('sage_disconnected');
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    walletAddress = accounts[0];
    onConnected();
  } catch (e) {
    console.error('Wallet connection failed:', e);
  }
}

async function onConnected() {
  // Capture the address this call is rendering for: every async result below
  // must be dropped if the user switches accounts before it lands, or account
  // A's portfolio/ENS name would overwrite account B's.
  const addr = walletAddress;
  const short = addr.slice(0,6) + '...' + addr.slice(-4);

  // Update header button
  document.getElementById('connect-label').textContent = short;
  document.getElementById('connect-btn').className = 'flex items-center gap-2 px-4 py-2 bg-surface-container-high text-on-surface rounded-full text-sm font-bold tracking-wide active:scale-95 transition-transform';

  // Update sidebar
  document.getElementById('sidebar-disconnected').classList.add('hidden');
  document.getElementById('sidebar-connected').classList.remove('hidden');
  document.getElementById('sidebar-addr').textContent = short;

  // Resolve ENS name in background
  fetch(`/api/ens?address=${encodeURIComponent(addr)}`).then(r=>r.json()).then(d=>{
    if (walletAddress !== addr) return;
    if(d.name){
      document.getElementById('connect-label').textContent=d.name;
      document.getElementById('sidebar-addr').textContent=d.name;
    }
  }).catch(()=>{});

  renderActivity();

  // Kick off both fetches immediately in parallel
  const balanceFetch = fetch(`/api/balances?address=${encodeURIComponent(addr)}&_t=${Date.now()}`);
  // Wait for prices first so renderPortfolio has correct values
  const pricesOk = await fetchPrices();
  // Now await the balance response (likely already in-flight or done)
  try {
    const res = await balanceFetch;
    if (!res.ok) throw new Error('API error ' + res.status);
    const data = await res.json();
    if (walletAddress !== addr) return;
    renderPortfolio(data);
    // Set OR clear the warning — a stale "prices unavailable" must not
    // outlive a later successful fetch.
    document.getElementById('hero-change').textContent =
      pricesOk ? '' : 'Live prices unavailable — totals may be incomplete';
  } catch (e) {
    if (walletAddress !== addr) return;
    console.error('Balance fetch failed:', e);
    document.getElementById('hero-balance').innerHTML = '<span class="text-on-surface-variant text-lg">Could not load balances — <button data-action="fetch-balances" class="underline text-primary font-bold">retry</button></span>';
  }
}

// ── Prices ──
async function fetchPrices() {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch('/api/prices', { signal: ctrl.signal });
    clearTimeout(t);
    // A 503 carries the hardcoded fallback prices — usable for display, but
    // the caller must know they aren't live (degraded ⇒ return false below).
    const degraded = !res.ok;
    const raw = await res.json();
    // Normalise CoinGecko format
    prices = {
      ETH:  { usd: raw.ethereum?.usd || 0,          change: raw.ethereum?.usd_24h_change || 0 },
      WETH: { usd: raw.ethereum?.usd || 0,          change: raw.ethereum?.usd_24h_change || 0 },
      BTC:  { usd: raw.bitcoin?.usd || 0,           change: raw.bitcoin?.usd_24h_change || 0 },
      WBTC: { usd: raw['wrapped-bitcoin']?.usd || raw.bitcoin?.usd || 0, change: raw['wrapped-bitcoin']?.usd_24h_change || raw.bitcoin?.usd_24h_change || 0 },
      USDC: { usd:1, change:0 },
      USDT: { usd:1, change:0 },
      DAI:  { usd:1, change:0 },
      POL:  { usd: raw['polygon-ecosystem-token']?.usd || raw['matic-network']?.usd || 0, change: raw['polygon-ecosystem-token']?.usd_24h_change || raw['matic-network']?.usd_24h_change || 0 },
      MATIC:{ usd: raw['polygon-ecosystem-token']?.usd || raw['matic-network']?.usd || 0, change: raw['polygon-ecosystem-token']?.usd_24h_change || raw['matic-network']?.usd_24h_change || 0 },
      BNB:  { usd: raw.binancecoin?.usd || 0,       change: raw.binancecoin?.usd_24h_change || 0 },
      UMA:  { usd: raw.uma?.usd || 0,               change: raw.uma?.usd_24h_change || 0 },
      ACX:  { usd: raw['across-protocol']?.usd || 0, change: raw['across-protocol']?.usd_24h_change || 0 },
      POOL: { usd: raw['pooltogether-v2']?.usd || 0, change: raw['pooltogether-v2']?.usd_24h_change || 0 },
      SNX:  { usd: raw.havven?.usd || 0,            change: raw.havven?.usd_24h_change || 0 },
    };
    return !degraded;
  } catch {
    console.warn('Could not fetch prices, using defaults');
    return false;
  }
}

// ── Balances ──
async function fetchBalances() {
  if (!walletAddress) return;
  const addr = walletAddress;
  try {
    const res = await fetch(`/api/balances?address=${encodeURIComponent(addr)}&_t=${Date.now()}`);
    if (!res.ok) throw new Error('API error ' + res.status);
    const data = await res.json();
    if (walletAddress !== addr) return;
    renderPortfolio(data);
  } catch (e) {
    console.error('Balance fetch failed:', e);
    document.getElementById('hero-balance').innerHTML = '<span class="text-on-surface-variant text-lg">Could not load balances</span>';
    document.getElementById('assets-grid').innerHTML = '<p class="text-sm text-error col-span-2">Failed to load — <button data-action="fetch-balances" class="underline font-bold">retry</button></p>';
  }
}

// ── Render ──
function usd(n) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
}
function pct(n) {
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(2) + '%';
}

let portfolioData = null;
let portfolioAgg = null;

function renderPortfolio(balancesByChain) {
  portfolioData = balancesByChain;
  const agg = {};
  let totalUsd = 0;
  let chainTotals = {};

  for (const [chainId, tokens] of Object.entries(balancesByChain)) {
    let chainUsd = 0;
    for (const [symbol, amount] of Object.entries(tokens)) {
      const price = prices[symbol]?.usd || 0;
      const val = amount * price;
      chainUsd += val;
      totalUsd += val;
      if (!agg[symbol]) agg[symbol] = { total:0, chains:[], usdValue:0 };
      agg[symbol].total += amount;
      agg[symbol].chains.push(Number(chainId));
      agg[symbol].usdValue += val;
    }
    if (chainUsd > 0) chainTotals[chainId] = chainUsd;
  }
  portfolioAgg = agg;

  // Hero
  let heroHtml;
  if (balancesHidden) {
    heroHtml = '••••';
  } else {
    const whole = Math.floor(totalUsd).toLocaleString('en-US');
    const cents = (totalUsd % 1).toFixed(2).slice(1);
    heroHtml = `$${whole}<span class="text-3xl md:text-4xl">${cents}</span>`;
  }
  document.getElementById('hero-balance').innerHTML = heroHtml;

  const chainCount = Object.keys(chainTotals).length;
  const badge = document.getElementById('hero-chain-count');
  badge.textContent = chainCount + ' chain' + (chainCount !== 1 ? 's' : '');
  badge.classList.remove('hidden');

  // Sidebar
  document.getElementById('sidebar-total').textContent = balancesHidden ? '••••' : usd(totalUsd);

  // Chain breakdown
  const chainEl = document.getElementById('chain-breakdown');
  if (chainCount === 0) {
    Safe.setHTML(chainEl, Safe.html`<p class="text-sm text-on-surface-variant px-2 py-3">No balances found</p>`);
  } else {
    Safe.setHTML(chainEl, Object.entries(chainTotals)
      .sort((a,b) => b[1] - a[1])
      .map(([cid, val]) => {
        const c = CHAINS[cid] || { name:'Chain '+cid };
        const icon = chainIcon(Number(cid));
        const displayVal = balancesHidden ? '••••' : usd(val);
        const cidNum = Number(cid);
        return Safe.html`<div class="flex-shrink-0 min-w-[160px]" data-chain="${cid}">
          <button data-chain-drop="${cidNum}" class="w-full px-4 py-3 bg-surface-container-lowest rounded-xl flex items-center gap-3 hover:bg-surface-container transition-colors">
            <img src="${Safe.url(icon)}" alt="${c.name}" class="w-8 h-8 rounded-full" data-img-fallback/>
            <div class="flex-1">
              <p class="text-xs text-on-surface-variant">${c.name}</p>
              <p class="text-sm font-bold">${displayVal}</p>
            </div>
            <span class="material-symbols-outlined text-on-surface-variant/40 text-sm">expand_more</span>
          </button>
        </div>`;
      }));
    chainEl.querySelectorAll('button[data-chain-drop]').forEach(btn => {
      btn.addEventListener('click', () => toggleChainDrop(Number(btn.dataset.chainDrop)));
    });
  }

  // Assets grid
  const grid = document.getElementById('assets-grid');
  const sorted = Object.entries(agg).sort((a,b) => b[1].usdValue - a[1].usdValue);
  if (sorted.length === 0) {
    Safe.setHTML(grid, Safe.html`<p class="text-sm text-on-surface-variant col-span-2">No tokens found in this wallet</p>`);
    return;
  }
  const cards = sorted.map(([symbol, info]) => {
    const meta = TOKEN_META[symbol] || { label:symbol };
    const change = prices[symbol]?.change || 0;
    const isStable = meta.stable;
    const changeBadge = isStable
      ? Safe.html`<span class="text-xs text-on-surface-variant font-bold px-2 py-1 bg-surface-container rounded-full">Stable</span>`
      : Safe.html`<span class="text-xs font-bold px-2 py-1 rounded-full ${change >= 0 ? 'text-primary bg-primary-container' : 'text-error bg-error-container/20'}">${pct(change)}</span>`;
    const chainLabel = info.chains.length > 1
      ? info.chains.length + ' chains'
      : (CHAINS[info.chains[0]]?.name || 'Chain ' + info.chains[0]);
    const icon = tokenIcon(symbol);
    const displayUsd = balancesHidden ? '••••' : usd(info.usdValue);
    return Safe.html`<div class="asset-card bg-surface-container-lowest rounded-xl cursor-pointer hover:shadow-md transition-shadow" data-symbol="${symbol}">
      <div class="p-4">
        <div class="flex items-center gap-3 mb-3">
          <img src="${Safe.url(icon)}" alt="${symbol}" class="w-10 h-10 rounded-full bg-surface-container flex-shrink-0" data-img-fallback/>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-black text-on-background">${symbol}</p>
            <p class="text-xs text-on-surface-variant">${chainLabel}</p>
          </div>
          ${changeBadge}
        </div>
        <p class="text-xl font-black text-on-background mb-0.5">${displayUsd}</p>
        <p class="text-xs text-on-surface-variant">${info.total.toLocaleString('en-US',{maximumFractionDigits:4})} ${symbol}</p>
      </div>
      <div class="flex items-center justify-center gap-1 py-2 border-t border-outline-variant/10 text-on-surface-variant hover:text-primary transition-colors">
        <span class="text-xs font-bold">View chains</span>
        <span class="material-symbols-outlined text-sm">expand_more</span>
      </div>
    </div>`;
  });

  const ASSET_LIMIT = 6;
  const visible = cards.slice(0, assetsExpanded ? cards.length : ASSET_LIMIT);
  const remaining = cards.length - ASSET_LIMIT;

  const moreBtn = remaining > 0 && !assetsExpanded
    ? Safe.html`<button id="expand-assets-btn" class="col-span-1 sm:col-span-2 lg:col-span-3 py-3 bg-surface-container-low text-on-surface-variant rounded-xl font-bold text-sm hover:bg-surface-container-high transition-colors">Show ${remaining} more asset${remaining > 1 ? 's' : ''}</button>`
    : Safe.html``;
  Safe.setHTML(grid, Safe.html`${visible}${moreBtn}`);
  grid.querySelectorAll('.asset-card[data-symbol]').forEach(card => {
    card.addEventListener('click', () => toggleAssetDrop(card.dataset.symbol));
  });
  const eb = document.getElementById('expand-assets-btn');
  if (eb) eb.addEventListener('click', expandAssets);
}

let assetsExpanded = false;
function expandAssets() {
  assetsExpanded = true;
  if (portfolioData) renderPortfolio(portfolioData);
}

// ── Auto-reconnect if already connected ──
// ── Dropdown toggles ──
function scrollChains(dir) {
  const el = document.getElementById('chain-breakdown');
  el.scrollBy({ left: dir * 200, behavior: 'smooth' });
}

function closeAllOverlays() {
  const a = document.getElementById('asset-overlay'); if (a) a.remove();
  const c = document.getElementById('chain-overlay'); if (c) c.remove();
}
window.addEventListener('scroll', closeAllOverlays, true);

function toggleAssetDrop(symbol) {
  closeAllOverlays();
  const existing = document.getElementById('asset-overlay');
  if (existing) { const prev = existing.dataset.symbol; existing.remove(); if (prev === symbol) return; }
  if (!portfolioData) return;
  const card = document.querySelector(`.asset-card[data-symbol="${symbol}"]`);
  if (!card) return;
  const rect = card.getBoundingClientRect();

  const rowItems = [];
  for (const [chainId, tokens] of Object.entries(portfolioData)) {
    const bal = tokens[symbol];
    if (!bal || bal <= 0) continue;
    const c = CHAINS[chainId] || { name: 'Chain ' + chainId };
    const p = prices[symbol]?.usd || 0;
    rowItems.push(Safe.html`<div class="flex items-center justify-between px-4 py-2.5">
      <div class="flex items-center gap-2.5">
        <img src="${Safe.url(chainIcon(Number(chainId)))}" class="w-5 h-5 rounded-full"/>
        <span class="text-sm text-on-surface">${c.name}</span>
      </div>
      <div class="text-right">
        <p class="text-sm font-bold text-on-background">${fmtNum(bal)} ${symbol}</p>
        <p class="text-xs text-on-surface-variant">${usd(bal * p)}</p>
      </div>
    </div>`);
  }

  const overlay = document.createElement('div');
  overlay.id = 'asset-overlay';
  overlay.dataset.symbol = symbol;
  overlay.className = 'fixed z-50 bg-surface-container-lowest rounded-lg shadow-2xl border border-outline-variant/10 overflow-hidden';
  overlay.style.cssText = `left:${rect.left}px;width:${rect.width}px;top:${rect.bottom + 4}px;max-height:300px;overflow-y:auto;`;
  Safe.setHTML(overlay, rowItems.length ? rowItems : Safe.html`<p class="px-4 py-3 text-sm text-on-surface-variant">No balances</p>`);
  document.body.appendChild(overlay);

  setTimeout(() => document.addEventListener('click', function close(e) {
    if (!overlay.contains(e.target) && !card.contains(e.target)) { overlay.remove(); document.removeEventListener('click', close); }
  }), 0);
}

function toggleChainDrop(chainId) {
  const existing = document.getElementById('chain-overlay');
  if (existing) { const prev = existing.dataset.chainId; existing.remove(); if (prev == chainId) return; }
  // Also close any asset overlay
  closeAllOverlays();
  if (!portfolioData) return;
  const card = document.querySelector(`[data-chain="${chainId}"]`);
  if (!card) return;
  const rect = card.getBoundingClientRect();
  const tokens = portfolioData[chainId] || {};
  const rowItems = [];
  for (const [symbol, bal] of Object.entries(tokens)) {
    if (bal <= 0) continue;
    const p = prices[symbol]?.usd || 0;
    const icon = tokenIcon(symbol);
    rowItems.push(Safe.html`<div class="flex items-center justify-between px-4 py-2.5">
      <div class="flex items-center gap-2">
        <img src="${Safe.url(icon)}" class="w-5 h-5 rounded-full"/>
        <span class="text-sm text-on-surface">${symbol}</span>
      </div>
      <div class="text-right">
        <p class="text-sm font-bold text-on-background">${fmtNum(bal)}</p>
        <p class="text-xs text-on-surface-variant">${usd(bal * p)}</p>
      </div>
    </div>`);
  }
  const overlay = document.createElement('div');
  overlay.id = 'chain-overlay';
  overlay.dataset.chainId = chainId;
  overlay.className = 'fixed z-50 bg-surface-container-lowest rounded-lg shadow-2xl border border-outline-variant/10 overflow-hidden';
  overlay.style.cssText = `left:${rect.left}px;width:${Math.max(rect.width, 220)}px;top:${rect.bottom + 4}px;max-height:250px;overflow-y:auto;`;
  Safe.setHTML(overlay, rowItems.length ? rowItems : Safe.html`<p class="px-4 py-3 text-sm text-on-surface-variant">Empty</p>`);
  document.body.appendChild(overlay);
  setTimeout(() => document.addEventListener('click', function close(e) {
    if (!overlay.contains(e.target) && !card.contains(e.target)) { overlay.remove(); document.removeEventListener('click', close); }
  }), 0);
}

function fmtNum(n) {
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (n >= 1) return n.toLocaleString('en-US', { maximumFractionDigits: 4 });
  return n.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

function getLocalSends() {
  try {
    const k = 'sage_tx_' + (walletAddress || '').toLowerCase();
    return JSON.parse(localStorage.getItem(k) || '[]').filter(t => t.type === 'send');
  } catch { return []; }
}

function mergeTx(bridgeTx) {
  return [...bridgeTx, ...getLocalSends()].sort((a, b) => b.timestamp - a.timestamp);
}

function fmtAmt(amt) {
  return Number(parseFloat(amt).toFixed(2));
}
function fmtToken(token) {
  const t = String(token || '');
  // If it's a full unresolved address, shorten it; proper symbols pass through unchanged
  if (/^0x[0-9a-fA-F]{10}/.test(t)) return t.slice(0, 6) + '…';
  return t;
}

function txMeta(tx) {
  if (tx.type === 'send') {
    return { icon: 'send', label: `Sent ${fmtAmt(tx.amount)} ${fmtToken(tx.token)}`, sub: tx.chain };
  }
  const appDest = ['hyperliquid', 'hypercore', 'polymarket'];
  if (appDest.some(a => (tx.toChain || '').toLowerCase().includes(a))) {
    return { icon: 'savings', label: `Deposited ${fmtAmt(tx.amount)} ${fmtToken(tx.fromToken)}`, sub: `${tx.fromChain} → ${tx.toChain}` };
  }
  if (tx.fromToken && tx.toToken && tx.fromToken !== tx.toToken) {
    return { icon: 'swap_horiz', label: `Swapped ${fmtAmt(tx.amount)} ${fmtToken(tx.fromToken)}`, sub: `${tx.fromChain} → ${tx.toChain}` };
  }
  return { icon: 'layers', label: `Bridged ${fmtAmt(tx.amount)} ${fmtToken(tx.fromToken)}`, sub: `${tx.fromChain} → ${tx.toChain}` };
}

async function renderActivity() {
  const feed = document.getElementById('activity-feed');

  if (!walletAddress) {
    feed.innerHTML = `<div class="text-center py-8">
      <span class="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-2">history</span>
      <p class="text-sm text-on-surface-variant">No transactions yet</p>
    </div>`;
    return;
  }

  try {
    const addr = walletAddress;
    const txCacheKey = 'sage_txcache_' + addr.toLowerCase();
    let allTx = mergeTx(lsGet(txCacheKey, 5 * 60 * 1000) || []);

    fetch(`/api/transactions?address=${encodeURIComponent(addr)}`)
      .then(r => r.json())
      .then(data => {
        // Skip on API failure or if the user switched accounts mid-flight;
        // otherwise always render — a legitimately-empty fresh result must
        // replace a stale cached list.
        if (data.error || walletAddress !== addr) return;
        const fresh = data.deposits || [];
        lsSet(txCacheKey, fresh, 5 * 60 * 1000);
        renderActivityList(mergeTx(fresh));
      }).catch(() => {});

    if (allTx.length === 0) {
      feed.innerHTML = `<div class="text-center py-8">
        <span class="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-2">history</span>
        <p class="text-sm text-on-surface-variant">No transactions yet</p>
      </div>`;
      return;
    }

    renderActivityList(allTx);
  } catch (e) {
    console.warn('Activity feed failed:', e);
    feed.innerHTML = `<div class="text-center py-8">
      <span class="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-2">history</span>
      <p class="text-sm text-on-surface-variant">No transactions yet</p>
    </div>`;
  }
}

function renderActivityList(allTx) {
  const feed = document.getElementById('activity-feed');
  if (allTx.length === 0) {
    feed.innerHTML = `<div class="text-center py-8">
      <span class="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-2">history</span>
      <p class="text-sm text-on-surface-variant">No transactions yet</p>
    </div>`;
    return;
  }
  const show = allTx.slice(0, 3);
  const rows = show.map(tx => {
    const ago = new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const meta = txMeta(tx);
    const url = tx.type === 'send'
      ? (tx.txHash && tx.chainId ? explorerTxUrl(tx.chainId, tx.txHash) : null)
      : (tx.depositTxHash && tx.fromChainId ? explorerTxUrl(tx.fromChainId, tx.depositTxHash) : null);
    const body = Safe.html`<div class="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
        <span class="material-symbols-outlined text-primary text-lg">${meta.icon}</span>
      </div>
      <div class="flex-1 border-b border-outline-variant/10 pb-3">
        <div class="flex justify-between gap-2">
          <p class="text-sm font-bold text-on-background">${meta.label}</p>
          <p class="text-xs text-primary font-bold">${ago}</p>
        </div>
      </div>`;
    return url
      ? Safe.html`<a href="${Safe.url(url)}" target="_blank" rel="noopener" class="flex items-center gap-4 px-2 hover:bg-surface-container-low rounded-lg cursor-pointer transition-colors">${body}<span class="material-symbols-outlined text-on-surface-variant text-base flex-shrink-0">open_in_new</span></a>`
      : Safe.html`<div class="flex items-center gap-4 px-2">${body}</div>`;
  });
  const viewAll = allTx.length > 3
    ? Safe.html`<a href="transactions.html" class="block mt-4 text-center text-sm font-bold text-primary hover:underline">View all ${allTx.length} transactions →</a>`
    : Safe.html``;
  Safe.setHTML(feed, Safe.html`<div class="space-y-4">${rows}</div>${viewAll}`);
}

(async function init() {
  try {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      const userDisconnected = localStorage.getItem('sage_disconnected') === '1';
      if (accounts.length > 0 && !userDisconnected) {
        walletAddress = accounts[0];
        await onConnected();
      } else {
        renderActivity();
      }
      window.ethereum.on('accountsChanged', (accs) => {
        if (accs.length === 0) { disconnect(); return; }
        localStorage.removeItem('sage_disconnected');
        walletAddress = accs[0];
        onConnected();
      });
      window.ethereum.on('chainChanged', () => { if (walletAddress) onConnected(); });
    } else {
      renderActivity();
    }
  } catch (e) {
    // A misbehaving provider must not take the rest of the page down with it
    console.warn('Wallet init failed:', e);
    renderActivity();
  }
  fetchBridgeTimes();
})();

async function fetchBridgeTimes() {
  const el = document.getElementById('bridge-times');
  const cacheKey = 'sage_bridge_times';
  function renderTimes(data) {
    el.innerHTML = ['L1 → L2','L2 → L1','L2 → L2'].map(label => {
      const val = data[label];
      const timeStr = val != null ? (val < 60 ? '~' + Math.round(val) + 's' : '~' + (val / 60).toFixed(1) + 'm') : '--';
      const color = val != null && val < 5 ? 'text-primary' : val != null && val < 30 ? 'text-on-background' : 'text-on-surface-variant';
      return `<div class="flex-1 bg-surface-container rounded-lg py-2 px-2 text-center">
        <p class="text-[10px] font-bold text-on-surface-variant mb-0.5">${label}</p>
        <p class="text-sm font-black ${color}">${timeStr}</p>
      </div>`;
    }).join('');
  }

  // Show cached instantly
  const cachedTimes = lsGet(cacheKey, 60 * 60 * 1000);
  if (cachedTimes) renderTimes(cachedTimes);

  // Fetch fresh
  try {
    const res = await fetch('/api/bridge-times');
    const data = await res.json();
    if (!data.error) { renderTimes(data); lsSet(cacheKey, data, 60 * 60 * 1000); }
  } catch (e) { console.warn('Bridge times failed:', e); }
}

// ── Balance Visibility Toggle ──
let balancesHidden = false;
function toggleBalanceVisibility() {
  balancesHidden = !balancesHidden;
  const icon = document.getElementById('balance-eye-icon');
  icon.textContent = balancesHidden ? 'visibility_off' : 'visibility';
  if (portfolioData) renderPortfolio(portfolioData);
}

// ── Event delegation & input listeners ──────────────────────────────────────
document.addEventListener('click', function(e) {
  var el = e.target.closest('[data-action]');
  if (!el) return;
  var action = el.dataset.action;
  var arg = el.dataset.arg;
  switch (action) {
    case 'toggle-balance':    toggleBalanceVisibility(); break;
    case 'scroll-chains':     scrollChains(Number(arg)); break;
    case 'fetch-balances':    fetchBalances(); break;
    case 'toggle-deposit-menu': toggleDepositMenu(); break;
    case 'toggle-more-menu':  toggleMoreMenu(); break;
  }
});
