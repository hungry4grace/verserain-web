const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    }
  });

  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.toString());
  });

  try {
    await page.goto('http://localhost:5174', { waitUntil: 'domcontentloaded', timeout: 10000 });
    // Wait an additional 3 seconds to let React render and log any errors
    await new Promise(r => setTimeout(r, 3000));
  } catch (err) {
    console.log('NAVIGATION ERROR:', err.message);
  }

  await browser.close();
  process.exit(0);
})();
