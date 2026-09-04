// 操作手冊教學影片錄製腳本（Playwright，headless Chromium，含假游標與點擊漣漪）。
// 產出 out/raw/<flow>/*.webm，再用 ffmpeg 轉成 public/manual/<name>.mp4 + .jpg poster。
//
// 用法（在任一暫存目錄）：
//   npm i playwright && npx playwright install chromium
//   BASE=http://localhost:5179 node record-manual-videos.js startGame listen playMode translate
//   BASE=https://verserain.com  node record-manual-videos.js map multiplayer
//   ffmpeg -ss 1 -i out/raw/start-game/*.webm -vf fps=24 -c:v libx264 -crf 27 -pix_fmt yuv420p -movflags +faststart -an start-game.mp4
//   多人：兩支 webm 用 hstack 併排（見 git log 的 3.27.5 提交說明）。
//
// 注意：
// - dev server 沒有 Vercel /api/*（地圖、翻譯），腳本會把 /api 轉到 verserain.com。
// - 地圖與多人請對 production 錄：dev 的 React StrictMode 會讓 socket 重連，開房者不再是 host。
// - 開房者要先在「多人遊戲」設好暱稱再按「邀人PK」，否則 socket 重連、host 錯位。
// Playwright tutorial recorder for VerseRain manual videos.
// usage: node rec.js <flow> [<flow>...]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'http://localhost:5179';
const VW = 1280, VH = 800;
const OUT = path.join(__dirname, process.env.OUT || 'out');
fs.mkdirSync(path.join(OUT, 'raw'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });

// Fake cursor overlay so viewers can see where clicks happen.
const CURSOR_SCRIPT = `
(() => {
  if (window.top !== window) return;
  const mk = () => {
    if (document.getElementById('__vr_cursor')) return;
    const c = document.createElement('div');
    c.id = '__vr_cursor';
    c.innerHTML = '<svg width="28" height="34" viewBox="0 0 28 34" xmlns="http://www.w3.org/2000/svg"><path d="M2 2 L2 26 L8 20 L12 30 L17 28 L13 18 L22 18 Z" fill="#111" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>';
    Object.assign(c.style, { position: 'fixed', left: '0px', top: '0px', zIndex: 2147483647, pointerEvents: 'none', transform: 'translate(-2px,-2px)', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.45))' });
    document.documentElement.appendChild(c);
    const st = document.createElement('style');
    st.textContent = '@keyframes __vr_rip{0%{transform:translate(-50%,-50%) scale(.2);opacity:.9}100%{transform:translate(-50%,-50%) scale(1);opacity:0}} .__vr_rip{position:fixed;width:56px;height:56px;border-radius:50%;background:rgba(59,130,246,.55);border:2px solid #fff;pointer-events:none;z-index:2147483646;animation:__vr_rip .55s ease-out forwards}';
    document.documentElement.appendChild(st);
    window.addEventListener('mousemove', e => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }, true);
    window.addEventListener('mousedown', e => {
      const r = document.createElement('div'); r.className = '__vr_rip';
      r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px';
      document.documentElement.appendChild(r); setTimeout(() => r.remove(), 600);
    }, true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mk); else mk();
})();`;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function newCtx(browser, name, opts = {}) {
  const ctx = await browser.newContext({
    viewport: { width: opts.w || VW, height: opts.h || VH },
    deviceScaleFactor: 1,
    locale: opts.locale || 'zh-TW',
    recordVideo: { dir: path.join(OUT, 'raw', name), size: { width: opts.w || VW, height: opts.h || VH } },
    permissions: [],
  });
  await ctx.addInitScript(CURSOR_SCRIPT);
  // The dev server has no Vercel functions; proxy /api/* to production.
  await ctx.route('**/api/**', async route => {
    const u = new URL(route.request().url());
    if (u.origin !== new URL(BASE).origin) return route.continue();
    try {
      const resp = await route.fetch({ url: 'https://verserain.com' + u.pathname + u.search });
      await route.fulfill({ response: resp });
    } catch (e) { console.log('[proxy fail]', u.pathname, e.message); await route.abort(); }
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log(`[${name}] pageerror:`, e.message));
  page.on('dialog', d => d.dismiss().catch(() => {}));
  page._vrName = name;
  page._mouse = { x: 40, y: 40 };
  return { ctx, page };
}

async function glideTo(page, x, y, steps = 18) {
  const from = page._mouse;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps, e = 1 - Math.pow(1 - t, 3);
    await page.mouse.move(from.x + (x - from.x) * e, from.y + (y - from.y) * e);
    await sleep(14);
  }
  page._mouse = { x, y };
}

