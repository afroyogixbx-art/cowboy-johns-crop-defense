# Cowboy John's Crop Defense

A mobile-first tower defense game. You play a farmhand working for Cowboy John, defending his hemp plant from spider mites and other infestations that march a winding dirt path across South Field.

Play it in the browser: **[afroyogixbx-art.github.io/cowboy-johns-crop-defense](https://afroyogixbx-art.github.io/cowboy-johns-crop-defense/)**

To put it on your phone's home screen (same treatment as Dungeon of Echoes):

- **iPhone:** open the link in Safari, tap Share, then Add to Home Screen.
- **Android:** open it in Chrome, tap the ⋮ menu, then Add to Home screen or Install app.

It opens fullscreen like an app and works offline after the first visit. Updates on this repo show up the next time you open it.

## How it plays

Pests follow a fixed dirt path toward John's crop. Lives are the plant's health — it visibly wilts as it takes hits. Place towers *off* the path (Sticky Traps sit *on* it), earn cash from kills and from clearing a wave, upgrade along two branches (up to 4/2 or 2/4), and sell for a 70% refund. 40 waves, then freeplay. A Locust Swarm King arrives every 10 waves.

The farm autosaves between waves on this device. Copy a save code from the menu for a backup.

## Towers

1. **Ladybug Nest** — eats mites and small pests.
2. **Neem Oil Sprayer** — cone of oil that slows a pack.
3. **Sticky Trap** — on-path glue; wears out unless upgraded to Endless Sap.
4. **Scarecrow Gunslinger** — Cowboy John style revolver, long range.
5. **Praying Mantis Post** — short-range melee slashes.
6. **Predatory Mite Release** — mites that chew over time.
7. **UV Lamp** — reveals mildew (camo) and burns pests; Beacon shares detection.
8. **Crop Duster** — a biplane makes timed runs across the field.

## Pests

Spider mites, fast aphids, armored beetles, split caterpillars (they drop inchworms), flying fungus gnats, powdery mildew clouds (need detection), mite queens that spawn mites, locusts, and the Locust Swarm King.

## Keys

1–8 select towers, Space starts a wave, F toggles 2× speed, Q / E upgrade path A / B, T cycles targeting, X (or Shift+S) sells, Esc pauses or backs out. The phone back button asks before leaving.

## Develop

```bash
npm install
npm run dev
npm run build    # typechecks, builds dist/, copies to docs/
```

GitHub Pages is published from `dist/` by `.github/workflows/pages.yml`. `./publish.sh` pushes `main` and waits for the live URL.
