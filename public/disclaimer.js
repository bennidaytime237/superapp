(function () {
  const STORAGE_KEY = 'sage_disclaimer_accepted';

  if (localStorage.getItem(STORAGE_KEY) === '1') return;

  const html = `
<div id="disclaimer-overlay" role="dialog" aria-modal="true" aria-labelledby="disclaimer-title"
     class="fixed inset-0 z-[100] flex items-center justify-center p-4">
  <!-- Backdrop — non-dismissible -->
  <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
  <!-- Panel -->
  <div class="relative w-full max-w-lg bg-surface-container-lowest rounded-3xl shadow-2xl p-8 flex flex-col gap-6">
    <!-- Header -->
    <div class="flex items-start gap-4">
      <div class="w-12 h-12 rounded-2xl bg-error/10 flex items-center justify-center flex-shrink-0">
        <span class="material-symbols-outlined text-error" style="font-size:28px;font-variation-settings:'FILL' 1,'wght' 500,'GRAD' 0,'opsz' 24">warning</span>
      </div>
      <div>
        <h2 id="disclaimer-title" class="text-xl font-black text-on-surface">Experimental Platform</h2>
        <p class="text-sm text-on-surface-variant mt-0.5">Please read before continuing</p>
      </div>
    </div>

    <!-- Body -->
    <div class="flex flex-col gap-3 text-sm text-on-surface-variant leading-relaxed">
      <div class="flex items-start gap-3 p-3 rounded-2xl bg-surface-container">
        <span class="material-symbols-outlined text-error mt-0.5 flex-shrink-0" style="font-size:18px;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 20">trending_down</span>
        <span><strong class="text-on-surface font-semibold">Capital at risk.</strong> All onchain activity involves real assets. You may lose some or all of the funds you transact with.</span>
      </div>
      <div class="flex items-start gap-3 p-3 rounded-2xl bg-surface-container">
        <span class="material-symbols-outlined text-tertiary mt-0.5 flex-shrink-0" style="font-size:18px;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 20">science</span>
        <span><strong class="text-on-surface font-semibold">Experimental software.</strong> Sage is under active development. Bugs, errors, and unexpected behaviour may occur at any time.</span>
      </div>
      <div class="flex items-start gap-3 p-3 rounded-2xl bg-surface-container">
        <span class="material-symbols-outlined text-secondary mt-0.5 flex-shrink-0" style="font-size:18px;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 20">person</span>
        <span><strong class="text-on-surface font-semibold">Your responsibility.</strong> Nothing here is financial advice. You are solely responsible for verifying all transaction details before signing.</span>
      </div>
    </div>

    <!-- Agree checkbox -->
    <label class="flex items-start gap-3 cursor-pointer select-none group">
      <input id="disclaimer-checkbox" type="checkbox" class="mt-0.5 w-5 h-5 rounded flex-shrink-0 accent-primary cursor-pointer"
             onchange="document.getElementById('disclaimer-enter-btn').disabled = !this.checked"/>
      <span class="text-sm text-on-surface">
        I understand this platform is experimental, that my capital is at risk, and that I am solely responsible for my actions.
      </span>
    </label>

    <!-- CTA -->
    <button id="disclaimer-enter-btn" disabled
            onclick="(function(){localStorage.setItem('sage_disclaimer_accepted','1');document.getElementById('disclaimer-overlay').remove();})()"
            class="w-full py-3.5 rounded-full bg-primary text-on-primary font-bold text-sm transition-all
                   disabled:opacity-40 disabled:cursor-not-allowed
                   enabled:hover:opacity-90 enabled:active:scale-[0.98]">
      Enter Sage
    </button>
  </div>
</div>`;

  // Inject once DOM is ready
  function inject() {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html.trim();
    document.body.appendChild(wrapper.firstElementChild);
  }

  if (document.body) {
    inject();
  } else {
    document.addEventListener('DOMContentLoaded', inject);
  }
})();
