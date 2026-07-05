// ── Config ──
const ACROSS_API = 'https://app.across.to/api';

let CHAINS = [
  { id: 1, name: 'Ethereum', slug: 'ethereum' },
  { id: 42161, name: 'Arbitrum', slug: 'arbitrum' },
  { id: 8453, name: 'Base', slug: 'base' },
  { id: 10, name: 'Optimism', slug: 'optimism' },
  { id: 137, name: 'Polygon', slug: 'polygon' },

  { id: 324, name: 'zkSync Era', slug: 'zksync%20era' },
  { id: 59144, name: 'Linea', slug: 'linea' },
  { id: 34443, name: 'Mode', slug: 'mode' },
  { id: 1135, name: 'Lisk', slug: 'lisk' },
  { id: 480, name: 'World Chain', slug: 'world%20chain' },
  { id: 81457, name: 'Blast', slug: 'blast' },
  { id: 534352, name: 'Scroll', slug: 'scroll' },
  { id: 7777777, name: 'Zora', slug: 'zora' },
  { id: 130, name: 'Unichain', slug: 'unichain' },
  { id: 57073, name: 'Ink', slug: 'ink' },
  { id: 1868, name: 'Soneium', slug: 'soneium' },
  { id: 999, name: 'HyperEVM', slug: 'hyperliquid%20evm' },
  { id: 232, name: 'Lens', slug: 'lens%20network' },
];

