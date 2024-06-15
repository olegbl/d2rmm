# Mod Manager

- Mod config actions
- Documentation
  - Write a simple tutorial
  - Add more examples to TSDocs
- Improved mod UI
  - Toggle all for subsections of checkboxes
  - Auto-complete
- Add D2RMM.getModList() API
  - Return list of mods already installed during this installation
  - Return list of mods yet to be installed during this installation
  - Include version number of each mod
  - Include config of each mod

# Mods

- New mod that dynamically generates list of all Horadric Cube recipes (UI Panel)
- New mod that dynamically generates list of all Runewords (UI Panel)
- New mod that dynamically generates list of all installed mods (UI Panel)

# Tools

- https://github.com/dschu012/d2s based save editor as electron project reading from game directory to understand modded files (data, sprites, etc...)
  - Maybe integrate CascLib, like in D2RMM, just to be able to read all the vanilla sprites/etc... without having to bundle them - but CascLib gives some folks trouble...
