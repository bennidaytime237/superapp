const CHAINS = [
  { id:1, name:'Ethereum', slug:'ethereum' },
  { id:42161, name:'Arbitrum', slug:'arbitrum' },
  { id:8453, name:'Base', slug:'base' },
  { id:10, name:'Optimism', slug:'optimism' },
  { id:137, name:'Polygon', slug:'polygon' },
  { id:324, name:'zkSync', slug:'zksync%20era' },
  { id:59144, name:'Linea', slug:'linea' },
];

const TOKENS = [
  { symbol:'ETH', name:'Ethereum', decimals:18, native:true,
    addresses:{1:null,42161:null,8453:null,10:null},
    wrapAddresses:{1:'0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',42161:'0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',8453:'0x4200000000000000000000000000000000000006',10:'0x4200000000000000000000000000000000000006'} },
  { symbol:'USDC', name:'USD Coin', decimals:6, native:false,
    addresses:{1:'0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',42161:'0xaf88d065e77c8cC2239327C5EDb3A432268e5831',8453:'0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',10:'0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',137:'0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'} },
  { symbol:'USDT', name:'Tether', decimals:6, native:false,
    addresses:{1:'0xdAC17F958D2ee523a2206206994597C13D831ec7',42161:'0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',10:'0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'} },
  { symbol:'DAI', name:'Dai', decimals:18, native:false,
    addresses:{1:'0x6B175474E89094C44Da98b954EedeAC495271d0F',42161:'0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'} },
  { symbol:'WBTC', name:'Wrapped BTC', decimals:8, native:false,
    addresses:{1:'0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',42161:'0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'} },
  { symbol:'POL', name:'Polygon', decimals:18, native:true,
    addresses:{137:null},
    wrapAddresses:{137:'0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'} },
];

const ACROSS_API = 'https://app.across.to/api';
const ZERO_ADDR = '0x0000000000000000000000000000000000000000';

let walletAddress=null, selTokenIdx=0, selChainIdx=0, fromBal=null, cachedBalances=null, prices={}, inputMode='token';

// ── Bridge-first state ──
let bridgeEnabled=false, bridgeTokenIdx=null, bridgeChainIdx=null, bridgeBal=null;
let lastBridgeQuote=null, bridgeInputNeeded=null, bridgeRouteAvailable=false, bridgeQuoteLoading=false, bridgeQuoteTimer=null;

async function connectWallet() {
  if(!window.ethereum){showNoWalletMessage();return;}
  try{
    const accs=await window.ethereum.request({method:'eth_requestAccounts'});
    localStorage.removeItem('sage_disconnected');
    walletAddress=accs[0];
    document.getElementById('connect-label').textContent=formatAddr(walletAddress);
    resolveWalletENS(walletAddress);
    fetchBalance(); updateBtn();
    if(bridgeEnabled)scheduleBridgeQuote();
  }catch(e){
    if(e&&e.code!==4001)console.warn('Wallet connect failed:',e.message||e);
  }
}

async function fetchBalance() {
  if(!walletAddress)return;
  const addr=walletAddress;
  try {
    const res=await fetch(`/api/balances?address=${encodeURIComponent(addr)}&_t=${Date.now()}`);
    if(!res.ok)throw new Error('API error '+res.status);
    if(walletAddress!==addr)return;
    cachedBalances=await res.json();
    const t=TOKENS[selTokenIdx], cid=CHAINS[selChainIdx].id;
    const bal=cachedBalances?.[cid]?.[t.symbol]||0;
    fromBal=bal;
    document.getElementById('from-balance').textContent=`${fmt(bal)} ${t.symbol}`;
    if(bridgeEnabled&&bridgeTokenIdx!=null)fetchBridgeBalance();
  } catch{fromBal=null;}
}

async function fetchPrices() {
  try {
    const res=await fetch('/api/prices'); const raw=await res.json();
    prices={ETH:raw.ethereum?.usd||0,USDC:1,USDT:1,DAI:1,WBTC:raw['wrapped-bitcoin']?.usd||0,POL:raw['polygon-ecosystem-token']?.usd||raw['matic-network']?.usd||0};
  } catch{prices={ETH:2500,USDC:1,USDT:1,DAI:1,WBTC:90000,POL:0.5};}
}

