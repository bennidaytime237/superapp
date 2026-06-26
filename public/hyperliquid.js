const ACROSS_API = 'https://app.across.to/api';
const BRIDGE2 = '0x2Df1c51E09aECF9cacB7bc98cB1742757f163dF7';
const USDC_ARB = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const DEST_CHAIN = 42161;

const CHAINS = [
  { id:1,     name:'Ethereum', slug:'ethereum' },
  { id:42161, name:'Arbitrum', slug:'arbitrum' },
  { id:8453,  name:'Base',     slug:'base' },
  { id:10,    name:'Optimism', slug:'optimism' },
  { id:137,   name:'Polygon',  slug:'polygon' },
  { id:324,   name:'zkSync',   slug:'zksync%20era' },
  { id:59144, name:'Linea',    slug:'linea' },
  { id:34443, name:'Mode',     slug:'mode' },
  { id:81457, name:'Blast',    slug:'blast' },
  { id:534352,name:'Scroll',   slug:'scroll' },
];

const TOKENS = [
  { symbol:'ETH', name:'Ethereum', decimals:18, native:true,
    addresses:{1:null,42161:null,8453:null,10:null},
    wrapAddresses:{1:'0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',42161:'0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',8453:'0x4200000000000000000000000000000000000006',10:'0x4200000000000000000000000000000000000006'}},
  { symbol:'USDC', name:'USD Coin', decimals:6, native:false,
    addresses:{1:'0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',42161:'0xaf88d065e77c8cC2239327C5EDb3A432268e5831',8453:'0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',10:'0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',137:'0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'}},
  { symbol:'USDT', name:'Tether', decimals:6, native:false,
    addresses:{1:'0xdAC17F958D2ee523a2206206994597C13D831ec7',42161:'0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',10:'0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'}},
  { symbol:'WBTC', name:'Wrapped BTC', decimals:8, native:false,
    addresses:{1:'0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',42161:'0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'}},
  { symbol:'DAI', name:'Dai', decimals:18, native:false,
    addresses:{1:'0x6B175474E89094C44Da98b954EedeAC495271d0F',42161:'0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'}},
];



let walletAddress=null, fromTokenIdx=1, fromChainIdx=0, fromBal=null, cachedBalances=null, prices={}, lastQuote=null, quoteTimer=null;

async function connectWallet(){
  if(!window.ethereum){alert('Install MetaMask');return;}
  const accs=await window.ethereum.request({method:'eth_requestAccounts'});
  walletAddress=accs[0];
  document.getElementById('connect-label').textContent=formatAddr(walletAddress);
  resolveWalletENS(walletAddress);
  fetchBalance();updateBtn();
}

async function fetchBalance(){
  if(!walletAddress)return;
  try{
    const res=await fetch(`/api/balances?address=${walletAddress}&_t=${Date.now()}`);
    cachedBalances=await res.json();
    const t=TOKENS[fromTokenIdx],cid=CHAINS[fromChainIdx].id;
    const bal=cachedBalances?.[cid]?.[t.symbol]||0;
    fromBal=bal;
    document.getElementById('from-balance').textContent=`${fmt(bal)} ${t.symbol}`;
  }catch{fromBal=null;}
}

async function fetchPrices(){
  try{
    const res=await fetch('/api/prices');const raw=await res.json();
    prices={ETH:raw.ethereum?.usd||0,USDC:1,USDT:1,DAI:1,WBTC:raw['wrapped-bitcoin']?.usd||0};
  }catch{prices={ETH:2500,USDC:1,USDT:1,DAI:1,WBTC:90000};}
}

function updateDisplay(){
  const t=TOKENS[fromTokenIdx],c=CHAINS[fromChainIdx];
  document.getElementById('from-token-icon').src=TOKEN_ICONS[t.symbol]||'';
  document.getElementById('from-chain-icon').src=chainIcon(c.id);
  document.getElementById('from-label').textContent=`${t.symbol} on ${c.name}`;
  document.getElementById('l2-hint').classList.toggle('hidden',c.id!==1);
}

