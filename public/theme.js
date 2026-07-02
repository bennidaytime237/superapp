// ─── Sage Theme Toggle ────────────────────────────────────────────────────────
// Note: FOUC prevention is handled by the inline <script> in each page's <head>

function _applyThemeClass(cls) {
  // Toggle only the theme classes — a bare className assignment would wipe any
  // other class ever added to <html>.
  const html = document.documentElement;
  html.classList.remove('light', 'dark');
  html.classList.add(cls);
}

function setTheme(mode) {
  if (mode === 'system') {
    localStorage.removeItem('sage-theme');
    _applyThemeClass(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  } else {
    _applyThemeClass(mode);
    localStorage.setItem('sage-theme', mode);
  }
  _updateThemeIcons();
  _updateThemePills();
}

function toggleTheme() {
  setTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark');
}

function _updateThemeIcons() {
  const isDark = document.documentElement.classList.contains('dark');
  document.querySelectorAll('.theme-toggle-icon').forEach(el => {
    el.textContent = isDark ? 'light_mode' : 'dark_mode';
  });
}

function _updateThemePills() {
  const saved = localStorage.getItem('sage-theme');
  const active = saved || 'system';
  document.querySelectorAll('[data-theme]').forEach(btn => {
    const isActive = btn.dataset.theme === active;
    btn.classList.toggle('bg-surface-container-lowest', isActive);
    btn.classList.toggle('text-on-surface', isActive);
    btn.classList.toggle('shadow-sm', isActive);
    btn.classList.toggle('text-on-surface-variant', !isActive);
  });
}

// In system mode, follow OS theme changes live. (Older Safari exposes only
// addListener on MediaQueryList.)
(function () {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onChange = e => {
    if (!localStorage.getItem('sage-theme')) {
      _applyThemeClass(e.matches ? 'dark' : 'light');
      _updateThemeIcons();
    }
  };
  if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
  else if (typeof mq.addListener === 'function') mq.addListener(onChange);
})();

document.addEventListener('DOMContentLoaded', () => {
  _updateThemeIcons();
  _updateThemePills();
});

// ── Click delegation ─────────────────────────────────────────────────────────
document.addEventListener('click', function(e) {
  if (e.target.closest('[data-action="toggle-theme"]')) toggleTheme();
  const themeBtn = e.target.closest('[data-theme]');
  if (themeBtn) setTheme(themeBtn.dataset.theme);
});