let TOKENS = [
  { symbol: 'ETH', name: 'Ethereum', decimals: 18, native: true,
    addresses: { 1:null, 42161:null, 8453:null, 10:null, 324:null, 59144:null, 34443:null, 81457:null, 534352:null, 7777777:null, 480:null, 1135:null, 57073:null, 1868:null, 130:null, 999:null, 232:null },
    wrapAddresses: { 1:'0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 42161:'0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', 8453:'0x4200000000000000000000000000000000000006', 10:'0x4200000000000000000000000000000000000006', 324:'0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91', 59144:'0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f', 34443:'0x4200000000000000000000000000000000000006', 81457:'0x4300000000000000000000000000000000000004', 534352:'0x5300000000000000000000000000000000000004', 7777777:'0x4200000000000000000000000000000000000006', 480:'0x4200000000000000000000000000000000000006', 1135:'0x4200000000000000000000000000000000000006', 57073:'0x4200000000000000000000000000000000000006', 1868:'0x4200000000000000000000000000000000000006', 130:'0x4200000000000000000000000000000000000006', 999:'0x4200000000000000000000000000000000000006', 232:'0x4200000000000000000000000000000000000006' }},
  { symbol: 'USDC', name: 'USD Coin', decimals: 6, native: false,
    addresses: { 1:'0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 42161:'0xaf88d065e77c8cC2239327C5EDb3A432268e5831', 8453:'0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', 10:'0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', 137:'0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' }},
  { symbol: 'USDT', name: 'Tether', decimals: 6, native: false,
    addresses: { 1:'0xdAC17F958D2ee523a2206206994597C13D831ec7', 42161:'0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', 10:'0x94b008aA00579c1307B0EF2c499aD98a8ce58e58' }},
  { symbol: 'WBTC', name: 'Wrapped BTC', decimals: 8, native: false,
    addresses: { 1:'0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', 42161:'0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f' }},
  { symbol: 'DAI', name: 'Dai', decimals: 18, native: false,
    addresses: { 1:'0x6B175474E89094C44Da98b954EedeAC495271d0F', 42161:'0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1' }},
  { symbol: 'WETH', name: 'Wrapped ETH', decimals: 18, native: false,
    addresses: { 1:'0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 42161:'0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', 8453:'0x4200000000000000000000000000000000000006', 10:'0x4200000000000000000000000000000000000006' }},
  { symbol: 'UMA', name: 'UMA', decimals: 18, native: false,
    addresses: { 1:'0x04Fa0d235C4abf4BcF4787aF4CF447DE572eF828', 42161:'0xd693Ec944A85eeca4247eC1c3b130DCa9B0C3b22', 10:'0xE7798f023fC62146e8Aa1b36Da45fb70855a77Ea', 137:'0x3066818837c5e6eD6601bd5a91B0762a89fB4EB5' }},
  { symbol: 'ACX', name: 'Across Protocol', decimals: 18, native: false,
    addresses: { 1:'0x44108f0223A3C3028F5Fe7AEC7f9bb2E66beF82F', 42161:'0x53691596d1BCe8CEa565b3fBC4d3b90d8b025213', 10:'0xFf733b2A3557a7ed6697007ab5D11B79FdD1b76B', 137:'0xF328b73B6c685831F238c30a23Fc19140CB4D8FC' }},
  { symbol: 'POOL', name: 'PoolTogether', decimals: 18, native: false,
    addresses: { 1:'0x0cEC1A9154Ff802e7934Fc916Ed7Ca50bDE6844e', 10:'0x395Ae52bB17aef68C2888d941736A71dC6d4e125' }},
  { symbol: 'SNX', name: 'Synthetix', decimals: 18, native: false,
    addresses: { 1:'0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F', 10:'0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4' }},
  { symbol: 'POL', name: 'Polygon', decimals: 18, native: true,
    addresses: { 137:null },
    wrapAddresses: { 137:'0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270' }},

];

// ── State ──
let fromChainIdx = 0, toChainIdx = 1;
let fromTokenIdx = 0, toTokenIdx = 1;
let slippage = 'auto';
let walletAddress = null;
let fromBal = null; // raw number
let prices = {};
let quoteTimer = null;
let lastQuote = null;   // stores Across swap/approval response
let lastQuoteAt = 0;    // Date.now() when lastQuote was fetched
let quoteSeq = 0;       // drops stale quote responses that resolve out of order
const QUOTE_MAX_AGE_MS = 30000; // re-quote before executing anything older

// ── Icon helpers ──
function tokenIconUrl(token) {
  const local = tokenIconBySymbol(token.symbol);
  if (local) return local;
  const ethAddr = token.addresses?.[1];
  if (ethAddr) return `${TW}/ethereum/assets/${ethAddr}/logo.png`;
  return token.logoURI || '';
}
const chainLogoUrl = chainIcon;

// ── Wallet ──
async function connectWallet() {
  if (!window.ethereum) { alert('Install MetaMask to continue'); return; }
  try {
    const accs = await window.ethereum.request({ method: 'eth_requestAccounts' });
    localStorage.removeItem('sage_disconnected');
    walletAddress = accs[0];
    document.getElementById('connect-label').textContent = formatAddr(walletAddress);
    resolveWalletENS();
    updateBalance();
    updateActionBtn();
  } catch(e) { console.error(e); }
}
function resolveWalletENS(){
  if(!walletAddress)return;
  const addr=walletAddress;
  const short=addr.slice(0,6)+'...'+addr.slice(-4);
  document.getElementById('from-wallet-label').textContent=short;
  fetch(`/api/ens?address=${encodeURIComponent(addr)}`).then(r=>r.json()).then(d=>{
    if(walletAddress!==addr)return;
    if(d.name){document.getElementById('connect-label').textContent=d.name;document.getElementById('from-wallet-label').textContent=d.name;}
  }).catch(()=>{});
}

async function updateBalance() {
  if (!walletAddress) return;
  const addr = walletAddress;
  const token = TOKENS[fromTokenIdx];
  const chainId = CHAINS[fromChainIdx].id;
  try {
    const res = await fetch(`/api/balances?address=${encodeURIComponent(addr)}&_t=${Date.now()}`);
    if (!res.ok) throw new Error('API error ' + res.status);
    const data = await res.json();
    if (walletAddress !== addr) return;
    cachedBalances = data;
    // find balance for this token on this chain (API may return string or number keys)
    const chainData = data[chainId] || data[String(chainId)] || {};
    const bal = chainData[token.symbol] || 0;
    fromBal = bal;
    document.getElementById('from-balance').textContent = `${fmtNum(bal)} ${token.symbol}`;
    document.getElementById('from-balance-warn').textContent = `${fmtNum(bal)} ${token.symbol}`;
    updateBalanceWarning();
  } catch (e) { console.error('Balance fetch failed:', e); fromBal = null; }
}

// ── Prices ──
async function fetchPrices() {
  try {
    const res = await fetch('/api/prices');
    const raw = await res.json();
    prices = {
      ETH: raw.ethereum?.usd || 0,
      WETH: raw.ethereum?.usd || 0,
      WBTC: raw['wrapped-bitcoin']?.usd || raw.bitcoin?.usd || 0,
      USDC: 1, USDT: 1, DAI: 1,
      POL: raw['polygon-ecosystem-token']?.usd || raw['matic-network']?.usd || 0,
      MATIC: raw['polygon-ecosystem-token']?.usd || raw['matic-network']?.usd || 0,
      BNB: raw.binancecoin?.usd || 0,
      UMA: raw.uma?.usd || 0,
      ACX: raw['across-protocol']?.usd || 0,
      POOL: raw['pooltogether-v2']?.usd || 0,
      SNX: raw.havven?.usd || 0,
    };
  } catch { prices = { ETH:2500, WETH:2500, WBTC:90000, USDC:1, USDT:1, DAI:1, POL:0.4 }; }
  updateRate();
}

// ── Mode ──

// ── Token picker modal ──
let pickerSide = 'from';
let cachedBalances = null;
let allModalRows = [];
let modalChainFilter = null; // null = all chains

function cycleToken(side) { openTokenModal(side); }

function openTokenModal(side) {
  pickerSide = side;
  modalChainFilter = null;
  showAllChains = false;
  document.getElementById('token-search').value = '';
  document.getElementById('chain-search').value = '';
  document.getElementById('chain-search').classList.add('hidden');
  buildChainGrid();
  buildTokenList();
  document.getElementById('token-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  document.getElementById('token-search').focus();
}

let showAllChains = false;

function buildChainGrid(chainsToShow) {
  const grid = document.getElementById('chain-grid');
  let defaultList = CHAINS.filter(c => !c.virtual);
  const list = chainsToShow || (showAllChains ? defaultList : defaultList.slice(0, 11));
  // Chain names/slugs can arrive from /api/routes at runtime — render through
  // Safe.html so a poisoned name can't inject markup into the picker.
  const allBtn = Safe.html`<button data-action="set-chain-filter" data-arg="" class="flex flex-col items-center justify-center w-12 h-12 rounded-xl text-[10px] font-bold transition-colors ${modalChainFilter === null ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'}">All</button>`;
  Safe.setHTML(grid, [allBtn].concat(list.map(c => {
    const active = modalChainFilter === c.id;
    return Safe.html`<button data-action="set-chain-filter" data-arg="${c.id}" class="flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-colors ${active ? 'bg-primary' : 'bg-surface-container-low hover:bg-surface-container-high'}" title="${c.name}">
        <img src="${Safe.url(chainLogoUrl(c.id) || c.logoURI || '')}" class="w-6 h-6 rounded-full" data-img-fallback/>
      </button>`;
  })));
  document.getElementById('chain-toggle').textContent = showAllChains ? 'Show less' : 'View all';
}

function toggleAllChains() {
  showAllChains = !showAllChains;
  const searchEl = document.getElementById('chain-search');
  searchEl.classList.toggle('hidden', !showAllChains);
  if (!showAllChains) searchEl.value = '';
  buildChainGrid();
}

function filterChainGrid() {
  const q = document.getElementById('chain-search').value.toLowerCase().trim();
  if (!q) { buildChainGrid(); return; }
  const filtered = CHAINS.filter(c => !c.virtual && c.name.toLowerCase().includes(q));
  buildChainGrid(filtered);
}

function setChainFilter(chainId) {
  modalChainFilter = chainId;
  buildChainGrid();
  buildTokenList();
}

function buildTokenList() {
  allModalRows = [];
  CHAINS.forEach((chain) => {
    if (chain.virtual) return;
    TOKENS.forEach((token, tIdx) => {
      if (!token.symbol) return;
      const hasAddr = token.native
        ? (token.addresses.hasOwnProperty(chain.id))
        : (token.addresses[chain.id]);
      if (!hasAddr) return;
      allModalRows.push({ chain, token, tIdx });
    });
  });

  allModalRows.sort((a, b) => {
    const balA = cachedBalances?.[a.chain.id]?.[a.token.symbol] || 0;
    const balB = cachedBalances?.[b.chain.id]?.[b.token.symbol] || 0;
    if (balA > 0 && balB <= 0) return -1;
    if (balB > 0 && balA <= 0) return 1;
    if (a.token.symbol < b.token.symbol) return -1;
    if (a.token.symbol > b.token.symbol) return 1;
    return a.chain.name.localeCompare(b.chain.name);
  });

  filterTokenList();
}

function renderModalRows(rows) {
  const list = document.getElementById('token-list');
  const selToken = pickerSide === 'from' ? TOKENS[fromTokenIdx] : TOKENS[toTokenIdx];
  const selChain = pickerSide === 'from'
    ? CHAINS[fromChainIdx]
    : CHAINS[toChainIdx];

  const items = rows.map(({ chain, token, tIdx }) => {
    const bal = cachedBalances?.[chain.id]?.[token.symbol] || 0;
    const price = prices[token.symbol] || 0;
    const usdVal = bal * price;
    const isSelected = selToken.symbol === token.symbol && selChain.id === chain.id;
    const highlight = isSelected ? 'bg-primary-container/20' : 'hover:bg-surface-container-low';
    const tIcon = tokenIconUrl(token);
    const cIcon = chainLogoUrl(chain.id) || chain.logoURI || '';
    const usdEl = bal > 0 ? Safe.html`<span class="text-xs text-on-surface-variant font-medium">$${fmtNum(usdVal)}</span>` : Safe.html``;

    return Safe.html`<button data-tidx="${tIdx}" data-chain-id="${chain.id}" class="token-pick w-full flex items-center gap-3 px-4 py-3 ${highlight} rounded-xl transition-colors text-left" data-search="${token.symbol + ' ' + token.name + ' ' + chain.name}">
      <div class="relative flex-shrink-0">
        <img src="${Safe.url(tIcon)}" alt="${token.symbol}" class="w-10 h-10 rounded-full bg-surface-container" data-img-fallback/>
        <img src="${Safe.url(cIcon)}" alt="${chain.name}" class="w-5 h-5 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-surface-container-lowest bg-surface-container-lowest" data-img-fallback/>
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-bold text-[15px] ${bal > 0 ? 'text-on-background' : 'text-on-surface-variant'}">${bal > 0 ? fmtNum(bal) + ' ' : '0 '}${token.symbol}</p>
        <p class="text-xs text-on-surface-variant">${token.name} · ${chain.name}</p>
      </div>
      ${usdEl}
      <span class="material-symbols-outlined text-on-surface-variant text-base flex-shrink-0">chevron_right</span>
    </button>`;
  });
  Safe.setHTML(list, items);
  list.querySelectorAll('button.token-pick').forEach(btn => {
    btn.addEventListener('click', () => selectToken(Number(btn.dataset.tidx), Number(btn.dataset.chainId)));
  });
}

function filterTokenList() {
  const q = document.getElementById('token-search').value.toLowerCase().trim();
  let rows = allModalRows;
  if (modalChainFilter !== null) {
    rows = rows.filter(({ chain }) => chain.id === modalChainFilter);
  }
  if (q) {
    rows = rows.filter(({ token }) =>
      token.symbol.toLowerCase().includes(q) ||
      token.name.toLowerCase().includes(q)
    );
  }
  renderModalRows(rows);
}

function closeTokenModal() {
  document.getElementById('token-modal').classList.add('hidden');
  document.body.style.overflow = '';
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !document.getElementById('token-modal').classList.contains('hidden')) closeTokenModal();
});

function selectToken(tokenIdx, chainId) {
  const chainIdx = CHAINS.findIndex(c => c.id === chainId);
  if (pickerSide === 'from') {
    fromTokenIdx = tokenIdx;
    if (chainIdx >= 0) fromChainIdx = chainIdx;
    if (fromTokenIdx === toTokenIdx && fromChainIdx === toChainIdx) {
      toTokenIdx = (toTokenIdx + 1) % TOKENS.length;
    }
  } else {
    toTokenIdx = tokenIdx;
    if (chainIdx >= 0) toChainIdx = chainIdx;
    if (fromTokenIdx === toTokenIdx && fromChainIdx === toChainIdx) {
      toChainIdx = (toChainIdx + 1) % CHAINS.length;
    }
  }
  closeTokenModal();
  updateTokenDisplay();
  updateRoute();
  updateBalance();
  onAmountChange();
}

function swapTokens() {
  [fromTokenIdx, toTokenIdx] = [toTokenIdx, fromTokenIdx];
  [fromChainIdx, toChainIdx] = [toChainIdx, fromChainIdx];
  updateTokenDisplay();
  updateRoute();
  updateBalance();
  // swap amounts
  const inp = document.getElementById('input-amount');
  const out = document.getElementById('output-amount');
  const outVal = out.textContent;
  inp.value = (outVal && outVal !== '--') ? outVal.replace(/,/g,'') : '';
  out.textContent = '--';
  onAmountChange();
}

// ── Display updates ──
function updateTokenDisplay() {
  const ft = TOKENS[fromTokenIdx], tt = TOKENS[toTokenIdx];
  const fromChainId = CHAINS[fromChainIdx].id;
  const toChainId = CHAINS[toChainIdx].id;
  const fromChain = CHAINS.find(c => c.id === fromChainId);
  const toChain = CHAINS.find(c => c.id === toChainId);
  // Chain icons (big, background)
  document.getElementById('from-chain-icon').src = chainLogoUrl(fromChainId);
  document.getElementById('to-chain-icon').src = chainLogoUrl(toChainId);
  // Token icons (small, overlay)
  document.getElementById('from-token-icon').src = tokenIconUrl(ft);
  document.getElementById('from-token-label').textContent = ft.symbol;
  document.getElementById('to-token-icon').src = tokenIconUrl(tt);
  document.getElementById('to-token-label').textContent = tt.symbol;
  updateRate();
  updateGasTopupVisibility();
}

function updateRate() {
  const fp = prices[TOKENS[fromTokenIdx].symbol] || 0;
  const tp = prices[TOKENS[toTokenIdx].symbol] || 0;
  if (fp && tp) {
    const rate = fp / tp;
    document.getElementById('rate-display').textContent = `1 ${TOKENS[fromTokenIdx].symbol} = ${fmtNum(rate)} ${TOKENS[toTokenIdx].symbol}`;
  }
}

function updateRoute() {
  document.getElementById('fee-route').textContent = `${CHAINS[fromChainIdx].name} → ${CHAINS[toChainIdx].name} · Across`;
}

let routeAvailable = false;
let gasTopupEnabled = false;
let gasTopupUsd = 2;

function updateActionBtn() {
  const btn = document.getElementById('action-btn');
  const val = parseFloat(document.getElementById('input-amount').value) || 0;
  if (!walletAddress) {
    btn.textContent = 'Connect Wallet';
    btn.className = 'w-full py-4 bg-primary text-on-primary rounded-full font-black text-lg active:scale-[0.98] transition-transform';
    btn.disabled = false;
  } else if (val <= 0) {
    btn.textContent = 'Enter amount';
    btn.className = 'w-full py-4 bg-surface-container-high text-on-surface-variant rounded-full font-black text-lg';
    btn.disabled = false;
  } else if (fromBal != null && val > fromBal) {
    btn.textContent = 'Insufficient balance';
    btn.className = 'w-full py-4 bg-surface-container-high text-on-surface-variant/50 rounded-full font-black text-lg cursor-not-allowed';
    btn.disabled = true;
  } else if (!routeAvailable && lastQuote === null) {
    btn.textContent = 'Route unavailable';
    btn.className = 'w-full py-4 bg-surface-container-high text-on-surface-variant/50 rounded-full font-black text-lg cursor-not-allowed';
    btn.disabled = true;
  } else {
    btn.textContent = 'Bridge';
    btn.className = 'w-full py-4 bg-primary text-on-primary rounded-full font-black text-lg active:scale-[0.98] transition-transform';
    btn.disabled = false;
  }
}

function toggleFeeBreakdown() {
  const bd = document.getElementById('fee-breakdown');
  const chev = document.getElementById('fee-chevron');
  const main = document.getElementById('bridge-main');
  bd.classList.toggle('hidden');
  const open = !bd.classList.contains('hidden');
  chev.style.transform = open ? 'rotate(180deg)' : '';
  main.classList.toggle('compact', open);
}

// ── Custom recipient ──
function getRecipient() {
  const inp = document.getElementById('recipient-address');
  const val = (inp?.value || '').trim();
  if (val && EthUtils.isValidAddress(val)) return val;
  return walletAddress;
}

function toggleRecipient() {
  const wrap = document.getElementById('recipient-input-wrap');
  const icon = document.getElementById('recipient-toggle-icon');
  const text = document.getElementById('recipient-toggle-text');
  const showing = !wrap.classList.contains('hidden');
  wrap.classList.toggle('hidden');
  icon.textContent = showing ? 'add' : 'close';
  text.textContent = showing ? 'Send to a different address' : 'Cancel';
  if (showing) {
    document.getElementById('recipient-address').value = '';
    document.getElementById('recipient-error').classList.add('hidden');
    document.getElementById('to-label').textContent = 'Wallet';
    // Recipient reverted to the connected wallet — the old quote is invalid
    onAmountChange();
  }
}

function validateRecipient() {
  const val = document.getElementById('recipient-address').value.trim();
  const err = document.getElementById('recipient-error');
  const label = document.getElementById('to-label');
  if (!val) { err.classList.add('hidden'); label.textContent = 'Wallet'; return; }
  if (EthUtils.isValidAddress(val)) {
    err.classList.add('hidden');
    label.textContent = val.slice(0,6) + '...' + val.slice(-4);
  } else {
    err.classList.remove('hidden');
    label.textContent = 'Wallet';
  }
}

function updateRecipientVisibility() {
  document.getElementById('recipient-row').classList.remove('hidden');
}

// ── Gas top-up helpers ──
function getNativeWrap(chainId) {
  for (const t of TOKENS) {
    if (t.native && t.wrapAddresses?.[chainId]) return { addr: t.wrapAddresses[chainId], symbol: t.symbol };
  }
  return null;
}

function updateGasTopupVisibility() {
  const row = document.getElementById('gas-topup-row');
  const destChain = CHAINS[toChainIdx];
  if (!destChain) {
    row.classList.add('hidden');
    gasTopupEnabled = false;
    return;
  }
  const nativeWrap = getNativeWrap(destChain.id);
  if (!nativeWrap) { row.classList.add('hidden'); return; }
  row.classList.remove('hidden');
  document.getElementById('gas-dest-name').textContent = destChain.name;
  document.getElementById('gas-topup-symbol').textContent = `of ${nativeWrap.symbol}`;
}

function toggleGasTopup() {
  gasTopupEnabled = !gasTopupEnabled;
  const toggle = document.getElementById('gas-toggle');
  const knob = document.getElementById('gas-toggle-knob');
  const amountRow = document.getElementById('gas-amount-row');
  if (gasTopupEnabled) {
    toggle.classList.remove('bg-surface-container-high');
    toggle.classList.add('bg-primary');
    knob.classList.remove('left-0.5', 'bg-on-surface-variant/50');
    knob.classList.add('left-4', 'bg-on-primary');
    amountRow.classList.remove('hidden');
  } else {
    toggle.classList.add('bg-surface-container-high');
    toggle.classList.remove('bg-primary');
    knob.classList.add('left-0.5', 'bg-on-surface-variant/50');
    knob.classList.remove('left-4', 'bg-on-primary');
    amountRow.classList.add('hidden');
  }
}

function setGasUsd(n) {
  gasTopupUsd = n;
  [1, 2, 5].forEach(v => {
    const btn = document.getElementById(`gas-btn-${v}`);
    if (v === n) {
      btn.className = 'px-3 py-1.5 rounded-full text-xs font-bold bg-primary text-on-primary';
    } else {
      btn.className = 'px-3 py-1.5 rounded-full text-xs font-bold bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors';
    }
  });
}

function setMax() {
  if (fromBal != null) {
    const token = TOKENS[fromTokenIdx];
    const chainId = CHAINS[fromChainIdx].id;
    const GAS_RESERVE = { 1: 0.005, 56: 0.001, 137: 0.05 };
    const reserve = token.native ? (GAS_RESERVE[chainId] ?? 0.0005) : 0;
    document.getElementById('input-amount').value = Math.max(0, fromBal - reserve);
    onAmountChange();
  }
}

// ── Quote / Amount ──
function updateBalanceWarning() {
  const val = parseFloat(document.getElementById('input-amount').value) || 0;
  const overBalance = fromBal != null && val > fromBal && val > 0;
  document.getElementById('balance-normal').classList.toggle('hidden', overBalance);
  document.getElementById('balance-warn').classList.toggle('hidden', !overBalance);
}

function onAmountChange() {
  clearTimeout(quoteTimer);
  lastQuote = null;
  routeAvailable = true; // assume available until quote returns
  updateBalanceWarning();
  updateActionBtn();
  const val = parseFloat(document.getElementById('input-amount').value) || 0;
  if (val <= 0) {
    document.getElementById('output-amount').textContent = '--';
    document.getElementById('output-usd').textContent = '';
    document.getElementById('fee-display').textContent = '--';
    document.getElementById('fee-route').textContent = '';
    return;
  }
  // Instant estimate from prices
  const fp = prices[TOKENS[fromTokenIdx].symbol] || 0;
  const tp = prices[TOKENS[toTokenIdx].symbol] || 0;
  if (fp && tp) {
    const est = (val * fp / tp);
    document.getElementById('output-amount').textContent = fmtNum(est);
    document.getElementById('output-usd').textContent = `≈ $${fmtNum(val * fp)}`;
  }
  // Fetch best route
  document.getElementById('fee-display').textContent = '...';
  document.getElementById('fee-route').textContent = 'Fetching Across quote...';
  quoteTimer = setTimeout(() => fetchBestQuote(val), 300);
}

// ── Quote fetcher ──
async function fetchBestQuote(amount) {
  const seq = ++quoteSeq;
  try {
  const fromToken = TOKENS[fromTokenIdx];
  const toToken = TOKENS[toTokenIdx];
  const originChain = CHAINS[fromChainIdx].id;
  const destChain = CHAINS[toChainIdx].id;
  const tp = prices[toToken.symbol] || 0;
  const amountWei = toUnits(amount, fromToken.decimals);

  let best = null;
  try {
    best = await fetchAcrossQuote(originChain, destChain, fromToken, toToken, amountWei);
  } catch (e) { console.warn('Across quote failed:', e); }

  // A newer quote request was issued while this one was in flight — its result
  // must win, or a slow response for an older amount executes the wrong trade.
  if (seq !== quoteSeq) return;

  if (!best) {
    routeAvailable = false;
    document.getElementById('fee-display').textContent = 'No route found';
    document.getElementById('fee-route').textContent = '';
    document.getElementById('output-amount').textContent = '--';
    document.getElementById('output-usd').textContent = '';
    updateActionBtn();
    return;
  }

  routeAvailable = true;
  lastQuote = best.quote;
  lastQuote._routeType = best.type;
  lastQuote._provider = best.provider;
  lastQuote._route = best.route;
  lastQuote._recipient = best.recipient;
  lastQuoteAt = Date.now();

  // Update UI
  document.getElementById('output-amount').textContent = fmtNum(best.outputNum);
  document.getElementById('output-usd').textContent = `≈ $${fmtNum(best.outputNum * tp)}`;
  document.getElementById('fee-display').textContent = best.feeDisplay;
  document.getElementById('fee-route').textContent = `via ${best.provider}`;

  // Breakdown
  document.getElementById('bd-route').textContent = best.route;
  document.getElementById('bd-provider').textContent = best.provider;
  document.getElementById('bd-fee').textContent = best.feeDisplay;
  document.getElementById('bd-time').textContent = best.time;
  document.getElementById('bd-slip').textContent = slippage === 'auto' ? 'Auto' : (parseFloat(slippage) * 100) + '%';
  updateActionBtn();
  } catch (e) {
    if (seq !== quoteSeq) return;
    console.error('fetchBestQuote error:', e);
    // Same reset as the no-route path — the button must not stay enabled
    // next to a price-ratio estimate when quoting failed.
    routeAvailable = false;
    document.getElementById('fee-display').textContent = 'Quote error';
    document.getElementById('fee-route').textContent = '';
    document.getElementById('output-amount').textContent = '--';
    document.getElementById('output-usd').textContent = '';
    updateActionBtn();
  }
}

// ── Across crosschain quote ──
async function fetchAcrossQuote(originChain, destChain, fromToken, toToken, amountWei) {
  const inputAddr = fromToken.native ? fromToken.wrapAddresses?.[originChain] : fromToken.addresses[originChain];
  const outputAddr = toToken.native ? toToken.wrapAddresses?.[destChain] : toToken.addresses[destChain];
  if (!inputAddr || !outputAddr) return null;

  const recipient = getRecipient() || walletAddress || '0x0000000000000000000000000000000000000000';
  const depositor = walletAddress || '0x0000000000000000000000000000000000000000';
  const params = new URLSearchParams({
    tradeType: 'exactInput', amount: amountWei, inputToken: inputAddr, outputToken: outputAddr,
    originChainId: originChain, destinationChainId: destChain,
    depositor: depositor,
    recipient: recipient,
    slippage: slippage,
  });

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  const res = await fetch(`${ACROSS_API}/swap/approval?${params}`, { signal: ctrl.signal });
  clearTimeout(t);
  if (!res.ok) return null;
  const data = await res.json();

  // Try multiple possible field paths for the output amount
  const rawOutput = data.steps?.bridge?.outputAmount ?? data.expectedOutput ?? data.outputAmount ?? data.minExpectedInputTokenAmount ?? null;
  if (!rawOutput) { console.warn('Across: no output field found in response'); return null; }
  let outputNum = 0;
  try { outputNum = Number(BigInt(rawOutput)) / 10 ** toToken.decimals; } catch { outputNum = parseFloat(rawOutput) / 10 ** toToken.decimals || 0; }
  if (!outputNum || outputNum <= 0) return null;
  const fp = prices[fromToken.symbol] || 0;
  const tp = prices[toToken.symbol] || 0;
  const amount = Number(BigInt(amountWei)) / 10 ** fromToken.decimals;
  const inputUsd = amount * fp;
  const outputUsd = outputNum * tp;
  const feeUsd = Math.max(0, inputUsd - outputUsd);
  const fromChainName = CHAINS.find(c => c.id === originChain)?.name || originChain;
  const toChainName = CHAINS.find(c => c.id === destChain)?.name || destChain;

  return {
    outputNum,
    provider: 'Across Protocol',
    route: `${fromToken.symbol}(${fromChainName}) → ${toToken.symbol}(${toChainName})`,
    feeDisplay: feeUsd > 0.001 ? `~$${fmtNum(feeUsd)}` : '<$0.01',
    time: '~2 seconds',
    type: 'across',
    quote: data,
    recipient: recipient,
  };
}

// ── Execute ──
let txStartTime = 0;
let txTimerInterval = null;

function showTxScreen(statusText, detailText) {
  const screen = document.getElementById('tx-screen');
  screen.classList.remove('hidden');
  screen.classList.add('flex');
  document.getElementById('tx-loading').classList.remove('hidden');
  document.getElementById('tx-success').classList.add('hidden');
  document.getElementById('tx-status').textContent = statusText;
  document.getElementById('tx-detail').textContent = detailText;
  document.getElementById('tx-timer').textContent = '';
}

function startTxTimer() {
  txStartTime = Date.now();
  clearInterval(txTimerInterval);
  txTimerInterval = setInterval(() => {
    const elapsed = ((Date.now() - txStartTime) / 1000).toFixed(1);
    document.getElementById('tx-timer').textContent = elapsed + 's';
  }, 100);
}

// Stops the ticking interval immediately and freezes the visible number at the
// true fill moment — without this, the timer keeps ticking through the rest of
// showTxSuccess (localStorage write, ENS fetch hookup, etc.) and lands higher
// than the elapsed value we record.
function stopTxTimer() {
  clearInterval(txTimerInterval);
  txTimerInterval = null;
  const elapsed = (Date.now() - txStartTime) / 1000;
  const el = document.getElementById('tx-timer');
  if (el) el.textContent = elapsed.toFixed(1) + 's';
  return elapsed;
}

let txRedirectTimer = null;
let txCountdownInterval = null;

// Saves a bridge to localStorage for the dashboard activity feed. Called as
// soon as the deposit tx is sent — a bridge whose fill-poll times out is
// still a real transaction and must appear in history.
function saveTxHistory(summary, txHash) {
  try {
    const historyKey = 'sage_tx_' + (walletAddress || '').toLowerCase();
    const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
    history.unshift({
      type: 'bridge',
      summary,
      time: 0,
      fromToken: TOKENS[fromTokenIdx].symbol,
      toToken: TOKENS[toTokenIdx].symbol,
      fromChain: CHAINS[fromChainIdx].name,
      toChain: CHAINS[toChainIdx].name,
      fromChainId: CHAINS[fromChainIdx].id,
      amount: document.getElementById('input-amount').value,
      timestamp: Date.now(),
      txHash: txHash || null,
    });
    if (history.length > 20) history.length = 20;
    localStorage.setItem(historyKey, JSON.stringify(history));
  } catch {}
}

function showTxSuccess(summary, elapsedSec, txHash, chainId) {
  if (txTimerInterval) { clearInterval(txTimerInterval); txTimerInterval = null; }
  document.getElementById('tx-loading').classList.add('hidden');
  document.getElementById('tx-success').classList.remove('hidden');

  if (typeof window.fireConfetti === 'function' && elapsedSec <= 30) {
    // Fire from the top of the checkmark circle and bloom outward.
    requestAnimationFrame(() => {
      const el = document.getElementById('tx-success-check');
      let origin;
      if (el) {
        const r = el.getBoundingClientRect();
        origin = { x: r.left + r.width / 2, y: r.top };
      }
      window.fireConfetti({ origin });
    });
  }

  document.getElementById('tx-summary').textContent = summary;
  document.getElementById('tx-time-final').textContent = elapsedSec.toFixed(1) + 's';

  // Congrats line — prefer ENS name (sans .eth), fall back to short address
  const congratsEl = document.getElementById('tx-congrats');
  if (congratsEl) {
    const shortAddr = walletAddress ? walletAddress.slice(0, 6) + '...' + walletAddress.slice(-4) : '';
    const setCongrats = (name) => {
      congratsEl.textContent = `Congrats, ${name}, you just bridged in`;
    };
    setCongrats(shortAddr || 'friend');
    if (walletAddress) {
      fetch(`/api/ens?address=${walletAddress}`)
        .then(r => r.json())
        .then(d => {
          if (d && d.name) setCongrats(d.name.replace(/\.eth$/i, ''));
        })
        .catch(() => {});
    }
  }

  // Show share button if under 5 seconds
  const shareBtn = document.getElementById('tx-share-btn');
  if (elapsedSec < 5) {
    const text = encodeURIComponent('I just moved money onchain with Sage. Cents. Seconds. Sage. \u{1F33F}');
    shareBtn.href = `https://x.com/intent/tweet?text=${text}`;
    // Restore the label — showTxPending repurposes this button as an explorer link
    shareBtn.textContent = 'Share on X';
    shareBtn.classList.remove('hidden');
  } else {
    shareBtn.classList.add('hidden');
  }

  // Auto-redirect countdown (20s)
  startCountdown(20);
}

function startCountdown(seconds) {
  clearTimeout(txRedirectTimer);
  clearInterval(txCountdownInterval);
  const bar = document.getElementById('tx-countdown-bar');
  const text = document.getElementById('tx-countdown-text');
  let remaining = seconds;
  bar.style.width = '100%';
  text.textContent = `Returning to dashboard in ${remaining}s`;

  txCountdownInterval = setInterval(() => {
    remaining--;
    const pct = Math.max(0, (remaining / seconds) * 100);
    bar.style.width = pct + '%';
    text.textContent = `Returning to dashboard in ${remaining}s`;
    if (remaining <= 0) clearInterval(txCountdownInterval);
  }, 1000);

  txRedirectTimer = setTimeout(() => {
    window.location.href = 'index.html';
  }, seconds * 1000);
}

function cancelCountdown() {
  clearTimeout(txRedirectTimer);
  clearInterval(txCountdownInterval);
  const bar = document.getElementById('tx-countdown-bar');
  const text = document.getElementById('tx-countdown-text');
  if (bar) bar.style.width = '0%';
  if (text) text.textContent = '';
}

function closeTxScreen() {
  clearInterval(txTimerInterval);
  cancelCountdown();
  document.getElementById('tx-screen').classList.add('hidden');
  document.getElementById('tx-screen').classList.remove('flex');
  lastQuote = null;
  document.getElementById('input-amount').value = '';
  document.getElementById('output-amount').textContent = '--';
  document.getElementById('output-usd').textContent = '';
  updateActionBtn();
  updateBalance();
}

// The quote must be re-fetched before signing when it is stale, was built for
// a different recipient/wallet, or is missing — the swapTx calldata embeds the
// recipient, so signing a mismatched quote sends funds to the wrong address.
function quoteNeedsRefresh() {
  if (!lastQuote) return true;
  if (Date.now() - lastQuoteAt > QUOTE_MAX_AGE_MS) return true;
  const currentRecipient = getRecipient() || walletAddress;
  if ((lastQuote._recipient || '').toLowerCase() !== (currentRecipient || '').toLowerCase()) return true;
  return false;
}

async function executeSwap() {
  if (!walletAddress) { connectWallet(); return; }
  const amount = parseFloat(document.getElementById('input-amount').value) || 0;
  if (amount <= 0) return;
  if (fromBal != null && amount > fromBal) return;
  // A non-empty but invalid recipient means the user intended a third-party
  // destination — refuse to fall back to their own wallet silently.
  const recipInput = document.getElementById('recipient-address');
  if (recipInput && recipInput.value.trim() && !EthUtils.isValidAddress(recipInput.value.trim())) {
    validateRecipient();
    return;
  }

  const fromSym = TOKENS[fromTokenIdx].symbol;
  const toSym = TOKENS[toTokenIdx].symbol;
  const fromChainName = CHAINS[fromChainIdx].name;
  const toChainName = CHAINS[toChainIdx].name;

  try {
    // Cancel any pending debounce quote: its seq-guard would otherwise void
    // the quote we are about to await here.
    clearTimeout(quoteTimer);
    if (quoteNeedsRefresh()) await fetchBestQuote(amount);
    if (!lastQuote || quoteNeedsRefresh()) throw new Error('Could not get quote');

    if (lastQuote.approvalTxns?.length) {
      showTxScreen('Approving...', `Approve ${fromSym} for bridging`);
      for (const tx of lastQuote.approvalTxns) { await sendTx(tx); }
    }
    showTxScreen('Confirm in wallet...', `${amount} ${fromSym} → ${toSym}`);
    const hash = await sendTx(lastQuote.swapTx);
    startTxTimer();
    showTxScreen('Bridging...', `${fromChainName} → ${toChainName} via Across`);

    // The deposit tx is real from this point — record it regardless of
    // whether the fill confirms inside the polling window.
    saveTxHistory(`${amount} ${fromSym} on ${fromChainName} → ${toSym} on ${toChainName}`, hash);

    const filled = await pollFill(CHAINS[fromChainIdx].id, hash);
    const elapsed = stopTxTimer();

    if (!filled) {
      // Never claim success for a fill we could not confirm
      showTxPending(hash);
      return;
    }

    // Run the gas top-up sequentially before the success screen — running it
    // in parallel made the two flows fight over the tx overlay and prompt the
    // wallet at the same time.
    let gasTopupFailed = false;
    if (gasTopupEnabled) {
      await executeGasTopup().catch(e => {
        console.warn('Gas top-up failed (non-fatal):', e);
        gasTopupFailed = true;
      });
    }

    showTxSuccess(`${amount} ${fromSym} on ${fromChainName} → ${toSym} on ${toChainName}`, elapsed, hash, CHAINS[fromChainIdx].id);
    if (gasTopupFailed) {
      const summary = document.getElementById('tx-summary');
      if (summary) summary.textContent += ' (Note: the gas top-up did not complete.)';
    }
  } catch (e) {
    console.error('Tx failed:', e);
    closeTxScreen();
    const btn = document.getElementById('action-btn');
    btn.textContent = e.code === 4001 ? 'Rejected' : 'Failed';
    setTimeout(() => updateActionBtn(), 2000);
  }
}

// Shown when the fill was not confirmed within the polling window: the deposit
// tx went through, but we won't pretend the bridge completed.
function showTxPending(txHash) {
  document.getElementById('tx-loading').classList.add('hidden');
  document.getElementById('tx-success').classList.remove('hidden');
  let msg = 'Still pending — your deposit was submitted but the fill has not been confirmed yet. Check the transaction status on the explorer.';
  if (gasTopupEnabled) msg += ' The gas top-up was not started; retry it once the bridge completes.';
  document.getElementById('tx-summary').textContent = msg;
  document.getElementById('tx-time-final').textContent = '';
  const congratsEl = document.getElementById('tx-congrats');
  if (congratsEl) congratsEl.textContent = 'Bridge still in progress';
  const shareBtn = document.getElementById('tx-share-btn');
  if (shareBtn) {
    if (txHash) {
      shareBtn.href = explorerTxUrl(CHAINS[fromChainIdx].id, txHash);
      shareBtn.textContent = 'View on explorer';
      shareBtn.classList.remove('hidden');
    } else {
      shareBtn.classList.add('hidden');
    }
  }
}

async function executeGasTopup() {
  const fromToken = TOKENS[fromTokenIdx];
  const originChain = CHAINS[fromChainIdx].id;
  const destChain = CHAINS[toChainIdx].id;
  const nativeWrap = getNativeWrap(destChain);
  if (!nativeWrap) return;

  const inputAddr = fromToken.native ? fromToken.wrapAddresses?.[originChain] : fromToken.addresses[originChain];
  if (!inputAddr) return;

  // Convert USD amount to source token amount
  const srcPrice = prices[fromToken.symbol] || 1;
  const gasAmountInSrc = gasTopupUsd / srcPrice;
  const gasAmountWei = BigInt(Math.floor(gasAmountInSrc * 10 ** fromToken.decimals)).toString();

  const params = new URLSearchParams({
    tradeType: 'exactInput', amount: gasAmountWei,
    inputToken: inputAddr, outputToken: nativeWrap.addr,
    originChainId: originChain, destinationChainId: destChain,
    depositor: walletAddress,
    recipient: getRecipient(),
    slippage: 'auto',
  });

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  const res = await fetch(`${ACROSS_API}/swap/approval?${params}`, { signal: ctrl.signal });
  clearTimeout(t);
  if (!res.ok) return;
  const data = await res.json();

  if (data.approvalTxns?.length) {
    showTxScreen('Approving gas...', `Approve ${fromToken.symbol}`);
    for (const tx of data.approvalTxns) { await sendTx(tx); }
  }
  showTxScreen('Adding gas...', `+$${gasTopupUsd} of ${nativeWrap.symbol} on ${CHAINS[toChainIdx].name} — confirm in wallet`);
  await sendTx(data.swapTx);
}

async function sendTx(tx) {
  // Switch chain if needed
  const targetChainHex = '0x' + tx.chainId.toString(16);
  const currentChain = await window.ethereum.request({ method: 'eth_chainId' });
  if (currentChain !== targetChainHex) {
    try {
      await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: targetChainHex }] });
    } catch (e) {
      if (e.code === 4902) throw new Error(`Please add chain ${tx.chainId} to MetaMask`);
      throw e;
    }
  }

  const txParams = {
    from: walletAddress, to: tx.to, data: tx.data,
    value: tx.value && tx.value !== '0' ? '0x' + BigInt(tx.value).toString(16) : '0x0',
    chainId: targetChainHex,
  };
  if (tx.gas) txParams.gas = '0x' + BigInt(tx.gas).toString(16);
  const txHash = await window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [txParams],
  });
  return txHash;
}

