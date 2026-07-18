import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await page.evaluate(() => document.querySelector('.home-final-cta').scrollIntoView({behavior:'instant'}));
await page.waitForTimeout(500);
const diag = await page.evaluate(() => {
  const se = document.scrollingElement;
  // find any scrolled containers
  const scrolled = [];
  document.querySelectorAll('*').forEach(el => { if (el.scrollTop > 0) scrolled.push(el.className || el.tagName); });
  return {
    scrollingElTop: se.scrollTop,
    windowScrollY: window.scrollY,
    scrolledContainers: scrolled.slice(0, 5),
    debug: window.__brainDebug,
  };
});
console.log(JSON.stringify(diag, null, 1));
await browser.close();