function updateDisplay() {
  const t=TOKENS[selTokenIdx], c=CHAINS[selChainIdx];
  document.getElementById('from-token-icon').src=TOKEN_ICONS[t.symbol]||'';
  document.getElementById('from-chain-icon').src=chainIcon(c.id);
  document.getElementById('from-label').textContent=`${t.symbol} on ${c.name}`;
  updateAmountUI();
}

let resolvedAddr = null;
let ensTimer = null;
function setEnsState(state, text) {
  const ensEl = document.getElementById('ens-resolved');
  const ensIcon = document.getElementById('ens-resolved-icon');
  const ensText = document.getElementById('ens-resolved-text');
  const states = {
    loading: { cls: 'flex items-center gap-1 mt-1.5 text-on-surface-variant', icon: 'autorenew', iconCls: 'material-symbols-outlined text-sm leading-none animate-spin' },
    success: { cls: 'flex items-center gap-1 mt-1.5 text-primary', icon: 'check_circle', iconCls: 'material-symbols-outlined text-sm leading-none' },
    error:   { cls: 'flex items-center gap-1 mt-1.5 text-error',   icon: 'error',        iconCls: 'material-symbols-outlined text-sm leading-none' },
  };
  const s = states[state];
  ensEl.className = s.cls;
  ensIcon.className = s.iconCls;
  ensIcon.textContent = s.icon;
  ensText.textContent = text;
  ensEl.classList.remove('hidden');
}
function validateAddr() {
  const v=document.getElementById('recipient').value.trim();
  const ensEl=document.getElementById('ens-resolved');
  resolvedAddr=null; ensEl.classList.add('hidden');
  if((v.endsWith('.eth') || v.endsWith('.hl')) && v.length > 3) {
    document.getElementById('addr-error').classList.add('hidden');
    setEnsState('loading', 'Resolving...');
    clearTimeout(ensTimer);
    ensTimer=setTimeout(()=>{
      fetch(`/api/ens?name=${encodeURIComponent(v)}`).then(r=>r.json()).then(d=>{
        if(d.address && d.address !== '0x0000000000000000000000000000000000000000') {
          resolvedAddr=d.address;
          setEnsState('success', d.address);
        } else { setEnsState('error', v.endsWith('.hl') ? 'HL name not found' : 'ENS name not found'); }
        updateBtn();
      }).catch(()=>{ setEnsState('error', 'Could not resolve'); });
    },500);
  } else {
    document.getElementById('addr-error').classList.toggle('hidden', !v||EthUtils.isValidAddress(v));
  }
  updateBtn();
}
function getRecipientAddr() {
  if(resolvedAddr) return resolvedAddr;
  const v=document.getElementById('recipient').value.trim();
  return EthUtils.isValidAddress(v) ? v : null;
}

function getTokenAmount() {
  const val=parseFloat(document.getElementById('input-amount').value)||0;
  if(inputMode==='usd'){const p=prices[TOKENS[selTokenIdx].symbol]||0;return p>0?val/p:0;}
  return val;
}

function setMode(mode) {
  if(mode!=='usd'&&mode!=='token')return;
  inputMode=mode;
  const usdBtn=document.getElementById('mode-usd-btn');
  const tokBtn=document.getElementById('mode-token-btn');
  const active='px-3 py-1 rounded-full text-xs font-bold transition-colors bg-primary text-on-primary';
  const inactive='px-3 py-1 rounded-full text-xs font-bold transition-colors text-on-surface-variant hover:text-on-surface';
  usdBtn.className=mode==='usd'?active:inactive;
  tokBtn.className=mode==='token'?active:inactive;
  usdBtn.setAttribute('aria-selected',String(mode==='usd'));
  tokBtn.setAttribute('aria-selected',String(mode==='token'));
  updateAmountUI();
  onAmountChange();
}

