# Kenney Asset Integration

This project is preconfigured for the Kenney 1-Bit Platformer Pack:
https://kenney.nl/assets/1-bit-platformer-pack

## Installed Pack

The downloaded archive is extracted to:

- `public/assets/kenney/1-bit-platformer-pack/`

The runtime loader reads:

- `public/assets/kenney/manifest.json`

Current default mapping uses 1-bit transparent tiles for:

- `tile`
- `tile-dirt`
- `tile-path`
- `tile-water`

## Override Any Texture

You can map any supported key to any PNG inside the pack:

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

If a key is not mapped or fails to load, the game falls back to generated runtime art.

## License

See `public/assets/kenney/1-bit-platformer-pack/License.txt`.
