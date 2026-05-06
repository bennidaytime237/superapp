const CHAINS = [
  { id:8453, name:'Base', slug:'base' },
  { id:42161, name:'Arbitrum', slug:'arbitrum' },
  { id:1, name:'Ethereum', slug:'ethereum' },
  { id:10, name:'Optimism', slug:'optimism' },
  { id:137, name:'Polygon', slug:'polygon' },
  { id:324, name:'zkSync', slug:'zksync%20era' },
  { id:59144, name:'Linea', slug:'linea' },
];
const TOKENS = [
  { symbol:'USDC', name:'USD Coin', decimals:6, native:false,
    addresses:{1:'0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',42161:'0xaf88d065e77c8cC2239327C5EDb3A432268e5831',8453:'0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',10:'0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',137:'0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'} },
  { symbol:'ETH', name:'Ethereum', decimals:18, native:true,
    addresses:{1:null,42161:null,8453:null,10:null} },
  { symbol:'USDT', name:'Tether', decimals:6, native:false,
    addresses:{1:'0xdAC17F958D2ee523a2206206994597C13D831ec7',42161:'0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',10:'0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'} },
  { symbol:'DAI', name:'Dai', decimals:18, native:false,
    addresses:{1:'0x6B175474E89094C44Da98b954EedeAC495271d0F',42161:'0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'} },
  { symbol:'WBTC', name:'Wrapped BTC', decimals:8, native:false,
    addresses:{1:'0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',42161:'0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'} },
  { symbol:'POL', name:'Polygon', decimals:18, native:true,
    addresses:{137:null} },
];

let walletAddress=null, selTokenIdx=0, selChainIdx=0, generatedUrl='';
let amountMode='usd'; // 'usd' or 'token'
let prices={};

const PRESETS_USD=[10,50,100,500];
const PRESETS_TOKEN={USDC:[10,50,100,500],USDT:[10,50,100,500],DAI:[10,50,100,500],ETH:[0.01,0.05,0.1,0.5],WBTC:[0.001,0.005,0.01,0.05],POL:[10,50,100,500]};

function fmt(n){if(!isFinite(n))return '0';if(n>=1000)return n.toLocaleString('en-US',{maximumFractionDigits:2});if(n>=1)return n.toLocaleString('en-US',{maximumFractionDigits:4});return n.toLocaleString('en-US',{maximumFractionDigits:6});}
function fmtUsd(n){if(!isFinite(n))return '$0.00';return '$'+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});}

async function fetchPrices(){
  try {
    const res=await fetch('/api/prices'); const raw=await res.json();
    prices={ETH:raw.ethereum?.usd||0,USDC:1,USDT:1,DAI:1,WBTC:raw['wrapped-bitcoin']?.usd||0,POL:raw['polygon-ecosystem-token']?.usd||raw['matic-network']?.usd||0};
  } catch{prices={ETH:2500,USDC:1,USDT:1,DAI:1,WBTC:90000,POL:0.5};}
}

function tokenPrice(){return prices[TOKENS[selTokenIdx].symbol]||0;}

async function connectWallet() {
  if(!window.ethereum){alert('Install MetaMask');return;}
  const accs=await window.ethereum.request({method:'eth_requestAccounts'});
  walletAddress=accs[0];
  document.getElementById('connect-label').textContent=formatAddr(walletAddress);
  document.getElementById('my-address').textContent=formatAddr(walletAddress);
  resolveWalletENS();
  updateBtn();
}
function resolveWalletENS(){
  if(!walletAddress)return;
  fetch(`/api/ens?address=${walletAddress}`).then(r=>r.json()).then(d=>{
    if(d.name){
      document.getElementById('connect-label').textContent=d.name;
      const ensEl=document.getElementById('my-ens');
      ensEl.textContent=d.name;ensEl.classList.remove('hidden');
    }
  }).catch(()=>{});
}

function setAmt(n){document.getElementById('amount-input').value=n;onAmountChange();}

