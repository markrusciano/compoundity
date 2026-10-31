#!/usr/bin/env node
/*
 * Deterministic frame renderer for QA. Pauses the loop clock and screenshots chosen timestamps.
 *
 *   node tools/render.cjs [page.html] [options]
 *     page            default: src/index.html (any harness page that loads src/core.js + src/main.js works)
 *     --times a,b,c   timestamps in seconds          (default 0)
 *     --every s       render every s seconds across the loop (overrides --times)
 *     --out dir       output directory               (default /tmp/lb-render)
 *     --size px       stage size for stage-only mode (default 600)
 *     --full          screenshot the whole page with Vine UI (phone viewport) instead of stage-only
 *     --viewport WxH  viewport for --full            (default 390x844)
 *     --sheet         also write a contact sheet (sheet.png) of all frames with timestamps
 *     --cols n        contact sheet columns          (default 4)
 *     --query q       extra query string, e.g. "debug=1"
 *     --play ms       instead of seeking, let it play for ms and take one screenshot
 * Prints console errors / page errors so modules can be debugged headlessly.
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const opt = { times: '0', out: '/tmp/lb-render', size: 600, cols: 4, viewport: '390x844', query: '' };
let page = null;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--full' || a === '--sheet') opt[a.slice(2)] = true;
  else if (a.startsWith('--')) opt[a.slice(2)] = args[++i];
  else page = a;
}
const root = path.resolve(__dirname, '..');
page = path.resolve(page || path.join(root, 'src/index.html'));
fs.mkdirSync(opt.out, { recursive: true });

(async () => {
  const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
  const browser = await chromium.launch({ proxy });
  const [vw, vh] = opt.full ? opt.viewport.split('x').map(Number) : [Number(opt.size), Number(opt.size)];
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: opt.full ? 2 : 1, ignoreHTTPSErrors: true });
  const pg = await ctx.newPage();
  const errors = [];
  pg.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[console.${m.type()}] ${m.text()}`); });
  pg.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}\n${e.stack || ''}`));
  const q = [opt.full ? '' : 'stageOnly=1', opt.play ? '' : 't=0', opt.query].filter(Boolean).join('&');
  await pg.goto('file://' + page + (q ? '?' + q : ''));
  await pg.evaluate(() => window.__lbReady || true).catch((e) => errors.push('[ready] ' + e.message));
  await pg.waitForTimeout(150);

  const D = await pg.evaluate(() => (window.LB && window.LB.D) || 6);
  let times = opt.every ? [] : String(opt.times).split(',').map(Number);
  if (opt.every) for (let t = 0; t < D - 1e-6; t += Number(opt.every)) times.push(Math.round(t * 1000) / 1000);

  const target = opt.full ? pg : (await pg.$('.lb-stage')) || pg;
  const files = [];
  if (opt.play) {
    await pg.evaluate(() => { window.LB.play && window.LB.play(); });
    await pg.waitForTimeout(Number(opt.play));
    const f = path.join(opt.out, `play-${opt.play}ms.png`);
    await target.screenshot({ path: f });
    files.push({ f, t: `played ${opt.play}ms` });
  } else {
    for (const t of times) {
      await pg.evaluate((tt) => { window.LB.pause(); window.LB.seek(tt); }, t);
      await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      await pg.evaluate((tt) => { window.LB.seek(tt); }, t);
      // --full: settle the Vine chrome's CSS transitions (e.g. the "Tap for sound" fold that a seek past 4.0 triggers), so
      // the still shows the UI as it looks in live play at that time rather than mid-transition
      if (opt.full) await pg.evaluate(() => { (document.getAnimations ? document.getAnimations() : []).forEach((a) => { try { a.finish(); } catch (e) { /* infinite */ } }); });
      const f = path.join(opt.out, `t${t.toFixed(2).padStart(5, '0')}.png`);
      await target.screenshot({ path: f });
      files.push({ f, t: t.toFixed(2) + 's' });
    }
  }

  if (opt.sheet && files.length) {
    const cols = Number(opt.cols);
    const cell = 300;
    const imgs = files.map(({ f, t }) =>
      `<figure><img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}"><figcaption>${t}</figcaption></figure>`).join('');
    const html = `<html><body style="margin:0;background:#111;color:#fff;font:600 14px sans-serif">
      <div style="display:grid;grid-template-columns:repeat(${cols},${cell}px);gap:6px;padding:6px">${imgs}</div>
      <style>figure{margin:0}img{width:${cell}px;display:block}figcaption{padding:2px 0}</style></body></html>`;
    const sp = await ctx.newPage();
    await sp.setViewportSize({ width: cols * (cell + 6) + 6, height: 400 });
    await sp.setContent(html);
    const sheet = path.join(opt.out, 'sheet.png');
    await sp.screenshot({ path: sheet, fullPage: true });
    console.log('sheet: ' + sheet);
  }

  files.forEach(({ f }) => console.log('frame: ' + f));
  if (errors.length) { console.log('--- page errors / warnings ---'); errors.forEach((e) => console.log(e)); }
  else console.log('no page errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
