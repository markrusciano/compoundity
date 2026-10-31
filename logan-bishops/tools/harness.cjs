#!/usr/bin/env node
/*
 * Generates a test page that loads core.js, the modules you list, optional extra scripts (e.g. a stub director),
 * and main.js, all by absolute path. Use it to test your module without depending on half-finished ones.
 *
 *   node tools/harness.cjs --modules face,char-king --extra /abs/stub-director.js --out /abs/scratch/king.html
 *     --modules  comma list of src/ basenames without .js (core and main are always included)
 *     --extra    comma list of extra script paths loaded after the modules, before main.js
 *     --out      where to write the html (put it in your scratch dir)
 * Then render it:  node tools/render.cjs /abs/scratch/king.html --times 0,1,2 --sheet --out /abs/scratch/r1
 * Without the ui module the page runs in stage-only mode automatically.
 */
const fs = require('fs');
const path = require('path');
const args = process.argv.slice(2);
const opt = {};
for (let i = 0; i < args.length; i += 2) opt[args[i].replace(/^--/, '')] = args[i + 1];
const root = path.resolve(__dirname, '..');
const src = path.join(root, 'src');
const mods = (opt.modules || '').split(',').filter(Boolean);
const extra = (opt.extra || '').split(',').filter(Boolean).map((p) => path.resolve(p));
const shell = fs.readFileSync(path.join(src, 'index.html'), 'utf8');
const head = shell.slice(0, shell.indexOf('</head>'));
const scripts = ['core', ...mods].map((m) => `<script src="${path.join(src, m + '.js')}"></script>`)
  .concat(extra.map((p) => `<script src="${p}"></script>`))
  .concat([`<script src="${path.join(src, 'main.js')}"></script>`]);
const html = `${head}</head>\n<body>\n<div id="app"></div>\n${scripts.join('\n')}\n</body>\n</html>\n`;
const out = path.resolve(opt.out || '/tmp/lb-harness.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log('wrote ' + out);
