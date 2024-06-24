# Mod Manager

- Show progress bar while downloading update
- Mod config actions
- Typeahead config
- Check for mod updates via GitHub
  - Check mod version via https://raw.githubusercontent.com/olegbl/d2rmm.mods/main/DisableBattleNet/mod.json
  - Download entire repo as zip from https://api.github.com/repos/olegbl/d2rmm.mods/zipball/main
  - Shouldn't cost any API rate limit to check, and 1 request per mod to download update. GH limit is 60/hr by default.
- Check for mod updates via Nexus Mods
  - Requires D2RMM to register as mod manager with Nexus Mods
  - Requires using Nexus Mods authentication API
- Download mod updates for premium Nexus Mods users

# Mods

- New mod that dynamically generates list of all Horadric Cube recipes (UI Panel)
- New mod that dynamically generates list of all Runewords (UI Panel)
- New mod that dynamically generates list of all installed mods (UI Panel)

# Tools

- https://github.com/dschu012/d2s based save editor as electron project reading from game directory to understand modded files (data, sprites, etc...)
  - Maybe integrate CascLib, like in D2RMM, just to be able to read all the vanilla sprites/etc... without having to bundle them - but CascLib gives some folks trouble...
