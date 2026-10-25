import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
const html = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8');
const code = html.slice(html.indexOf('const POST_DEFAULT ='), html.indexOf('const PP = (() =>'));
function setup() {
  const c = vm.createContext({ activeDef:{post:{bloom:0.4, ao:0.7}}, active:{post:{bloom:0.85, ao:0.8}} });
  vm.runInContext(code, c);
  return c;
}
test('zero overrides survive repeated live updates, with all supported controls', () => {
  const c = setup();
  vm.runInContext(`setPostOverrides(Object.fromEntries(Object.keys(POST_DEFAULT).map(k => [k, k === 'tint' ? [1,1,1] : 0])));`, c);
  for (let frame=0; frame<20; frame++) {
    c.active.post = { bloom:frame+1, ao:0.8, tint:[0.8,1,1.1] };
    const p = c.resolvePostSettings();
    for (const [k,v] of Object.entries(p)) assert.deepEqual(JSON.parse(JSON.stringify(v)), k === 'tint' ? [1,1,1] : 0, k);
  }
});
test('partial override merges, release and clear restore live/default precedence without mutations', () => {
  const c = setup(), before = JSON.stringify([c.activeDef, c.active]);
  c.setPostOverrides({ bloom:0 }); c.setPostOverrides({ ao:0.2 });
  assert.equal(c.resolvePostSettings().bloom, 0);
  assert.equal(c.resolvePostSettings().ao, 0.2);
  c.setPostOverrides({ bloom:null });
  assert.equal(c.resolvePostSettings().bloom, 0.85);
  c.setPostOverrides(null);
  assert.equal(c.resolvePostSettings().ao, 0.8);
  assert.equal(JSON.stringify([c.activeDef,c.active]), before);
  c.active.post = {}; assert.equal(c.resolvePostSettings().bloom, 0.4);
  c.activeDef.post = {}; assert.equal(c.resolvePostSettings().bloom, 0.5);
});
test('caller-owned tint arrays cannot mutate overrides; unknown keys are ignored', () => {
  const c = setup(), tint = [1,0.9,0.8];
  c.setPostOverrides({ tint, unknown:42 }); tint[0] = 0;
  assert.equal(c.resolvePostSettings().tint[0], 1);
  assert.equal(c.resolvePostSettings().unknown, undefined);
});
test('renderer, biome lifecycle and screenshot jobs use the override layer', () => {
  assert.match(html, /resolvePostSettings\(P\);/);
  assert.match(html, /setPostOverrides\(null\);\s+activeDef = def/);
  assert.match(html, /post: setPostOverrides/);
  assert.doesNotMatch(html, /activeDef\.post\s*=/);
  const shot = readFileSync(new URL('../shot.mjs', import.meta.url), 'utf8');
  assert.match(shot, /H\.post\(null\);[^\n]*\n\s+if \(j.post\) H.post\(j.post\)/);
});
test('consecutive screenshot jobs without a biome reload cannot inherit overrides', () => {
  const shot = readFileSync(new URL('../shot.mjs', import.meta.url), 'utf8');
  const body = shot.split('const url = await tab.evaluate(j => {')[1].split('}, j);')[0];
  const c = setup();
  c.window = { __helios: { post:c.setPostOverrides, snap:() => c.resolvePostSettings() } };
  c.j = { post:{bloom:0} };
  const run = () => vm.runInContext(`(() => { ${body} })()`, c);
  assert.equal(run().bloom, 0);
  c.j = {}; assert.equal(run().bloom, 0.85);
});