function updateAmountUI() {
  const t=TOKENS[selTokenIdx];
  const prefix=document.getElementById('amount-prefix');
  const suffix=document.getElementById('amount-suffix');
  const tokLabel=document.getElementById('mode-token-label');
  const input=document.getElementById('input-amount');
  if(tokLabel)tokLabel.textContent=t.symbol;
  if(inputMode==='usd'){
    prefix.textContent='$';
    prefix.classList.remove('hidden');
    suffix.classList.add('hidden');
    input.placeholder='0.00';
    input.step='0.01';
  }else{
    prefix.classList.add('hidden');
    suffix.textContent=t.symbol;
    suffix.classList.remove('hidden');
    input.placeholder='0';
    input.step=t.decimals>=8?'0.0001':'0.01';
  }
}

function updateBtn() {
  const btn=document.getElementById('action-btn');
  const amt=getTokenAmount();
  const addr=getRecipientAddr();
  const t=TOKENS[selTokenIdx];
  const dim='w-full py-4 bg-surface-container-high text-on-surface-variant rounded-full font-black text-lg';
  const active='w-full py-4 bg-primary text-on-primary rounded-full font-black text-lg active:scale-[0.98] transition-transform';
  if(!walletAddress){btn.textContent='Connect Wallet';btn.className=active;}
  else if(!addr){btn.textContent='Enter address';btn.className=dim;}
  else if(amt<=0){btn.textContent='Enter amount';btn.className=dim;}
  else if(amt*10**t.decimals<1){btn.textContent='Amount too small';btn.className=dim;}
  else if(bridgeEnabled){
    const srcT=bridgeTokenIdx!=null?TOKENS[bridgeTokenIdx]:null;
    if(bridgeQuoteLoading){btn.textContent='Finding route...';btn.className=dim;}
    else if(!bridgeRouteAvailable){btn.textContent='Route unavailable';btn.className=dim;}
    else if(bridgeBal!=null&&bridgeInputNeeded!=null&&bridgeInputNeeded>bridgeBal){btn.textContent=`Insufficient ${srcT?srcT.symbol:'balance'}`;btn.className=dim;}
    else{btn.textContent='Bridge & Send';btn.className=active;}
  }
  else if(fromBal!=null&&amt>fromBal){btn.textContent='Insufficient balance';btn.className=dim;}
  else{btn.textContent='Send';btn.className=active;}
}

function onAmountChange() {
  updateBtn();
  if(bridgeEnabled)scheduleBridgeQuote();
  const val=parseFloat(document.getElementById('input-amount').value)||0;
  const p=prices[TOKENS[selTokenIdx].symbol]||0;
  const t=TOKENS[selTokenIdx];
  const conv=document.getElementById('usd-value');
  if(inputMode==='usd'){
    if(val<=0){conv.textContent=`≈ 0 ${t.symbol}`;return;}
    if(p>0){conv.textContent=`≈ ${fmt(val/p)} ${t.symbol}`;}
    else{conv.textContent=`Price unavailable for ${t.symbol}`;}
  } else {
    conv.textContent=val>0&&p?`~$${fmt(val*p)}`:'~$0.00';
  }
}

function toHex(n) { return '0x'+BigInt(n).toString(16); }

function encodeTransfer(to, amount, decimals) {
  const selector='0xa9059cbb';
  const addrPad=to.toLowerCase().replace('0x','').padStart(64,'0');
  const amtWei=BigInt(toUnits(amount,decimals));
  const amtPad=amtWei.toString(16).padStart(64,'0');
  return selector+addrPad+amtPad;
}

async function sendTx(chainId, txParams) {
  const chainHex='0x'+chainId.toString(16);
  const current=await window.ethereum.request({method:'eth_chainId'});
  if(current!==chainHex){
    try{await window.ethereum.request({method:'wallet_switchEthereumChain',params:[{chainId:chainHex}]});}
    catch(e){if(e.code===4902)throw new Error('Add chain to wallet');throw e;}
  }
  // Estimate gas
  try{const gas=await window.ethereum.request({method:'eth_estimateGas',params:[txParams]});txParams.gas=gas;}catch{}
  return window.ethereum.request({method:'eth_sendTransaction',params:[txParams]});
}

