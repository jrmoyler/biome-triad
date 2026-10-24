# Biome Triad

A real-time, explorable 3D biome engine built on Three.js (r160, WebGL2). It ships with eleven complete,
procedurally built worlds: the Amazon rainforest, tropical Sea islands, Ancient Egypt on the Nile, a frost-bitten
Arctic archipelago, an erupting Volcanic valley, a divine Haven of floating islands above a sea of clouds, an Ancient
Temperate Forest, a Boreal Taiga, a Savanna, a Canyon and its Badlands, and Alpine Highlands. Every world runs a
dynamic surface and environmental state layer: weather, fire and the Touch tools leave the ground wet, snowed on,
frozen, scorched or trampled, and fire spreads with the wind.
New biomes plug in as packages for open worlds, games and apps. Every world runs on to the horizon and keeps the
viewer inside its playable area.

**Run it:** serve the folder with any static host (GitHub Pages, Vercel, Netlify, or `npx serve` locally) and open
`index.html`. There is no build step; three.js loads from jsDelivr through an import map. Opening the file directly
from disk also works, but browsers refuse local module imports there, so the surface layer (fire, impacts, footprints in
the state grid) stays inert and only the weather-driven wet and snow cover is shown.

| Amazon (aerial, dawn) | Amazon (river, lily pads and lianas) |
|---|---|
| ![](docs/renders/amazon-aerial.jpg) | ![](docs/renders/amazon-river.jpg) |
| **Amazon (understory)** | **Egypt (Nile, temple, pyramids)** |
| ![](docs/renders/amazon-interior.jpg) | ![](docs/renders/egypt.jpg) |
| **Egypt (crop fields, mud-brick village)** | **Egypt (stepped limestone pyramids)** |
| ![](docs/renders/egypt-fields.jpg) | ![](docs/renders/egypt-pyramids.jpg) |
| **Sea (islands at dusk)** | **Sea (reef and shoreline foam)** |
| ![](docs/renders/sea.jpg) | ![](docs/renders/sea-reef.jpg) |
| **Sea (storm, rain with volumetric cloud deck)** | **Arctic (tidewater glacier and icebergs)** |
| ![](docs/renders/sea-storm.jpg) | ![](docs/renders/arctic.jpg) |
| **Arctic (aurora at night)** | **Arctic (cabin, inukshuks, whale skeleton)** |
| ![](docs/renders/arctic-aurora.jpg) | ![](docs/renders/arctic-cabin.jpg) |
| **Volcanic (lava river and ash plume)** | **Volcanic (night)** |
| ![](docs/renders/volcano.jpg) | ![](docs/renders/volcano-night.jpg) |
| **Volcanic (valley from above)** | **Haven (sky bridge to the sanctuary)** |
| ![](docs/renders/volcano-aerial.jpg) | ![](docs/renders/haven.jpg) |
| **Haven (tholos, halo, blossom groves)** | **Haven (sea of clouds)** |
| ![](docs/renders/haven-temple.jpg) | ![](docs/renders/haven-cloudsea.jpg) |
| **Forest (autumn stream at dusk)** | **Forest (elder oak with root buttresses)** |
| ![](docs/renders/forest.jpg) | ![](docs/renders/forest-elder.jpg) |
| **Forest (winter)** | **Taiga (frozen lake at dawn)** |
| ![](docs/renders/forest-winter.jpg) | ![](docs/renders/taiga.jpg) |
| **Taiga (blizzard)** | **Taiga (cracked and broken lake ice, footprints)** |
| ![](docs/renders/taiga-blizzard.jpg) | ![](docs/renders/taiga-ice.jpg) |
| **Savanna (controlled burn at dusk)** | **Savanna (wildfire front at night)** |
| ![](docs/renders/savanna.jpg) | ![](docs/renders/savanna-wildfire.jpg) |
| **Savanna (zebra herd)** | **Canyon (from the rim at golden hour)** |
| ![](docs/renders/savanna-herd.jpg) | ![](docs/renders/canyon.jpg) |
| **Canyon (haboob dust storm)** | **Canyon (cliff ledge trail)** |
| ![](docs/renders/canyon-duststorm.jpg) | ![](docs/renders/canyon-ledge.jpg) |
| **Alpine (meadow, rope bridge, glacier)** | **Alpine (avalanche)** |
| ![](docs/renders/alpine.jpg) | ![](docs/renders/alpine-avalanche.jpg) |
| **Alpine (storm: rain below the freezing level)** | |
| ![](docs/renders/alpine-storm.jpg) | |

