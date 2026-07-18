import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(3500); // idle-callback probe + lazy chunk

const info = await page.evaluate(() => {
  const canvases = [...document.querySelectorAll('canvas')].map(c => ({
    cls: c.className, w: c.width, h: c.height,
    webgl: !!(c.getContext('webgl2') || c.getContext('webgl')),
  }));
  const layer = document.querySelector('.neural-bg-layer');
  const style = layer ? getComputedStyle(layer) : null;
  return {
    canvases,
    layer: style ? { position: style.position, zIndex: style.zIndex, pointerEvents: style.pointerEvents } : null,
    heroVisible: !!document.querySelector('.hero-title'),
    ctaExists: !!document.querySelector('.home-final-cta'),
  };
});
console.log('INFO', JSON.stringify(info, null, 1));

// measure fps over 2s
const fps = await page.evaluate(() => new Promise((res) => {
  let frames = 0; const start = performance.now();
  const tick = () => { frames++; if (performance.now() - start < 2000) requestAnimationFrame(tick); else res(frames / 2); };
  requestAnimationFrame(tick);
}));
console.log('FPS ~', fps);

await page.screenshot({ path: 'shot-top.png' });

// scroll to CTA, verify page still works and take a screenshot
await page.evaluate(() => document.querySelector('.home-final-cta').scrollIntoView({ behavior: 'instant' }));
await page.waitForTimeout(1600); // let damped rotation settle
await page.screenshot({ path: 'shot-cta.png' });

// click the CTA button through the background layer
const clicked = await page.evaluate(() => {
  const btn = document.querySelector('.home-final-cta .cta-btn');
  if (!btn) return 'no button';
  btn.click();
  return 'clicked';
});
await page.waitForTimeout(600);
const authStep = await page.evaluate(() => !!document.querySelector('.auth-card'));
console.log('CTA click:', clicked, '→ auth card shown:', authStep);

// navbar Log In from top
await page.evaluate(() => window.scrollTo(0, 0));
console.log('ERRORS:', errors.length ? errors : 'none');
await browser.close();