async function execute() {
  if(!walletAddress){connectWallet();return;}
  const amount=getTokenAmount();
  if(amount<=0)return;
  const recipient=getRecipientAddr();
  if(!recipient)return;
  const t=TOKENS[selTokenIdx];
  if(amount*10**t.decimals<1)return;
  if(bridgeEnabled){
    if(!bridgeRouteAvailable)return;
    if(bridgeBal!=null&&bridgeInputNeeded!=null&&bridgeInputNeeded>bridgeBal)return;
    await executeBridgeThenSend(amount,recipient);
    return;
  }
  if(fromBal!=null&&amount>fromBal)return;
  try {
    await doSendTransfer(amount,recipient);
  } catch(e){
    console.error(e);
    document.getElementById('tx-status').classList.add('hidden');
    const btn=document.getElementById('action-btn');
    btn.textContent=e.code===4001?'Rejected':'Failed';
    setTimeout(updateBtn,2000);
  }
}

// Performs the actual token transfer. Throws on failure so callers (direct send
// or bridge-then-send) can surface the error themselves.
async function doSendTransfer(amount,recipient){
  const t=TOKENS[selTokenIdx], c=CHAINS[selChainIdx];
  const btn=document.getElementById('action-btn');
  btn.textContent='Confirm in wallet...';
  document.getElementById('tx-status').classList.remove('hidden');
  document.getElementById('tx-done').classList.add('hidden');
  document.getElementById('tx-text').textContent='Confirming...';
  let txParams, hash;
  if(t.native) {
    const amtWei=BigInt(toUnits(amount,t.decimals));
    txParams={from:walletAddress,to:recipient,value:toHex(amtWei),chainId:'0x'+c.id.toString(16)};
    hash=await sendTx(c.id,txParams);
  } else {
    const contractAddr=t.addresses[c.id];
    const data=encodeTransfer(recipient,amount,t.decimals);
    txParams={from:walletAddress,to:contractAddr,data,value:'0x0',chainId:'0x'+c.id.toString(16)};
    hash=await sendTx(c.id,txParams);
  }
  document.getElementById('tx-text').textContent='Waiting for confirmation...';
  // Poll for receipt and check its status — a mined-but-reverted transfer is
  // NOT a success, and a receipt that never shows up is only "pending".
  let receipt=null;
  for(let i=0;i<60&&!receipt;i++){
    try{const r=await window.ethereum.request({method:'eth_getTransactionReceipt',params:[hash]});if(r&&r.blockNumber)receipt=r;}catch{}
    if(!receipt)await new Promise(r=>setTimeout(r,2000));
  }
  document.getElementById('tx-status').classList.add('hidden');
  if(receipt&&receipt.status==='0x0'){
    btn.textContent='Transfer failed';
    setTimeout(updateBtn,3000);
    throw new Error('Transfer reverted on-chain');
  }
  document.getElementById('tx-done').classList.remove('hidden');
  btn.textContent=receipt?'Transfer complete!':'Transfer pending — check the explorer';
  // Save to history
  try{const k='sage_tx_'+(walletAddress||'').toLowerCase();const h=JSON.parse(localStorage.getItem(k)||'[]');h.unshift({type:'send',summary:`Sent ${amount} ${t.symbol} on ${c.name}`,token:t.symbol,chain:c.name,chainId:c.id,amount:String(amount),to:recipient,timestamp:Date.now(),txHash:hash});if(h.length>20)h.length=20;localStorage.setItem(k,JSON.stringify(h));}catch{}
  fetchBalance();
  setTimeout(updateBtn,3000);
  return hash;
}

function setMax(){if(fromBal!=null){const t=TOKENS[selTokenIdx];const cid=CHAINS[selChainIdx].id;const GAS_RESERVE={1:0.005,56:0.001,137:0.05};const reserve=t.native?(GAS_RESERVE[cid]??0.0005):0;const maxToken=Math.max(0,fromBal-reserve);if(inputMode==='usd'){const p=prices[t.symbol]||0;document.getElementById('input-amount').value=p>0?fmt(maxToken*p):maxToken;}else{document.getElementById('input-amount').value=maxToken;}onAmountChange();}}

