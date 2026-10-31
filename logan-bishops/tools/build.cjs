#!/usr/bin/env node
/* Inlines every local <script src="..."> in src/index.html into one self-contained logan-bishops.html. */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'src');
const html = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');
const missing = [];
const out = html.replace(/<script src="([^"]+)"><\/script>/g, (m, file) => {
  if (/^https?:/.test(file)) return m;
  const p = path.join(srcDir, file);
  if (!fs.existsSync(p)) { missing.push(file); return ''; }
  const js = fs.readFileSync(p, 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<script>/* ${file} */\n${js}\n</script>`;
});
if (missing.length) {
  console.error('missing modules: ' + missing.join(', '));
  process.exit(1);
}
const dest = path.join(root, 'logan-bishops.html');
fs.writeFileSync(dest, out);
console.log(`wrote ${dest} (${(out.length / 1024).toFixed(1)} KB)`);
