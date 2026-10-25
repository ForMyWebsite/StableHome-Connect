import { chromium } from '@playwright/test';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:3000/login');
await page.screenshot({ path: '/tmp/stablehome-login.png', fullPage: true });
await page.getByRole('button', { name: 'Explore the demo', exact: true }).click();
await page.waitForURL('**/dashboard');
await page.getByRole('heading', { name: 'Welcome back, Jordan.' }).waitFor();
await page.screenshot({ path: '/tmp/stablehome-dashboard.png', fullPage: true });
await page.setViewportSize({ width: 375, height: 812 });
await page.screenshot({ path: '/tmp/stablehome-mobile.png', fullPage: true });
console.log(
  JSON.stringify({
    errors,
    overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    title: await page.title(),
  }),
);
await browser.close();