## Controls

| Input | Action |
|---|---|
| WASD / arrows | Move |
| E / Space, Q / C | Rise, sink |
| Shift | Move fast |
| Drag | Look |
| Double-click | Mouse lock |
| 1–9, 0, − | Switch biome |
| Touch + click, or F | Strike the ground (fire, frost, water, storm, grow, force) where you click, or at the screen centre |
| H | Hide controls |
| Touch joystick | Move on phones |

The HUD also switches time of day (dawn, noon, dusk, night), weather (clear, rain with lightning, fog)
and quality (Fast, Balanced, Ultra). Phones start on Fast. Some worlds add their own controls (the Forest's seasons).
The line under the title reports what the world is doing (temperature, fire, canopy, wind, ice, climbing…).
Deep links: `index.html#amazon`, `#sea`, `#egypt`, `#arctic`, `#volcano`, `#haven`, `#forest`, `#taiga`, `#savanna`,
`#canyon`, `#alpine`.

## Engine overview

All code lives in `index.html`, grouped into these sections:

- **Renderer:** WebGL2 with MSAA, a logarithmic depth buffer (no z-fighting from 0.5 m to 16 km),
  ACES filmic tone mapping, PCF soft shadows on a texel-snapped shadow camera that follows the viewer,
  and a physical sky (`Sky.js`) that also feeds image-based lighting through PMREM.
- **Atmosphere:** sun and moon lighting, exponential fog tinted per biome, stars, rain streaks, lightning and
  shared wind uniforms. Clouds are volumetric: a raymarched cumulus slab (3D noise, sun-marched self shadowing,
  dual-lobe phase function, powder term) plus a cirrus deck, drawn on a sky dome. Each biome sets its own
  `clouds: { cover, base, top, cirrus, dark }`; rain thickens and darkens the deck, fog hides it, and the planar water
  reflection gets the same sky at half the march steps. The slab is marched from whichever side the viewer is on,
  so a biome can put it below the camera (the Haven's sea of clouds).
- **Precipitation:** rain streaks with lightning, plus world-anchored snow, ash, dust or glowing motes chosen per biome
  with `precip` (a world can swap it at runtime, e.g. rain below the freezing level and snow above). `fog.storm` and
  `fog.stormTint` turn the Rain weather into a blizzard or a dust storm.
- **Dynamic surface & environmental state** (`extensions/surface-state`): every world runs a deterministic, sparse
  state grid (3 m cells, 10 Hz) holding wetness, snow, ice, temperature, burn, scorch, integrity, growth, charge and
  more. The engine feeds it the HUD weather, the world's `climate` (air temperature with a lapse rate by altitude) and a
  veering prevailing wind; untouched ground follows an ambient field, so cells only exist where something happened.
  Fire spreads cell to cell through dry fuel, faster downwind, and dies out as the fuel runs out or rain falls. The
  cells around the viewer are mirrored into a 128×128 texture window that the terrain, ground cover, trees and
  impostors read: ground goes rain-dark and glossy, snow settles where the air is freezing, frost glazes it, fire
  leaves char and glowing embers, plants flatten when trampled and burn away, canopies are stripped and trunks charred.
  Live fire is drawn as flames, drifting smoke and flickering firelight. The Touch tools strike the layer with fire,
  frost, water, storm (with a lightning bolt), growth or force; worlds react through `onImpact`.
- **World edges:** `makeTerrain({ apron })` adds a coarse ring sampled from the same height and colour functions
  (optionally lifted, e.g. into a distant canopy) out to the horizon; `bounds`, `floor` and `ceiling` keep the
  viewer inside the playable area.
- **Terrain shading (`terrainMaterial`):** world-space noise breaks up vertex colour at three scales, slopes blend to
  banded strata rock, shorelines go wet and glossy, and per-biome options add wind-rippled sand, crop rows,
  animated shoreline foam, underwater caustics, snow glints, glowing lava-crust cracks and glacier ice
  (selected by a per-vertex `kind`). The bump is an analytic finite-difference normal
  perturbation with each octave faded by distance (no screen-derivative blockiness).
- **Ground cover (`scatter`):** instanced tiles are generated around the viewer from a deterministic `place()`
  callback and dropped behind it, so density is not limited by what the world can hold up front. Plants are real
  geometry (`bladeClump` with seed heads, `papyrusClump`, `fernPlant` with leaflet pairs, `broadleafPlant`,
  `lianaGeo`, `lilyGeo`, coral, boulders, logs) with wind sway, backlit translucency and a distance shrink fade.
- **Water:** planar-mirror `Water.js` on Balanced and Ultra; a cheap normal-mapped PBR surface on Fast.
- **Verdant (vegetation):**
  - `genTree(spec, seed)`: procedural broadleaf trees with buttressed trunks, branches, sub-branches and
    leaf-spray cards that radiate from the twigs, using spherical crown normals and baked occlusion.
  - `genPalm(spec, seed)`: palms with curved trunks, a leaf-base boot and V-folded, drooping pinnate fronds.
  - `sprayAtlas()` / `frondTexture()`: leaf textures painted leaf by leaf (midribs, veins, fold shading),
    uploaded as DataTextures so mipmaps have no dark fringes.
  - Foliage material: Standard PBR plus a translucency term (leaves glow toward the sun), wind sway,
    leaf flutter and a per-instance distance fade.
  - Impostors: every species is baked once into an 8-view albedo and normal atlas. Distant trees are
    single camera-facing quads lit with the same sun and sky as near trees, and they cross-fade into the
    full mesh with a screen-space dither. Near meshes are binned into 70 m tiles and culled by distance,
    which keeps around 17,000 Amazon trees interactive.
- **Biomes:** registered with `Helios.registerBiome({...})`.
  - **Amazon:** procedural broadleaf canopy with kapok emergents; understory of leaflet-built ferns, folded heliconia,
    bromeliads, fallen logs and mossy boulders; river with lily pads and lotus flowers; hanging liana curtains built
    from sagging strands with leaf blades; sun shafts that follow the viewer under the canopy; macaw pairs.
  - **Egypt:** pyramids built block by block (risers, treads, per-block depth jitter, patchy erosion, polished casing
    and gilded cap); a temple with a carved-glyph pylon, colossi, obelisks, a ram-sphinx avenue, flagpoles and a
    hypostyle hall of fluted columns with painted papyrus-bud capitals; mud-brick houses with roof stairs, beams
    and awnings; crop fields (barley, wheat) with seed heads; papyrus and reeds on the Nile bank; shadufs; rippled
    dunes with scrub and boulders.
  - **Sea:** islands with hummocks, cliffs and beaches; foam and caustics from the terrain shader; a reef of
    branching and brain coral with seagrass; fluted sea stacks; beach grass, jungle-floor ferns and heliconia;
    gull flocks and fish schools animated by instance-driven wing and tail beats.
  - **Arctic:** a barren archipelago of multi-summit islands with snow on the flats and dark rock on the steeps; a
    tidewater glacier with moraine stripes ending in a fluted, serac-topped ice cliff; calved icebergs (noise-swollen,
    plane-cut, lit by a cold subsurface term) and thousands of pack-ice floes; snow-capped boulders, frosted tussocks
    and ice blocks on the strand; a log cabin with a lit window, inukshuks and a bleached whale skeleton; sea smoke,
    petrels, drifting snow (a blizzard in rain) and folded aurora curtains at night.
  - **Volcanic:** a rugged valley climbing to a gullied stratovolcano; a lava river from a spatter-cone vent down the
    valley between levees, plus a crater lava lake, both with drifting crust plates over HDR molten glow and a lava
    light that follows the viewer; cooled flows with glowing cracks; an ash plume with ember-lit base and eruption
    pulses with volcanic lightning; lava bombs and spatter; fumaroles over sulfur crusts; columnar basalt
    colonnades, obsidian boulders and charred snags; falling ash and rising embers.
  - **Haven:** floating islands with meadows on top and hanging marble-strata undersides over a sea of clouds and a
    deep-blue abyss; a marble tholos with fluted columns, gilded capitals, a ribbed dome and lantern; a reflecting
    pool, cypress avenue and a walkable arched sky bridge with balustrades and lamps; a triumphal gate, a spire with
    turning gold rings and two small shrines; a gilded double halo with a pillar of light and beams from the sky;
    waterfalls pouring off the rims; blossom and cypress groves, wildflowers, drifting rock debris and far islands;
    doves and golden motes.
  - **Forest (Ancient Temperate Forest):** old-growth oak and beech in clumps and light gaps, giant elder oaks whose
    root buttresses are part of the walkable ground, a meandering stream with bridging and hollow logs you can walk
    across and through, a fallen-giant clearing with an upturned root plate, snags, holly and hazel, ferns, bluebells,
    fly agaric and bracket fungi. *Seasons* (Spring, Summer, Autumn, Winter) recolour and drop the leaves on trees,
    impostors, saplings and ground cover, repaint the leaf litter, add falling leaves, and in winter cool the air so
    the Rain weather falls as snow. *Canopy occlusion*: a crown-cover grid shades sun and sky light, tints the
    understorey green and drives the sun shafts (status: canopy %). *Destructible vegetation*: thousands of saplings
    topple under Force or Storm strikes, and fire and trampling flatten the ground cover.
  - **Taiga (Boreal Taiga):** spruce forest from a dedicated generator (drooping whorls, snow-laden needle shelves),
    birch, wind-flagged krummholz at the treeline, a 640 m frozen lake and ponds, fallen pines, a moose, caribou on
    the tundra and ravens. *Snow accumulation* thickens caps on rocks and logs, loads the spruce and buries trails.
    *Footprints*: walking leaves boot prints that fresh snow fills; deer and fox tracks follow the animal trails.
    *Breaking lake ice*: standing and running load the ice, cracks race and fork across it, it gives way under you
    (you drop into the water), floes bob in the hole, fire melts it and frost refreezes it. *Blizzards*: the Rain
    weather becomes a whiteout with sideways snow, gusts and spindrift (status: visibility).
  - **Savanna (Savanna and Grasslands):** rolling plains of chest-high grass, umbrella acacias, baobabs and thorn
    thickets, granite kopjes, termite mounds, two watering holes, herds of impala, zebra, wildebeest and giraffe, and
    circling vultures. *Concealment*: in tall grass you are hidden (crouch with Q); exposed, you startle the herds.
    *Wind-driven grass*: gust fronts roll across the plain along the wind. *Wildfire*: a burn is already running,
    dry lightning ignites more in storms, embers start spot fires downwind, herds flee the front, and fuel is bounded
    by tracks, pools and the plain's edge. *Surface dust*: dust devils, stampede dust and dust you kick up when moving
    fast; rain lays it.
  - **Canyon (Canyon and Badlands):** a winding gorge cut through thirteen sediment beds of cliffs and benches, side
    canyons, buttes, hoodoos and badlands, mesas on the horizon, a braided dry wash, alcoves, crystal and copper
    deposits, juniper, pinyon, cottonwood, yucca and agave, ravens and condors. *Rockfall*: boulders break from
    ledges, bounce and roll down the talus, raise dust and stay as debris. *Erosion decals*: desert varnish, runoff
    stains, tafoni and salt crust on the cliffs, mud cracks and salt rings in the wash; rain darkens and widens them.
    *Ledge traversal*: a cliff trail keeps you on the ledge (status: drop below). *Dust storms*: the Rain weather
    brings a haboob, then a cloudburst. *Echo propagation*: strikes, rockfall and footsteps echo off the walls with
    delays from ray casts, panned by direction (WebAudio starts on your first click).
  - **Alpine (Alpine Highlands):** a U-shaped valley climbing to a glacier and cirque, banded cliffs, meadows with
    flowers, scree fans, a glacial stream with cascades, a walkable rope bridge over a gorge that sways in the wind, a
    bolted climbing crag, a hut, choughs and eagles. *Elevation-dependent weather*: rain below the freezing level,
    sleet around it and snow above, a cloud band at the freezing level, a snowline that falls in storms.
    *Avalanches* release from loaded slopes or Force/Storm strikes and run down as a powder cloud and debris.
    *Rock climbing*: walk into the crag's route and climb with W/S. *Wind exposure*: ridges are windier than hollows,
    with buffeting, spindrift and wind chill.

## Adding a biome

Beyond the fields shown below, a world can declare `climate: { temp, lapse, night }`, `surface: { cellSize, humidity,
spread, amb }`, `options` (extra HUD buttons, delivered to `setOption`) and `windy`, and its build can return
`materialAt(x, z)` (surface material per cell: soil, sand, stone, vegetation, organic, wood, snow, ice, water…),
`status(env)` (the line under the title), `onImpact(element, point, radius)`, `onSurfaceEvent(event)`,
`locomote(S, forward, right, dt, keys)` (take over movement, e.g. climbing), and live `precip`, `fogK`, `fogTint`,
`windK` and `tempOffset` properties.


```js
Helios.registerBiome({
  id: 'tundra', label: 'Tundra',
  sky: { turbidity: 4, rayleigh: 1.5, mie: 0.005, mieG: 0.8 },
  fog: { density: 0.0012, tint: [0.9, 0.95, 1.0] },
  ground: [0.2, 0.22, 0.18],                       // hemisphere bounce colour
  camera: { pos: [0, 12, 0], look: [0, 8, -200] },  // or a function returning that
  clouds: { cover: 0.4, base: 1500, top: 3000, cirrus: 0.3 },   // volumetric sky for this biome
  precip: { kind: 'snow', base: 0.1, storm: 0.9, rainLines: false },  // optional snow / ash / motes
  bounds: [0, 0, 950],                                         // viewer stays within 950 m of the centre
  build(k) {
    const heightAt = (x, z) => 20 * k.noise.fbm(x * 0.003, z * 0.003, 5);
    const group = new k.THREE.Group();
    group.add(k.makeTerrain({ size: 2000, seg: 400, height: heightAt, apron: { size: 9000 },
      detail: { rock: [0.4, 0.37, 0.33], rockLo: 0.3, bump: 14, wet: 0.5 },   // optional: ripple, rows, foam, caustic
      color: (c, x, y, z, ny) => k.srgb(c, 0.3, 0.32, 0.25) }));
    group.add(k.makeWater({ size: 2000, color: 0x123040 }));

    // Define your own species (or reuse canopyA, canopyB, kapok, cecropia,
    // shrub, island, datePalm, coconut, acai)
    k.defineSpecies('spruce', { seed: 1, bark: 0x6b5a4a,
      leaves: () => k.sprayAtlas(2, { hue: 0.33, sat: 0.4, light: 0.2, len: [30, 50], width: 0.12, count: [30, 40], twig: '#3a2e20' }),
      tree: { h: 30, r: 0.5, buttress: 0, lean: 0.03, wobble: 0.3, trunkTop: 1.0, bStart: 0.2, branches: 18,
              el: [-0.2, 0.2], bLen: 0.12, curl: 0.05, subs: 1, cR: 1.6, flatY: 0.6, cards: 18, card: 1.4, droop: 0.4 } });

    const F = k.forest();
    for (let i = 0; i < 5000; i++) {
      const x = (Math.random() - 0.5) * 1800, z = (Math.random() - 0.5) * 1800;
      F.add('spruce', x, heightAt(x, z), z, 0.8 + Math.random() * 0.4, Math.random() * 6.28);
    }
    group.add(F.build());

    // Streaming ground cover: place() returns { y, s, c? } or null for each candidate position
    const tuft = k.bladeClump({ blades: 8, seg: 3, h: [0.3, 0.7], w: 0.035, spread: 0.2, bend: 0.6,
      colA: k.lin(0.1, 0.2, 0.06), colB: k.lin(0.4, 0.55, 0.2), seed: 1 });
    const grass = k.scatter({ geo: tuft, mat: k.plantMat({ wind: 0.05 }), radius: 70, per: 0.8,
      place: (x, z, r) => ({ y: heightAt(x, z), s: 0.7 + r() * 0.8 }) });
    group.add(grass.group);
    return { group, heightAt, update(dt, env) {} };   // scatter tiles follow the viewer automatically
  }
});
```

The biome appears in the HUD automatically and inherits time of day, weather, quality levels, LOD,
impostors, volumetric clouds and the walk floor.

## Visual verification

`tools/render-harness` renders views headlessly, using SwiftShader (software WebGL), so changes can be
checked without a GPU:

```bash
cd tools/render-harness
npm install
node shot.mjs ../../index.html out/check \
  '[{"biome":"amazon","q":"balanced"},{"cam":[60,75,250,0,-0.25]},{"biome":"egypt"},{"biome":"sea"}]' 960 540
```

Each job saves a JPEG and prints the triangle count and draw calls. A job accepts `biome`, `q`, `tod`,
`wx` (`clear`, `rain`, `fog`), `cam` (`[x, y, z, yaw, pitch]`), `opt` (`["season", "winter"]`), `strike`
(`[["fire", x, z, radius, intensity], ...]`), `sim` (seconds of weather, surface and wildlife to advance before the
frame) and `steps`. The engine exposes `window.__helios` (`load`, `setQuality`, `snap`, `stats`, `sim`, `strike`,
`option`, `status`) only for this harness. `PORT` sets the harness server port.

The surface package has its own tests: `cd extensions/surface-state && npm test` (Node 18+).

## Repository layout

```
index.html                     The engine and the eleven biomes (single file, no build)
extensions/surface-state/      Dynamic Surface & Environmental State layer (ES modules, zero dependencies, tests)
docs/renders/                  Reference frames from the render harness
tools/render-harness/          Headless screenshot tool (puppeteer + SwiftShader)
legacy/                        The original GLSL ES 3.00 raymarched version this project grew from
```

## Known gaps

- Performance was not profiled on physical GPUs or phones. The harness renders in software and reports triangle
  counts only. At Balanced the Amazon runs about 1.3 to 2.4 million triangles and Egypt about 0.5 to 1.7 million,
  depending on the view. Ground cover density and radius scale with the Fast, Balanced and Ultra levels.
- The volumetric clouds are the most expensive screen-space pass (14, 28 and 40 march steps per quality level).
  Far cloud detail is dropped past a fixed distance, and cloud edges can show faint dither banding.
- The Great Sphinx, interior chambers and hieroglyph colour are not modelled; the pylon glyphs are procedural
  marks, not real text.
- Fish, gulls, petrels and doves follow scripted orbits rather than flocking behaviour.
- The Volcanic and Haven worlds add point lights, extra transparent passes (plume, waterfalls, light beams) and a
  second reflection on the Haven pool at Balanced and Ultra; like the rest, they were only measured in software
  (about 0.6 to 1.5 million triangles at Balanced).
- Cooled lava flows, sulfur crusts and the glacier are painted per terrain vertex, so their outlines follow the
  terrain grid (5 to 10 m) when seen from above.
- The five newer worlds were also only measured in software. At Balanced their opening views run about 1.05 to 1.85
  million triangles; the Forest (252), Taiga (258) and Savanna (about 300) are the heaviest in draw calls, mostly from
  the 70 m tree tiles and their shadow pass.
- The surface layer is a 3 m grid simulated near the viewer, so scorch, snow and ice edges are soft at that scale,
  and the Taiga's broken-ice holes are about 1.3 m blocky. Far from the viewer only the ambient weather field shows.
- The Canyon's echoes and footsteps could not be listened to in the headless harness; only their timing, status and
  wall glows were checked. The Alpine glacier's seracs read pale and flat, and the Forest's fallen giant reads as a
  smooth mossy slab from the side.
- Herds, rooks, ravens and the avalanche run on simple CPU rules rather than real flocking or snow physics.
