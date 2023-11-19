# Mod Manager

- Allow mods to be written in TypeScript
  - Probably need to move tsconfig into /src/ so that root level tsconfig could be shipped with D2RMM and be used when editing files inside /mods/
- Allow TypeScript based mods to be composed of multiple files
  - Probably need to run a WebPack process to compile everything into JS on demand
- Add D2RMM.getModList() API
  - Return list of mods already installed during this installation
  - Return list of mods yet to be installed during this installation
  - Include version number of each mod
  - Include config of each mod

# Mods

- New mod that dynamically generates list of all Horadric Cube recipes (UI Panel)
- New mod that dynamically generates list of all Runewords (UI Panel)
- New mod that dynamically generates list of all installed mods (UI Panel)
- d2s based save editor
