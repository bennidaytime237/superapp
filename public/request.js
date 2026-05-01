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

function setAmt(n){document.getElementById('amount-input').value=n;updateBtn();}

function updateDisplay(){
  const t=TOKENS[selTokenIdx], c=CHAINS[selChainIdx];
  document.getElementById('sel-token-icon').src=TOKEN_ICONS[t.symbol]||'';
  document.getElementById('sel-chain-icon').src=chainIcon(c.id);
  document.getElementById('sel-label').textContent=`${t.symbol} on ${c.name}`;
}

function updateBtn(){
  const btn=document.getElementById('action-btn');
  const amt=parseFloat(document.getElementById('amount-input').value)||0;
  if(!walletAddress){btn.textContent='Connect Wallet';btn.className='w-full py-4 bg-primary text-on-primary rounded-full font-black text-lg active:scale-[0.98] transition-transform';}
  else if(amt<=0){btn.textContent='Enter amount';btn.className='w-full py-4 bg-surface-container-high text-on-surface-variant rounded-full font-black text-lg';}
  else{btn.textContent='Create Payment Link';btn.className='w-full py-4 bg-primary text-on-primary rounded-full font-black text-lg active:scale-[0.98] transition-transform';}
}

function generateLink(){
  if(!walletAddress){connectWallet();return;}
  const amt=parseFloat(document.getElementById('amount-input').value)||0;
  if(amt<=0)return;
  const t=TOKENS[selTokenIdx], c=CHAINS[selChainIdx];
  const note=document.getElementById('note-input').value.trim();
  const params=new URLSearchParams({to:walletAddress,token:t.symbol,chain:c.id,amount:amt});
  if(note)params.set('note',note);
  generatedUrl=`${window.location.origin}/send.html?${params}`;

  // Show share view
  document.getElementById('form-view').classList.add('hidden');
  document.getElementById('share-view').classList.remove('hidden');
  document.getElementById('share-url').textContent=generatedUrl;
  document.getElementById('share-summary').textContent=`${amt} ${t.symbol} on ${c.name}`;
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
  updateBtn();
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
  updateDisplay();updateBtn();
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
  }
});
document.addEventListener('DOMContentLoaded', function() {
  var amtEl = document.getElementById('amount-input');
  if (amtEl) amtEl.addEventListener('input', updateReqBtn);
  var ps = document.getElementById('picker-search');
  if (ps) ps.addEventListener('input', filterPicker);
});