/**
 * Polls Across for the fill status of a deposit. Starts fast (fills are often
 * sub-second, and the on-screen timer should stop promptly) then backs off to
 * 2s so a slow fill doesn't hammer the status API with ~800 requests.
 * @returns {Promise<boolean>} true if the fill was confirmed within ~4 minutes.
 */
async function pollFill(originChainId, txHash) {
  const deadline = Date.now() + 240000;
  let intervalMs = 300;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${ACROSS_API}/deposit/status?originChainId=${originChainId}&depositTxHash=${txHash}`);
      const data = await res.json();
      if (data.status === 'filled') return true;
    } catch {}
    await new Promise(r => setTimeout(r, intervalMs));
    if (intervalMs < 2000) intervalMs = Math.min(intervalMs * 1.5, 2000);
  }
  return false;
}

// ── Helpers ──
function fmtNum(n) {
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (n >= 1) return n.toLocaleString('en-US', { maximumFractionDigits: 4 });
  return n.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

// ── Load Across routes dynamically ──
async function loadRoutes() {
  try {
    const res = await fetch('/api/routes');
    if (!res.ok) return;
    const { chains, tokens, routes } = await res.json();

    // Enrich TOKENS with any new tokens from Across that we don't have.
    // The API response is treated as untrusted: addresses are validated, and
    // curated entries are never overwritten — a poisoned response replacing
    // the USDC address would silently redirect every bridge.
    if (Array.isArray(tokens)) {
      for (const t of tokens) {
        if (!t.symbol || !t.chainId || !t.address || !EthUtils.isValidAddress(t.address)) continue;
        const existing = TOKENS.find(x => x.symbol === t.symbol);
        if (existing) {
          // Only ADD addresses for chains we don't already know, and only if
          // the decimals agree — a symbol collision with different decimals
          // would make every amount off by orders of magnitude.
          if (existing.addresses[t.chainId] === undefined &&
              (t.decimals === undefined || t.decimals === existing.decimals)) {
            existing.addresses[t.chainId] = t.address;
          }
        } else {
          TOKENS.push({
            symbol: t.symbol,
            name: t.name || t.symbol,
            decimals: t.decimals || 18,
            native: false,
            addresses: { [t.chainId]: t.address },
            logoURI: typeof t.logoURI === 'string' ? t.logoURI : '',
          });
        }
      }
    }

    // Enrich CHAINS
    if (Array.isArray(chains)) {
      for (const c of chains) {
        if (!CHAINS.find(x => x.id === c.chainId)) {
          CHAINS.push({
            id: c.chainId,
            name: c.name || `Chain ${c.chainId}`,
            // Chains we don't bundle an icon for render via the API's logoURI.
            logoURI: typeof c.logoURI === 'string' ? c.logoURI : '',
          });
        }
      }
    }
  } catch (e) {
    console.warn('Could not load Across routes, using defaults:', e);
  }
}

// ── Init ──
(async function init() {
  // Ensure different chains for bridge
  if (fromChainIdx === toChainIdx) {
    toChainIdx = (fromChainIdx + 1) % CHAINS.length;
    if (CHAINS[toChainIdx]?.virtual) toChainIdx = (toChainIdx + 1) % CHAINS.length;
  }
  updateTokenDisplay();
  updateRecipientVisibility();
  updateRoute();
  updateActionBtn();
  await Promise.all([fetchPrices(), loadRoutes()]);
  onAmountChange();

  await setupWallet({
    onConnected(addr) {
      walletAddress = addr;
      document.getElementById('connect-label').textContent = formatAddr(addr);
      resolveWalletENS();
      updateBalance();
      // Any quote fetched before/for another wallet embeds the wrong
      // depositor/recipient — drop it and re-quote for this account.
      lastQuote = null;
      onAmountChange();
    },
    onDisconnected() {
      walletAddress = null;
      document.getElementById('connect-label').textContent = 'Connect';
      lastQuote = null;
      updateBalance();
      updateActionBtn();
    },
    onChainChanged() { if (walletAddress) { updateBalance(); updateActionBtn(); } }
  });
  updateActionBtn();
})();


// ── Event delegation & input listeners ──────────────────────────────────────
document.addEventListener('click', function(e) {
  var el = e.target.closest('[data-action]');
  if (!el) return;
  var action = el.dataset.action;
  var arg = el.dataset.arg;
  switch (action) {
    case 'cycle-token':          cycleToken(arg); break;
    case 'close-token-modal':    closeTokenModal(); break;
    case 'swap-tokens':          swapTokens(); break;
    case 'set-max':              setMax(); break;
    case 'set-gas-usd':          setGasUsd(Number(arg)); break;
    case 'toggle-fee-breakdown': toggleFeeBreakdown(); break;
    case 'toggle-gas-topup':     toggleGasTopup(); break;
    case 'close-tx-screen':      closeTxScreen(); break;
    case 'toggle-all-chains':    toggleAllChains(); break;
    case 'set-chain-filter':     setChainFilter(arg === '' ? null : (isNaN(arg) ? arg : Number(arg))); break;
    case 'execute-swap':         executeSwap(); break;
    case 'toggle-recipient':     toggleRecipient(); break;
  }
});
document.addEventListener('DOMContentLoaded', function() {
  var amtEl = document.getElementById('input-amount');
  if (amtEl) amtEl.addEventListener('input', onAmountChange);
  var chainSearch = document.getElementById('chain-search');
  if (chainSearch) chainSearch.addEventListener('input', filterChainGrid);
  var tokenSearch = document.getElementById('token-search');
  if (tokenSearch) tokenSearch.addEventListener('input', filterTokenList);
  // Editing the recipient invalidates the current quote — the swapTx calldata
  // embeds the recipient, so the quote must be re-fetched.
  var recipEl = document.getElementById('recipient-address');
  if (recipEl) recipEl.addEventListener('input', function() {
    validateRecipient();
    onAmountChange();
  });
});
