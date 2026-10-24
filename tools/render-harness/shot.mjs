// Headless render harness: loads index.html with a software WebGL renderer, drives
// the engine through window.__helios and saves one JPEG per job.
//
//   node shot.mjs <page.html> <outPrefix> '<jobs JSON>' [width] [height]
//   job: { "biome":"amazon|sea|egypt|arctic|volcano|haven|forest|taiga|savanna|canyon|alpine", "q":"fast|balanced|ultra",
//          "tod":"dawn|noon|dusk|night", "wx":"clear|rain|fog", "cam":[x, y, z, yaw, pitch], "steps":3,
//          "opt":["season","autumn"], "strike":[["fire", x, z, radius?], ...], "sim":seconds }
//   strike hits the surface layer; sim advances weather, surface and wildlife without rendering (after cam/strike).
//
// Example:
//   node shot.mjs ../../index.html out/amazon '[{"biome":"amazon","q":"balanced"}]' 960 540
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import http from 'http'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const [,, file, outPrefix, jobsJson, w='1280', h='720'] = process.argv;
if (!file || !outPrefix || !jobsJson) { console.error('usage: node shot.mjs <page.html> <outPrefix> <jobs JSON> [w] [h]'); process.exit(1); }
const jobs = JSON.parse(jobsJson);
fs.mkdirSync(path.dirname(path.resolve(outPrefix)), { recursive:true });

// Serve the page with three.js from local node_modules so no network is needed.
const root = path.dirname(path.resolve(file)), port = +(process.env.PORT || 8765);
const page = fs.readFileSync(file, 'utf8')
  .replace('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js', '/node_modules/three/build/three.module.js')
  .replace('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/', '/node_modules/three/examples/jsm/')
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

let i = 0;
for (const j of jobs){
  const t0 = Date.now();
  const url = await tab.evaluate(j => {
    const H = window.__helios;
    if (j.q) H.setQuality(j.q);
    if (j.biome) H.load(j.biome);
    if (j.tod) H.S.sun = H.S.tSun = H.TOD[j.tod].slice();
    if (j.wx) H.S.wx = H.S.tWx = H.WX[j.wx].slice();
    if (j.tod || j.wx) H.relight?.();   // re-bake the sky light for the new sun/weather
    if (j.cam){ const [x,y,z,yaw,pitch] = j.cam; H.S.pos.set(x,y,z); H.S.tPos.set(x,y,z); H.S.yaw = H.S.tYaw = yaw; H.S.pitch = H.S.tPitch = pitch; }
    if (j.opt) H.option(...j.opt);
    for (const [el, x, z, r, k] of j.strike || []) H.strike(el, x, z, r, k);
    if (j.sim) H.sim(j.sim);
    return H.snap(j.steps || 3);
  }, j);
  const status = await tab.evaluate(() => window.__helios.status?.() ?? "");
  const stats = await tab.evaluate(() => window.__helios.stats());
  const out = `${outPrefix}-${i++}.jpg`;
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
  console.log(out, 'triangles', stats.triangles, 'draw calls', stats.calls, ((Date.now()-t0)/1000).toFixed(1) + 's', status ? '| ' + status : '');
}
await browser.close(); srv.close();
