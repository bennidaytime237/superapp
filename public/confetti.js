// Lightweight self-contained canvas confetti for bridge success.
// Exposes window.fireConfetti(opts?) — opts: { particleCount, originY }
(function () {
  function readThemeColors() {
    const s = getComputedStyle(document.documentElement);
    const pick = (name, fallback) => (s.getPropertyValue(name).trim() || fallback);
    return [
      pick('--primary', '#667b68'),
      pick('--primary-fixed-dim', '#a3b899'),
      pick('--primary-container', '#dde6d5'),
      '#f4c95d',
      '#e87a5d',
      '#ffffff',
    ];
  }

  function fireConfetti(opts) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const particleCount = (opts && opts.particleCount) || 140;
    const originY = (opts && opts.originY) != null ? opts.originY : 0.45;
    const colors = readThemeColors();

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:60;';
    document.body.appendChild(canvas);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };
    resize();
    window.addEventListener('resize', resize);

    const ctx = canvas.getContext('2d');
    const cx = canvas.width / 2;
    const cy = canvas.height * originY;

    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.3;
      const speed = (8 + Math.random() * 9) * dpr;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed * (0.6 + Math.random() * 0.8),
        vy: Math.sin(angle) * speed * (0.6 + Math.random() * 0.8) - 4 * dpr,
        size: (5 + Math.random() * 6) * dpr,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.3,
        shape: Math.random() < 0.4 ? 'circle' : 'rect',
        life: 1,
      });
    }

    const gravity = 0.35 * dpr;
    const drag = 0.985;
    let rafId;

    function frame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = 0;
      for (const p of particles) {
        if (p.life <= 0) continue;
        p.vy += gravity;
        p.vx *= drag;
        p.vy *= drag;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y > canvas.height + 40) { p.life = 0; continue; }
        if (p.y > canvas.height * 0.85) p.life -= 0.02;
        alive++;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
        ctx.fillStyle = p.color;
        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size * 0.5, -p.size * 0.25, p.size, p.size * 0.5);
        }
        ctx.restore();
      }
      if (alive > 0) {
        rafId = requestAnimationFrame(frame);
      } else {
        window.removeEventListener('resize', resize);
        canvas.remove();
      }
    }
    rafId = requestAnimationFrame(frame);
  }

  window.fireConfetti = fireConfetti;
})();
