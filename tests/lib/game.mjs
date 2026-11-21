// Shared test helpers: a browser that runs the game from this repo (three.js and cannon-es from tests/node_modules
// instead of the CDN), crash reports caught locally, and quick ways into a place and mode.
import { chromium, firefox, webkit } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../..'), NM = path.resolve(HERE, '../node_modules');
export { ROOT };
const TYPES = { '.js': 'application/javascript', '.mjs': 'application/javascript', '.html': 'text/html', '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.css': 'text/css', '.svg': 'image/svg+xml' };
// BROWSER=firefox or webkit (Safari's engine, as on every iPhone) runs the same tests in those instead of Chromium
export const BROWSER = process.env.BROWSER || 'chromium';
export async function launch({ args = [] } = {}) {
  if (BROWSER === 'firefox') return firefox.launch({ headless: !process.env.HEADED, firefoxUserPrefs: { 'webgl.force-enabled': true, 'media.autoplay.default': 0 } });      // (headless Firefox has no WebGL on Linux: run it on a virtual screen, HEADED=1 under xvfb-run)
  if (BROWSER === 'webkit') return webkit.launch();
  return chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info', '--disable-features=BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessSendPreflights,LocalNetworkAccessChecks', '--no-proxy-server', ...args] });
}
// a page on http://game.local/ serving the repo; every crash report the game sends lands in page.crashes
export async function newPage(browser, { width = 900, height = 560, mobile = false, xr = false, warm = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage(); page.errors = []; page.crashes = [];
  // (a room's games normally open with a WARM-UP until the host presses START: the tests of the modes themselves skip
  // it, so they start straight into the mode as before; warmup.test.mjs tests the warm-up, with { warm: true })
  if (!warm) await page.addInitScript(() => { try { sessionStorage.setItem('rs_nowarm', '1'); } catch (e) {} });
  page.on('pageerror', e => page.errors.push('pageerror: ' + e.message));
  page.on('console', m => { const t = m.text(); if (m.type() === 'error' && !/Failed to load resource|net::ERR|WebSocket connection|Navigated away from page/.test(t)) page.errors.push('console: ' + t.slice(0, 300)); });
  await page.route('**/*', async (r) => {
    const u = r.request().url(); let f = null;
    if (u.startsWith('blob:') || u.startsWith('data:')) return r.fallback();
    if (/^http:\/\/localhost:\d+\//.test(u)) return r.continue();      // (the room server run locally: its leaderboards)      // (WebKit sends the page's own in-memory pictures through here too: let them be)
    if (u.startsWith('https://cdn.jsdelivr.net/npm/three@0.170.0/')) f = path.join(NM, 'three', u.split('three@0.170.0/')[1].split('?')[0]);
    else if (u.startsWith('https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/')) f = path.join(NM, 'cannon-es/dist/cannon-es.js');
    else if (/\/crash$/.test(u.split('?')[0]) && r.request().method() === 'POST') { try { page.crashes.push(JSON.parse(r.request().postData() || '{}')); } catch (e) {} return r.fulfill({ body: 'ok' }); }
    else if (u.startsWith('http://game.local/')) f = path.join(ROOT, decodeURIComponent(u.slice(18).split('?')[0].split('#')[0]) || 'index.html');
    else if (/workers\.dev/.test(u)) return r.abort();      // (tests never touch the real server)
    if (f && fs.existsSync(f) && fs.statSync(f).isFile()) {
      let body = fs.readFileSync(f);
      if (xr && f.endsWith('index.html')) body = Buffer.from(String(body).replace("<script type=\"module\">import './js/main.js';</script>", '<script type="module">import { XRDevice, metaQuest3 } from "/__iwer.js"; const d = new XRDevice(metaQuest3); d.installRuntime(); window.xrd = d; import("./js/main.js");</script>'));
      return r.fulfill({ body, contentType: TYPES[path.extname(f)] || 'application/octet-stream' });
    }
    if (xr && u === 'http://game.local/__iwer.js') return r.fulfill({ body: fs.readFileSync(path.join(NM, 'iwer/build/iwer.module.js')), contentType: 'application/javascript' });
    return r.abort();
  });
  return page;
}
// straight into a place and mode, playing flat; resolves when the game is running
export async function startGame(page, { place = 'pub', mode = 'roam', dev = false, extra = '' } = {}) {
  if (dev) await page.addInitScript(() => { try { sessionStorage.setItem('rs_dev', '1'); } catch (e) {} });      // (set before the page starts: loading it twice left the first load's half-done requests failing, in WebKit)
  await page.goto(`http://game.local/index.html?go=1&place=${place}&mode=${mode}${extra}`);
  try { await page.waitForFunction(() => window.RS && document.body.classList.contains('ready'), null, { timeout: 180000 }); }
  catch (e) { const st = await page.evaluate(() => JSON.stringify({ url: location.href, rs: !!window.RS, ready: document.body.classList.contains('ready'), body: document.body.className, load: (document.querySelector('#loadscreen') || {}).className, lsText: ((document.querySelector('#loadscreen') || {}).textContent || '').replace(/\s+/g, ' ').slice(0, 160), screen: (document.querySelector('#start .screen.on') || {}).dataset })).catch(x => 'no page: ' + x.message);
    throw new Error(`game never got ready (${place}/${mode}): ${st} errors: ${page.errors.slice(0, 3).join(' | ')}`); }
  await page.waitForFunction(() => !document.querySelector('#loadscreen.on'), null, { timeout: 120000 }).catch(() => {});
  await page.evaluate(() => { const r = document.querySelector('.screen[data-s="intro"].on #intro-ready'); if (r) r.click(); const b = document.getElementById('play-flat'); if (b) b.click(); });
  await page.waitForTimeout(1500);
}
export const sleep = (t) => new Promise(r => setTimeout(r, t));
// little assertion helper: collects failures instead of stopping at the first
export function checker(name) { const fails = []; return { ok(cond, msg) { if (!cond) fails.push(msg); }, fails, name }; }
