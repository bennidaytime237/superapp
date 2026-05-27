// Lightweight self-contained canvas confetti for bridge success.
// Exposes window.fireConfetti(opts?) — opts: { particleCount }
(function () {
  // Sage-leaf palette — varying shades of green.
  const COLORS = [
    '#4b7a3a', // deep sage
    '#6b8e4e', // sage
    '#86a96a', // light sage
    '#a3b886', // pale sage
    '#3f6b2f', // forest
    '#5a8a3e', // olive-green
    '#7fa86a', // soft green
    '#c2d1a3', // dusty mint
  ];

  function spawnLeaves(particles, count, canvasWidth, dpr) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvasWidth,
        y: -Math.random() * canvasWidth * 0.4 - 20 * dpr,
        vx: (Math.random() - 0.5) * 0.6 * dpr,
        vy: (0.6 + Math.random() * 0.9) * dpr, // slow descent
        size: (14 + Math.random() * 14) * dpr,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.04, // gentle spin
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 0.015 + Math.random() * 0.02,
        swayAmp: (0.6 + Math.random() * 1.2) * dpr,
        life: 1,
      });
    }
  }

  // Draw a sage-leaf silhouette: pointed ellipse with a central vein.
  function drawLeaf(ctx, size, color) {
    const w = size * 0.45;
    const h = size;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.5);
    ctx.bezierCurveTo(w, -h * 0.3, w, h * 0.3, 0, h * 0.5);
    ctx.bezierCurveTo(-w, h * 0.3, -w, -h * 0.3, 0, -h * 0.5);
    ctx.closePath();
    ctx.fill();

    // Central vein for a sage-leaf feel.
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = Math.max(1, size * 0.04);
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.45);
    ctx.lineTo(0, h * 0.45);
    ctx.stroke();
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

    // Leaves fall from above across the full width.
    spawnLeaves(particles, particleCount, canvas.width, dpr);
    // A gentle second flurry for fullness.
    setTimeout(() => {
      spawnLeaves(particles, Math.floor(particleCount * 0.6), canvas.width, dpr);
    }, 400);

    const gravity = 0.015 * dpr; // very light — leaves drift, not drop
    const maxFallSpeed = 2.2 * dpr;

    function frame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = 0;
      for (const p of particles) {
        if (p.life <= 0) continue;
        p.vy = Math.min(p.vy + gravity, maxFallSpeed);
        p.swayPhase += p.swaySpeed;
        const sway = Math.cos(p.swayPhase) * p.swayAmp;
        p.x += p.vx + sway;
        p.y += p.vy;
        p.rot += p.vr + Math.cos(p.swayPhase) * 0.01;
        if (p.y > canvas.height + 40) { p.life = 0; continue; }
        alive++;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
        drawLeaf(ctx, p.size, p.color);
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
    }, 15000);
  }

  window.fireConfetti = fireConfetti;
})();
