
const CHAINS=[{id:1,name:'Ethereum',slug:'ethereum'},{id:42161,name:'Arbitrum',slug:'arbitrum'},{id:8453,name:'Base',slug:'base'},{id:10,name:'Optimism',slug:'optimism'},{id:137,name:'Polygon',slug:'polygon'},{id:324,name:'zkSync',slug:'zksync%20era'},{id:59144,name:'Linea',slug:'linea'}];
const TOKENS=[{symbol:'ETH',name:'Ethereum',decimals:18,native:true,addresses:{1:null,42161:null,8453:null,10:null}},{symbol:'USDC',name:'USD Coin',decimals:6,native:false,addresses:{1:'0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',42161:'0xaf88d065e77c8cC2239327C5EDb3A432268e5831',8453:'0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',10:'0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',137:'0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'}},{symbol:'USDT',name:'Tether',decimals:6,native:false,addresses:{1:'0xdAC17F958D2ee523a2206206994597C13D831ec7',42161:'0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',10:'0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'}},{symbol:'DAI',name:'Dai',decimals:18,native:false,addresses:{1:'0x6B175474E89094C44Da98b954EedeAC495271d0F',42161:'0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'}},{symbol:'WBTC',name:'Wrapped BTC',decimals:8,native:false,addresses:{1:'0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',42161:'0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'}},{symbol:'POL',name:'Polygon',decimals:18,native:true,addresses:{137:null}}];

