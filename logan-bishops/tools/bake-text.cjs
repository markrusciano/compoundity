#!/usr/bin/env node
/*
 * Bakes the world-space signage text (billboard, "Peanut Day" box, the King's tee print) into glyph-outline path data.
 * World <text> under the zooming camera made Blink re-lay out every text node on every zoom change (30 fps on a mid
 * phone in every zoom beat), so scene.js (and char-king.js) draw these strings as <path>s instead.
 *
 *   npm i --no-save opentype.js@1.3.4      (once, anywhere on the module path)
 *   node tools/bake-text.cjs [--dec 1]     prints { name: d } as JSON
 *
 * Positions come from Chrome laying out the ORIGINAL <text> specs below with the Google web fonts (so kerning,
 * letter-spacing, text-anchor and textLength match what the page used to render); outlines come from the same families'
 * TTFs (Google Fonts css2 API, which serves TTF to non-browser clients). Edit SPECS, re-run, paste the strings.
 */
const path = require('path');
const https = require('https');
const { chromium } = require('playwright');
let opentype;
try { opentype = require('opentype.js'); } catch (e) { opentype = require(path.resolve(process.cwd(), 'node_modules/opentype.js')); }

const SPECS = {
  // scene.js billboard: Source Sans 3 700, white on navy; $1 BILLION squeezed to 104 wide
  billboard: { family: 'Source Sans 3', weight: 700, texts: [
    { x: 465, y: 184, size: 13.6, ls: 0.6, text: 'OVER' },
    { x: 515, y: 202.2, size: 21.6, anchor: 'middle', textLength: 104, text: '$1 BILLION' },
    { x: 565, y: 215.2, size: 13.6, anchor: 'end', ls: 0.3, text: 'RECOVERED' },
  ] },
  // scene.js "Peanut Day" box label (drawn inside the rotate(-6 94 840) group)
  peanutDay: { family: 'Mochiy Pop One', weight: 400, texts: [
    { x: 92, y: 834, size: 21, anchor: 'middle', text: 'Peanut' },
    { x: 100, y: 860, size: 21, anchor: 'middle', text: 'Day' },
  ] },
  // char-king.js tee print (drawn with transform rotate(2 314 512))
  night: { family: 'Source Sans 3', weight: 700, texts: [{ x: 314, y: 512, size: 9.5, anchor: 'middle', text: 'night' }] },
};

const args = process.argv.slice(2);
const DEC = args.indexOf('--dec') >= 0 ? Number(args[args.indexOf('--dec') + 1]) : 1;

function get(url, binary) {
  return new Promise((res, rej) => {
    const opts = { headers: { 'User-Agent': 'curl/8' } };
    if (process.env.HTTPS_PROXY) {
      try { const { HttpsProxyAgent } = require('https-proxy-agent'); opts.agent = new HttpsProxyAgent(process.env.HTTPS_PROXY); } catch (e) { /* direct */ }
    }
    https.get(url, opts, (r) => {
      const chunks = [];
      r.on('data', (c) => chunks.push(c));
      r.on('end', () => (r.statusCode === 200 ? res(binary ? Buffer.concat(chunks) : Buffer.concat(chunks).toString()) : rej(new Error(url + ' ' + r.statusCode))));
    }).on('error', rej);
  });
}

(async () => {
  // TTF per family/weight
  const fonts = {};
  for (const k in SPECS) {
    const s = SPECS[k], key = s.family + s.weight;
    if (fonts[key]) continue;
    const css = await get('https://fonts.googleapis.com/css2?family=' + s.family.replace(/ /g, '+') + ':wght@' + s.weight);
    const m = /url\((https:[^)]+\.ttf)\)/.exec(css);
    if (!m) throw new Error('no ttf for ' + key);
    const buf = await get(m[1], true);
    fonts[key] = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  }
  // layout in Chrome with the web fonts
  const fams = [...new Set(Object.values(SPECS).map((s) => s.family.replace(/ /g, '+') + ':wght@' + s.weight))];
  const html = '<!doctype html><link rel="stylesheet" href="https://fonts.googleapis.com/css2?' + fams.map((f) => 'family=' + f).join('&') + '&display=block">' +
    '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000">' +
    Object.keys(SPECS).map((k) => SPECS[k].texts.map((t, i) =>
      `<text data-k="${k}" data-i="${i}" x="${t.x}" y="${t.y}" font-family="'${SPECS[k].family}'" font-weight="${SPECS[k].weight}" font-size="${t.size}"` +
      (t.anchor ? ` text-anchor="${t.anchor}"` : '') + (t.ls ? ` letter-spacing="${t.ls}"` : '') +
      (t.textLength ? ` textLength="${t.textLength}" lengthAdjust="spacingAndGlyphs"` : '') + `>${t.text}</text>`).join('')).join('') + '</svg>';
  const b = await chromium.launch({ proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
  const pg = await (await b.newContext()).newPage();
  await pg.setContent(html);
  await pg.evaluate((specs) => Promise.all(Object.values(specs).map((s) => document.fonts.load(s.weight + ' 20px "' + s.family + '"', s.texts.map((t) => t.text).join(' ')))), SPECS);
  const lay = await pg.evaluate(() => [...document.querySelectorAll('text')].map((el) => {
    const chars = [];
    for (let i = 0; i < el.getNumberOfChars(); i++) { const p = el.getStartPositionOfChar(i); chars.push({ c: el.textContent[i], x: p.x, y: p.y }); }
    let sx = 1;
    if (el.hasAttribute('textLength')) {
      const cl = el.cloneNode(true); cl.removeAttribute('textLength'); cl.removeAttribute('lengthAdjust');
      el.parentNode.appendChild(cl); sx = el.getComputedTextLength() / cl.getComputedTextLength(); cl.remove();
    }
    const fam = el.getAttribute('font-family').replace(/'/g, '');
    return { k: el.dataset.k, size: +el.getAttribute('font-size'), chars, sx, loaded: document.fonts.check(el.getAttribute('font-weight') + ' 20px "' + fam + '"', el.textContent) };
  }));
  await b.close();
  const out = {};
  lay.forEach((L) => {
    if (!L.loaded) throw new Error('web font not loaded for ' + L.k);
    const s = SPECS[L.k], font = fonts[s.family + s.weight];
    const f = (v) => String(+v.toFixed(DEC));
    let d = out[L.k] || '';
    L.chars.forEach((ch) => {
      if (/\s/.test(ch.c)) return;
      font.charToGlyph(ch.c).getPath(0, 0, L.size).commands.forEach((cm) => {
        const X = (v) => f(ch.x + L.sx * v), Y = (v) => f(ch.y + v);
        if (cm.type === 'M' || cm.type === 'L') d += cm.type + X(cm.x) + ' ' + Y(cm.y);
        else if (cm.type === 'Q') d += 'Q' + X(cm.x1) + ' ' + Y(cm.y1) + ' ' + X(cm.x) + ' ' + Y(cm.y);
        else if (cm.type === 'C') d += 'C' + X(cm.x1) + ' ' + Y(cm.y1) + ' ' + X(cm.x2) + ' ' + Y(cm.y2) + ' ' + X(cm.x) + ' ' + Y(cm.y);
        else if (cm.type === 'Z') d += 'Z';
      });
    });
    out[L.k] = d.replace(/ -/g, '-');
  });
  console.log(JSON.stringify(out, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