// Picker
let allRows=[];
let pickerTarget='send';
function openPicker(){ pickerTarget='send'; _openPicker('Choose token'); }
function openBridgePicker(){ pickerTarget='bridge'; _openPicker('Bridge from'); }
function _openPicker(title){
  document.getElementById('picker-search').value='';
  const titleEl=document.getElementById('picker-modal-title');
  if(titleEl)titleEl.textContent=title;
  allRows=[];
  CHAINS.forEach((c,ci)=>{TOKENS.forEach((t,ti)=>{
    const has=t.native?t.addresses.hasOwnProperty(c.id):t.addresses[c.id];
    if(!has)return;
    // For the bridge source, skip the asset we're sending — bridging to itself is a no-op
    if(pickerTarget==='bridge'&&ti===selTokenIdx&&ci===selChainIdx)return;
    const bal=cachedBalances?.[c.id]?.[t.symbol]||0;
    allRows.push({c,ci,t,ti,bal});
  });});
  allRows.sort((a,b)=>b.bal-a.bal);
  renderPicker(allRows);
  document.getElementById('picker-modal').classList.remove('hidden');
  document.getElementById('picker-search').focus();
}
function closePicker(){document.getElementById('picker-modal').classList.add('hidden');}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !document.getElementById('picker-modal').classList.contains('hidden')) closePicker();
});
function filterPicker(){
  const q=document.getElementById('picker-search').value.toLowerCase();
  renderPicker(q?allRows.filter(r=>r.t.symbol.toLowerCase().includes(q)||r.t.name.toLowerCase().includes(q)||r.c.name.toLowerCase().includes(q)):allRows);
}
function renderPicker(rows){
  const list = document.getElementById('picker-list');
  const items = rows.map(({c,ci,t,ti,bal}) =>
    Safe.html`<button data-ti="${ti}" data-ci="${ci}" class="pick-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface-container-low transition-colors text-left">
      <div class="relative flex-shrink-0">
        <img src="${Safe.url(TOKEN_ICONS[t.symbol]||'')}" class="w-9 h-9 rounded-full bg-surface-container" data-img-fallback/>
        <img src="${Safe.url(chainIcon(c.id))}" class="w-4 h-4 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-surface-container-lowest bg-surface-container-lowest" data-img-fallback/>
      </div>
      <div class="flex-1"><p class="font-bold text-sm">${bal>0?fmt(bal)+' ':''}${t.symbol}</p><p class="text-xs text-on-surface-variant">${t.name} · ${c.name}</p></div>
      <span class="material-symbols-outlined text-on-surface-variant text-base">chevron_right</span>
    </button>`
  );
  Safe.setHTML(list, items.length ? items : Safe.html`<p class="text-sm text-on-surface-variant text-center py-4">No tokens found</p>`);
  list.querySelectorAll('button.pick-btn').forEach(btn => {
    btn.addEventListener('click', () => selectToken(Number(btn.dataset.ti), Number(btn.dataset.ci)));
  });
}
function selectToken(ti,ci){
  if(pickerTarget==='bridge'){ selectBridgeToken(ti,ci); return; }
  selTokenIdx=ti;selChainIdx=ci;closePicker();updateDisplay();fetchBalance();onAmountChange();
  // If the new send asset now matches the bridge source, the bridge step is moot — drop it
  if(bridgeEnabled&&bridgeTokenIdx===ti&&bridgeChainIdx===ci)clearBridge();
  else if(bridgeEnabled){updateBridgeDestLabel();scheduleBridgeQuote();}
}

function fmt(n){if(n>=1000)return n.toLocaleString('en-US',{maximumFractionDigits:2});if(n>=1)return n.toLocaleString('en-US',{maximumFractionDigits:4});return n.toLocaleString('en-US',{maximumFractionDigits:6});}

// ── Bridge-first flow ───────────────────────────────────────────────────────
function toggleBridgePanel(){
  const panel=document.getElementById('bridge-panel');
  const toggle=document.getElementById('bridge-toggle');
  const chevron=document.getElementById('bridge-chevron');
  const open=panel.classList.toggle('hidden')===false;
  toggle.setAttribute('aria-expanded',String(open));
  if(chevron)chevron.style.transform=open?'rotate(180deg)':'';
  if(open)updateBridgeDestLabel();
}