function setMode(mode){
  if(mode!=='usd'&&mode!=='token')return;
  amountMode=mode;
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

function updateAmountUI(){
  const t=TOKENS[selTokenIdx];
  const prefix=document.getElementById('amount-prefix');
  const suffix=document.getElementById('amount-suffix');
  const tokLabel=document.getElementById('mode-token-label');
  const input=document.getElementById('amount-input');
  tokLabel.textContent=t.symbol;
  if(amountMode==='usd'){
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
    input.step=t.decimals>=18?'0.0001':(t.decimals>=8?'0.0001':'0.01');
  }
  // Presets
  const presetEl=document.getElementById('amount-presets');
  const presets=amountMode==='usd'?PRESETS_USD:(PRESETS_TOKEN[t.symbol]||PRESETS_USD);
  presetEl.innerHTML='';
  presets.forEach(v=>{
    const b=document.createElement('button');
    b.dataset.action='set-amt';
    b.dataset.arg=String(v);
    b.className='px-4 py-1.5 rounded-full text-sm font-bold border border-outline-variant/15 text-on-surface-variant hover:bg-surface-container-low transition-colors';
    b.textContent=amountMode==='usd'?`$${v}`:`${v} ${t.symbol}`;
    presetEl.appendChild(b);
  });
}

function onAmountChange(){
  updateBtn();
  const conv=document.getElementById('amount-conversion');
  const t=TOKENS[selTokenIdx];
  const val=parseFloat(document.getElementById('amount-input').value)||0;
  const p=tokenPrice();
  if(val<=0){conv.textContent='';return;}
  if(amountMode==='usd'){
    if(p>0){conv.textContent=`≈ ${fmt(val/p)} ${t.symbol}`;}
    else{conv.textContent=`Price unavailable for ${t.symbol}`;}
  }else{
    if(p>0){conv.textContent=`≈ ${fmtUsd(val*p)}`;}
    else{conv.textContent='';}
  }
}

function updateDisplay(){
  const t=TOKENS[selTokenIdx], c=CHAINS[selChainIdx];
  document.getElementById('sel-token-icon').src=TOKEN_ICONS[t.symbol]||'';
  document.getElementById('sel-chain-icon').src=chainIcon(c.id);
  document.getElementById('sel-label').textContent=`${t.symbol} on ${c.name}`;
  updateAmountUI();
  onAmountChange();
}

function updateBtn(){
  const btn=document.getElementById('action-btn');
  const t=TOKENS[selTokenIdx];
  const val=parseFloat(document.getElementById('amount-input').value)||0;
  const p=tokenPrice();
  const dim='w-full py-4 bg-surface-container-high text-on-surface-variant rounded-full font-black text-lg';
  const active='w-full py-4 bg-primary text-on-primary rounded-full font-black text-lg active:scale-[0.98] transition-transform';
  if(!walletAddress){btn.textContent='Connect Wallet';btn.className=active;}
  else if(val<=0){btn.textContent='Enter amount';btn.className=dim;}
  else if(amountMode==='usd'&&!p){btn.textContent=`Price unavailable for ${t.symbol}`;btn.className=dim;}
  else{btn.textContent='Create Payment Link';btn.className=active;}
}

function generateLink(){
  if(!walletAddress){connectWallet();return;}
  const t=TOKENS[selTokenIdx], c=CHAINS[selChainIdx];
  const val=parseFloat(document.getElementById('amount-input').value)||0;
  if(val<=0)return;
  const p=tokenPrice();
  let tokenAmt, usdAmt;
  if(amountMode==='usd'){
    if(!p)return;
    usdAmt=val;
    tokenAmt=val/p;
  }else{
    tokenAmt=val;
    usdAmt=p?val*p:null;
  }
  // Round token amount to a reasonable precision based on token decimals
  const maxFrac=Math.min(t.decimals,8);
  const tokenAmtStr=Number(tokenAmt.toFixed(maxFrac)).toString();

  const note=document.getElementById('note-input').value.trim();
  const params=new URLSearchParams({to:walletAddress,token:t.symbol,chain:c.id,amount:tokenAmtStr});
  params.set('currency',amountMode);
  if(amountMode==='usd')params.set('usd',String(usdAmt));
  if(note)params.set('note',note);
  generatedUrl=`${window.location.origin}/send.html?${params}`;

  // Show share view
  document.getElementById('form-view').classList.add('hidden');
  document.getElementById('share-view').classList.remove('hidden');
  document.getElementById('share-url').textContent=generatedUrl;
  const summary=amountMode==='usd'
    ? `${fmtUsd(usdAmt)} · ${fmt(tokenAmt)} ${t.symbol} on ${c.name}`
    : (usdAmt!=null?`${fmt(tokenAmt)} ${t.symbol} on ${c.name} · ${fmtUsd(usdAmt)}`:`${fmt(tokenAmt)} ${t.symbol} on ${c.name}`);
  document.getElementById('share-summary').textContent=summary;
  const noteEl=document.getElementById('share-note');
  if(note){noteEl.textContent=`"${note}"`;noteEl.classList.remove('hidden');}
  else{noteEl.classList.add('hidden');}
}

function copyLink(){
  navigator.clipboard.writeText(generatedUrl);
  const label=document.getElementById('copy-label');
  label.textContent='Copied!';
  setTimeout(()=>{label.textContent='Copy';},2000);
}

function shareLink(){
  if(navigator.share){
    navigator.share({title:'Payment Request',text:'Pay me via Sage',url:generatedUrl}).catch(()=>{});
  } else { copyLink(); }
}

function resetForm(){
  document.getElementById('form-view').classList.remove('hidden');
  document.getElementById('share-view').classList.add('hidden');
  document.getElementById('amount-input').value='';
  document.getElementById('note-input').value='';
  onAmountChange();
}

// Picker
let allRows=[];
function openPicker(){
  document.getElementById('picker-search').value='';
  allRows=[];
  CHAINS.forEach((c,ci)=>{TOKENS.forEach((t,ti)=>{
    const has=t.native?t.addresses.hasOwnProperty(c.id):t.addresses[c.id];
    if(!has)return;
    allRows.push({c,ci,t,ti});
  });});
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
  const items = rows.map(({c,ci,t,ti}) =>
    Safe.html`<button data-ti="${ti}" data-ci="${ci}" class="pick-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface-container-low transition-colors text-left">
      <div class="relative flex-shrink-0">
        <img src="${Safe.url(TOKEN_ICONS[t.symbol]||'')}" class="w-9 h-9 rounded-full bg-surface-container"/>
        <img src="${Safe.url(chainIcon(c.id))}" class="w-4 h-4 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-surface-container-lowest bg-surface-container-lowest"/>
      </div>
      <div class="flex-1"><p class="font-bold text-sm">${t.symbol}</p><p class="text-xs text-on-surface-variant">${t.name} · ${c.name}</p></div>
    </button>`
  );
  Safe.setHTML(list, items.length ? items : Safe.html`<p class="text-sm text-on-surface-variant text-center py-4">No tokens found</p>`);
  list.querySelectorAll('button.pick-btn').forEach(btn => {
    btn.addEventListener('click', () => selectToken(Number(btn.dataset.ti), Number(btn.dataset.ci)));
  });
}
function selectToken(ti,ci){selTokenIdx=ti;selChainIdx=ci;closePicker();updateDisplay();}

(async function(){
  setMode(amountMode);
  updateDisplay();
  fetchPrices().then(onAmountChange);
  await setupWallet({
    onConnected(addr){
      walletAddress=addr;
      document.getElementById('connect-label').textContent=formatAddr(addr);
      document.getElementById('my-address').textContent=formatAddr(addr);
      resolveWalletENS();updateBtn();
    },
    onDisconnected(){
      walletAddress=null;
      document.getElementById('connect-label').textContent='Connect';
      document.getElementById('my-address').textContent='Connect wallet';
      updateBtn();
    },
    onChainChanged(){if(walletAddress)updateBtn();}
  });
})();

function toggleMobileMenu() { document.getElementById('mobile-menu').classList.toggle('hidden'); }
function closeMobileMenu(e) { if (e.target === document.getElementById('mobile-menu')) document.getElementById('mobile-menu').classList.add('hidden'); }

// ── Event delegation & input listeners ──────────────────────────────────────
document.addEventListener('click', function(e) {
  var el = e.target.closest('[data-action]');
  if (!el) return;
  var action = el.dataset.action;
  var arg = el.dataset.arg;
  switch (action) {
    case 'open-picker':  openPicker(arg); break;
    case 'close-picker': closePicker(); break;
    case 'generate-link': generateLink(); break;
    case 'copy-link':    copyLink(); break;
    case 'share-link':   shareLink(); break;
    case 'reset-form':   resetForm(); break;
    case 'set-amt':      setAmt(Number(arg)); break;
    case 'set-mode':     setMode(arg); break;
  }
});
document.addEventListener('DOMContentLoaded', function() {
  var amtEl = document.getElementById('amount-input');
  if (amtEl) amtEl.addEventListener('input', onAmountChange);
  var ps = document.getElementById('picker-search');
  if (ps) ps.addEventListener('input', filterPicker);
});
