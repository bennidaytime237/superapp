// ─── Sage Theme Toggle ────────────────────────────────────────────────────────
// Note: FOUC prevention is handled by the inline <script> in each page's <head>

function setTheme(mode) {
  const html = document.documentElement;
  if (mode === 'system') {
    localStorage.removeItem('sage-theme');
    html.className = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } else {
    html.className = mode;
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