async function clickLoc(page, loc, { pause = 700, dx = 0, dy = 0 } = {}) {
  await loc.waitFor({ state: 'visible', timeout: 15000 });
  await loc.scrollIntoViewIfNeeded();
  await sleep(250);
  const box = await loc.boundingBox();
  if (!box) throw new Error('no box for locator');
  const x = box.x + box.width / 2 + dx, y = box.y + box.height / 2 + dy;
  await glideTo(page, x, y);
  await sleep(200);
  await page.mouse.down(); await sleep(80); await page.mouse.up();
  await sleep(pause);
}

const byText = (page, text, exact = true) => page.getByText(text, { exact }).last();
async function clickText(page, text, opts = {}) { await clickLoc(page, byText(page, text, opts.exact !== false), opts); }

async function shot(page, tag) {
  await page.screenshot({ path: path.join(OUT, 'shots', `${page._vrName}-${tag}.png`) });
}

async function typeSlow(page, loc, text) {
  await clickLoc(page, loc, { pause: 200 });
  for (const ch of text) { await page.keyboard.type(ch); await sleep(70); }
}

async function open(page, url = BASE) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=話語甘霖', { timeout: 20000 });
  await sleep(1200);
  await glideTo(page, 300, 300, 6);
}

// Pick a Bible version from the top-left picker.
async function pickVersion(page, label) {
  await clickLoc(page, page.getByText('版本：', { exact: false }).first(), { pause: 800 });
  await clickText(page, label, { pause: 1500 });
}

// ---------------------------------------------------------------- flows
const flows = {};

async function gotoSet(page, title = '約翰福音 核心經文') {
  await clickLoc(page, page.locator('h2', { hasText: '經文題庫' }).first(), { pause: 1400 });
  await clickText(page, title, { pause: 1600 });
}

flows.startGame = async (browser) => {
  const { ctx, page } = await newCtx(browser, 'start-game');
  await open(page);
  await shot(page, '1-lobby');
  await gotoSet(page);
  await shot(page, '3-detail');
  const row = page.locator('tr', { hasText: '約翰福音 3:16' }).first();
  await clickLoc(page, row.locator('button[title="挑戰這節經文"]').first(), { pause: 1200 });
  await shot(page, '4-modal');
  await clickLoc(page, page.getByRole('button', { name: /經文雨/ }).first(), { pause: 900 });
  await clickLoc(page, page.getByRole('button', { name: /開始挑戰/ }).first(), { pause: 300 });
  await sleep(4500);
  // play it: tap the falling blocks in verse order
  const phrases = ['神愛世人，甚至將', '他的獨生子賜給他們', '叫一切信他的', '不至滅亡，反得永生'];
  for (const ph of phrases) {
    const loc = page.getByText(ph, { exact: true }).first();
    try {
      await loc.waitFor({ state: 'visible', timeout: 12000 });
      await sleep(600);
      const box = await loc.boundingBox();
      if (!box) continue;
      await glideTo(page, box.x + box.width / 2, box.y + box.height / 2 + 18, 8);
      await page.mouse.down(); await sleep(60); await page.mouse.up();
      await sleep(900);
    } catch (e) { console.log('block', ph, e.message.split('\n')[0]); }
  }
  await sleep(5000);
  await shot(page, '5-game');
  await ctx.close();
};

