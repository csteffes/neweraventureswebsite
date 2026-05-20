/* ── Tunable constants ── */
const LINE_COUNT     = 40;    // number of flowing lines (was 60)
const WAVE_SPEED     = 0.003; // phase shift per frame (lower = slower)
const BASE_AMPLITUDE = 80;    // wave height in pixels
const FREQUENCY      = 0.004; // spatial frequency (waves per pixel)
const LINE_OPACITY   = 0.12;  // base stroke opacity
const LINE_WIDTH     = 0.8;   // stroke width in pixels
const TARGET_FPS     = 30;    // throttle render rate (was 60, halves GPU work)

/* ── Hardware capability check ── */
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const lowEnd = (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4)
            || (navigator.deviceMemory && navigator.deviceMemory < 4);

/* If user prefers reduced motion OR device is low-end → skip entirely */
if (!reducedMotion && !lowEnd) {

  /* ── Setup canvas ── */
  const canvas = document.createElement('canvas');
  canvas.id = 'wave-bg';
  Object.assign(canvas.style, {
    position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
    zIndex: '-1', pointerEvents: 'none', display: 'block'
  });
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d', { alpha: true });

  /* ── Responsive config ── */
  let lineCount = LINE_COUNT;
  let xStep = 5;

  function resize() {
    /* Cap DPR at 1 — wave is a soft background, no benefit to high-res. */
    /* This is the single biggest perf win on Retina/HiDPI displays.        */
    const dpr = 1;
    canvas.width  = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (window.innerWidth < 768) { lineCount = 22; xStep = 8; }
    else { lineCount = LINE_COUNT; xStep = 5; }
  }
  window.addEventListener('resize', resize);
  resize();

  /* ── Render loop — throttled to TARGET_FPS, time-based phase ── */
  const startTime = performance.now();
  const frameInterval = 1000 / TARGET_FPS;
  let lastFrame = 0;

  function draw(now) {
    requestAnimationFrame(draw);
    if (now - lastFrame < frameInterval) return;
    lastFrame = now;

    const phase = ((now - startTime) / 1000) * WAVE_SPEED * 60;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const centerY = H * 0.5;
    const spread = H * 0.5;

    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = LINE_WIDTH;

    for (let i = 0; i < lineCount; i++) {
      const t = i / (lineCount - 1);
      const baseY = centerY - spread / 2 + t * spread;

      ctx.beginPath();
      for (let x = 0; x <= W; x += xStep) {
        /* Amplitude modulation — single sin instead of two */
        const ampMod = 0.5 + 0.5 * Math.sin(x * 0.0008 + phase * 0.15);
        const amp = BASE_AMPLITUDE * (ampMod + 0.3);

        /* Shared wave — 3 layers (was 5) for organic feel */
        const raw = Math.sin(x * FREQUENCY + phase)
                  + Math.sin(x * FREQUENCY * 0.5 + phase * 0.7) * 0.5
                  + Math.sin(x * FREQUENCY * 1.7 + phase * 1.3) * 0.3;
        const shared = raw / 1.8;

        /* Per-line drift — single sin instead of two */
        const drift = Math.sin(x * FREQUENCY * 0.6 + i * 0.5 + phase * 0.4) * 8;

        const y = baseY + shared * amp + drift;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      const opacity = LINE_OPACITY * (0.7 + 0.3 * Math.sin(i * 0.4 + phase * 0.1));
      ctx.strokeStyle = `rgba(255, 255, 255, ${opacity.toFixed(3)})`;
      ctx.stroke();
    }
  }

  requestAnimationFrame(draw);
}
