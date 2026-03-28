// cursor-fx.js — Magnetic orb cursor with rocket particle trail
// Pure Canvas 2D, no dependencies

(function () {
  // ── Tunable constants ──
  const ORB_RADIUS = 10;
  const ORB_OPACITY = 0.3;
  const GLOW_RADIUS = 30;
  const GLOW_OPACITY = 0.06;
  const LERP = 0.13;                // magnetic lag (lower = more floaty)
  const MAX_PARTICLES = 120;
  const EMIT_PER_FRAME = 3;         // particles emitted per frame while moving
  const PARTICLE_LIFE = 50;         // frames
  const PARTICLE_MIN_R = 0.8;
  const PARTICLE_MAX_R = 3.0;
  const TRAIL_SPREAD = 1.2;         // lateral scatter
  const DRIFT_DECAY = 0.96;         // velocity damping per frame
  const SPARKLE_CHANCE = 0.15;      // chance a particle "twinkles"

  // ── State ──
  let mx = -100, my = -100;         // actual mouse
  let ox = -100, oy = -100;         // orb position (lerped)
  let pvx = 0, pvy = 0;             // previous velocity (for trail direction)
  let particles = [];
  let raf;
  let canvas, ctx;
  let W, H;
  let hasMoved = false;
  let isTouch = false;

  // ── Detect touch devices — skip entirely ──
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    isTouch = true;
  }

  // ── Accessibility: respect reduced motion ──
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // ── Create canvas ──
  canvas = document.createElement('canvas');
  canvas.id = 'cursor-fx';
  canvas.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none;';
  document.body.appendChild(canvas);
  ctx = canvas.getContext('2d');

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  // ── Hide default cursor (except on interactive elements) ──
  if (!isTouch) {
    const style = document.createElement('style');
    style.textContent = `
      html, body, * { cursor: none !important; }
      a, button, input, select, textarea, [role="button"] { cursor: none !important; }
    `;
    document.head.appendChild(style);
  }

  // ── Mouse tracking ──
  document.addEventListener('mousemove', function (e) {
    mx = e.clientX;
    my = e.clientY;
    hasMoved = true;
  });

  document.addEventListener('mouseleave', function () {
    hasMoved = false;
  });

  document.addEventListener('mouseenter', function () {
    hasMoved = true;
  });

  // ── Particle class ──
  function Particle(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = PARTICLE_LIFE;
    this.maxLife = PARTICLE_LIFE;
    this.r = PARTICLE_MIN_R + Math.random() * (PARTICLE_MAX_R - PARTICLE_MIN_R);
    this.brightness = 180 + Math.floor(Math.random() * 75); // 180-255
    this.sparkle = Math.random() < SPARKLE_CHANCE;
    this.sparklePhase = Math.random() * Math.PI * 2;
  }

  // ── Emit particles ──
  function emit() {
    // Calculate movement velocity
    var vx = mx - ox;
    var vy = my - oy;
    var speed = Math.sqrt(vx * vx + vy * vy);

    if (speed < 1.5) return; // don't emit when nearly still

    // Normalize direction (opposite of movement = trail behind)
    var nx = -vx / speed;
    var ny = -vy / speed;

    // Emit rate scales with speed
    var count = Math.min(EMIT_PER_FRAME, Math.floor(speed * 0.4));

    for (var i = 0; i < count; i++) {
      if (particles.length >= MAX_PARTICLES) break;

      // Perpendicular vector for spread
      var px = -ny;
      var py = nx;
      var spread = (Math.random() - 0.5) * TRAIL_SPREAD;

      // Base velocity: opposite of movement + some spread + randomness
      var baseSpeed = 0.5 + Math.random() * 1.5;
      var pvxNew = nx * baseSpeed + px * spread + (Math.random() - 0.5) * 0.3;
      var pvyNew = ny * baseSpeed + py * spread + (Math.random() - 0.5) * 0.3;

      // Spawn slightly behind the orb
      var spawnX = ox + nx * (ORB_RADIUS * 0.3) + (Math.random() - 0.5) * 4;
      var spawnY = oy + ny * (ORB_RADIUS * 0.3) + (Math.random() - 0.5) * 4;

      particles.push(new Particle(spawnX, spawnY, pvxNew, pvyNew));
    }
  }

  // ── Render loop ──
  function frame() {
    raf = requestAnimationFrame(frame);
    ctx.clearRect(0, 0, W, H);

    if (!hasMoved && particles.length === 0) return;

    // Lerp orb toward mouse (magnetic feel)
    ox += (mx - ox) * LERP;
    oy += (my - oy) * LERP;

    // Emit new particles
    if (hasMoved) emit();

    // ── Draw particles ──
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.life--;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      // Update position
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= DRIFT_DECAY;
      p.vy *= DRIFT_DECAY;

      // Age ratio (1 = newborn, 0 = dead)
      var age = p.life / p.maxLife;

      // Fade: quick ramp up, long fade out
      var alpha = age < 0.9 ? age * 1.1 : 1.0;
      alpha = Math.min(alpha, 1.0);

      // Sparkle effect
      var sparkleBoost = 1.0;
      if (p.sparkle) {
        p.sparklePhase += 0.3;
        sparkleBoost = 0.6 + 0.4 * Math.abs(Math.sin(p.sparklePhase));
      }

      // Shrink as they age
      var radius = p.r * (0.3 + 0.7 * age);

      // Draw particle
      var finalAlpha = alpha * 0.55 * sparkleBoost;
      var b = p.brightness;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + b + ',' + b + ',' + b + ',' + finalAlpha + ')';
      ctx.fill();

      // Tiny glow on larger/brighter particles
      if (radius > 1.8 && finalAlpha > 0.25) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,' + (finalAlpha * 0.08) + ')';
        ctx.fill();
      }
    }

    // ── Draw orb ──
    if (hasMoved) {
      // Outer glow
      var grd = ctx.createRadialGradient(ox, oy, ORB_RADIUS * 0.3, ox, oy, GLOW_RADIUS);
      grd.addColorStop(0, 'rgba(255,255,255,' + GLOW_OPACITY * 1.5 + ')');
      grd.addColorStop(0.5, 'rgba(255,255,255,' + GLOW_OPACITY * 0.5 + ')');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.arc(ox, oy, GLOW_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      // Inner orb — soft radial gradient
      var orbGrd = ctx.createRadialGradient(ox, oy, 0, ox, oy, ORB_RADIUS);
      orbGrd.addColorStop(0, 'rgba(255,255,255,' + ORB_OPACITY * 1.2 + ')');
      orbGrd.addColorStop(0.4, 'rgba(255,255,255,' + ORB_OPACITY * 0.8 + ')');
      orbGrd.addColorStop(0.7, 'rgba(230,235,245,' + ORB_OPACITY * 0.4 + ')');
      orbGrd.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.arc(ox, oy, ORB_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = orbGrd;
      ctx.fill();

      // Bright core dot
      ctx.beginPath();
      ctx.arc(ox, oy, 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,' + ORB_OPACITY * 1.5 + ')';
      ctx.fill();
    }
  }

  // ── Start ──
  if (!isTouch) {
    raf = requestAnimationFrame(frame);
  }
})();