function updateBtn(){
  const btn=document.getElementById('action-btn');
  const amt=parseFloat(document.getElementById('input-amount').value)||0;
  const usdVal=amt*(prices[TOKENS[fromTokenIdx].symbol]||0);
  const minErr=document.getElementById('min-error');
  const activeBtn='w-full py-4 bg-surface-container-lowest text-hl-green border border-hl-green/30 rounded-full font-black text-lg active:scale-[0.98] transition-transform hover:border-hl-green/60';
  const dimBtn='w-full py-4 bg-surface-container text-on-surface-variant/60 border border-outline-variant/15 rounded-full font-black text-lg';
  if(!walletAddress){btn.textContent='Connect Wallet';btn.className=activeBtn;minErr.classList.add('hidden');}
  else if(amt<=0){btn.textContent='Enter amount';btn.className=dimBtn;minErr.classList.add('hidden');}
  else if(fromBal!=null&&amt>fromBal){minErr.classList.add('hidden');btn.textContent='Insufficient balance';btn.className=dimBtn;}
  else if(usdVal<5&&usdVal>0){minErr.classList.remove('hidden');btn.textContent='Amount too low';btn.className=dimBtn;}
  else{minErr.classList.add('hidden');btn.textContent='Deposit to Hyperliquid';btn.className=activeBtn;}
}

function onAmountChange(){
  clearTimeout(quoteTimer);lastQuote=null;updateBtn();
  const val=parseFloat(document.getElementById('input-amount').value)||0;
  if(val<=0){document.getElementById('output-amount').textContent='--';document.getElementById('output-amount-usd').textContent='';document.getElementById('fee-display').textContent='--';return;}
  const p=prices[TOKENS[fromTokenIdx].symbol]||0;
  if(p){document.getElementById('output-amount').textContent=fmt(val*p);document.getElementById('output-amount-usd').textContent='$'+fmt(val*p);}
  document.getElementById('fee-display').textContent='Fetching...';
  quoteTimer=setTimeout(()=>fetchQuote(val),300);
}

async function fetchQuote(amount){
  try{
    const t=TOKENS[fromTokenIdx],c=CHAINS[fromChainIdx];
    const inputAddr=t.native?t.wrapAddresses?.[c.id]:t.addresses[c.id];
    if(!inputAddr)return;
    const amountWei=BigInt(Math.floor(amount*10**t.decimals)).toString();
    const params=new URLSearchParams({
      tradeType:'exactInput',amount:amountWei,inputToken:inputAddr,outputToken:USDC_ARB,
      originChainId:c.id,destinationChainId:DEST_CHAIN,
      depositor:walletAddress||'0x0000000000000000000000000000000000000000',
      recipient:BRIDGE2,slippage:'auto',
    });
    const ctrl=new AbortController();
    const tm=setTimeout(()=>ctrl.abort(),8000);
    const res=await fetch(`${ACROSS_API}/swap/approval?${params}`,{signal:ctrl.signal});
    clearTimeout(tm);
    if(!res.ok)return;
    const data=await res.json();
    lastQuote=data;
    const rawOut=data.steps?.bridge?.outputAmount??data.expectedOutput??data.outputAmount??'0';
    let out=0;try{out=Number(BigInt(rawOut))/1e6;}catch{out=parseFloat(rawOut)/1e6||0;}
    const inputUsd=amount*(prices[t.symbol]||0);
    const feeUsd=inputUsd>0?Math.max(0,inputUsd-out):0;
    document.getElementById('output-amount').textContent=fmt(out);
    document.getElementById('output-amount-usd').textContent='$'+fmt(out);
    document.getElementById('fee-display').textContent=feeUsd>0.001?`~$${fmt(feeUsd)} fee`:'Calculating...';
    updateBtn();
  }catch(e){console.warn('Quote failed:',e);document.getElementById('fee-display').textContent='Quote failed';}
}

async function execute(){
  if(!walletAddress){connectWallet();return;}
  const amount=parseFloat(document.getElementById('input-amount').value)||0;
  if(amount<=0)return;
  if(fromBal!=null&&amount>fromBal)return;
  const usdVal=amount*(prices[TOKENS[fromTokenIdx].symbol]||0);
  if(usdVal<5&&usdVal>0)return;
  try{
    if(!lastQuote)await fetchQuote(amount);
    if(!lastQuote)throw new Error('No quote');
    const btn=document.getElementById('action-btn');
    if(lastQuote.approvalTxns?.length){
      btn.textContent='Approving...';
      for(const tx of lastQuote.approvalTxns)await sendTx(tx);
    }
    btn.textContent='Confirm in wallet...';
    document.getElementById('tx-status').classList.remove('hidden');
    document.getElementById('tx-done').classList.add('hidden');
    const hash=await sendTx(lastQuote.swapTx);
    btn.textContent='Bridging...';
    document.getElementById('tx-text').textContent='Bridging to Hyperliquid...';
    for(let i=0;i<120;i++){
      try{const r=await fetch(`${ACROSS_API}/deposit/status?originChainId=${CHAINS[fromChainIdx].id}&depositTxHash=${hash}`);const d=await r.json();if(d.status==='filled')break;}catch{}
      await new Promise(r=>setTimeout(r,2000));
    }
    document.getElementById('tx-status').classList.add('hidden');
    document.getElementById('tx-done').classList.remove('hidden');
    btn.textContent='Deposit complete!';
    try{
      const k='sage_tx_'+(walletAddress||'').toLowerCase();
      const h=JSON.parse(localStorage.getItem(k)||'[]');
      h.unshift({type:'bridge',summary:`Hyperliquid deposit: ${amount} ${TOKENS[fromTokenIdx].symbol} \u2192 USDC on HyperCore`,fromToken:TOKENS[fromTokenIdx].symbol,toToken:'USDC',fromChain:CHAINS[fromChainIdx].name,toChain:'Hyperliquid',fromChainId:CHAINS[fromChainIdx].id,amount:String(amount),timestamp:Date.now(),txHash:hash});
      if(h.length>20)h.length=20;
      localStorage.setItem(k,JSON.stringify(h));
    }catch{}
    setTimeout(updateBtn,3000);
  }catch(e){
    console.error(e);
    document.getElementById('tx-status').classList.add('hidden');
    const btn=document.getElementById('action-btn');
    btn.textContent=e.code===4001?'Rejected':'Failed';
    setTimeout(updateBtn,2000);
  }
}

