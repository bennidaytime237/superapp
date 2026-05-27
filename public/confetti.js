// Lightweight self-contained canvas confetti for bridge success.
// Exposes window.fireConfetti(opts?) — opts: { particleCount }
(function () {
  // Vibrant celebratory palette — chosen for high contrast in both light and dark themes.
  const COLORS = [
    '#f43f5e', // rose
    '#f59e0b', // amber
    '#eab308', // gold
    '#22c55e', // green
    '#06b6d4', // cyan
    '#3b82f6', // blue
    '#a855f7', // purple
    '#ec4899', // pink
  ];

  function spawnBurst(particles, originX, originY, angleDeg, spreadDeg, count, dpr) {
    const angle = (angleDeg * Math.PI) / 180;
    const spread = (spreadDeg * Math.PI) / 180;
    for (let i = 0; i < count; i++) {
      const a = angle + (Math.random() - 0.5) * spread;
      const speed = (12 + Math.random() * 14) * dpr;
      particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        size: (6 + Math.random() * 8) * dpr,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.4,
        shape: Math.random() < 0.5 ? 'rect' : 'circle',
        life: 1,
      });
    }
  }

  function fireConfetti(opts) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const particleCount = (opts && opts.particleCount) || 90;

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483647;';
    document.body.appendChild(canvas);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };
    resize();
    window.addEventListener('resize', resize);

    const ctx = canvas.getContext('2d');
    const particles = [];

    // Two side cannons firing inward and upward — classic confetti shape.
    const leftX = canvas.width * 0.08;
    const rightX = canvas.width * 0.92;
    const baseY = canvas.height * 0.78;
    spawnBurst(particles, leftX, baseY, -60, 50, particleCount, dpr);   // up-right
    spawnBurst(particles, rightX, baseY, -120, 50, particleCount, dpr); // up-left

    // Small delayed second pop from center for emphasis.
    setTimeout(() => {
      spawnBurst(particles, canvas.width / 2, canvas.height * 0.55, -90, 140, Math.floor(particleCount * 0.6), dpr);
    }, 180);

    const gravity = 0.4 * dpr;
    const drag = 0.99;

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
        if (p.y > canvas.height + 60) { p.life = 0; continue; }
        if (p.y > canvas.height * 0.9) p.life -= 0.015;
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
          ctx.fillRect(-p.size * 0.5, -p.size * 0.3, p.size, p.size * 0.6);
        }
        ctx.restore();
      }
      if (alive > 0) {
        requestAnimationFrame(frame);
      } else {
        window.removeEventListener('resize', resize);
        canvas.remove();
      }
    }
    requestAnimationFrame(frame);

    // Hard timeout safety net in case something keeps the canvas alive.
    setTimeout(() => {
      window.removeEventListener('resize', resize);
      if (canvas.isConnected) canvas.remove();
    }, 8000);
  }

  window.fireConfetti = fireConfetti;
})();