flows.map = async (browser) => {
  const { ctx, page } = await newCtx(browser, 'map');
  await open(page);
  await clickText(page, '地圖', { pause: 6000 });
  await shot(page, '1-2d');
  await clickText(page, '3D 地球', { exact: false, pause: 7000 });
  await shot(page, '2-3d');
  await glideTo(page, 640, 460, 10);
  await page.mouse.down();
  for (let i = 0; i < 50; i++) { await page.mouse.move(640 - i * 5, 460 + i * 0.6); await sleep(30); }
  await page.mouse.up();
  await sleep(3500);
  await shot(page, '3-rotated');
  await ctx.close();
};

flows.listen = async (browser) => {
  const { ctx, page } = await newCtx(browser, 'listen');
  await open(page);
  await clickLoc(page, page.locator('h2', { hasText: '話語甘霖' }).first(), { pause: 2500 });
  await shot(page, '1-welcome');
  await clickText(page, '開始朗讀每日經文', { exact: false, pause: 3500 });
  await shot(page, '2-picker');
  await clickLoc(page, page.getByRole('button', { name: /每日經文/ }).first(), { pause: 6000 });
  await shot(page, '3-player');
  // 雙語對調：朗讀第二語言 → pick an English voice
  await clickLoc(page, page.getByRole('button', { name: /朗讀/ }).last(), { pause: 2000 }).catch(e => console.log('swap', e.message.split('\n')[0]));
  const voiceBtn = page.getByRole('button', { name: /Ava|Samantha|Superstar/ }).first();
  await clickLoc(page, voiceBtn, { pause: 5000 }).catch(e => console.log('voicepick', e.message.split('\n')[0]));
  await shot(page, '4-swap');
  await sleep(3000);
  // voice switch menu (電腦語音 / 無聲音 / 親聲)
  await clickLoc(page, page.locator('[title="切換聲音"]').first(), { pause: 3000 }).catch(e => console.log('voice', e.message.split('\n')[0]));
  await shot(page, '5-voice-menu');
  await sleep(2500);
  await ctx.close();
};

flows.playMode = async (browser) => {
  const { ctx, page } = await newCtx(browser, 'play-mode');
  await open(page);
  await gotoSet(page);
  await clickText(page, '播放', { pause: 1500 });
  await shot(page, '1-chooser');
  await clickText(page, '20分', { pause: 800 });
  await clickText(page, '大', { pause: 800 });
  await clickText(page, '電腦語音', { exact: false, pause: 800 });
  await clickText(page, '按序', { exact: false, pause: 4000 });
  await shot(page, '2-player');
  await sleep(7000);
  await shot(page, '3-player');
  await ctx.close();
};

flows.translate = async (browser) => {
  const { ctx, page } = await newCtx(browser, 'translate');
  await open(page);
  await gotoSet(page);
  await clickText(page, '翻譯', { pause: 1200 });
  await shot(page, '1-modal');
  for (const lang of ['Bahasa Melayu', 'Türkçe', 'Deutsch', 'Français']) {
    const sel = page.locator('select').last();
    await clickLoc(page, sel, { pause: 500 });
    await sel.selectOption({ label: lang });
    await sleep(900);
    await clickText(page, '開始翻譯', { pause: 1500 });
    const exists = page.getByText('已經有', { exact: false });
    const done = page.getByText('標題（可修改）', { exact: false });
    await Promise.race([exists.waitFor({ timeout: 60000 }), done.waitFor({ timeout: 60000 })]).catch(() => {});
    if (await done.isVisible().catch(() => false)) break;
    console.log('exists already:', lang);
    await clickText(page, '取消', { pause: 800 });
    await clickText(page, '翻譯', { pause: 1200 });
  }
  await sleep(2500);
  await shot(page, '2-preview');
  await page.mouse.wheel(0, 400); await sleep(1500);
  await page.mouse.wheel(0, 400); await sleep(2500);
  await shot(page, '3-preview-scrolled');
  await ctx.close();
};