function updateBridgeDestLabel(){
  const el=document.getElementById('bridge-dest-label');
  if(el){const t=TOKENS[selTokenIdx],c=CHAINS[selChainIdx];el.textContent=`${t.symbol} on ${c.name}`;}
}

function selectBridgeToken(ti,ci){
  bridgeTokenIdx=ti;bridgeChainIdx=ci;bridgeEnabled=true;
  closePicker();
  updateBridgeDisplay();
  fetchBridgeBalance();
  scheduleBridgeQuote();
  document.getElementById('bridge-clear').classList.remove('hidden');
  updateBtn();
}

function clearBridge(){
  bridgeEnabled=false;bridgeTokenIdx=null;bridgeChainIdx=null;bridgeBal=null;
  lastBridgeQuote=null;bridgeInputNeeded=null;bridgeRouteAvailable=false;
  const icon=document.getElementById('bridge-token-icon');
  const cicon=document.getElementById('bridge-chain-icon');
  icon.hidden=true;cicon.hidden=true;
  document.getElementById('bridge-token-placeholder').hidden=false;
  document.getElementById('bridge-label').textContent='Select asset';
  document.getElementById('bridge-balance').textContent='';
  document.getElementById('bridge-quote').classList.add('hidden');
  document.getElementById('bridge-clear').classList.add('hidden');
  updateBtn();
}

function updateBridgeDisplay(){
  if(bridgeTokenIdx==null)return;
  const t=TOKENS[bridgeTokenIdx],c=CHAINS[bridgeChainIdx];
  const icon=document.getElementById('bridge-token-icon');
  const cicon=document.getElementById('bridge-chain-icon');
  icon.src=TOKEN_ICONS[t.symbol]||'';icon.hidden=false;
  cicon.src=chainIcon(c.id);cicon.hidden=false;
  document.getElementById('bridge-token-placeholder').hidden=true;
  document.getElementById('bridge-label').textContent=`${t.symbol} on ${c.name}`;
}

async function fetchBridgeBalance(){
  if(!walletAddress||bridgeTokenIdx==null)return;
  const t=TOKENS[bridgeTokenIdx],cid=CHAINS[bridgeChainIdx].id;
  const bal=cachedBalances?.[cid]?.[t.symbol]||0;
  bridgeBal=bal;
  document.getElementById('bridge-balance').textContent=`Balance: ${fmt(bal)} ${t.symbol}`;
  updateBtn();
}

function setBridgeQuoteText(txt){
  const el=document.getElementById('bridge-quote');
  el.textContent=txt;el.classList.toggle('hidden',!txt);
}

function scheduleBridgeQuote(){
  clearTimeout(bridgeQuoteTimer);
  bridgeQuoteTimer=setTimeout(fetchBridgeQuote,400);
}

async function fetchBridgeQuote(){
  if(!bridgeEnabled||bridgeTokenIdx==null){return;}
  const amt=getTokenAmount();
  const destT=TOKENS[selTokenIdx],destC=CHAINS[selChainIdx];
  const srcT=TOKENS[bridgeTokenIdx],srcC=CHAINS[bridgeChainIdx];
  lastBridgeQuote=null;bridgeInputNeeded=null;bridgeRouteAvailable=false;
  if(amt<=0){setBridgeQuoteText('');updateBtn();return;}
  const inputAddr=srcT.native?srcT.wrapAddresses?.[srcC.id]:srcT.addresses[srcC.id];
  const outputAddr=destT.native?destT.wrapAddresses?.[destC.id]:destT.addresses[destC.id];
  if(!inputAddr||!outputAddr){setBridgeQuoteText('No route available for this pair');updateBtn();return;}
  const outWei=toUnits(amt,destT.decimals);
  bridgeQuoteLoading=true;setBridgeQuoteText('Finding best route…');updateBtn();
  try{
    const params=new URLSearchParams({
      tradeType:'minOutput',amount:outWei,inputToken:inputAddr,outputToken:outputAddr,
      originChainId:srcC.id,destinationChainId:destC.id,
      depositor:walletAddress||ZERO_ADDR,recipient:walletAddress||ZERO_ADDR,slippage:'auto',
    });
    const ctrl=new AbortController();const t=setTimeout(()=>ctrl.abort(),9000);
    const res=await fetch(`${ACROSS_API}/swap/approval?${params}`,{signal:ctrl.signal});
    clearTimeout(t);
    if(!res.ok)throw new Error('no route');
    const data=await res.json();
    const rawIn=data.inputAmount||data.maxInputAmount;
    if(!rawIn)throw new Error('no input');
    lastBridgeQuote=data;
    bridgeInputNeeded=Number(BigInt(rawIn))/10**srcT.decimals;
    bridgeRouteAvailable=true;
    const feeUsd=parseFloat(data.fees?.total?.amountUsd||'0');
    const feeTxt=feeUsd>0.01?`$${fmt(feeUsd)}`:'<$0.01';
    const secs=data.expectedFillTime||2;
    setBridgeQuoteText(`Bridge ≈ ${fmt(bridgeInputNeeded)} ${srcT.symbol} → ${fmt(amt)} ${destT.symbol} · fee ${feeTxt} · ~${secs}s`);
  }catch{
    lastBridgeQuote=null;bridgeRouteAvailable=false;
    setBridgeQuoteText('No route available for this pair');
  }
  bridgeQuoteLoading=false;updateBtn();
}

