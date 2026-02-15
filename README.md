# Diablo II: Resurrected Mod Manager

D2RMM is a mod manager for Diablo II: Resurrected.

See the [Nexus page](https://www.nexusmods.com/diablo2resurrected/mods/169) for a full description.

## Example Mods

You can find some example mods over at [https://github.com/olegbl/d2rmm.mods](https://github.com/olegbl/d2rmm.mods). There are also [API Docs](https://olegbl.github.io/d2rmm/) available.

## Building

- [https://github.com/nodejs/node-gyp#on-windows](https://github.com/nodejs/node-gyp#on-windows)
- D2RMM uses Node v18 by default, so make sure to install that (e.g. via nvm).
- `git clone`
- `cd d2rmm`
- `yarn install`
- `yarn start` to debug
- `yarn package` to build release
- `yarn docs` to build documentation
- `yarn build:updater` to build auto-updater exe
- `yarn build:config-schema` to build config json schema

## Experimental support for macOS

See [instructions](README.macos.md).
