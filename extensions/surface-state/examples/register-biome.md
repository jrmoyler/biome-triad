# Register biome example

```js
import {createBiomeSurfaceLayer} from './extensions/surface-state/src/index.mjs';
const biomeLayers = new Map();
// Inside any existing Helios.registerBiome({...}) definition:
// build(k) {
//   const layer = createBiomeSurfaceLayer('amazon', { materialAt: (x,z) => biomeMaterialAt(x,z) });
//   biomeLayers.set('amazon', layer);
//   return {group, heightAt, update(dt,env) { layer.update(dt,env); /* existing update */ }};
// }
// On biome unload, biomeLayers.get(id)?.reset(), then biomeLayers.delete(id).
```

### Surface presentation adapter
Update per-tile colors, decals, ice accumulation and ground friction based on `layer.sample(x,z)`; do not bind simulation progression to renderer FPS. For production-scale texture mapping, create dirty-grid texture pages keyed by `revision`, not individual material instances per cell.
