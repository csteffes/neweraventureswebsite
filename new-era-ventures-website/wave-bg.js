/* ── Tunable constants ── */
const LINE_COUNT     = 60;    // number of flowing lines
const WAVE_SPEED     = 0.003; // phase shift per frame (lower = slower)
const BASE_AMPLITUDE = 80;    // wave height in pixels
const FREQUENCY      = 0.004; // spatial frequency (waves per pixel)
const LINE_OPACITY   = 0.12;  // base stroke opacity
const LINE_WIDTH     = 0.8;   // stroke width in pixels
const GLOW_BLUR      = 3;     // shadowBlur radius for glow effect (0 to disable)
const GLOW_COLOR     = 'rgba(255, 255, 255, 0.15)'; // glow color

/* ── Setup canvas ── */
const canvas = document.createElement('canvas');
canvas.id = 'wave-bg';
Object.assign(canvas.style, {
  position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
  zIndex: '-1', pointerEvents: 'none', display: 'block'
});
document.body.prepend(canvas);
const ctx = canvas.getContext('2d');

/* ── Responsive config ── */
let lineCount = LINE_COUNT;
let xStep = 3;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (window.innerWidth < 768) { lineCount = 30; xStep = 6; }
  else { lineCount = LINE_COUNT; xStep = 3; }
}
window.addEventListener('resize', resize);
resize();

/* ── Reduced motion ── */
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const speedMult = reducedMotion ? 0.02 : 1.0;

/* ── Render loop (time-based so animation never stalls) ── */
const startTime = performance.now();

function draw() {
  const phase = ((performance.now() - startTime) / 1000) * WAVE_SPEED * 60 * speedMult;
  const W = window.innerWidth;
  const H = window.innerHeight;
  const centerY = H * 0.5;
  const spread = H * 0.5;

  ctx.clearRect(0, 0, W, H);
  ctx.lineWidth = LINE_WIDTH;
  ctx.shadowBlur = GLOW_BLUR;
  ctx.shadowColor = GLOW_COLOR;

  for (let i = 0; i < lineCount; i++) {
    const t = i / (lineCount - 1);
    const baseY = centerY - spread / 2 + t * spread;

    ctx.beginPath();
    for (let x = 0; x <= W; x += xStep) {
      /* Amplitude modulation — smooth base + sporadic bursts */
      const ampBase = Math.sin(x * 0.0008 + phase * 0.15) * 0.5 + 0.5;
      const ampBurst = Math.pow(Math.max(0, Math.sin(x * 0.0025 + phase * 0.08)), 4);
      const amp = BASE_AMPLITUDE * (ampBase + ampBurst * 1.2);

      /* Shared wave — 5 layers for organic irregularity */
      const raw = Math.sin(x * FREQUENCY + phase)
                + Math.sin(x * FREQUENCY * 0.5 + phase * 0.7) * 0.5
                + Math.sin(x * FREQUENCY * 1.7 + phase * 1.3) * 0.3
                + Math.sin(x * FREQUENCY * 2.9 + phase * 0.5) * 0.15
                + Math.sin(x * FREQUENCY * 0.3 + phase * 1.1) * 0.4;
      const shared = raw / 2.35; /* normalize to ~-1..1 */

      /* Per-line drift — organic variation between lines */
      const drift = Math.sin(x * FREQUENCY * 0.6 + i * 0.5 + phase * 0.4) * 6
                  + Math.sin(x * FREQUENCY * 1.4 + i * 0.8 + phase * 0.25) * 3;

      const y = baseY + shared * amp + drift;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    /* Consistent subtle opacity */
    const opacity = LINE_OPACITY * (0.7 + 0.3 * Math.sin(i * 0.4 + phase * 0.1));
    ctx.strokeStyle = `rgba(255, 255, 255, ${opacity.toFixed(3)})`;
    ctx.stroke();
  }

  requestAnimationFrame(draw);
}

requestAnimationFrame(draw);