let walletAddress=null,payTokenIdx=0,payChainIdx=0,reqTokenIdx=0,reqChainIdx=0,payFromBal=null,payPrices={},pickerMode='pay',allRows=[],reqGeneratedUrl='',payResolvedAddr=null,payEnsTimer=null;
function switchTab(tab){const isPay=tab==='pay';document.getElementById('pane-pay').classList.toggle('hidden',!isPay);document.getElementById('pane-request').classList.toggle('hidden',isPay);const pb=document.getElementById('tab-pay'),pr=document.getElementById('tab-request');pb.className=isPay?'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-full bg-surface-container-lowest shadow-sm text-sm font-bold text-on-surface transition-all':'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-full text-sm font-bold text-on-surface-variant transition-all';pr.className=!isPay?'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-full bg-surface-container-lowest shadow-sm text-sm font-bold text-on-surface transition-all':'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-full text-sm font-bold text-on-surface-variant transition-all';}
async function connectWallet(){
  if(!window.ethereum){showNoWalletMessage();return;}
  try{
    const accs=await window.ethereum.request({method:'eth_requestAccounts'});
    localStorage.removeItem('sage_disconnected');
    walletAddress=accs[0];
    document.getElementById('connect-label').textContent=formatAddr(walletAddress);
    document.getElementById('my-address').textContent=formatAddr(walletAddress);
    resolveWalletENS();fetchPayBalance();updatePayBtn();updateReqBtn();
  }catch(e){
    if(e&&e.code!==4001)console.warn('Wallet connect failed:',e.message||e);
  }
}
// Registered once at init — registering inside connectWallet stacked a new
// pair of listeners on every connect click.
function registerWalletListeners(){
  if(!window.ethereum)return;
  window.ethereum.on('accountsChanged',a=>{
    walletAddress=a[0]||null;
    document.getElementById('connect-label').textContent=walletAddress?formatAddr(walletAddress):'Connect';
    if(walletAddress){document.getElementById('my-address').textContent=formatAddr(walletAddress);resolveWalletENS();}
    else{document.getElementById('my-address').textContent='Connect wallet';}
    fetchPayBalance();updatePayBtn();updateReqBtn();
  });
  window.ethereum.on('chainChanged',()=>{if(walletAddress){fetchPayBalance();updatePayBtn();updateReqBtn();}});
}
function resolveWalletENS(){if(!walletAddress)return;const addr=walletAddress;fetch(`/api/ens?address=${encodeURIComponent(addr)}`).then(r=>r.json()).then(d=>{if(walletAddress!==addr)return;if(d.name){document.getElementById('connect-label').textContent=d.name;const e=document.getElementById('my-ens');e.textContent=d.name;e.classList.remove('hidden');}}).catch(()=>{});}
async function fetchPayBalance(){if(!walletAddress)return;const addr=walletAddress;try{const res=await fetch(`/api/balances?address=${encodeURIComponent(addr)}&_t=${Date.now()}`);if(!res.ok)throw new Error('API error '+res.status);const b=await res.json();if(walletAddress!==addr)return;const t=TOKENS[payTokenIdx],cid=CHAINS[payChainIdx].id;const bal=b?.[cid]?.[t.symbol]||0;payFromBal=bal;document.getElementById('pay-balance').textContent=`${fmt(bal)} ${t.symbol}`;updatePayBtn();}catch{payFromBal=null;}}
async function fetchPayPrices(){try{const res=await fetch('/api/prices');const raw=await res.json();payPrices={ETH:raw.ethereum?.usd||0,USDC:1,USDT:1,DAI:1,WBTC:raw['wrapped-bitcoin']?.usd||0,POL:raw['polygon-ecosystem-token']?.usd||raw['matic-network']?.usd||0};}catch{payPrices={ETH:2500,USDC:1,USDT:1,DAI:1,WBTC:90000,POL:0.5};}}
function updatePayDisplay(){const t=TOKENS[payTokenIdx],c=CHAINS[payChainIdx];document.getElementById('pay-token-icon').src=TOKEN_ICONS[t.symbol]||'';document.getElementById('pay-chain-icon').src=chainIcon(c.id);document.getElementById('pay-label').textContent=`${t.symbol} on ${c.name}`;}
function updateReqDisplay(){const t=TOKENS[reqTokenIdx],c=CHAINS[reqChainIdx];document.getElementById('req-token-icon').src=TOKEN_ICONS[t.symbol]||'';document.getElementById('req-chain-icon').src=chainIcon(c.id);document.getElementById('req-label').textContent=`${t.symbol} on ${c.name}`;}
function validateAddr(){const v=document.getElementById('recipient').value.trim();const e=document.getElementById('ens-resolved');payResolvedAddr=null;e.classList.add('hidden');if(v.endsWith('.eth')&&v.length>4){document.getElementById('addr-error').classList.add('hidden');e.textContent='Resolving...';e.classList.remove('hidden');clearTimeout(payEnsTimer);payEnsTimer=setTimeout(()=>{fetch(`/api/ens?name=${encodeURIComponent(v)}`).then(r=>r.json()).then(d=>{if(d.address&&d.address!=='0x0000000000000000000000000000000000000000'){payResolvedAddr=d.address;e.textContent=`→ ${d.address.slice(0,6)}...${d.address.slice(-4)}`;}else{e.textContent='ENS name not found';}updatePayBtn();}).catch(()=>{e.textContent='Could not resolve';});},500);}else{document.getElementById('addr-error').classList.toggle('hidden',!v||EthUtils.isValidAddress(v));}updatePayBtn();}
function getRecipientAddr(){if(payResolvedAddr)return payResolvedAddr;const v=document.getElementById('recipient').value.trim();return EthUtils.isValidAddress(v)?v:null;}
function updatePayBtn(){const btn=document.getElementById('pay-action-btn');const amt=parseFloat(document.getElementById('input-amount').value)||0;const addr=getRecipientAddr();if(!walletAddress){btn.textContent='Connect Wallet';btn.className='w-full py-4 bg-primary text-on-primary rounded-full font-black text-lg active:scale-[0.98] transition-transform';}else if(!addr){btn.textContent='Enter address';btn.className='w-full py-4 bg-surface-container-high text-on-surface-variant rounded-full font-black text-lg';}else if(amt<=0){btn.textContent='Enter amount';btn.className='w-full py-4 bg-surface-container-high text-on-surface-variant rounded-full font-black text-lg';}else if(payFromBal!=null&&amt>payFromBal){btn.textContent='Insufficient balance';btn.className='w-full py-4 bg-surface-container-high text-on-surface-variant/50 rounded-full font-black text-lg cursor-not-allowed';}else{btn.textContent='Send';btn.className='w-full py-4 bg-primary text-on-primary rounded-full font-black text-lg active:scale-[0.98] transition-transform';}}
function onAmountChange(){updatePayBtn();const val=parseFloat(document.getElementById('input-amount').value)||0;const p=payPrices[TOKENS[payTokenIdx].symbol]||0;document.getElementById('usd-value').textContent=val>0&&p?`~$${fmt(val*p)}`:'~$0.00';}
async function executePay(){
  if(!walletAddress){connectWallet();return;}
  const amount=parseFloat(document.getElementById('input-amount').value)||0;
  if(amount<=0)return;
  if(payFromBal!=null&&amount>payFromBal)return;
  const recipient=getRecipientAddr();
  if(!recipient)return;
  const t=TOKENS[payTokenIdx],c=CHAINS[payChainIdx];
  try{
    document.getElementById('pay-action-btn').textContent='Confirm in wallet...';
    document.getElementById('tx-status').classList.remove('hidden');
    document.getElementById('tx-done').classList.add('hidden');
    const amtWei=BigInt(toUnits(amount,t.decimals));
    const chainHex='0x'+c.id.toString(16);
    const current=await window.ethereum.request({method:'eth_chainId'});
    if(current!==chainHex){
      try{await window.ethereum.request({method:'wallet_switchEthereumChain',params:[{chainId:chainHex}]});}
      catch(e){if(e.code===4902)throw new Error('Add chain to wallet');throw e;}
    }
    let txParams,hash;
    if(t.native){
      txParams={from:walletAddress,to:recipient,value:'0x'+amtWei.toString(16),chainId:chainHex};
      hash=await window.ethereum.request({method:'eth_sendTransaction',params:[txParams]});
    }else{
      const contractAddr=t.addresses[c.id];
      const selector='0xa9059cbb';
      const addrPad=recipient.toLowerCase().replace('0x','').padStart(64,'0');
      const amtPad=amtWei.toString(16).padStart(64,'0');
      const data=selector+addrPad+amtPad;
      txParams={from:walletAddress,to:contractAddr,data,value:'0x0',chainId:chainHex};
      hash=await window.ethereum.request({method:'eth_sendTransaction',params:[txParams]});
    }
    document.getElementById('tx-text').textContent='Waiting for confirmation...';
    let receipt=null;
    for(let i=0;i<60&&!receipt;i++){
      try{const r=await window.ethereum.request({method:'eth_getTransactionReceipt',params:[hash]});if(r&&r.blockNumber)receipt=r;}catch{}
      if(!receipt)await new Promise(r=>setTimeout(r,2000));
    }
    document.getElementById('tx-status').classList.add('hidden');
    if(receipt&&receipt.status==='0x0')throw new Error('Transfer reverted on-chain');
    document.getElementById('tx-done').classList.remove('hidden');
    document.getElementById('pay-action-btn').textContent=receipt?'Transfer complete!':'Transfer pending — check the explorer';
    fetchPayBalance();
    setTimeout(updatePayBtn,3000);
  }catch(e){
    console.error(e);
    document.getElementById('tx-status').classList.add('hidden');
    document.getElementById('pay-action-btn').textContent=e.code===4001?'Rejected':'Failed';
    setTimeout(updatePayBtn,2000);
  }
}
function setMax(){if(payFromBal!=null){const t=TOKENS[payTokenIdx];const cid=CHAINS[payChainIdx].id;const GAS_RESERVE={1:0.005,56:0.001,137:0.05};const reserve=t.native?(GAS_RESERVE[cid]??0.0005):0;document.getElementById('input-amount').value=Math.max(0,payFromBal-reserve);onAmountChange();}}
function updateReqBtn(){const btn=document.getElementById('req-action-btn');const amt=parseFloat(document.getElementById('amount-input').value)||0;if(!walletAddress){btn.textContent='Connect Wallet';btn.className='w-full py-4 bg-primary text-on-primary rounded-full font-black text-lg active:scale-[0.98] transition-transform';}else if(amt<=0){btn.textContent='Enter amount';btn.className='w-full py-4 bg-surface-container-high text-on-surface-variant rounded-full font-black text-lg';}else{btn.textContent='Create Payment Link';btn.className='w-full py-4 bg-primary text-on-primary rounded-full font-black text-lg active:scale-[0.98] transition-transform';}}
function generateLink(){if(!walletAddress){connectWallet();return;}const amt=parseFloat(document.getElementById('amount-input').value)||0;if(amt<=0)return;const t=TOKENS[reqTokenIdx],c=CHAINS[reqChainIdx];const note=document.getElementById('note-input').value.trim();const params=new URLSearchParams({to:walletAddress,token:t.symbol,chain:c.id,amount:amt});if(note)params.set('note',note);reqGeneratedUrl=`${window.location.origin}/payments.html?tab=pay&${params}`;document.getElementById('pane-request').querySelector('[id^="req-"]').closest('.mb-6')?.nextElementSibling?.classList?.add('hidden');document.getElementById('share-view').classList.remove('hidden');document.getElementById('share-url').textContent=reqGeneratedUrl;document.getElementById('share-summary').textContent=`${amt} ${t.symbol} on ${c.name}`;const noteEl=document.getElementById('share-note');if(note){noteEl.textContent=`"${note}"`;noteEl.classList.remove('hidden');}else{noteEl.classList.add('hidden');}}
function copyLink(){navigator.clipboard.writeText(reqGeneratedUrl);const label=document.getElementById('copy-label');label.textContent='Copied!';setTimeout(()=>{label.textContent='Copy';},2000);}
function shareLink(){if(navigator.share){navigator.share({title:'Payment Request',text:'Pay me via Sage',url:reqGeneratedUrl}).catch(()=>{});}else{copyLink();}}
function resetForm(){document.getElementById('share-view').classList.add('hidden');document.getElementById('amount-input').value='';document.getElementById('note-input').value='';updateReqBtn();}
function setAmt(n){document.getElementById('amount-input').value=n;updateReqBtn();}
function openPicker(mode){pickerMode=mode;document.getElementById('picker-search').value='';allRows=[];CHAINS.forEach((c,ci)=>{TOKENS.forEach((t,ti)=>{const has=t.native?t.addresses.hasOwnProperty(c.id):t.addresses[c.id];if(!has)return;allRows.push({c,ci,t,ti});});});renderPicker(allRows);document.getElementById('picker-modal').classList.remove('hidden');document.getElementById('picker-search').focus();}
function closePicker(){document.getElementById('picker-modal').classList.add('hidden');}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !document.getElementById('picker-modal').classList.contains('hidden')) closePicker();
});
function filterPicker(){const q=document.getElementById('picker-search').value.toLowerCase();renderPicker(q?allRows.filter(r=>r.t.symbol.toLowerCase().includes(q)||r.t.name.toLowerCase().includes(q)||r.c.name.toLowerCase().includes(q)):allRows);}
function renderPicker(rows){
  const plist=document.getElementById('picker-list');
  const items=rows.map(({c,ci,t,ti})=>
    Safe.html`<button data-ti="${ti}" data-ci="${ci}" class="pick-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface-container-low transition-colors text-left"><div class="relative flex-shrink-0"><img src="${Safe.url(TOKEN_ICONS[t.symbol]||'')}" class="w-9 h-9 rounded-full bg-surface-container"/><img src="${Safe.url(chainIcon(c.id))}" class="w-4 h-4 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-surface-container-lowest bg-surface-container-lowest"/></div><div class="flex-1"><p class="font-bold text-sm text-on-surface">${t.symbol}</p><p class="text-xs text-on-surface-variant">${t.name} · ${c.name}</p></div><span class="material-symbols-outlined text-on-surface-variant text-base">chevron_right</span></button>`
  );
  Safe.setHTML(plist,items.length?items:Safe.html`<p class="text-sm text-on-surface-variant text-center py-4">No tokens found</p>`);
  plist.querySelectorAll('button.pick-btn').forEach(btn=>{
    btn.addEventListener('click',()=>selectToken(Number(btn.dataset.ti),Number(btn.dataset.ci)));
  });
}
function selectToken(ti,ci){if(pickerMode==='pay'){payTokenIdx=ti;payChainIdx=ci;updatePayDisplay();fetchPayBalance();onAmountChange();}else{reqTokenIdx=ti;reqChainIdx=ci;updateReqDisplay();}closePicker();}
function fmt(n){if(n>=1000)return n.toLocaleString('en-US',{maximumFractionDigits:2});if(n>=1)return n.toLocaleString('en-US',{maximumFractionDigits:4});return n.toLocaleString('en-US',{maximumFractionDigits:6});}
(async function(){registerWalletListeners();const params=new URLSearchParams(window.location.search);if(params.get('tab')==='request'){switchTab('request');}updatePayDisplay();updateReqDisplay();await fetchPayPrices();if(params.get('to')){document.getElementById('recipient').value=params.get('to');validateAddr();}if(params.get('token')&&params.get('chain')){const tok=params.get('token'),cid=Number(params.get('chain'));const ti=TOKENS.findIndex(t=>t.symbol===tok);const ci=CHAINS.findIndex(c=>c.id===cid);if(ti>=0&&ci>=0){payTokenIdx=ti;payChainIdx=ci;updatePayDisplay();}}if(params.get('amount')){document.getElementById('input-amount').value=params.get('amount');onAmountChange();}if(window.ethereum){const accs=await window.ethereum.request({method:'eth_accounts'});if(accs.length>0){walletAddress=accs[0];document.getElementById('connect-label').textContent=walletAddress.slice(0,6)+'...'+walletAddress.slice(-4);document.getElementById('my-address').textContent=walletAddress.slice(0,6)+'...'+walletAddress.slice(-4);resolveWalletENS();fetchPayBalance();updatePayBtn();updateReqBtn();}}updatePayBtn();updateReqBtn();})();

// ── Event delegation & input listeners ──────────────────────────────────────
document.addEventListener('click', function(e) {
  var el = e.target.closest('[data-action]');
  if (!el) return;
  var action = el.dataset.action;
  var arg = el.dataset.arg;
  switch (action) {
    case 'switch-tab':   switchTab(arg); break;
    case 'open-picker':  openPicker(arg); break;
    case 'close-picker': closePicker(); break;
    case 'execute-pay':  executePay(); break;
    case 'set-max':      setMax(); break;
    case 'generate-link': generateLink(); break;
    case 'copy-link':    copyLink(); break;
    case 'share-link':   shareLink(); break;
    case 'reset-form':   resetForm(); break;
    case 'set-amt':      setAmt(Number(arg)); break;
  }
});
document.addEventListener('DOMContentLoaded', function() {
  var recipEl = document.getElementById('recipient');
  if (recipEl) recipEl.addEventListener('input', validateAddr);
  var amtEl = document.getElementById('input-amount');
  if (amtEl) amtEl.addEventListener('input', onAmountChange);
  var ps = document.getElementById('picker-search');
  if (ps) ps.addEventListener('input', filterPicker);
});
