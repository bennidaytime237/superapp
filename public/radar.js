function toggleMobileMenu() { document.getElementById('mobile-menu').classList.toggle('hidden'); }
function closeMobileMenu(e) { if (e.target === document.getElementById('mobile-menu')) document.getElementById('mobile-menu').classList.add('hidden'); }

(function() {
  "use strict";

  let chainMap = {};
  let tokenMap = {};
  let refreshTimer = null;
  let countdown = 30;
  let countdownInterval = null;

  // --- Helpers ---

  function fmtUsd(n) {
    if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
    if (n >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
    return "$" + n.toFixed(2);
  }

  function fmtNum(n) {
    return n.toLocaleString("en-US");
  }

  function fmtSecs(s) {
    if (s < 60) return s.toFixed(0) + "s";
    return (s / 60).toFixed(1) + "m";
  }

  function timeAgo(dateStr) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return Math.floor(diff) + "s ago";
    if (diff < 3600) return Math.floor(diff / 60) + "m ago";
    if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
    return Math.floor(diff / 86400) + "d ago";
  }

  function chainIcon(chain) {
    if (chain && chain.logoUrl) return chain.logoUrl;
    const name = chain ? chain.name.toLowerCase() : "unknown";
    return "https://icons.llamao.fi/icons/chains/rsz_" + name + ".jpg";
  }

  function tokenIcon(token) {
    if (token && token.logoUrl) return token.logoUrl;
    return "";
  }

  function tokenKey(chainId, address) {
    return chainId + "-" + (address || "").toLowerCase();
  }

  function depositUsdVolume(d) {
    const tk = tokenMap[tokenKey(d.originChainId, d.inputToken)];
    if (!tk) return 0;
    try {
      const raw = Number(BigInt(d.inputAmount));
      return raw / Math.pow(10, tk.decimals) * tk.priceUsd;
    } catch { return 0; }
  }

  function bridgeTime(d) {
    if (!d.fillBlockTimestamp || !d.depositBlockTimestamp) return null;
    const diff = (new Date(d.fillBlockTimestamp) - new Date(d.depositBlockTimestamp)) / 1000;
    return diff > 0 ? diff : null;
  }

  function imgFallback(ev) {
    ev.target.style.display = "none";
  }

  function statusBadge(status) {
    const s = (status || "").toLowerCase();
    if (s === "filled") return Safe.html`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">Filled</span>`;
    if (s === "pending") return Safe.html`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-700">Pending</span>`;
    if (s === "expired") return Safe.html`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-error-container text-error">Expired</span>`;
    return Safe.html`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container text-on-surface-variant">${status || "Unknown"}</span>`;
  }

  // --- Build token/chain maps ---

  function buildMaps(data) {
    chainMap = {};
    tokenMap = {};
    (data.chains || []).forEach(function(c) { chainMap[c.chainId] = c; });
    (data.tokens || []).forEach(function(t) { tokenMap[tokenKey(t.chainId, t.address)] = t; });
  }

  // --- Filter deposits to last hour ---

  function lastHourDeposits(deposits) {
    const cutoff = Date.now() - 3600000;
    return deposits.filter(function(d) {
      return new Date(d.depositBlockTimestamp).getTime() >= cutoff;
    });
  }

  // --- Render Stats ---

  function renderStats(deposits) {
    const recent = lastHourDeposits(deposits);
    let totalVol = 0;
    let totalTime = 0;
    let timeCount = 0;
    const activeChains = new Set();

    recent.forEach(function(d) {
      totalVol += depositUsdVolume(d);
      activeChains.add(d.originChainId);
      activeChains.add(d.destinationChainId);
      const bt = bridgeTime(d);
      if (bt !== null) { totalTime += bt; timeCount++; }
    });

    document.getElementById("stat-volume").textContent = fmtUsd(totalVol);
    document.getElementById("stat-txns").textContent = fmtNum(recent.length);
    document.getElementById("stat-time").textContent = timeCount > 0 ? fmtSecs(totalTime / timeCount) : "--";
    document.getElementById("stat-chains").textContent = activeChains.size.toString();
  }

  // --- Render Destination Chains Leaderboard ---

  function renderDestChains(deposits) {
    const agg = {};
    deposits.forEach(function(d) {
      const id = d.destinationChainId;
      if (!agg[id]) agg[id] = { vol: 0, count: 0, totalTime: 0, timeCount: 0 };
      agg[id].vol += depositUsdVolume(d);
      agg[id].count++;
      const bt = bridgeTime(d);
      if (bt !== null) { agg[id].totalTime += bt; agg[id].timeCount++; }
    });

    const sorted = Object.keys(agg).sort(function(a, b) { return agg[b].vol - agg[a].vol; }).slice(0, 8);
    const container = document.getElementById("dest-chains");

    if (sorted.length === 0) {
      container.innerHTML = '<div class="p-5 text-center text-sm text-on-surface-variant">No data available</div>';
      return;
    }

    Safe.setHTML(container, sorted.map(function(id, i) {
      const chain = chainMap[id] || { name: "Chain " + id };
      const d = agg[id];
      const avgTime = d.timeCount > 0 ? fmtSecs(d.totalTime / d.timeCount) : "--";
      return Safe.html`<div class="flex items-center gap-3 px-5 py-3">
        <span class="text-xs font-bold text-on-surface-variant w-4">${i + 1}</span>
        <img src="${Safe.url(chainIcon(chain))}" alt="" class="w-6 h-6 rounded-full bg-surface-container flex-shrink-0" data-img-fallback />
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold truncate">${chain.name || "Unknown"}</div>
          <div class="text-[10px] text-on-surface-variant">${fmtNum(d.count)} txns · avg ${avgTime}</div>
        </div>
        <div class="text-sm font-bold text-right">${fmtUsd(d.vol)}</div>
      </div>`;
    }));
  }

  // --- Render Top Routes ---

  function renderRoutes(deposits) {
    const agg = {};
    deposits.forEach(function(d) {
      const key = d.originChainId + "->" + d.destinationChainId;
      if (!agg[key]) agg[key] = { origin: d.originChainId, dest: d.destinationChainId, vol: 0, count: 0 };
      agg[key].vol += depositUsdVolume(d);
      agg[key].count++;
    });

    const sorted = Object.keys(agg).sort(function(a, b) { return agg[b].vol - agg[a].vol; }).slice(0, 8);
    const container = document.getElementById("top-routes");

    if (sorted.length === 0) {
      container.innerHTML = '<div class="p-5 text-center text-sm text-on-surface-variant">No data available</div>';
      return;
    }

    Safe.setHTML(container, sorted.map(function(key, i) {
      const r = agg[key];
      const oc = chainMap[r.origin] || { name: "Chain " + r.origin };
      const dc = chainMap[r.dest] || { name: "Chain " + r.dest };
      return Safe.html`<div class="flex items-center gap-3 px-5 py-3">
        <span class="text-xs font-bold text-on-surface-variant w-4">${i + 1}</span>
        <div class="flex items-center gap-1 flex-shrink-0">
          <img src="${Safe.url(chainIcon(oc))}" alt="" class="w-5 h-5 rounded-full bg-surface-container" data-img-fallback />
          <span class="material-symbols-outlined text-outline-variant text-xs">arrow_forward</span>
          <img src="${Safe.url(chainIcon(dc))}" alt="" class="w-5 h-5 rounded-full bg-surface-container" data-img-fallback />
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold truncate">${oc.name || "?"} → ${dc.name || "?"}</div>
          <div class="text-[10px] text-on-surface-variant">${fmtNum(r.count)} txns</div>
        </div>
        <div class="text-sm font-bold text-right">${fmtUsd(r.vol)}</div>
      </div>`;
    }));
  }

  // --- Render Top Tokens ---

  function renderTokens(deposits) {
    const agg = {};
    deposits.forEach(function(d) {
      const tk = tokenMap[tokenKey(d.originChainId, d.inputToken)];
      if (!tk) return;
      const sym = tk.symbol || "???";
      if (!agg[sym]) agg[sym] = { symbol: sym, token: tk, vol: 0, count: 0 };
      agg[sym].vol += depositUsdVolume(d);
      agg[sym].count++;
    });

    const sorted = Object.keys(agg).sort(function(a, b) { return agg[b].vol - agg[a].vol; }).slice(0, 8);
    const container = document.getElementById("top-tokens");

    if (sorted.length === 0) {
      container.innerHTML = '<div class="p-5 text-center text-sm text-on-surface-variant">No data available</div>';
      return;
    }

    Safe.setHTML(container, sorted.map(function(sym, i) {
      const t = agg[sym];
      const logoSrc = tokenIcon(t.token);
      const imgTag = logoSrc
        ? Safe.html`<img src="${Safe.url(logoSrc)}" alt="" class="w-6 h-6 rounded-full bg-surface-container flex-shrink-0" data-img-fallback />`
        : Safe.html`<div class="w-6 h-6 rounded-full bg-surface-container flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-on-surface-variant">${sym.charAt(0)}</div>`;
      return Safe.html`<div class="flex items-center gap-3 px-5 py-3">
        <span class="text-xs font-bold text-on-surface-variant w-4">${i + 1}</span>
        ${imgTag}
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold">${sym}</div>
          <div class="text-[10px] text-on-surface-variant">${fmtNum(t.count)} txns</div>
        </div>
        <div class="text-sm font-bold text-right">${fmtUsd(t.vol)}</div>
      </div>`;
    }));
  }

  // --- Render Recent Transactions ---

  function renderRecent(deposits) {
    const sorted = deposits.slice().sort(function(a, b) {
      return new Date(b.depositBlockTimestamp) - new Date(a.depositBlockTimestamp);
    }).slice(0, 10);

    const container = document.getElementById("recent-txns");

    if (sorted.length === 0) {
      container.innerHTML = '<div class="p-5 text-center text-sm text-on-surface-variant">No transactions yet</div>';
      return;
    }

    Safe.setHTML(container, sorted.map(function(d) {
      const oc = chainMap[d.originChainId] || { name: "?" };
      const dc = chainMap[d.destinationChainId] || { name: "?" };
      const tk = tokenMap[tokenKey(d.originChainId, d.inputToken)];
      const sym = tk ? tk.symbol : "???";
      const decimals = tk ? tk.decimals : 18;
      let amount;
      try { amount = (Number(BigInt(d.inputAmount)) / Math.pow(10, decimals)); } catch { amount = 0; }
      const amtStr = amount >= 1000 ? fmtNum(Math.floor(amount)) : amount.toFixed(amount < 1 ? 4 : 2);
      const bt = bridgeTime(d);
      const btStr = bt !== null ? fmtSecs(bt) : "--";
      const ago = timeAgo(d.depositBlockTimestamp);

      return Safe.html`<div class="flex items-center gap-3 px-5 py-3">
        <div class="flex flex-col items-center flex-shrink-0 w-10">
          <span class="text-[10px] text-on-surface-variant">${ago}</span>
        </div>
        <div class="flex items-center gap-1 flex-shrink-0">
          <img src="${Safe.url(chainIcon(oc))}" alt="" class="w-4 h-4 rounded-full bg-surface-container" data-img-fallback />
          <span class="material-symbols-outlined text-outline-variant text-[10px]">arrow_forward</span>
          <img src="${Safe.url(chainIcon(dc))}" alt="" class="w-4 h-4 rounded-full bg-surface-container" data-img-fallback />
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-xs font-semibold truncate">${amtStr} ${sym}</div>
          <div class="text-[10px] text-on-surface-variant">${oc.name || "?"} → ${dc.name || "?"}</div>
        </div>
        <div class="flex flex-col items-end gap-0.5 flex-shrink-0">
          ${statusBadge(d.status)}
          <span class="text-[10px] text-on-surface-variant">${btStr}</span>
        </div>
      </div>`;
    }));
  }

  // --- Fetch and render all ---

  async function fetchAndRender() {
    try {
      const res = await fetch("/api/radar");
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      lsSet('sage_radar_cache', data, 2 * 60 * 1000);

      buildMaps(data);
      const deposits = data.deposits || [];

      renderStats(deposits);
      renderDestChains(deposits);
      renderRoutes(deposits);
      renderTokens(deposits);
      renderRecent(deposits);
      const note = document.getElementById('initial-load-note');
      if (note) note.remove();
    } catch (err) {
      console.error("Radar fetch error:", err);
    }
  }

  // --- Countdown timer ---

  function startCountdown() {
    countdown = 30;
    clearInterval(countdownInterval);
    countdownInterval = setInterval(function() {
      countdown--;
      var el = document.getElementById("countdown");
      if (el) el.textContent = countdown + "s";
      if (countdown <= 0) {
        countdown = 30;
        fetchAndRender();
      }
    }, 1000);
  }

  // --- Init ---

  // Show cached data instantly, fetch fresh in background
  const cachedRadar = lsGet('sage_radar_cache', 2 * 60 * 1000);
  if (cachedRadar && cachedRadar.deposits && cachedRadar.deposits.length > 0) {
    buildMaps(cachedRadar);
    const d = cachedRadar.deposits;
    renderStats(d); renderDestChains(d); renderRoutes(d); renderTokens(d); renderRecent(d);
  }
  fetchAndRender();
  startCountdown();

})();

// ── Event delegation ──────────────────────────────────────────────────────────
document.addEventListener('click', function(e) {
  var el = e.target.closest('[data-action]');
  if (!el) return;
  // radar.html has no page-specific click actions beyond shared wallet/theme
});