// Two players, two languages, side by side (邀人PK = individual match).
flows.multiplayer = async (browser) => {
  const H = 760, W = 900;
  const host = await newCtx(browser, 'mp-host', { w: W, h: H });
  const guest = await newCtx(browser, 'mp-guest', { w: W, h: H });
  const hp = host.page, gp = guest.page;
  await open(hp); await open(gp);
  // guest switches to English ESV first
  await pickVersion(gp, 'English - ESV');
  await shot(gp, '0-esv');
  // host: nickname first (so the room socket is created once), then set detail → 邀人PK
  await clickLoc(hp, hp.locator('h2', { hasText: '多人遊戲' }).first(), { pause: 1500 });
  if (await hp.getByPlaceholder('你的暱稱').isVisible().catch(() => false)) {
    await typeSlow(hp, hp.getByPlaceholder('你的暱稱'), '小明');
    await clickText(hp, '出發！', { pause: 1500 });
  }
  await clickText(hp, '大廳', { pause: 1200 });
  await gotoSet(hp);
  await clickLoc(hp, hp.locator('button[title="開房間邀請連線遊玩"]').first(), { pause: 2000 });
  await shot(hp, '1-after-pk');
  if (await hp.getByPlaceholder('你的暱稱').isVisible().catch(() => false)) {
    await typeSlow(hp, hp.getByPlaceholder('你的暱稱'), '小明');
    await clickText(hp, '出發！', { pause: 2500 });
  }
  await shot(hp, '2-room');
  const code = await hp.evaluate(() => {
    for (const el of document.querySelectorAll('div,span,h2,h3')) {
      const t = el.textContent.replace(/\s+/g, '');
      if (el.children.length === 0 && /^[A-Z0-9]{4,8}$/.test(t) && parseFloat(getComputedStyle(el).letterSpacing) >= 3) return t;
    }
    return null;
  });
  console.log('room code', code);
  if (!code) { await shot(hp, 'x-nocode'); await host.ctx.close(); await guest.ctx.close(); return; }
  // guest joins (English UI)
  await clickLoc(gp, gp.locator('h2', { hasText: /Multiplayer/ }).first(), { pause: 1500 });
  await shot(gp, '1-name');
  if (await gp.getByPlaceholder(/Your nickname/).isVisible().catch(() => false)) {
    await typeSlow(gp, gp.getByPlaceholder(/Your nickname/), 'Amy');
    await clickText(gp, 'Go!', { pause: 1500 });
  }
  await typeSlow(gp, gp.getByPlaceholder(/Enter Room Code/), code);
  await clickLoc(gp, gp.getByRole('button', { name: /^Join$/ }).first(), { pause: 3000 });
  await shot(gp, '2-joined'); await shot(hp, '3-guest-in');
  // ready + start
  await clickLoc(gp, gp.getByRole('button', { name: /I am ready/ }).first(), { pause: 1500 }).catch(e => console.log('gready', e.message.split('\n')[0]));
  await clickLoc(hp, hp.getByRole('button', { name: /我準備好了/ }).first(), { pause: 1500 }).catch(e => console.log('hready', e.message.split('\n')[0]));
  await shot(hp, '4-ready'); await shot(gp, '3-ready');
  await clickLoc(hp, hp.getByRole('button', { name: /比賽開始/ }).first(), { pause: 500 }).catch(e => console.log('start', e.message.split('\n')[0]));
  await sleep(6000);
  await shot(hp, '5-game'); await shot(gp, '4-game');
  await sleep(8000);
  await shot(hp, '6-game'); await shot(gp, '5-game');
  await host.ctx.close(); await guest.ctx.close();
};

(async () => {
  const names = process.argv.slice(2);
  const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const n of names) {
    if (!flows[n]) { console.log('unknown flow', n); continue; }
    console.log('▶', n);
    try { await flows[n](browser); console.log('✓', n); }
    catch (e) { console.log('✗', n, e.message.split('\n')[0]); }
  }
  await browser.close();
  for (const d of fs.readdirSync(path.join(OUT, 'raw'))) {
    console.log(d, '->', fs.readdirSync(path.join(OUT, 'raw', d)).join(', '));
  }
})();
