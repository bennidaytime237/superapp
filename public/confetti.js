// Lightweight self-contained canvas confetti for bridge success.
// Exposes window.fireConfetti(opts?) — opts: { particleCount, origin: {x, y} (CSS px) }
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

  // Bloom outward from a point — biased upward, like a fountain bursting from the top.
  function spawnBloom(particles, originX, originY, count, dpr) {
    for (let i = 0; i < count; i++) {
      // Angles from -170° to -10° → upper hemisphere, full left-to-right spread.
      const angle = (-170 + Math.random() * 160) * Math.PI / 180;
      const speed = (10 + Math.random() * 12) * dpr; // fires out quickly
      particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: (14 + Math.random() * 14) * dpr,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.06,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 0.03 + Math.random() * 0.03,
        swayAmp: (0.15 + Math.random() * 0.35) * dpr,
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

    // Origin in canvas (device) pixels — defaults to center if not provided.
    const originCss = (opts && opts.origin) || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const originX = originCss.x * dpr;
    const originY = originCss.y * dpr;

    spawnBloom(particles, originX, originY, particleCount, dpr);
    // A small follow-up pop for fullness.
    setTimeout(() => {
      spawnBloom(particles, originX, originY, Math.floor(particleCount * 0.5), dpr);
    }, 120);

    // Strong air drag on the initial burst, then a gentle, steady fall to the bottom of the page.
    const gravity = 0.18 * dpr;
    const burstDrag = 0.92; // bleed off launch speed quickly
    const maxFallSpeed = 3.5 * dpr;

    function frame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = 0;
      for (const p of particles) {
        if (p.life <= 0) continue;
        // Drag bleeds horizontal momentum; gravity always pulls down so the
        // upward burst eventually reverses into a slow fall.
        p.vx *= burstDrag;
        p.vy = Math.min(p.vy + gravity, maxFallSpeed);
        p.swayPhase += p.swaySpeed;
        const sway = Math.cos(p.swayPhase) * p.swayAmp;
        p.x += p.vx + sway;
        p.y += p.vy;
        p.rot += p.vr + Math.cos(p.swayPhase) * 0.012;
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

    // Hard timeout safety net.
    setTimeout(() => {
      window.removeEventListener('resize', resize);
      if (canvas.isConnected) canvas.remove();
    }, 15000);
  }

  window.fireConfetti = fireConfetti;
})();
