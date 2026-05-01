// ─── Sage Theme Toggle ────────────────────────────────────────────────────────
// Note: FOUC prevention is handled by the inline <script> in each page's <head>

function toggleTheme() {
  const html = document.documentElement;
  const next = html.classList.contains('dark') ? 'light' : 'dark';
  html.className = next;
  localStorage.setItem('sage-theme', next);
  _updateThemeIcons();
}

function _updateThemeIcons() {
  const isDark = document.documentElement.classList.contains('dark');
  document.querySelectorAll('.theme-toggle-icon').forEach(el => {
    el.textContent = isDark ? 'light_mode' : 'dark_mode';
  });
}

document.addEventListener('DOMContentLoaded', _updateThemeIcons);

// ── Click delegation for theme toggle ───────────────────────────────────────
document.addEventListener('click', function(e) {
  if (e.target.closest('[data-action="toggle-theme"]')) toggleTheme();
});
