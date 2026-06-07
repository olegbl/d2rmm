# Diablo II: Resurrected Mod Manager

D2RMM is a mod manager for Diablo II: Resurrected.

See the [Nexus page](https://www.nexusmods.com/diablo2resurrected/mods/169) for a full description.

## Example Mods

You can find some example mods over at [https://github.com/olegbl/d2rmm.mods](https://github.com/olegbl/d2rmm.mods). There are also [API Docs](https://olegbl.github.io/d2rmm/) available.

## Building

- [https://github.com/nodejs/node-gyp#on-windows](https://github.com/nodejs/node-gyp#on-windows)
- D2RMM uses Node v22 by default, so make sure to install that (e.g. via nvm).
- `git clone`
- `cd d2rmm`
- `yarn install`
- `yarn start` to run D2RMM in debug mode
- `yarn package` to build a release of D2RMM
- `yarn docs` to build documentation site
- `yarn build:updater` to build the auto-updater
- `yarn build:casclib` to build the CascLib native library
- `yarn build:config-schema` to build config json mod schema

## macOS Support (arm64 only, experimental)

> **Note:** macOS support is experimental and not officially supported. Things may not work as expected.

Pre-built releases are available (.dmg) for Apple Silicon Macs (M1/M2/M3/M4). Intel Macs are not currently supported.

Since Diablo II: Resurrected has no native MacOS version, you'll need to run the game using external tools (e.g. [CrossOver](https://www.codeweavers.com/crossover)). Launch D2R with the run options: `-mod D2RMM -txt`

Building from source follows the same steps as Windows. `yarn package` produces a `.dmg` in `release/build/`.

## linux support (experimental)

> **Note:** linux support is experimental and not officially supported. Things may not work as expected.

Pre-built releases are available (.tar.gz).

Since Diablo II: Resurrected has no native Linux version, you'll need to run the game using external tools (e.g. [Lutris](https://github.com/lutris/lutris)). Launch D2R with the run options: `-mod D2RMM -txt`

Building from source follows the same steps as Windows. `yarn package` produces a `.tar.gz` archive in `release/build/`.
