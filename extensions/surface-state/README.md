# Biome Triad — Dynamic Surface & Environmental State Layer

Drop-in ES module package for `jrmoyler/biome-triad`, aligned to Ability Matrix UCSM after merge commit `cdb861f070e34f99046673241e66ec047e608cc7` (PR #15).

## Scope
- Sparse, bounded deterministic 2D surface grid (world X/Z; no mesh edits required).
- 15 base material types and six legacy biome defaults.
- 23 elemental impacts, weather, heat, wetness, snow, ice, combustion, charge, contamination, integrity, growth, visibility, friction, temporary modifiers.
- Biome-scoped update and query API, snapshot/restore, UTC-independent fixed 30-Hz tick, test suite.
- UCSM adapter uses actual event fields: `type:'terrain-impact'`, `element:'storm'` for Lightning, `abilityUid`, `ownerId`, `position`, `shape`, `mechanic:'worldshape'`.

## Install into Biome Triad
Copy this package to `extensions/surface-state/` in your `biome-triad` checkout. Since current Biome Triad loads Three.js through an import map and lives in `index.html`, import the ES module from a `<script type="module">` or from a modularized source file. It has **zero runtime dependencies** and does not modify the original six biomes.

```js
import {createBiomeSurfaceLayer} from './extensions/surface-state/src/index.mjs';
const layer=createBiomeSurfaceLayer('amazon',{
  materialAt:(x,z)=>x>15?'vegetation':'soil', cellSize:3, maxCells:12000
});
layer.impact({eventId:'demo:1', element:'fire',position:[5,0,8],radius:4,intensity:1});
// inside your existing update loop
layer.update(dt,{weather:'rain',temperature:22});
console.log(layer.sample(5,8));
```

To attach to a `Helios.registerBiome` build, create one layer inside the biome `build(k)`, call `layer.update(dt,env)` in its returned `update`, and expose `layer` through a stable host registry. Example in `examples/register-biome.md`.

**This is an engine package, not a patch to `index.html`.** It must be wired into biome lifecycle, visual material shaders, physics, and the game navigation layer by the integrating agent. No new biome or scene was generated.

## Ability Matrix UCSM interaction
The actual UCSM has `submit(event)`, not a surface-material API. Use `ingestCombatImpact(layer.surface,event)` for raw `terrain-impact` events only, then call `surfaceToUCSM(layer.surface, combat)` to emit the environment's new impacts. Do **not** blindly feed emitted events back to this layer; `biome-surface` tags prevent simple loops.

For full integration, wire the bridge at an event bus rather than polling `combat.log`; the current Ability Matrix `PackAdapter` is the authority for casts and `CombatStateManager` resolves reactions. Establish dedupe and shared `castId` handling before production integration. An independently authored visual shader or collision adapter should subscribe to surface revisions and update corresponding GPU uniforms/collider types.

## Current limitations
- No terrain mesh deformation, actual fire spread to neighbors, fluid solver, shader hookups, real snow displacement, physics bindings, multiplayer serialization, or external persistence yet.
- Temporary elemental modifiers are state descriptors, not arbitrary gameplay damage multipliers.
- Collision, AI navigation and VFX must consume this grid. Reactivity in this package is state-level and tested, not visually integrated.
- Current weather integration is a minimal translation of `wx` strings. Existing biome weather should pass actual climate scalars when available.

## Tests
`npm test` (Node 18+).
