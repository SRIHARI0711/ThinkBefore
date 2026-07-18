import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('response', r => { if (r.status() === 404) console.log('404:', r.url()); });
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
await browser.close();
