(function () {
  const STORAGE_KEY = 'sage_disclaimer_accepted';

  if (localStorage.getItem(STORAGE_KEY) === '1') return;

  function inject() {
    const style = document.createElement('style');
    style.textContent = `
      #disclaimer-overlay {
        position: fixed; inset: 0; z-index: 9999;
        display: flex; align-items: center; justify-content: center; padding: 1rem;
        font-family: 'Outfit', sans-serif;
      }
      #disclaimer-backdrop {
        position: absolute; inset: 0;
        background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
      }
      #disclaimer-panel {
        position: relative; width: 100%; max-width: 32rem;
        background: var(--surface-container-lowest, #fff);
        border-radius: 1.5rem;
        box-shadow: 0 25px 60px rgba(0,0,0,0.2);
        padding: 2rem; display: flex; flex-direction: column; gap: 1.25rem;
      }
      #disclaimer-panel .d-header { display: flex; align-items: flex-start; gap: 1rem; }
      #disclaimer-panel .d-icon-wrap {
        width: 3rem; height: 3rem; border-radius: 0.75rem; flex-shrink: 0;
        background: rgba(var(--error-rgb, 186,26,26), 0.1);
        display: flex; align-items: center; justify-content: center;
      }
      #disclaimer-panel h2 {
        font-size: 1.2rem; font-weight: 900; margin: 0;
        color: var(--on-surface, #1a1c1b);
      }
      #disclaimer-panel .d-subtitle {
        font-size: 0.8rem; color: var(--on-surface-variant, #3f4945); margin-top: 0.15rem;
      }
      #disclaimer-panel .d-cards { display: flex; flex-direction: column; gap: 0.6rem; }
      #disclaimer-panel .d-card {
        display: flex; align-items: flex-start; gap: 0.75rem;
        padding: 0.75rem; border-radius: 0.875rem;
        background: var(--surface-container, #ecf2ef);
        font-size: 0.825rem; line-height: 1.5;
        color: var(--on-surface-variant, #3f4945);
      }
      #disclaimer-panel .d-card strong { color: var(--on-surface, #1a1c1b); }
      #disclaimer-panel .d-agree {
        display: flex; align-items: flex-start; gap: 0.75rem;
        cursor: pointer; font-size: 0.85rem;
        color: var(--on-surface, #1a1c1b);
      }
      #disclaimer-checkbox {
        margin-top: 0.15rem; width: 1.1rem; height: 1.1rem; flex-shrink: 0;
        cursor: pointer; accent-color: var(--primary, #006a60);
      }
      #disclaimer-enter-btn {
        width: 100%; padding: 0.875rem; border-radius: 9999px; border: none;
        background: var(--primary, #006a60); color: var(--on-primary, #fff);
        font-family: inherit; font-weight: 700; font-size: 0.9rem;
        cursor: pointer; transition: opacity 0.15s, transform 0.1s;
      }
      #disclaimer-enter-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      #disclaimer-enter-btn:not(:disabled):hover { opacity: 0.88; }
      #disclaimer-enter-btn:not(:disabled):active { transform: scale(0.98); }
    `;
    document.head.appendChild(style);

    const el = document.createElement('div');
    el.id = 'disclaimer-overlay';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'disclaimer-title');
    el.innerHTML = `
      <div id="disclaimer-backdrop"></div>
      <div id="disclaimer-panel">
        <div class="d-header">
          <div class="d-icon-wrap">
            <span class="material-symbols-outlined" style="color:var(--error,#ba1a1a);font-size:26px;font-variation-settings:'FILL' 1,'wght' 500,'GRAD' 0,'opsz' 24">warning</span>
          </div>
          <div>
            <h2 id="disclaimer-title">Experimental Platform</h2>
            <p class="d-subtitle">Please read before continuing</p>
          </div>
        </div>

        <div class="d-cards">
          <div class="d-card">
            <span class="material-symbols-outlined" style="color:var(--error,#ba1a1a);font-size:18px;flex-shrink:0;margin-top:1px;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 20">trending_down</span>
            <span><strong>Capital at risk.</strong> All onchain activity involves real assets. You may lose some or all of the funds you transact with.</span>
          </div>
          <div class="d-card">
            <span class="material-symbols-outlined" style="color:var(--tertiary,#4a6364);font-size:18px;flex-shrink:0;margin-top:1px;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 20">science</span>
            <span><strong>Experimental software.</strong> Sage is under active development. Bugs, errors, and unexpected behaviour may occur at any time.</span>
          </div>
          <div class="d-card">
            <span class="material-symbols-outlined" style="color:var(--secondary,#4a6360);font-size:18px;flex-shrink:0;margin-top:1px;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 20">person</span>
            <span><strong>Your responsibility.</strong> Nothing here is financial advice. You are solely responsible for verifying all transaction details before signing.</span>
          </div>
        </div>

        <label class="d-agree">
          <input id="disclaimer-checkbox" type="checkbox"/>
          <span>I understand this platform is experimental, that my capital is at risk, and that I am solely responsible for my actions.</span>
        </label>

        <button id="disclaimer-enter-btn" disabled>Enter Sage</button>
      </div>
    `;

    document.body.appendChild(el);

    el.querySelector('#disclaimer-checkbox').addEventListener('change', function () {
      document.getElementById('disclaimer-enter-btn').disabled = !this.checked;
    });

    el.querySelector('#disclaimer-enter-btn').addEventListener('click', function () {
      localStorage.setItem(STORAGE_KEY, '1');
      document.getElementById('disclaimer-overlay').remove();
      style.remove();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
