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
    addresses:{1:null,42161:null,8453:null,10:null} },
  { symbol:'USDC', name:'USD Coin', decimals:6, native:false,
    addresses:{1:'0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',42161:'0xaf88d065e77c8cC2239327C5EDb3A432268e5831',8453:'0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',10:'0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',137:'0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'} },
  { symbol:'USDT', name:'Tether', decimals:6, native:false,
    addresses:{1:'0xdAC17F958D2ee523a2206206994597C13D831ec7',42161:'0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',10:'0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'} },
  { symbol:'DAI', name:'Dai', decimals:18, native:false,
    addresses:{1:'0x6B175474E89094C44Da98b954EedeAC495271d0F',42161:'0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'} },
  { symbol:'WBTC', name:'Wrapped BTC', decimals:8, native:false,
    addresses:{1:'0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',42161:'0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'} },
  { symbol:'POL', name:'Polygon', decimals:18, native:true,
    addresses:{137:null} },
];


let walletAddress=null, selTokenIdx=0, selChainIdx=0, fromBal=null, cachedBalances=null, prices={};

async function connectWallet() {
  if(!window.ethereum){alert('Install MetaMask');return;}
  const accs=await window.ethereum.request({method:'eth_requestAccounts'});
  walletAddress=accs[0];
  document.getElementById('connect-label').textContent=formatAddr(walletAddress);
  resolveWalletENS(walletAddress);
  fetchBalance(); updateBtn();
}

