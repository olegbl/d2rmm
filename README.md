# Diablo II: Resurrected Mod Manager

D2RMM is a mod manager for Diablo II: Resurrected.

See the [Nexus page](https://www.nexusmods.com/diablo2resurrected/mods/169) for a full description.

## Example Mods

You can find some example mods over at [https://github.com/olegbl/d2rmm.mods](https://github.com/olegbl/d2rmm.mods). There are also [API Docs](https://olegbl.github.io/d2rmm/) available.

## Building

- [https://github.com/nodejs/node-gyp#on-windows](https://github.com/nodejs/node-gyp#on-windows)
  - I needed `npm config set msvs_version 2019` instead of `npm config set msvs_version 2017`.
- `git clone`
- `cd d2rmm`
- `yarn install`
- `npm start` to debug
- `npm run package` to build release
- `npm run docs` to build documentation
- `npm run build:updater` to build auto-updater exe
- `npm run build:config-schema` to build config json schema

## Experimental support for macOS

See [instructions](README.macos.md).
