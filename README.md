# Runes of the Void

Vercel-compatible Next.js + Phaser RPG vertical slice with deterministic dungeon instances, class-based stats, telegraphed boss attacks, loot/equipment progression, and browser persistence.

## Features (MVP Vertical Slice)

- Landing page at `/` with title and Play button
- Game page at `/play` with Phaser loaded client-side only (no SSR runtime issues)
- Isometric overworld movement (WASD), camera follow, NPC interaction hint, and dungeon portal
- Instanced dungeon generation from a seed
- Wave combat, then boss with multi-phase behavior
- Telegraph attacks (danger zone shown before damage)
- Adds summoned during boss phase 2
- Loot drops with rarity tiers: Common, Uncommon, Rare, Epic, Legendary
- Inventory + equip/unequip (weapon/armor)
- Class roles: Tank / Healer / DPS
- Derived stats and power level affected by class, level, and gear
- Difficulty scaling foundations by dungeon tier and power level
- Save/load with `localStorage` (class, inventory, equipment, progression)

## Controls

- `W A S D`: Move
- `F`: Enter dungeon when near portal in overworld
- `E`: Interact near NPC marker
- `Space`: Basic attack (cooldown)

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

3. Open:

```text
http://localhost:3000
```

## Production Build

```bash
npm run build
npm run start
```

## Vercel Deployment

1. Push this repository to GitHub.
2. Import the repo in Vercel.
3. Framework preset: Next.js (auto-detected).
4. Build command: `npm run build`.
5. Output: Next.js default.
6. Deploy.

No custom server configuration is required.

## Architecture

- `src/app/`
	- App Router pages (`/` landing, `/play` game route)
- `src/components/`
	- React UI overlay and browser-only Phaser mount
- `src/game/`
	- Core RPG systems (classes, stats, scaling, RNG, loot, inventory, persistence, global store)
- `src/phaser/`
	- Phaser boot/config and scene implementations (overworld + dungeon/boss)

### Key Modules

- `src/game/rng.ts`: Seeded deterministic RNG (`mulberry32`) and seed hashing
- `src/game/stats.ts`: Derived player stats, power level, enemy scaling
- `src/game/loot.ts`: Rarity-based loot generation and item stat modifiers
- `src/game/store.ts`: Runtime state + persistence bridge for React and Phaser
- `src/phaser/scenes/OverworldScene.ts`: Movement, map rendering, portal trigger
- `src/phaser/scenes/DungeonScene.ts`: Waves, boss phases, telegraphs, adds, rewards

## Notes

- Assets are generated at runtime with Phaser graphics (no external CDNs required).

- Prototype intentionally uses lightweight overlap/proximity checks instead of heavy physics.


3. Launch the game. Any missing key automatically falls back to generated art.

Expected texture keys:

- `tile`
- `tile-dirt`
- `tile-path`
- `tile-water`
- `player`
- `enemy`
- `boss`
- `telegraph`
- `portal`
- `npc`
- `add`
- `slash`

### Imported ZIP Packs

The following ZIP archives are extracted and used via CSS sprite sheets or procedural generation:

- `public/assets/sprites/free-pixel-art-dungeon-crawler-mini-pack-90-sprites-assets.zip`
- `public/assets/sprites/free-rpg-characters-companions-pixel-art-240-sprites-assets.zip`
- `public/assets/sprites/free-rpg-weapons-armor-pixel-art-160-sprites-assets.zip`
- `public/assets/tiles/free-rpg-tilesets-pixel-art-350-sprites-assets.zip`
- `public/assets/ui/free-pixel-art-ui-kit-mini-pack-80-sprites-assets.zip`

Two archives currently fail to extract (`zipfile corrupt`) and were not imported:

- `public/assets/sprites/free-pixel-art-treasure-chests-475-game-assets-assets.zip`
- `public/assets/sprites/free-rpg-enemies-bosses-pixel-art-200-sprites-assets.zip`