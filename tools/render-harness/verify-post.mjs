// Browser regression: all 17 biomes, frozen-scene bloom/AO comparisons, override lifecycle.
// Run: npm run verify:post (writes docs/post-override-evidence).
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import http from 'http'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = new URL('../../index.html', import.meta.url).pathname, outPrefix = new URL('../../docs/post-override-evidence/', import.meta.url).pathname, w=640, h=360;
fs.mkdirSync(outPrefix, { recursive:true });

// Serve the page with three.js from local node_modules so no network is needed.
const root = path.dirname(path.resolve(file)), port = +(process.env.PORT || 8765);
const page = fs.readFileSync(file, 'utf8')
  .replace('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js', '/node_modules/three/build/three.module.js')
  .replace('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/', '/node_modules/three/examples/jsm/')
  .replace('const PP = (() => {', 'window.__postTest = { ids: () => BIOMES.map(b => b.id), defaults: () => Object.fromEntries(Object.keys(POST_DEFAULT).map(k => [k, active.post?.[k] ?? activeDef.post?.[k] ?? POST_DEFAULT[k]])), render: () => { PP.render(S.lastEnv); return canvas.toDataURL(\"image/png\"); } }; const PP = (() => {')
  .replace(/<link rel="stylesheet" href="https:\/\/fonts[^>]*>/, '');
const srv = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/' || p === '/page.html'){ res.writeHead(200, {'Content-Type':'text/html'}); return res.end(page); }
  const base = p.startsWith('/node_modules/') ? here : root, f = path.join(base, p);   // page assets (extensions/) come from beside the page
  if (!f.startsWith(base) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, {'Content-Type': /\.m?js$/.test(f) ? 'text/javascript' : 'application/octet-stream'}); fs.createReadStream(f).pipe(res);
}).listen(port);

const browser = await puppeteer.launch({
  args:[...chromium.args, '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  executablePath: await chromium.executablePath(), headless:true, defaultViewport:{ width:+w, height:+h }, protocolTimeout:600000 });
const tab = await browser.newPage();
tab.on('console', m => { const t = m.text(); if (!/GPU stall|swiftshader|WebGL-/i.test(t)) console.log('[console]', t.slice(0,300)); });
tab.on('pageerror', e => console.log('[pageerror]', e.message));
await tab.evaluateOnNewDocument(() => { window.__HEADLESS = true; });
await tab.goto(`http://localhost:${port}/page.html`, { waitUntil:'load', timeout:120000 });
await tab.waitForFunction(() => window.__helios, { timeout:120000 });
await tab.evaluate(() => document.querySelectorAll('.plate,.help,#hud,#stick,#veil,#show').forEach(e => e.style.display = 'none'));


const results = [];
const errors = [];
tab.on('pageerror', e => errors.push(e.message));
try {
  const allIds = await tab.evaluate(() => window.__postTest.ids());
  const selected = process.argv.slice(2);
  if (selected.some(id => !allIds.includes(id))) throw new Error('Unknown biome');
  const ids = selected.length ? selected : allIds;
  for (const id of ids) {
    const result = await tab.evaluate(id => {
      const H = window.__helios, T = window.__postTest;
      const check = (ok, message) => { if (!ok) throw new Error(`${id}: ${message}`); };
      H.setQuality('balanced'); H.load(id); H.snap(1);
      const defaults = T.defaults();
      check(JSON.stringify(H.postState().applied) === JSON.stringify(defaults), 'default settings changed');
      const disabled = Object.fromEntries(Object.keys(defaults).map(k => [k, k === 'tint' ? [1,1,1] : 0]));
      H.post(disabled); H.sim(0.2); H.snap(1);
      const applied = H.postState().applied;
      check(JSON.stringify(applied) === JSON.stringify(disabled), 'override lost after update/render');
      H.post(null);
      check(JSON.stringify(H.postState().effective) === JSON.stringify(T.defaults()), 'clear failed');
      // Compare the identical scene/time twice, with only the tested effect changed.
      const comparisons = {};
      for (const key of ['bloom','ao']) {
        // Fixed low threshold makes bloom legible even at the deep-water camera.
        if (key === 'bloom') H.post({ thresh:0.25 });
        H.post({ [key]:0 }); const off = T.render();
        H.post({ [key]:1 }); const on = T.render();
        check(off !== on, `${key} had no pixel effect`);
        comparisons[key] = { off, on };
        H.post({ [key]:null });
        if (key === 'bloom') H.post({ thresh:null });
      }
      const restored = T.render(); H.post({ bloom:0, ao:0 }); T.render(); H.post(null);
      check(T.render() === restored, 'clearing overrides did not restore identical pixels');
      H.post({ bloom:0 }); H.load(id);
      check(Object.keys(H.postState().overrides).length === 0, 'reload leaked overrides');
      check(JSON.stringify(H.postState().effective) === JSON.stringify(T.defaults()), 'reload defaults changed');
      return { id, defaults, applied, passed:true, comparisons };
    }, id);
    for (const [effect, pair] of Object.entries(result.comparisons)) {
      if (['caverns','underwater'].includes(id)) {
        for (const [state, data] of Object.entries(pair)) fs.writeFileSync(path.join(outPrefix, `${id}-${effect}-${state}.png`), Buffer.from(data.split(',')[1], 'base64'));
      }
    }
    delete result.comparisons; results.push(result);
    console.log('PASS', id);
    fs.writeFileSync(path.join(outPrefix, selected.length ? 'focused-results.json' : 'results.json'), JSON.stringify({viewport:[w,h], quality:'balanced', renderer:'Chromium 123 / SwiftShader', results, errors}, null, 2));
  }
  if (errors.length) throw new Error(errors.join('\n'));
} finally { await browser.close(); srv.close(); }
