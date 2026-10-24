# Biome Triad — Dynamic Surface & Environmental State Layer

Drop-in ES module package for `jrmoyler/biome-triad`, aligned to Ability Matrix UCSM after merge commit `cdb861f070e34f99046673241e66ec047e608cc7` (PR #15).

## Scope
- Sparse, bounded deterministic 2D surface grid (world X/Z; no mesh edits required). Untouched ground follows a
  shared `ambient` state (the weather acting on bare ground); a cell only exists where something made it diverge,
  and recovered cells are pruned back into the ambient field.
- Wind-driven fire spread between neighbouring cells (fuel = flammability × remaining integrity), fires that flare on
  fresh fuel and die as it runs out, rain and water that put fires out, `scorch` left behind, slow regrowth.
- 15 base material types and six legacy biome defaults.
- 23 elemental impacts, weather, heat, wetness, snow, ice, combustion, charge, contamination, integrity, growth, visibility, friction, temporary modifiers.
- Biome-scoped update and query API, snapshot/restore, UTC-independent fixed 30-Hz tick, test suite.
- UCSM adapter uses actual event fields: `type:'terrain-impact'`, `element:'storm'` for Lightning, `abilityUid`, `ownerId`, `position`, `shape`, `mechanic:'worldshape'`.

## In Biome Triad
This package lives at `extensions/surface-state/` and is loaded by `index.html`, which runs one layer per world:
it feeds the layer the HUD weather, the world's climate (temperature by altitude) and a prevailing wind, strikes it
from the Touch tools, and mirrors the cells around the viewer into a texture window that the terrain, ground cover,
tree and impostor shaders read (wet, snow, ice, char, live embers, trampled and burnt plants). Live fire is drawn as
flames, smoke and firelight. Each world supplies `materialAt(x, z)`.

## Install elsewhere
Copy this package into your checkout. Since current Biome Triad loads Three.js through an import map and lives in `index.html`, import the ES module from a `<script type="module">` or from a modularized source file. It has **zero runtime dependencies** and does not modify the original six biomes.

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

## API additions (0.2)
- `peek(x, z)` returns a cell or `null` without allocating; `sample()` of untouched ground no longer allocates.
- Options `spread` (default `true`), `spreadRate`, `prune` (default `true`); `ambient` state included in snapshots.
- New per-cell field `scorch`; `force` now damages integrity (trampled, flattened, broken surfaces).
- `createBiomeSurfaceLayer().update(dt, env)` also accepts the engine's numeric env: `{rain, humidity, light, wind:[x,z], temperature}`.

## Current limitations
- No terrain mesh deformation, fluid solver, real snow displacement, physics bindings, multiplayer serialization, or external persistence yet.
- Temporary elemental modifiers are state descriptors, not arbitrary gameplay damage multipliers.
- Collision, AI navigation and VFX must consume this grid. Reactivity in this package is state-level and tested, not visually integrated.
- Current weather integration is a minimal translation of `wx` strings. Existing biome weather should pass actual climate scalars when available.

## Tests
`npm test` (Node 18+).
