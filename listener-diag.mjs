import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
const res = await page.evaluate(async () => {
  const fired = { windowBubble: false, windowCapture: false, bodyDirect: false };
  window.addEventListener('scroll', () => { fired.windowBubble = true; });
  window.addEventListener('scroll', () => { fired.windowCapture = true; }, { capture: true });
  document.body.addEventListener('scroll', () => { fired.bodyDirect = true; });
  document.body.scrollTop = 500;
  await new Promise(r => setTimeout(r, 300));
  return {
    ...fired,
    bodyScrollTop: document.body.scrollTop,
    scrolledClassOnBody: document.body.classList.contains('scrolled'),
    progressBarWidth: document.querySelector('.scroll-progress-fill')?.style.width,
  };
});
console.log(JSON.stringify(res, null, 1));
await browser.close();