// ── Bridge transaction helpers (mirror swap.js) ──
async function sendBridgeTx(tx){
  const targetHex='0x'+tx.chainId.toString(16);
  const cur=await window.ethereum.request({method:'eth_chainId'});
  if(cur!==targetHex){
    try{await window.ethereum.request({method:'wallet_switchEthereumChain',params:[{chainId:targetHex}]});}
    catch(e){if(e.code===4902)throw new Error('Add chain to wallet');throw e;}
  }
  const p={from:walletAddress,to:tx.to,data:tx.data,
    value:tx.value&&tx.value!=='0'?'0x'+BigInt(tx.value).toString(16):'0x0',chainId:targetHex};
  if(tx.gas&&tx.gas!=='0')p.gas='0x'+BigInt(tx.gas).toString(16);
  return window.ethereum.request({method:'eth_sendTransaction',params:[p]});
}

async function pollFill(originChainId,txHash){
  const intervalMs=1500,max=Math.ceil(240000/intervalMs);
  for(let i=0;i<max;i++){
    try{const r=await fetch(`${ACROSS_API}/deposit/status?originChainId=${originChainId}&depositTxHash=${txHash}`);const d=await r.json();if(d.status==='filled')return true;}catch{}
    await new Promise(r=>setTimeout(r,intervalMs));
  }
  return false;
}

async function executeBridgeThenSend(amount,recipient){
  const srcT=TOKENS[bridgeTokenIdx],srcC=CHAINS[bridgeChainIdx];
  const destT=TOKENS[selTokenIdx],destC=CHAINS[selChainIdx];
  const btn=document.getElementById('action-btn');
  try{
    // Refresh the quote so calldata uses the real wallet as depositor/recipient
    await fetchBridgeQuote();
    if(!lastBridgeQuote)throw new Error('No bridge route');
    const q=lastBridgeQuote;
    document.getElementById('tx-status').classList.remove('hidden');
    document.getElementById('tx-done').classList.add('hidden');
    if(q.approvalTxns&&q.approvalTxns.length){
      btn.textContent='Approve in wallet...';
      document.getElementById('tx-text').textContent=`Approving ${srcT.symbol}...`;
      for(const tx of q.approvalTxns){await sendBridgeTx(tx);}
    }
    btn.textContent='Confirm bridge...';
    document.getElementById('tx-text').textContent=`Confirm bridge of ${srcT.symbol}...`;
    const hash=await sendBridgeTx(q.swapTx);
    document.getElementById('tx-text').textContent=`Bridging ${srcC.name} → ${destC.name}...`;
    const filled=await pollFill(srcC.id,hash);
    if(!filled){
      // The bridged funds have not arrived — sending now would revert.
      document.getElementById('tx-text').textContent='Bridge still pending — the send was not started. Retry once the bridge completes.';
      btn.textContent='Bridge pending';
      setTimeout(updateBtn,4000);
      return;
    }
    document.getElementById('tx-text').textContent='Bridge complete — preparing send...';
    await fetchBalance();
    // Now run the standard send with the freshly bridged funds
    await doSendTransfer(amount,recipient);
  }catch(e){
    console.error(e);
    document.getElementById('tx-status').classList.add('hidden');
    btn.textContent=e.code===4001?'Rejected':'Bridge failed';
    setTimeout(updateBtn,2500);
  }
}

