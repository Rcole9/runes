# Kenney Asset Integration

This project supports optional external textures via `manifest.json`.

## How to use Kenney assets

1. Download a compatible pack from https://kenney.nl/assets
2. Export or copy PNG files into `public/assets/kenney/`
3. Add entries to `manifest.json` where key = in-game texture key and value = public path.

Example `manifest.json`:

```json
{
  "tile": "/assets/kenney/tile.png",
  "tile-dirt": "/assets/kenney/tile-dirt.png",
  "tile-path": "/assets/kenney/tile-path.png",
  "tile-water": "/assets/kenney/tile-water.png",
  "player": "/assets/kenney/player.png",
  "enemy": "/assets/kenney/enemy.png",
  "boss": "/assets/kenney/boss.png",
  "telegraph": "/assets/kenney/telegraph.png",
  "portal": "/assets/kenney/portal.png",
  "npc": "/assets/kenney/npc.png",
  "add": "/assets/kenney/add.png",
  "slash": "/assets/kenney/slash.png"
}
```

When a key is missing, the game falls back to generated runtime art.

## License

Kenney assets are typically distributed under CC0, but verify the exact license terms of the pack you download.
