// Headless render harness: loads index.html with a software WebGL renderer, drives
// the engine through window.__helios and saves one JPEG per job.
//
//   node shot.mjs <page.html> <outPrefix> '<jobs JSON>' [width] [height]
//   job: { "biome":"amazon", "q":"fast|balanced|ultra", "tod":"dawn|noon|dusk|night",
//          "cam":[x, y, z, yaw, pitch], "steps":3 }
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
const page = fs.readFileSync(file, 'utf8')
  .replace('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js', '/node_modules/three/build/three.module.js')
  .replace('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/', '/node_modules/three/examples/jsm/')
  .replace(/<link rel="stylesheet" href="https:\/\/fonts[^>]*>/, '');
const srv = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/' || p === '/page.html'){ res.writeHead(200, {'Content-Type':'text/html'}); return res.end(page); }
  const f = path.join(here, p);
  if (!f.startsWith(here) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, {'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'application/octet-stream'}); fs.createReadStream(f).pipe(res);
}).listen(8765);

const browser = await puppeteer.launch({
  args:[...chromium.args, '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  executablePath: await chromium.executablePath(), headless:true, defaultViewport:{ width:+w, height:+h }, protocolTimeout:600000 });
const tab = await browser.newPage();
tab.on('console', m => { const t = m.text(); if (!/GPU stall|swiftshader|WebGL-/i.test(t)) console.log('[console]', t.slice(0,300)); });
tab.on('pageerror', e => console.log('[pageerror]', e.message));
await tab.evaluateOnNewDocument(() => { window.__HEADLESS = true; });
await tab.goto('http://localhost:8765/page.html', { waitUntil:'load', timeout:120000 });
await tab.waitForFunction(() => window.__helios, { timeout:120000 });
await tab.evaluate(() => document.querySelectorAll('.plate,.help,#hud,#stick,#veil,#show').forEach(e => e.style.display = 'none'));

let i = 0;
for (const j of jobs){
  const t0 = Date.now();
  const url = await tab.evaluate(j => {
    const H = window.__helios;
    if (j.q) H.setQuality(j.q);
    if (j.biome) H.load(j.biome);
    if (j.tod) H.S.sun = H.S.tSun = ({ dawn:[-0.9,0.07], noon:[0.25,1.05], dusk:[0.1,0.09], night:[-0.5,-0.3] })[j.tod].slice();
    if (j.cam){ const [x,y,z,yaw,pitch] = j.cam; H.S.pos.set(x,y,z); H.S.tPos.set(x,y,z); H.S.yaw = H.S.tYaw = yaw; H.S.pitch = H.S.tPitch = pitch; }
    return H.snap(j.steps || 3);
  }, j);
  const stats = await tab.evaluate(() => window.__helios.stats());
  const out = `${outPrefix}-${i++}.jpg`;
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
  console.log(out, 'triangles', stats.triangles, 'draw calls', stats.calls, ((Date.now()-t0)/1000).toFixed(1) + 's');
}
await browser.close(); srv.close();