async function sendTx(tx){
  const chainHex='0x'+tx.chainId.toString(16);
  const current=await window.ethereum.request({method:'eth_chainId'});
  if(current!==chainHex){
    try{await window.ethereum.request({method:'wallet_switchEthereumChain',params:[{chainId:chainHex}]});}
    catch(e){if(e.code===4902)throw new Error('Add chain to wallet');throw e;}
  }
  const params={from:walletAddress,to:tx.to,data:tx.data,value:tx.value&&tx.value!=='0'?'0x'+BigInt(tx.value).toString(16):'0x0',chainId:chainHex};
  if(tx.gas)params.gas='0x'+BigInt(tx.gas).toString(16);
  return window.ethereum.request({method:'eth_sendTransaction',params:[params]});
}

function setMax(){if(fromBal!=null){const t=TOKENS[fromTokenIdx];const cid=CHAINS[fromChainIdx].id;const GAS_RESERVE={1:0.005,56:0.001,137:0.05};const reserve=t.native?(GAS_RESERVE[cid]??0.0005):0;document.getElementById('input-amount').value=Math.max(0,fromBal-reserve);onAmountChange();}}

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
      <div class="flex-1"><p class="font-bold text-sm text-on-surface">${bal>0?fmt(bal)+' ':''}${t.symbol}${t.native?Safe.html`<span class="ml-1 px-1 rounded-md bg-surface-container-high text-xs font-medium text-on-surface-variant align-middle">Gas Token</span>`:Safe.html``}</p><p class="text-xs text-on-surface-variant">${t.name} · ${c.name}</p></div>
      <span class="material-symbols-outlined text-on-surface-variant text-base">chevron_right</span>
    </button>`
  );
  Safe.setHTML(list, items.length ? items : Safe.html`<p class="text-sm text-on-surface-variant text-center py-4">No tokens found</p>`);
  list.querySelectorAll('button.pick-btn').forEach(btn => {
    btn.addEventListener('click', () => selectToken(Number(btn.dataset.ti), Number(btn.dataset.ci)));
  });
}
function selectToken(ti,ci){fromTokenIdx=ti;fromChainIdx=ci;closePicker();updateDisplay();fetchBalance();onAmountChange();}

function fmt(n){if(n>=1000)return n.toLocaleString('en-US',{maximumFractionDigits:2});if(n>=1)return n.toLocaleString('en-US',{maximumFractionDigits:4});return n.toLocaleString('en-US',{maximumFractionDigits:6});}

(async function(){
  updateDisplay();updateBtn();
  await fetchPrices();
  await setupWallet({
    onConnected(addr){
      walletAddress=addr;
      document.getElementById('connect-label').textContent=formatAddr(addr);
      resolveWalletENS(addr);
      fetchBalance();updateBtn();
    },
    onDisconnected(){
      walletAddress=null;
      document.getElementById('connect-label').textContent='Connect';
      fetchBalance();updateBtn();
    },
    onChainChanged(){if(walletAddress){fetchBalance();updateBtn();}}
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
    case 'open-picker':  openPicker(); break;
    case 'close-picker': closePicker(); break;
    case 'execute':      execute(); break;
    case 'set-max':      setMax(); break;
  }
});
document.addEventListener('DOMContentLoaded', function() {
  var amtEl = document.getElementById('input-amount');
  if (amtEl) amtEl.addEventListener('input', onAmountChange);
  var ps = document.getElementById('picker-search');
  if (ps) ps.addEventListener('input', filterPicker);
});