(async function(){
  setMode(inputMode);
  updateDisplay();updateBtn();
  await fetchPrices();

  // Pre-fill from URL params (payment request links)
  const params=new URLSearchParams(window.location.search);
  if(params.get('to')){document.getElementById('recipient').value=params.get('to');validateAddr();}
  if(params.get('token')&&params.get('chain')){
    const tok=params.get('token'), cid=Number(params.get('chain'));
    const ti=TOKENS.findIndex(t=>t.symbol===tok);
    const ci=CHAINS.findIndex(c=>c.id===cid);
    if(ti>=0&&ci>=0){selTokenIdx=ti;selChainIdx=ci;updateDisplay();}
  }
  if(params.get('currency')==='usd'&&params.get('usd')){
    setMode('usd');
    document.getElementById('input-amount').value=params.get('usd');
    onAmountChange();
  } else if(params.get('amount')){
    document.getElementById('input-amount').value=params.get('amount');
    onAmountChange();
  }
  const reqUsd=params.get('usd');
  const reqCurrency=params.get('currency');
  const reqNote=params.get('note');
  if(reqUsd||reqNote||reqCurrency){
    const div=document.createElement('div');
    div.id='request-note';
    div.className='mb-4 px-4 py-3 bg-primary-container rounded-xl';
    const label=document.createElement('p');
    label.className='text-xs font-bold text-on-primary-container mb-1';
    if(reqCurrency==='usd'&&reqUsd){
      const usdNum=Number(reqUsd);
      label.textContent='Payment request';
      const amt=document.createElement('p');
      amt.className='text-base font-black text-on-primary-container mb-0.5';
      amt.textContent=`$${usdNum.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})} requested`;
      const sub=document.createElement('p');
      sub.className='text-xs text-on-primary-container/80';
      sub.textContent=`≈ ${params.get('amount')} ${params.get('token')||''}`.trim();
      div.append(label,amt,sub);
    } else {
      label.textContent='Payment request';
      const amt=document.createElement('p');
      amt.className='text-base font-black text-on-primary-container mb-0.5';
      amt.textContent=`${params.get('amount')||''} ${params.get('token')||''} requested`.trim();
      div.append(label,amt);
    }
    if(reqNote){
      const body=document.createElement('p');
      body.className='text-sm text-on-primary-container italic mt-1';
      body.textContent=`"${reqNote}"`;
      div.append(body);
    }
    document.getElementById('recipient').closest('.mb-5').after(div);
  }

  await setupWallet({
    onConnected(addr) {
      walletAddress=addr;
      document.getElementById('connect-label').textContent=formatAddr(addr);
      resolveWalletENS(addr);
      fetchBalance(); updateBtn();
      if(bridgeEnabled)scheduleBridgeQuote();
    },
    onDisconnected() {
      walletAddress=null;
      document.getElementById('connect-label').textContent='Connect';
      fetchBalance(); updateBtn();
    },
    onChainChanged() { if(walletAddress){fetchBalance();updateBtn();} }
  });
})();


// ── Event delegation & input listeners ──────────────────────────────────────
document.addEventListener('click', function(e) {
  var el = e.target.closest('[data-action]');
  if (!el) return;
  var action = el.dataset.action;
  switch (action) {
    case 'open-picker':  openPicker(); break;
    case 'close-picker': closePicker(); break;
    case 'execute':      execute(); break;
    case 'set-max':      setMax(); break;
    case 'set-mode':     setMode(el.dataset.arg); break;
    case 'toggle-bridge':     toggleBridgePanel(); break;
    case 'open-bridge-picker':openBridgePicker(); break;
    case 'clear-bridge':      clearBridge(); break;
  }
});
document.addEventListener('DOMContentLoaded', function() {
  var el = document.getElementById('recipient');
  if (el) el.addEventListener('input', validateAddr);
});
