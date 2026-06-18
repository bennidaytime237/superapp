// Combined Transfer page — Bridge / Send / Receive / Deposit.
// Self-contained re-implementation (does not load the per-page scripts) so the
// four flows can coexist on one page without global/ID collisions. Reuses the
// shared helpers from config.js, wallet.js, eth-utils.js and safe-dom.js.

(function () {
  'use strict';

  const ACROSS_API = 'https://app.across.to/api';
  const ZERO = '0x0000000000000000000000000000000000000000';
  const USDC_ARB = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
  const USDC_POLYGON = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
  const HL_BRIDGE = '0x2Df1c51E09aECF9cacB7bc98cB1742757f163dF7'; // Across→Hyperliquid forwarder
  const HL_MIN = 5, PM_MIN = 3;

  const CHAINS = [
    { id: 1,      name: 'Ethereum' },
    { id: 42161,  name: 'Arbitrum' },
    { id: 8453,   name: 'Base' },
    { id: 10,     name: 'Optimism' },
    { id: 137,    name: 'Polygon' },
    { id: 56,     name: 'BNB Chain' },
    { id: 324,    name: 'zkSync' },
    { id: 59144,  name: 'Linea' },
    { id: 34443,  name: 'Mode' },
    { id: 81457,  name: 'Blast' },
    { id: 534352, name: 'Scroll' },
  ];

  const TOKENS = [
    { symbol: 'ETH', name: 'Ethereum', decimals: 18, native: true,
      addresses: { 1: null, 42161: null, 8453: null, 10: null },
      wrapAddresses: { 1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 42161: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', 8453: '0x4200000000000000000000000000000000000006', 10: '0x4200000000000000000000000000000000000006' } },
    { symbol: 'USDC', name: 'USD Coin', decimals: 6, native: false,
      addresses: { 1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', 8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', 10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', 137: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' } },
    { symbol: 'USDT', name: 'Tether', decimals: 6, native: false,
      addresses: { 1: '0xdAC17F958D2ee523a2206206994597C13D831ec7', 42161: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', 10: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58' } },
    { symbol: 'DAI', name: 'Dai', decimals: 18, native: false,
      addresses: { 1: '0x6B175474E89094C44Da98b954EedeAC495271d0F', 42161: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1' } },
    { symbol: 'WBTC', name: 'Wrapped BTC', decimals: 8, native: false,
      addresses: { 1: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', 42161: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f' } },
    { symbol: 'POL', name: 'Polygon', decimals: 18, native: true,
      addresses: { 137: null }, wrapAddresses: { 137: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270' } },
    { symbol: 'BNB', name: 'BNB', decimals: 18, native: true,
      addresses: { 56: null }, wrapAddresses: { 56: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' } },
  ];

  const USDC_ICON = TOKEN_ICONS['USDC'];
  const HL_OUT_ICON = 'https://icons.llamao.fi/icons/chains/rsz_hyperliquid.jpg';

  let walletAddress = null, prices = {}, cachedBalances = null;

  // ── helpers ────────────────────────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  function fmt(n) { if (!isFinite(n)) return '0'; if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 }); if (n >= 1) return n.toLocaleString('en-US', { maximumFractionDigits: 4 }); return n.toLocaleString('en-US', { maximumFractionDigits: 6 }); }
  function fmtUsd(n) { if (!isFinite(n)) return '$0.00'; return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function existsOn(t, c) { return t.native ? Object.prototype.hasOwnProperty.call(t.addresses, c.id) : !!t.addresses[c.id]; }
  function addrFor(t, c) { return t.native ? (t.wrapAddresses && t.wrapAddresses[c.id]) : t.addresses[c.id]; }
  function balOf(t, c) { return (cachedBalances && cachedBalances[c.id] && cachedBalances[c.id][t.symbol]) || 0; }
  function priceOf(t) { return prices[t.symbol] || 0; }
  function toHex(n) { return '0x' + BigInt(n).toString(16); }

  async function fetchPrices() {
    try {
      const raw = await (await fetch('/api/prices')).json();
      prices = { ETH: raw.ethereum?.usd || 0, USDC: 1, USDT: 1, DAI: 1, WBTC: raw['wrapped-bitcoin']?.usd || 0, POL: raw['polygon-ecosystem-token']?.usd || raw['matic-network']?.usd || 0, BNB: raw.binancecoin?.usd || 0 };
    } catch { prices = { ETH: 2500, USDC: 1, USDT: 1, DAI: 1, WBTC: 90000, POL: 0.5, BNB: 600 }; }
  }

  async function fetchBalances() {
    if (!walletAddress) { cachedBalances = null; refreshBalances(); return; }
    try {
      cachedBalances = await (await fetch(`/api/balances?address=${walletAddress}&_t=${Date.now()}`)).json();
    } catch { cachedBalances = null; }
    refreshBalances();
  }
  function refreshBalances() { Bridge.refreshBal(); Send.refreshBal(); Deposit.refreshBal(); }

  // ── ENS / address validation (shared) ───────────────────────────────────────
  function makeAddrValidator(inputId, errId, ensId) {
    let resolved = null, timer = null;
    function validate(onChange) {
      const el = $(inputId); if (!el) return;
      const v = el.value.trim();
      const ens = $(ensId), err = $(errId);
      resolved = null; if (ens) ens.classList.add('hidden');
      if ((v.endsWith('.eth') || v.endsWith('.hl')) && v.length > 3) {
        if (err) err.classList.add('hidden');
        if (ens) { ens.textContent = 'Resolving…'; ens.classList.remove('hidden'); }
        clearTimeout(timer);
        timer = setTimeout(() => {
          fetch(`/api/ens?name=${encodeURIComponent(v)}`).then(r => r.json()).then(d => {
            if (d.address && d.address !== ZERO) { resolved = d.address; if (ens) ens.textContent = `→ ${d.address.slice(0, 6)}…${d.address.slice(-4)}`; }
            else if (ens) ens.textContent = v.endsWith('.hl') ? 'HL name not found' : 'ENS name not found';
            onChange && onChange();
          }).catch(() => { if (ens) ens.textContent = 'Could not resolve'; });
        }, 500);
      } else if (err) {
        err.classList.toggle('hidden', !v || EthUtils.isValidAddress(v));
      }
      onChange && onChange();
    }
    function get() {
      if (resolved) return resolved;
      const el = $(inputId); const v = el ? el.value.trim() : '';
      return EthUtils.isValidAddress(v) ? v : null;
    }
    return { validate, get };
  }

  // ── shared token picker modal ────────────────────────────────────────────────
  let pickerCtx = null, pickerRows = [];
  function openPicker(ctx) {
    pickerCtx = ctx;
    pickerRows = [];
    CHAINS.forEach((c, ci) => TOKENS.forEach((t, ti) => {
      if (!existsOn(t, c)) return;
      if (ctx.filter && !ctx.filter(t, c)) return;
      pickerRows.push({ t, ti, c, ci, bal: balOf(t, c) });
    }));
    if (ctx.withBalance) pickerRows.sort((a, b) => b.bal - a.bal);
    $('picker-search').value = '';
    renderPicker(pickerRows);
    $('picker-modal').classList.remove('hidden');
    $('picker-search').focus();
  }
  function closePicker() { $('picker-modal').classList.add('hidden'); }
  function filterPicker() {
    const q = $('picker-search').value.toLowerCase();
    renderPicker(q ? pickerRows.filter(r => r.t.symbol.toLowerCase().includes(q) || r.t.name.toLowerCase().includes(q) || r.c.name.toLowerCase().includes(q)) : pickerRows);
  }
  function renderPicker(rows) {
    const list = $('picker-list');
    const items = rows.map(({ t, ti, c, ci, bal }) =>
      Safe.html`<button data-ti="${ti}" data-ci="${ci}" class="pick-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface-container-low transition-colors text-left">
        <div class="relative flex-shrink-0">
          <img src="${Safe.url(TOKEN_ICONS[t.symbol] || '')}" class="w-9 h-9 rounded-full bg-surface-container"/>
          <img src="${Safe.url(chainIcon(c.id))}" class="w-4 h-4 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-surface-container-lowest bg-surface-container-lowest"/>
        </div>
        <div class="flex-1"><p class="font-bold text-sm text-on-surface">${bal > 0 ? fmt(bal) + ' ' : ''}${t.symbol}</p><p class="text-xs text-on-surface-variant">${t.name} · ${c.name}</p></div>
        <span class="material-symbols-outlined text-on-surface-variant text-base">chevron_right</span>
      </button>`);
    Safe.setHTML(list, items.length ? items : Safe.html`<p class="text-sm text-on-surface-variant text-center py-4">No tokens found</p>`);
    list.querySelectorAll('button.pick-btn').forEach(btn => {
      btn.addEventListener('click', () => { const ctx = pickerCtx; closePicker(); ctx.onPick(Number(btn.dataset.ti), Number(btn.dataset.ci)); });
    });
  }

  // ── transaction overlay (shared) ─────────────────────────────────────────────
  function txShow(text) {
    $('tx-spinner').classList.remove('hidden');
    $('tx-done').classList.add('hidden');
    $('tx-text').textContent = text || 'Working…';
    $('tx-overlay').classList.remove('hidden');
    $('tx-overlay').classList.add('flex');
  }
  function txProgress(text) { $('tx-text').textContent = text; }
  function txDone(text) {
    $('tx-spinner').classList.add('hidden');
    $('tx-done').classList.remove('hidden');
    $('tx-done-text').textContent = text || 'Done';
  }
  function txHide() { $('tx-overlay').classList.add('hidden'); $('tx-overlay').classList.remove('flex'); }

  function saveHistory(entry) {
    try {
      const k = 'sage_tx_' + (walletAddress || '').toLowerCase();
      const h = JSON.parse(localStorage.getItem(k) || '[]');
      h.unshift(Object.assign({ timestamp: Date.now() }, entry));
      if (h.length > 20) h.length = 20;
      localStorage.setItem(k, JSON.stringify(h));
    } catch {}
  }

  // Sends a normalized Across tx object {to,data,value,chainId,gas}.
  async function sendAcrossTx(tx) {
    const chainHex = '0x' + tx.chainId.toString(16);
    const current = await window.ethereum.request({ method: 'eth_chainId' });
    if (current !== chainHex) {
      try { await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chainHex }] }); }
      catch (e) { if (e.code === 4902) throw new Error('Add chain to wallet'); throw e; }
    }
    const params = { from: walletAddress, to: tx.to, data: tx.data, value: tx.value && tx.value !== '0' ? '0x' + BigInt(tx.value).toString(16) : '0x0', chainId: chainHex };
    if (tx.gas) params.gas = '0x' + BigInt(tx.gas).toString(16);
    return window.ethereum.request({ method: 'eth_sendTransaction', params: [params] });
  }

  // Generic Across exactInput quote. Returns { data, out } or null.
  async function acrossQuote({ fromT, fromC, outputToken, destChainId, amount, recipient, outDecimals }) {
    const inputAddr = addrFor(fromT, fromC);
    if (!inputAddr) return null;
    const amountWei = BigInt(Math.floor(amount * 10 ** fromT.decimals)).toString();
    const params = new URLSearchParams({
      tradeType: 'exactInput', amount: amountWei, inputToken: inputAddr, outputToken,
      originChainId: fromC.id, destinationChainId: destChainId,
      depositor: walletAddress || ZERO, recipient: recipient || walletAddress || ZERO, slippage: 'auto',
    });
    const ctrl = new AbortController();
    const tm = setTimeout(() => ctrl.abort(), 8000);
    let res;
    try { res = await fetch(`${ACROSS_API}/swap/approval?${params}`, { signal: ctrl.signal }); }
    finally { clearTimeout(tm); }
    if (!res.ok) return null;
    const data = await res.json();
    const rawOut = data.steps?.bridge?.outputAmount ?? data.expectedOutput ?? data.outputAmount ?? '0';
    let out = 0; try { out = Number(BigInt(rawOut)) / 10 ** outDecimals; } catch { out = parseFloat(rawOut) / 10 ** outDecimals || 0; }
    return { data, out };
  }

  async function pollFill(originChainId, hash) {
    for (let i = 0; i < 120; i++) {
      try { const d = await (await fetch(`${ACROSS_API}/deposit/status?originChainId=${originChainId}&depositTxHash=${hash}`)).json(); if (d.status === 'filled') return; } catch {}
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  const DIM = 'w-full py-4 bg-surface-container-high text-on-surface-variant rounded-full font-black text-lg';
  const ACTIVE = 'w-full py-4 bg-primary text-on-primary rounded-full font-black text-lg active:scale-[0.98] transition-transform';

  // ══════════════════════════════════════════════════════════════════════════
  // BRIDGE
  // ══════════════════════════════════════════════════════════════════════════
  const Bridge = {
    fromT: 0, fromC: 2, toT: 1, toC: 1, recipOpen: false, recip: null, lastQuote: null, timer: null,
    init() { this.recip = makeAddrValidator('br-recip', 'br-recip-err', null); this.updateDisplay(); this.updateBtn(); },
    refreshBal() {
      const t = TOKENS[this.fromT], c = CHAINS[this.fromC];
      $('br-balance').textContent = walletAddress ? `${fmt(balOf(t, c))} ${t.symbol}` : '--';
    },
    updateDisplay() {
      const ft = TOKENS[this.fromT], fc = CHAINS[this.fromC], tt = TOKENS[this.toT], tc = CHAINS[this.toC];
      $('br-from-icon').src = TOKEN_ICONS[ft.symbol] || ''; $('br-from-chain-icon').src = chainIcon(fc.id); $('br-from-label').textContent = `${ft.symbol} on ${fc.name}`;
      $('br-to-icon').src = TOKEN_ICONS[tt.symbol] || ''; $('br-to-chain-icon').src = chainIcon(tc.id); $('br-to-label').textContent = `${tt.symbol} on ${tc.name}`;
      this.refreshBal(); this.onAmount();
    },
    onAmount() {
      clearTimeout(this.timer); this.lastQuote = null; this.updateBtn();
      const val = parseFloat($('br-amount').value) || 0;
      if (val <= 0) { $('br-output').textContent = '--'; $('br-fee').textContent = '--'; return; }
      $('br-fee').textContent = 'Fetching…';
      this.timer = setTimeout(() => this.quote(val), 300);
    },
    async quote(amount) {
      try {
        const ft = TOKENS[this.fromT], fc = CHAINS[this.fromC], tt = TOKENS[this.toT], tc = CHAINS[this.toC];
        const outputToken = addrFor(tt, tc);
        if (!outputToken) { $('br-fee').textContent = 'Route unavailable'; return; }
        const r = await acrossQuote({ fromT: ft, fromC: fc, outputToken, destChainId: tc.id, amount, recipient: this.recip.get(), outDecimals: tt.decimals });
        if (!r) { $('br-fee').textContent = 'Quote failed'; return; }
        this.lastQuote = r.data;
        $('br-output').textContent = fmt(r.out);
        const inUsd = amount * priceOf(ft), outUsd = r.out * priceOf(tt);
        const feeUsd = inUsd > 0 ? Math.max(0, inUsd - outUsd) : 0;
        $('br-fee').textContent = feeUsd > 0.001 ? `~${fmtUsd(feeUsd)} fee` : 'Best rate';
        this.updateBtn();
      } catch (e) { console.warn(e); $('br-fee').textContent = 'Quote failed'; }
    },
    setMax() {
      const t = TOKENS[this.fromT], c = CHAINS[this.fromC], bal = balOf(t, c);
      const reserve = t.native ? ({ 1: 0.005, 56: 0.001, 137: 0.05 }[c.id] ?? 0.0005) : 0;
      $('br-amount').value = Math.max(0, bal - reserve); this.onAmount();
    },
    toggleRecip() {
      this.recipOpen = !this.recipOpen;
      $('br-recip-wrap').classList.toggle('hidden', !this.recipOpen);
      $('br-recip-toggle-text').textContent = this.recipOpen ? 'Send to my wallet' : 'Send to a different address';
      if (!this.recipOpen) { $('br-recip').value = ''; }
      this.onAmount();
    },
    swap() {
      [this.fromT, this.toT] = [this.toT, this.fromT];
      [this.fromC, this.toC] = [this.toC, this.fromC];
      $('br-amount').value = ''; this.updateDisplay();
    },
    updateBtn() {
      const btn = $('br-action'), amt = parseFloat($('br-amount').value) || 0, t = TOKENS[this.fromT], c = CHAINS[this.fromC];
      const bal = balOf(t, c);
      if (!walletAddress) { btn.textContent = 'Connect Wallet'; btn.className = ACTIVE; }
      else if (amt <= 0) { btn.textContent = 'Enter amount'; btn.className = DIM; }
      else if (bal && amt > bal) { btn.textContent = 'Insufficient balance'; btn.className = DIM; }
      else if (this.recipOpen && !this.recip.get()) { btn.textContent = 'Enter recipient'; btn.className = DIM; }
      else { btn.textContent = 'Review Bridge'; btn.className = ACTIVE; }
    },
    async execute() {
      if (!walletAddress) return connectWallet();
      const amount = parseFloat($('br-amount').value) || 0; if (amount <= 0) return;
      const ft = TOKENS[this.fromT], fc = CHAINS[this.fromC], tt = TOKENS[this.toT], tc = CHAINS[this.toC];
      if (this.recipOpen && !this.recip.get()) return;
      try {
        txShow('Preparing route…');
        if (!this.lastQuote) await this.quote(amount);
        if (!this.lastQuote) throw new Error('No quote');
        const q = this.lastQuote;
        if (q.approvalTxns?.length) { txProgress('Approving…'); for (const tx of q.approvalTxns) await sendAcrossTx(tx); }
        txProgress('Confirm in wallet…');
        const hash = await sendAcrossTx(q.swapTx);
        txProgress(`Bridging to ${tc.name}…`);
        await pollFill(fc.id, hash);
        saveHistory({ type: 'bridge', summary: `Bridged ${amount} ${ft.symbol} (${fc.name}) → ${tt.symbol} on ${tc.name}`, fromToken: ft.symbol, toToken: tt.symbol, fromChain: fc.name, toChain: tc.name, fromChainId: fc.id, amount: String(amount), txHash: hash });
        txDone('Bridge complete!');
        fetchBalances();
      } catch (e) { console.error(e); txProgress(e.code === 4001 ? 'Rejected' : (e.message || 'Failed')); setTimeout(txHide, 1800); }
    },
  };

  // ══════════════════════════════════════════════════════════════════════════
  // SEND
  // ══════════════════════════════════════════════════════════════════════════
  const Send = {
    tok: 1, chn: 2, mode: 'token', recip: null,
    init() { this.recip = makeAddrValidator('sd-recip', 'sd-addr-err', 'sd-ens'); this.applyMode(); this.updateDisplay(); this.updateBtn(); },
    refreshBal() {
      const t = TOKENS[this.tok], c = CHAINS[this.chn];
      $('sd-balance').textContent = walletAddress ? `${fmt(balOf(t, c))} ${t.symbol}` : '--';
    },
    updateDisplay() {
      const t = TOKENS[this.tok], c = CHAINS[this.chn];
      $('sd-token-icon').src = TOKEN_ICONS[t.symbol] || ''; $('sd-chain-icon').src = chainIcon(c.id); $('sd-token-label').textContent = `${t.symbol} on ${c.name}`;
      this.applyMode(); this.refreshBal(); this.onAmount();
    },
    setMode(m) { if (m !== 'usd' && m !== 'token') return; this.mode = m; this.applyMode(); this.onAmount(); },
    applyMode() {
      const t = TOKENS[this.tok], usd = this.mode === 'usd';
      const a = 'px-3 py-1 rounded-full text-xs font-bold transition-colors bg-primary text-on-primary';
      const i = 'px-3 py-1 rounded-full text-xs font-bold transition-colors text-on-surface-variant hover:text-on-surface';
      $('sd-mode-usd').className = usd ? a : i; $('sd-mode-token').className = usd ? i : a;
      $('sd-mode-token-label').textContent = t.symbol;
      $('sd-prefix').classList.toggle('hidden', !usd); $('sd-suffix').classList.toggle('hidden', usd);
      $('sd-suffix').textContent = t.symbol; $('sd-amount').placeholder = usd ? '0.00' : '0';
    },
    tokenAmount() { const v = parseFloat($('sd-amount').value) || 0; if (this.mode === 'usd') { const p = priceOf(TOKENS[this.tok]); return p > 0 ? v / p : 0; } return v; },
    onAmount() {
      this.updateBtn();
      const t = TOKENS[this.tok], p = priceOf(t), v = parseFloat($('sd-amount').value) || 0, conv = $('sd-conv');
      if (v <= 0) { conv.textContent = ''; return; }
      conv.textContent = this.mode === 'usd' ? (p > 0 ? `≈ ${fmt(v / p)} ${t.symbol}` : `Price unavailable`) : (p ? `≈ ${fmtUsd(v * p)}` : '');
    },
    setMax() {
      const t = TOKENS[this.tok], c = CHAINS[this.chn], bal = balOf(t, c);
      const reserve = t.native ? ({ 1: 0.005, 56: 0.001, 137: 0.05 }[c.id] ?? 0.0005) : 0;
      const maxTok = Math.max(0, bal - reserve);
      $('sd-amount').value = this.mode === 'usd' ? (priceOf(t) > 0 ? fmt(maxTok * priceOf(t)) : maxTok) : maxTok;
      this.onAmount();
    },
    updateBtn() {
      const btn = $('sd-action'), amt = this.tokenAmount(), addr = this.recip.get(), t = TOKENS[this.tok], c = CHAINS[this.chn], bal = balOf(t, c);
      if (!walletAddress) { btn.textContent = 'Connect Wallet'; btn.className = ACTIVE; }
      else if (!addr) { btn.textContent = 'Enter address'; btn.className = DIM; }
      else if (amt <= 0) { btn.textContent = 'Enter amount'; btn.className = DIM; }
      else if (bal && amt > bal) { btn.textContent = 'Insufficient balance'; btn.className = DIM; }
      else { btn.textContent = 'Send'; btn.className = ACTIVE; }
    },
    encodeTransfer(to, amount, decimals) {
      const sel = '0xa9059cbb';
      const addrPad = to.toLowerCase().replace('0x', '').padStart(64, '0');
      const amt = BigInt(Math.floor(amount * 10 ** decimals)).toString(16).padStart(64, '0');
      return sel + addrPad + amt;
    },
    async execute() {
      if (!walletAddress) return connectWallet();
      const amount = this.tokenAmount(); if (amount <= 0) return;
      const recipient = this.recip.get(); if (!recipient) return;
      const t = TOKENS[this.tok], c = CHAINS[this.chn], bal = balOf(t, c);
      if (bal && amount > bal) return;
      try {
        txShow('Confirm in wallet…');
        const chainHex = '0x' + c.id.toString(16);
        const current = await window.ethereum.request({ method: 'eth_chainId' });
        if (current !== chainHex) { try { await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chainHex }] }); } catch (e) { if (e.code === 4902) throw new Error('Add chain to wallet'); throw e; } }
        let txParams;
        if (t.native) txParams = { from: walletAddress, to: recipient, value: toHex(BigInt(Math.floor(amount * 10 ** t.decimals))), chainId: chainHex };
        else txParams = { from: walletAddress, to: t.addresses[c.id], data: this.encodeTransfer(recipient, amount, t.decimals), value: '0x0', chainId: chainHex };
        try { txParams.gas = await window.ethereum.request({ method: 'eth_estimateGas', params: [txParams] }); } catch {}
        const hash = await window.ethereum.request({ method: 'eth_sendTransaction', params: [txParams] });
        txProgress('Waiting for confirmation…');
        for (let i = 0; i < 60; i++) { try { const r = await window.ethereum.request({ method: 'eth_getTransactionReceipt', params: [hash] }); if (r && r.blockNumber) break; } catch {} await new Promise(r => setTimeout(r, 2000)); }
        saveHistory({ type: 'send', summary: `Sent ${amount} ${t.symbol} on ${c.name}`, token: t.symbol, chain: c.name, chainId: c.id, amount: String(amount), to: recipient, txHash: hash });
        txDone('Transfer complete!');
        fetchBalances();
      } catch (e) { console.error(e); txProgress(e.code === 4001 ? 'Rejected' : (e.message || 'Failed')); setTimeout(txHide, 1800); }
    },
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RECEIVE (payment request link)
  // ══════════════════════════════════════════════════════════════════════════
  const PRESETS_USD = [10, 50, 100];
  const PRESETS_TOKEN = { USDC: [10, 50, 100], USDT: [10, 50, 100], DAI: [10, 50, 100], ETH: [0.01, 0.05, 0.1], WBTC: [0.001, 0.005, 0.01], POL: [10, 50, 100], BNB: [0.05, 0.1, 0.5] };
  const Receive = {
    tok: 1, chn: 2, mode: 'usd', url: '',
    init() { this.applyMode(); this.updateDisplay(); this.updateBtn(); },
    refreshBal() {},
    updateMyAddr() { $('rc-myaddr').textContent = walletAddress ? formatAddr(walletAddress) : 'Connect wallet'; },
    updateDisplay() {
      const t = TOKENS[this.tok], c = CHAINS[this.chn];
      $('rc-token-icon').src = TOKEN_ICONS[t.symbol] || ''; $('rc-chain-icon').src = chainIcon(c.id); $('rc-token-label').textContent = `${t.symbol} on ${c.name}`;
      this.applyMode(); this.onAmount();
    },
    setMode(m) { if (m !== 'usd' && m !== 'token') return; this.mode = m; this.applyMode(); this.onAmount(); },
    setAmt(n) { $('rc-amount').value = n; this.onAmount(); },
    applyMode() {
      const t = TOKENS[this.tok], usd = this.mode === 'usd';
      const a = 'px-3 py-1 rounded-full text-xs font-bold transition-colors bg-primary text-on-primary';
      const i = 'px-3 py-1 rounded-full text-xs font-bold transition-colors text-on-surface-variant hover:text-on-surface';
      $('rc-mode-usd').className = usd ? a : i; $('rc-mode-token').className = usd ? i : a;
      $('rc-mode-token-label').textContent = t.symbol;
      $('rc-prefix').classList.toggle('hidden', !usd); $('rc-suffix').classList.toggle('hidden', usd);
      $('rc-suffix').textContent = t.symbol; $('rc-amount').placeholder = usd ? '0.00' : '0';
      const presets = usd ? PRESETS_USD : (PRESETS_TOKEN[t.symbol] || PRESETS_USD);
      const el = $('rc-presets'); el.innerHTML = '';
      presets.forEach(v => { const b = document.createElement('button'); b.dataset.action = 'rc-set-amt'; b.dataset.arg = String(v); b.className = 'px-4 py-1.5 rounded-full text-sm font-bold border border-outline-variant/15 text-on-surface-variant hover:bg-surface-container-low transition-colors'; b.textContent = usd ? `$${v}` : `${v} ${t.symbol}`; el.appendChild(b); });
    },
    onAmount() {
      this.updateBtn();
      const t = TOKENS[this.tok], p = priceOf(t), v = parseFloat($('rc-amount').value) || 0, conv = $('rc-conv');
      if (v <= 0) { conv.textContent = ''; return; }
      conv.textContent = this.mode === 'usd' ? (p > 0 ? `≈ ${fmt(v / p)} ${t.symbol}` : 'Price unavailable') : (p ? `≈ ${fmtUsd(v * p)}` : '');
    },
    updateBtn() {
      const btn = $('rc-action'), t = TOKENS[this.tok], v = parseFloat($('rc-amount').value) || 0, p = priceOf(t);
      if (!walletAddress) { btn.textContent = 'Connect Wallet'; btn.className = ACTIVE; }
      else if (v <= 0) { btn.textContent = 'Enter amount'; btn.className = DIM; }
      else if (this.mode === 'usd' && !p) { btn.textContent = 'Price unavailable'; btn.className = DIM; }
      else { btn.textContent = 'Create Payment Link'; btn.className = ACTIVE; }
    },
    generate() {
      if (!walletAddress) return connectWallet();
      const t = TOKENS[this.tok], c = CHAINS[this.chn], v = parseFloat($('rc-amount').value) || 0; if (v <= 0) return;
      const p = priceOf(t); let tokenAmt, usdAmt;
      if (this.mode === 'usd') { if (!p) return; usdAmt = v; tokenAmt = v / p; } else { tokenAmt = v; usdAmt = p ? v * p : null; }
      const tokenAmtStr = Number(tokenAmt.toFixed(Math.min(t.decimals, 8))).toString();
      const note = $('rc-note').value.trim();
      const params = new URLSearchParams({ to: walletAddress, token: t.symbol, chain: c.id, amount: tokenAmtStr, currency: this.mode });
      if (this.mode === 'usd') params.set('usd', String(usdAmt));
      if (note) params.set('note', note);
      this.url = `${window.location.origin}/send.html?${params}`;
      $('rc-form').classList.add('hidden'); $('rc-share').classList.remove('hidden');
      $('rc-url').textContent = this.url;
      $('rc-summary').textContent = this.mode === 'usd' ? `${fmtUsd(usdAmt)} · ${fmt(tokenAmt)} ${t.symbol} on ${c.name}` : (usdAmt != null ? `${fmt(tokenAmt)} ${t.symbol} on ${c.name} · ${fmtUsd(usdAmt)}` : `${fmt(tokenAmt)} ${t.symbol} on ${c.name}`);
      const nd = $('rc-note-disp'); if (note) { nd.textContent = `"${note}"`; nd.classList.remove('hidden'); } else nd.classList.add('hidden');
      this.renderQR();
      this.showEns();
    },
    renderQR() {
      const canvas = $('rc-qr'); if (!canvas || !window.SageQR) return;
      // Card is always white, so pin the brand sage that keeps strong contrast
      // regardless of the active light/dark theme.
      const draw = (logo) => { try { SageQR.render(canvas, this.url, { color: '#667b68', bg: '#ffffff', logo, targetSize: 260, ecLevel: 'H' }); } catch (e) { console.warn('QR render failed', e); } };
      if (this._logo && this._logo.complete) { draw(this._logo); return; }
      const img = this._logo || (this._logo = new Image());
      img.onload = () => draw(img);
      img.onerror = () => draw(null);
      if (!img.src) img.src = 'sage-logo.svg'; else if (img.complete) draw(img);
    },
    showEns() {
      const ensEl = $('rc-qr-ens'), addrEl = $('rc-qr-addr');
      ensEl.classList.add('hidden'); addrEl.classList.add('hidden');
      if (!walletAddress) return;
      const short = formatAddr(walletAddress);
      fetch(`/api/ens?address=${walletAddress}`).then(r => r.json()).then(d => {
        if (d && d.name) {
          ensEl.textContent = d.name; ensEl.classList.remove('hidden');
          addrEl.textContent = short; addrEl.classList.remove('hidden');
        } else {
          ensEl.textContent = short; ensEl.classList.remove('hidden');
        }
      }).catch(() => { ensEl.textContent = short; ensEl.classList.remove('hidden'); });
    },
    downloadQR() {
      const qr = $('rc-qr'); if (!qr) return;
      const ensEl = $('rc-qr-ens');
      const label = ensEl && !ensEl.classList.contains('hidden') ? ensEl.textContent.trim() : '';
      const scale = qr.width / 260;
      const pad = Math.round(24 * scale);
      const textH = label ? Math.round(48 * scale) : 0;
      const out = document.createElement('canvas');
      out.width = qr.width + pad * 2;
      out.height = qr.height + pad * 2 + textH;
      const ctx = out.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.drawImage(qr, pad, pad);
      if (label) {
        ctx.fillStyle = '#667b68';
        ctx.font = `bold ${Math.round(18 * scale)}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(label, out.width / 2, qr.height + pad + Math.round(32 * scale));
      }
      const a = document.createElement('a');
      a.download = `${label || 'sage-payment'}-qr.png`;
      a.href = out.toDataURL('image/png');
      a.click();
    },
    copy() { navigator.clipboard.writeText(this.url); const l = $('rc-copy-label'); l.textContent = 'Copied!'; setTimeout(() => l.textContent = 'Copy', 2000); },
    share() { if (navigator.share) navigator.share({ title: 'Payment Request', text: 'Pay me via Sage', url: this.url }).catch(() => {}); else this.copy(); },
    reset() { $('rc-form').classList.remove('hidden'); $('rc-share').classList.add('hidden'); $('rc-amount').value = ''; $('rc-note').value = ''; this.onAmount(); },
  };

  // ══════════════════════════════════════════════════════════════════════════
  // DEPOSIT (Hyperliquid / Polymarket)
  // ══════════════════════════════════════════════════════════════════════════
  const Deposit = {
    app: 'hyperliquid', tok: 1, chn: 1, recip: null, lastQuote: null, timer: null,
    cfg: {
      hyperliquid: { name: 'Hyperliquid', out: 'USDC on Hyperliquid', outToken: USDC_ARB, destChain: 42161, min: HL_MIN, recipient: () => HL_BRIDGE, needAddr: false },
      polymarket:  { name: 'Polymarket',  out: 'USDC on Polygon',     outToken: USDC_POLYGON, destChain: 137,  min: PM_MIN, recipient: () => Deposit.recip.get(), needAddr: true },
    },
    init() { this.recip = makeAddrValidator('dp-address', 'dp-addr-err', 'dp-ens'); this.applyApp(); this.updateDisplay(); this.updateBtn(); },
    refreshBal() { const t = TOKENS[this.tok], c = CHAINS[this.chn]; $('dp-balance').textContent = walletAddress ? `${fmt(balOf(t, c))} ${t.symbol}` : '--'; },
    setApp(app) { if (!this.cfg[app]) return; this.app = app; this.lastQuote = null; this.applyApp(); this.onAmount(); },
    applyApp() {
      const cfg = this.cfg[this.app];
      $('dp-out-label').textContent = cfg.out;
      $('dp-out-icon').src = this.app === 'hyperliquid' ? HL_OUT_ICON : USDC_ICON;
      $('dp-address-wrap').classList.toggle('hidden', !cfg.needAddr);
      $('dp-min-note').textContent = `Minimum deposit $${cfg.min}`;
    },
    updateDisplay() {
      const t = TOKENS[this.tok], c = CHAINS[this.chn];
      $('dp-token-icon').src = TOKEN_ICONS[t.symbol] || ''; $('dp-chain-icon').src = chainIcon(c.id); $('dp-token-label').textContent = `${t.symbol} on ${c.name}`;
      this.refreshBal(); this.onAmount();
    },
    onAmount() {
      clearTimeout(this.timer); this.lastQuote = null; this.updateBtn();
      const val = parseFloat($('dp-amount').value) || 0;
      if (val <= 0) { $('dp-output').textContent = '--'; $('dp-fee').textContent = '--'; return; }
      const p = priceOf(TOKENS[this.tok]); if (p) $('dp-output').textContent = fmt(val * p);
      $('dp-fee').textContent = 'Fetching…';
      this.timer = setTimeout(() => this.quote(val), 300);
    },
    async quote(amount) {
      try {
        const cfg = this.cfg[this.app], t = TOKENS[this.tok], c = CHAINS[this.chn];
        const r = await acrossQuote({ fromT: t, fromC: c, outputToken: cfg.outToken, destChainId: cfg.destChain, amount, recipient: cfg.recipient(), outDecimals: 6 });
        if (!r) { $('dp-fee').textContent = 'Route unavailable'; return; }
        this.lastQuote = r.data;
        $('dp-output').textContent = fmt(r.out);
        const inUsd = amount * priceOf(t), feeUsd = inUsd > 0 ? Math.max(0, inUsd - r.out) : 0;
        $('dp-fee').textContent = feeUsd > 0.001 ? `~${fmtUsd(feeUsd)} fee` : 'Calculating…';
        this.updateBtn();
      } catch (e) { console.warn(e); $('dp-fee').textContent = 'Quote failed'; }
    },
    setMax() {
      const t = TOKENS[this.tok], c = CHAINS[this.chn], bal = balOf(t, c);
      const reserve = t.native ? ({ 1: 0.005, 56: 0.001, 137: 0.05 }[c.id] ?? 0.0005) : 0;
      $('dp-amount').value = Math.max(0, bal - reserve); this.onAmount();
    },
    updateBtn() {
      const cfg = this.cfg[this.app], btn = $('dp-action'), amt = parseFloat($('dp-amount').value) || 0, t = TOKENS[this.tok], c = CHAINS[this.chn];
      const bal = balOf(t, c), usd = amt * priceOf(t), minErr = $('dp-min-err'); minErr.classList.add('hidden');
      if (!walletAddress) { btn.textContent = 'Connect Wallet'; btn.className = ACTIVE; }
      else if (cfg.needAddr && !this.recip.get()) { btn.textContent = `Enter ${cfg.name} address`; btn.className = DIM; }
      else if (amt <= 0) { btn.textContent = 'Enter amount'; btn.className = DIM; }
      else if (bal && amt > bal) { btn.textContent = 'Insufficient balance'; btn.className = DIM; }
      else if (usd > 0 && usd < cfg.min) { minErr.classList.remove('hidden'); btn.textContent = 'Amount too low'; btn.className = DIM; }
      else { btn.textContent = `Deposit to ${cfg.name}`; btn.className = ACTIVE; }
    },
    async execute() {
      if (!walletAddress) return connectWallet();
      const cfg = this.cfg[this.app], amount = parseFloat($('dp-amount').value) || 0; if (amount <= 0) return;
      const t = TOKENS[this.tok], c = CHAINS[this.chn], bal = balOf(t, c);
      if (bal && amount > bal) return;
      if (amount * priceOf(t) < cfg.min && amount * priceOf(t) > 0) return;
      if (cfg.needAddr && !this.recip.get()) return;
      try {
        txShow('Preparing route…');
        if (!this.lastQuote) await this.quote(amount);
        if (!this.lastQuote) throw new Error('No quote');
        const q = this.lastQuote;
        if (q.approvalTxns?.length) { txProgress('Approving…'); for (const tx of q.approvalTxns) await sendAcrossTx(tx); }
        txProgress('Confirm in wallet…');
        const hash = await sendAcrossTx(q.swapTx);
        txProgress(`Depositing to ${cfg.name}…`);
        await pollFill(c.id, hash);
        saveHistory({ type: 'bridge', summary: `${cfg.name} deposit: ${amount} ${t.symbol} → ${cfg.out}`, fromToken: t.symbol, toToken: 'USDC', fromChain: c.name, toChain: cfg.name, fromChainId: c.id, amount: String(amount), txHash: hash });
        txDone('Deposit complete!');
        fetchBalances();
      } catch (e) { console.error(e); txProgress(e.code === 4001 ? 'Rejected' : (e.message || 'Failed')); setTimeout(txHide, 1800); }
    },
  };

  // ══════════════════════════════════════════════════════════════════════════
  // Tabs
  // ══════════════════════════════════════════════════════════════════════════
  const TABS = ['bridge', 'send', 'receive', 'deposit'];
  const TAB_ACTIVE = 'flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-full text-sm font-bold transition-all bg-surface-container-lowest shadow-sm text-on-surface';
  const TAB_INACTIVE = 'flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-full text-sm font-bold transition-all text-on-surface-variant hover:text-on-surface';
  function switchTab(tab) {
    if (!TABS.includes(tab)) tab = 'bridge';
    TABS.forEach(t => { $('tab-' + t).className = t === tab ? TAB_ACTIVE : TAB_INACTIVE; $('pane-' + t).classList.toggle('hidden', t !== tab); });
    try { const u = new URL(window.location.href); u.searchParams.set('tab', tab); history.replaceState(null, '', u); } catch {}
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Wallet
  // ══════════════════════════════════════════════════════════════════════════
  async function connectWallet() {
    if (!window.ethereum) { if (typeof showNoWalletMessage === 'function') showNoWalletMessage(); else alert('Install MetaMask'); return; }
    const accs = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (accs[0]) onConnected(accs[0]);
  }
  function onConnected(addr) {
    walletAddress = addr;
    $('connect-label').textContent = formatAddr(addr);
    resolveWalletENS(addr);
    Receive.updateMyAddr();
    fetchBalances();
    Bridge.updateBtn(); Send.updateBtn(); Receive.updateBtn(); Deposit.updateBtn();
    renderActivity();
  }
  function onDisconnected() {
    walletAddress = null; cachedBalances = null;
    $('connect-label').textContent = 'Connect';
    Receive.updateMyAddr(); refreshBalances();
    Bridge.updateBtn(); Send.updateBtn(); Receive.updateBtn(); Deposit.updateBtn();
    renderActivity();
  }
  // expose for wallet.js shared delegation
  window.connectWallet = connectWallet;
  window.toggleMobileMenu = function () { $('mobile-menu').classList.toggle('hidden'); };
  window.closeMobileMenu = function (e) { if (e.target === $('mobile-menu')) $('mobile-menu').classList.add('hidden'); };

  // ══════════════════════════════════════════════════════════════════════════
  // Event delegation
  // ══════════════════════════════════════════════════════════════════════════
  const PICKERS = {
    'bridge-from': { withBalance: true, filter: () => true, onPick: (ti, ci) => { Bridge.fromT = ti; Bridge.fromC = ci; Bridge.updateDisplay(); } },
    'bridge-to':   { withBalance: false, filter: (t, c) => !!addrFor(t, c), onPick: (ti, ci) => { Bridge.toT = ti; Bridge.toC = ci; Bridge.updateDisplay(); } },
    'send':        { withBalance: true, filter: () => true, onPick: (ti, ci) => { Send.tok = ti; Send.chn = ci; Send.updateDisplay(); } },
    'receive':     { withBalance: false, filter: () => true, onPick: (ti, ci) => { Receive.tok = ti; Receive.chn = ci; Receive.updateDisplay(); } },
    'deposit':     { withBalance: true, filter: (t, c) => !!addrFor(t, c) && !(Deposit.app === 'polymarket' && c.id === 137 && t.symbol === 'USDC'), onPick: (ti, ci) => { Deposit.tok = ti; Deposit.chn = ci; Deposit.updateDisplay(); } },
  };

  document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-action]'); if (!el) return;
    const a = el.dataset.action, arg = el.dataset.arg;
    switch (a) {
      case 'switch-tab': switchTab(arg); break;
      case 'open-picker': openPicker(PICKERS[el.dataset.ctx]); break;
      case 'close-picker': closePicker(); break;
      case 'close-tx': txHide(); break;
      case 'bridge-swap': Bridge.swap(); break;
      case 'bridge-toggle-recip': Bridge.toggleRecip(); break;
      case 'br-set-max': Bridge.setMax(); break;
      case 'br-execute': Bridge.execute(); break;
      case 'sd-set-max': Send.setMax(); break;
      case 'sd-set-mode': Send.setMode(arg); break;
      case 'sd-execute': Send.execute(); break;
      case 'rc-set-mode': Receive.setMode(arg); break;
      case 'rc-set-amt': Receive.setAmt(Number(arg)); break;
      case 'rc-generate': Receive.generate(); break;
      case 'rc-download-qr': Receive.downloadQR(); break;
      case 'rc-copy': Receive.copy(); break;
      case 'rc-share': Receive.share(); break;
      case 'rc-reset': Receive.reset(); break;
      case 'dp-set-max': Deposit.setMax(); break;
      case 'dp-execute': Deposit.execute(); break;
    }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('picker-modal').classList.contains('hidden')) closePicker(); });

  // ══════════════════════════════════════════════════════════════════════════
  // Sidebar — Bridge Times + Activity
  // ══════════════════════════════════════════════════════════════════════════
  function timeAgo(ts) {
    const sec = Math.floor((Date.now() - ts) / 1000);
    if (sec < 60) return 'Just now';
    if (sec < 3600) return Math.floor(sec / 60) + 'm ago';
    if (sec < 86400) return Math.floor(sec / 3600) + 'h ago';
    return Math.floor(sec / 86400) + 'd ago';
  }

  async function fetchBridgeTimes() {
    const el = document.getElementById('tr-bridge-times');
    if (!el) return;
    const cacheKey = 'sage_bridge_times';
    function renderTimes(data) {
      el.innerHTML = ['L1 → L2', 'L2 → L1', 'L2 → L2'].map(label => {
        const val = data[label];
        const timeStr = val != null ? (val < 60 ? '~' + Math.round(val) + 's' : '~' + (val / 60).toFixed(1) + 'm') : '--';
        const color = val != null && val < 5 ? 'text-primary' : val != null && val < 30 ? 'text-on-background' : 'text-on-surface-variant';
        return `<div class="flex-1 bg-surface-container rounded-lg py-2 px-2 text-center">
          <p class="text-[10px] font-bold text-on-surface-variant mb-0.5">${label}</p>
          <p class="text-sm font-black ${color}">${timeStr}</p>
        </div>`;
      }).join('');
    }
    const cached = lsGet(cacheKey, 60 * 60 * 1000);
    if (cached) renderTimes(cached);
    try {
      const res = await fetch('/api/bridge-times');
      const data = await res.json();
      if (!data.error) { renderTimes(data); lsSet(cacheKey, data, 60 * 60 * 1000); }
    } catch (e) { console.warn('Bridge times failed:', e); }
  }

  async function renderActivity() {
    const feed = document.getElementById('tr-activity-feed');
    if (!feed) return;
    if (!walletAddress) {
      feed.innerHTML = `<div class="text-center py-8">
        <span class="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-2">history</span>
        <p class="text-sm text-on-surface-variant">No transactions yet</p>
      </div>`;
      return;
    }
    try {
      const txCacheKey = 'sage_txcache_' + walletAddress.toLowerCase();
      let allTx = lsGet(txCacheKey, 5 * 60 * 1000) || [];
      fetch(`/api/transactions?address=${walletAddress}`)
        .then(r => r.json())
        .then(data => {
          const fresh = data.deposits || [];
          if (fresh.length > 0) {
            lsSet(txCacheKey, fresh, 5 * 60 * 1000);
            if (JSON.stringify(fresh) !== JSON.stringify(allTx)) renderActivityList(fresh);
          }
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
    }
  }

  function renderActivityList(allTx) {
    const feed = document.getElementById('tr-activity-feed');
    if (!feed) return;
    const show = allTx.slice(0, 3);
    const EXP = { 1: 'https://etherscan.io/tx/', 42161: 'https://arbiscan.io/tx/', 8453: 'https://basescan.org/tx/', 10: 'https://optimistic.etherscan.io/tx/', 137: 'https://polygonscan.com/tx/', 324: 'https://explorer.zksync.io/tx/', 59144: 'https://lineascan.build/tx/' };
    const rows = show.map(tx => {
      const ago = timeAgo(tx.timestamp);
      const url = tx.depositTxHash && tx.fromChainId ? (EXP[tx.fromChainId] || 'https://etherscan.io/tx/') + tx.depositTxHash : null;
      const body = Safe.html`<div class="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
          <span class="material-symbols-outlined text-primary text-lg">layers</span>
        </div>
        <div class="flex-1 border-b border-outline-variant/10 pb-3">
          <div class="flex justify-between gap-2">
            <p class="text-sm font-bold text-on-background">Bridged ${tx.amount} ${tx.fromToken}</p>
          </div>
          <div class="flex justify-between gap-2">
            <p class="text-xs text-on-surface-variant">${tx.fromChain} → ${tx.toChain}</p>
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

  // ══════════════════════════════════════════════════════════════════════════
  // Init
  // ══════════════════════════════════════════════════════════════════════════
  function bindInputs() {
    $('picker-search').addEventListener('input', filterPicker);
    $('br-amount').addEventListener('input', () => Bridge.onAmount());
    $('br-recip').addEventListener('input', () => { Bridge.recip.validate(() => Bridge.onAmount()); });
    $('sd-amount').addEventListener('input', () => Send.onAmount());
    $('sd-recip').addEventListener('input', () => Send.recip.validate(() => Send.updateBtn()));
    $('rc-amount').addEventListener('input', () => Receive.onAmount());
    $('dp-amount').addEventListener('input', () => Deposit.onAmount());
    $('dp-address').addEventListener('input', () => Deposit.recip.validate(() => Deposit.updateBtn()));
    $('dp-app').addEventListener('change', (e) => Deposit.setApp(e.target.value));
  }

  document.addEventListener('DOMContentLoaded', async function () {
    bindInputs();
    Bridge.init(); Send.init(); Receive.init(); Deposit.init();
    const params = new URLSearchParams(window.location.search);
    switchTab(params.get('tab'));
    await fetchPrices();
    Bridge.onAmount(); Send.onAmount(); Receive.onAmount(); Deposit.onAmount();
    fetchBridgeTimes();
    renderActivity();
    if (typeof setupWallet === 'function') {
      await setupWallet({ onConnected, onDisconnected, onChainChanged() { if (walletAddress) fetchBalances(); } });
    }
  });
})();