async function fetchBalance() {
  if(!walletAddress)return;
  try {
    const res=await fetch(`/api/balances?address=${walletAddress}&_t=${Date.now()}`);
    cachedBalances=await res.json();
    const t=TOKENS[selTokenIdx], cid=CHAINS[selChainIdx].id;
    const bal=cachedBalances?.[cid]?.[t.symbol]||0;
    fromBal=bal;
    document.getElementById('from-balance').textContent=`${fmt(bal)} ${t.symbol}`;
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
}

let resolvedAddr = null;
let ensTimer = null;
function validateAddr() {
  const v=document.getElementById('recipient').value.trim();
  const ensEl=document.getElementById('ens-resolved');
  resolvedAddr=null; ensEl.classList.add('hidden');
  if(v.endsWith('.eth') && v.length > 4) {
    document.getElementById('addr-error').classList.add('hidden');
    ensEl.textContent='Resolving...'; ensEl.classList.remove('hidden');
    clearTimeout(ensTimer);
    ensTimer=setTimeout(()=>{
      fetch(`/api/ens?name=${encodeURIComponent(v)}`).then(r=>r.json()).then(d=>{
        if(d.address && d.address !== '0x0000000000000000000000000000000000000000') {
          resolvedAddr=d.address;
          ensEl.textContent=`→ ${d.address.slice(0,6)}...${d.address.slice(-4)}`;
        } else { ensEl.textContent='ENS name not found'; }
        updateBtn();
      }).catch(()=>{ ensEl.textContent='Could not resolve'; });
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

function updateBtn() {
  const btn=document.getElementById('action-btn');
  const amt=parseFloat(document.getElementById('input-amount').value)||0;
  const addr=getRecipientAddr();
  const t=TOKENS[selTokenIdx];
  const dim='w-full py-4 bg-surface-container-high text-on-surface-variant rounded-full font-black text-lg';
  const active='w-full py-4 bg-primary text-on-primary rounded-full font-black text-lg active:scale-[0.98] transition-transform';
  if(!walletAddress){btn.textContent='Connect Wallet';btn.className=active;}
  else if(!addr){btn.textContent='Enter address';btn.className=dim;}
  else if(amt<=0){btn.textContent='Enter amount';btn.className=dim;}
  else if(fromBal!=null&&amt>fromBal){btn.textContent='Insufficient balance';btn.className=dim;}
  else if(amt*10**t.decimals<1){btn.textContent='Amount too small';btn.className=dim;}
  else{btn.textContent='Send';btn.className=active;}
}

function onAmountChange() {
  updateBtn();
  const val=parseFloat(document.getElementById('input-amount').value)||0;
  const p=prices[TOKENS[selTokenIdx].symbol]||0;
  document.getElementById('usd-value').textContent=val>0&&p?`~$${fmt(val*p)}`:'~$0.00';
}

function toHex(n) { return '0x'+BigInt(n).toString(16); }

function encodeTransfer(to, amount, decimals) {
  const selector='0xa9059cbb';
  const addrPad=to.toLowerCase().replace('0x','').padStart(64,'0');
  const amtWei=BigInt(Math.floor(amount*10**decimals));
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
  const amount=parseFloat(document.getElementById('input-amount').value)||0;
  if(amount<=0)return;
  const recipient=getRecipientAddr();
  if(!recipient)return;
  const t=TOKENS[selTokenIdx], c=CHAINS[selChainIdx];
  if(fromBal!=null&&amount>fromBal)return;
  if(amount*10**t.decimals<1)return;
  try {
    const btn=document.getElementById('action-btn');
    btn.textContent='Confirm in wallet...';
    document.getElementById('tx-status').classList.remove('hidden');
    document.getElementById('tx-done').classList.add('hidden');
    document.getElementById('tx-text').textContent='Confirming...';
    let txParams, hash;
    if(t.native) {
      const amtWei=BigInt(Math.floor(amount*10**t.decimals));
      txParams={from:walletAddress,to:recipient,value:toHex(amtWei),chainId:'0x'+c.id.toString(16)};
      hash=await sendTx(c.id,txParams);
    } else {
      const contractAddr=t.addresses[c.id];
      const data=encodeTransfer(recipient,amount,t.decimals);
      txParams={from:walletAddress,to:contractAddr,data,value:'0x0',chainId:'0x'+c.id.toString(16)};
      hash=await sendTx(c.id,txParams);
    }
    document.getElementById('tx-text').textContent='Waiting for confirmation...';
    // Poll for receipt
    for(let i=0;i<60;i++){
      try{const r=await window.ethereum.request({method:'eth_getTransactionReceipt',params:[hash]});if(r&&r.blockNumber)break;}catch{}
      await new Promise(r=>setTimeout(r,2000));
    }
    document.getElementById('tx-status').classList.add('hidden');
    document.getElementById('tx-done').classList.remove('hidden');
    btn.textContent='Transfer complete!';
    // Save to history
    try{const k='sage_tx_'+(walletAddress||'').toLowerCase();const h=JSON.parse(localStorage.getItem(k)||'[]');h.unshift({type:'send',summary:`Sent ${amount} ${t.symbol} on ${c.name}`,token:t.symbol,chain:c.name,chainId:c.id,amount:String(amount),to:recipient,timestamp:Date.now(),txHash:hash});if(h.length>20)h.length=20;localStorage.setItem(k,JSON.stringify(h));}catch{}
    fetchBalance();
    setTimeout(updateBtn,3000);
  } catch(e){
    console.error(e);
    document.getElementById('tx-status').classList.add('hidden');
    const btn=document.getElementById('action-btn');
    btn.textContent=e.code===4001?'Rejected':'Failed';
    setTimeout(updateBtn,2000);
  }
}

function setMax(){if(fromBal!=null){const t=TOKENS[selTokenIdx];const cid=CHAINS[selChainIdx].id;const GAS_RESERVE={1:0.005,56:0.001,137:0.05};const reserve=t.native?(GAS_RESERVE[cid]??0.0005):0;document.getElementById('input-amount').value=Math.max(0,fromBal-reserve);onAmountChange();}}

// Picker
let allRows=[];
function openPicker(){
  document.getElementById('picker-search').value='';
  allRows=[];
  CHAINS.forEach((c,ci)=>{TOKENS.forEach((t,ti)=>{
    const has=t.native?t.addresses.hasOwnProperty(c.id):t.addresses[c.id];
    if(!has)return;
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
        <img src="${Safe.url(TOKEN_ICONS[t.symbol]||'')}" class="w-9 h-9 rounded-full bg-surface-container"/>
        <img src="${Safe.url(chainIcon(c.id))}" class="w-4 h-4 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-surface-container-lowest bg-surface-container-lowest"/>
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
function selectToken(ti,ci){selTokenIdx=ti;selChainIdx=ci;closePicker();updateDisplay();fetchBalance();onAmountChange();}

function fmt(n){if(n>=1000)return n.toLocaleString('en-US',{maximumFractionDigits:2});if(n>=1)return n.toLocaleString('en-US',{maximumFractionDigits:4});return n.toLocaleString('en-US',{maximumFractionDigits:6});}

(async function(){
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
  if(params.get('amount')){document.getElementById('input-amount').value=params.get('amount');onAmountChange();}
  if(params.get('note')){
    const noteEl=document.getElementById('request-note');
    if(!noteEl){
      const div=document.createElement('div');
      div.className='mb-4 px-4 py-3 bg-primary-container rounded-xl';
      const label=document.createElement('p');
      label.className='text-xs font-bold text-on-primary-container mb-1';
      label.textContent='Payment request';
      const body=document.createElement('p');
      body.className='text-sm text-on-primary-container';
      body.textContent=params.get('note');
      div.append(label,body);
      document.getElementById('recipient').closest('.mb-5').after(div);
    }
  }

  await setupWallet({
    onConnected(addr) {
      walletAddress=addr;
      document.getElementById('connect-label').textContent=formatAddr(addr);
      resolveWalletENS(addr);
      fetchBalance(); updateBtn();
    },
    onDisconnected() {
      walletAddress=null;
      document.getElementById('connect-label').textContent='Connect';
      fetchBalance(); updateBtn();
    },
    onChainChanged() { if(walletAddress){fetchBalance();updateBtn();} }
  });
})();

function toggleMobileMenu() { document.getElementById('mobile-menu').classList.toggle('hidden'); }
function closeMobileMenu(e) { if (e.target === document.getElementById('mobile-menu')) document.getElementById('mobile-menu').classList.add('hidden'); }

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
  }
});
document.addEventListener('DOMContentLoaded', function() {
  var el = document.getElementById('recipient-address');
  if (el) el.addEventListener('input', validateRecipient);
  var src = document.getElementById('source-search');
  if (src) src.addEventListener('input', filterSourceList);
});
