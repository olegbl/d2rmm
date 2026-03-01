# D2RMM Codebase Map — Where to Find Things

## "I need to change X" → "Edit file Y"

### App startup / window creation
→ [src/main/main.ts](../src/main/main.ts)

### Worker thread startup / API initialization order
→ [src/main/worker/worker.ts](../src/main/worker/worker.ts)

### IPC routing / `provideAPI` / `consumeAPI` implementation
→ [src/main/IPC.ts](../src/main/IPC.ts)

### Worker thread IPC (worker-side)
→ [src/main/worker/IPC.ts](../src/main/worker/IPC.ts)

### App preferences (paths, settings) — persistence
→ [src/main/preferences.ts](../src/main/preferences.ts)

---

## Bridge (Type Contracts)

| API | Bridge file |
|-----|-------------|
| Core mod install, file I/O | [src/bridge/BridgeAPI.d.ts](../src/bridge/BridgeAPI.d.ts) |
| Nexus Mods (download, collections) | [src/bridge/ModUpdaterAPI.d.ts](../src/bridge/ModUpdaterAPI.d.ts) |
| Nexus data types | [src/bridge/NexusModsAPI.d.ts](../src/bridge/NexusModsAPI.d.ts) |
| App info (path, version) | [src/bridge/AppInfoAPI.d.ts](../src/bridge/AppInfoAPI.d.ts) |
| Event bus | [src/bridge/EventAPI.d.ts](../src/bridge/EventAPI.d.ts) |
| Open URLs/files | [src/bridge/ShellAPI.d.ts](../src/bridge/ShellAPI.d.ts) |
| nxm:// protocol | [src/bridge/NxmProtocolAPI.d.ts](../src/bridge/NxmProtocolAPI.d.ts) |
| Auto-updater | [src/bridge/UpdateInstallerAPI.d.ts](../src/bridge/UpdateInstallerAPI.d.ts) |
| HTTP requests | [src/bridge/RequestAPI.d.ts](../src/bridge/RequestAPI.d.ts) |
| Mod config types | [src/bridge/ModConfig.d.ts](../src/bridge/ModConfig.d.ts) |
| TSV data type | [src/bridge/TSV.d.ts](../src/bridge/TSV.d.ts) |
| JSON data type | [src/bridge/JSON.d.ts](../src/bridge/JSON.d.ts) |
| IPC message schema | [src/bridge/IPC.d.ts](../src/bridge/IPC.d.ts) |
| API type constraints | [src/bridge/API.d.ts](../src/bridge/API.d.ts) |

---

## Worker Implementations

| Feature | File |
|---------|------|
| **Core mod installation** | [src/main/worker/BridgeAPI.ts](../src/main/worker/BridgeAPI.ts) |
| Nexus Mods REST + GraphQL | [src/main/worker/ModUpdaterAPI.ts](../src/main/worker/ModUpdaterAPI.ts) |
| CascLib native binding | [src/main/worker/CascLib.ts](../src/main/worker/CascLib.ts) |
| QuickJS sandbox | [src/main/worker/quickjs.ts](../src/main/worker/quickjs.ts) |
| Auto-updater | [src/main/worker/UpdaterAPI.ts](../src/main/worker/UpdaterAPI.ts) |
| Mod manifest loading | [src/main/worker/ModAPI.ts](../src/main/worker/ModAPI.ts) |
| TSV file parser | [src/main/worker/TSVParser.ts](../src/main/worker/TSVParser.ts) |
| JSON file parser | [src/main/worker/JSONParser.ts](../src/main/worker/JSONParser.ts) |
| Sprite parser | [src/main/worker/SpriteParser.ts](../src/main/worker/SpriteParser.ts) |

---

## Main Process APIs

| Feature | File |
|---------|------|
| nxm:// URL handling | [src/main/NxmProtocolAPI.ts](../src/main/NxmProtocolAPI.ts) |
| Worker spawning | [src/main/Workers.ts](../src/main/Workers.ts) |
| App info (path/version) | [src/main/AppInfoAPI.ts](../src/main/AppInfoAPI.ts) |
| Event bus (main→renderer) | [src/main/EventAPI.ts](../src/main/EventAPI.ts) |
| Shell open | [src/main/ShellAPI.ts](../src/main/ShellAPI.ts) |
| HTTP requests | [src/main/RequestAPI.ts](../src/main/RequestAPI.ts) |
| Electron utilities | [src/main/ElectronUtilsAPI.ts](../src/main/ElectronUtilsAPI.ts) |
| Logging to electron-log | [src/main/ConsoleAPI.ts](../src/main/ConsoleAPI.ts) |
| Auto-update installer | [src/main/UpdateInstallerAPI.ts](../src/main/UpdateInstallerAPI.ts) |
| App version info | [src/main/version.ts](../src/main/version.ts) |

---

## React — Context / State

All contexts live in [src/renderer/react/context/](../src/renderer/react/context/)

| Context | Hook | State |
|---------|------|-------|
| `ModsContext` | `useModsContext()` | Mod list, enabled map, order |
| `NexusModsContext` | `useNexusModsContext()` | API key, auth (name, email, isPremium), limits |
| `DialogContext` | `useDialogContext()` | showDialog, hideDialog, open dialogs |
| `InstallContext` | `useInstallContext()` | Installation progress/status |
| `ToastContext` | `useToastContext()` | Toast notifications |
| `LogContext` | `useLogContext()` | App log entries |
| `AppUpdaterContext` | `useAppUpdaterContext()` | Update available/status |
| `ThemeContext` | `useThemeContext()` | MUI theme (dark/light) |
| `SessionContext` | `useSessionContext()` | Current session state |
| `TabContext` | `useTabState()` | Active tab |
| `GamePathContext` | `useGamePathContext()` | D2R game path |
| `OutputPathContext` | `useOutputPathContext()` | Output mod path |
| `SavesPathContext` | `useSavesPathContext()` | D2 saves path |
| `DataPathContext` | `useDataPathContext()` | Data path |
| `IsDirectModeContext` | `useIsDirectModeContext()` | Direct mode flag |
| `UpdatesContext` | `useUpdatesContext()` | Mod update status |

---

## React — Custom Hooks (Business Logic)

All in [src/renderer/react/context/hooks/](../src/renderer/react/context/hooks/)

| Hook | Purpose |
|------|---------|
| `useCreateCollection` | Create/update Nexus Mods collection |
| `useModCollectionInstaller` | Install all mods from a collection |
| `useModInstaller` | Install a single mod |
| `useNxmProtocolHandler` | Handle incoming nxm:// events |
| `useNxmProtocolRegistrar` | Register/unregister nxm:// protocol |
| `useValidateNexusModsApiKey` | Validate API key on entry |
| `useNexusModsApiStateListener` | Rate limit monitoring |
| `useCheckModsForUpdates` | Check all mods for newer versions |
| `useModUpdater` | Update all outdated mods |
| `useModUpdate` | Update a single mod |

---

## React — UI Components

### Mod List Tab
| Component | File | Purpose |
|-----------|------|---------|
| ModList | [modlist/ModList.tsx](../src/renderer/react/modlist/ModList.tsx) | Container with search, drag-drop |
| ModListItem | [modlist/ModListItem.tsx](../src/renderer/react/modlist/ModListItem.tsx) | Single mod row |
| ModListMenu | [modlist/ModListMenu.tsx](../src/renderer/react/modlist/ModListMenu.tsx) | Right-click context menu |
| ModListSectionHeader | [modlist/ModListSectionHeader.tsx](../src/renderer/react/modlist/ModListSectionHeader.tsx) | Collapsible group header |
| OverflowActionsButton | [modlist/OverflowActionsButton.tsx](../src/renderer/react/modlist/OverflowActionsButton.tsx) | Toolbar "..." menu |
| ModInstallButton | [modlist/ModInstallButton.tsx](../src/renderer/react/modlist/ModInstallButton.tsx) | Install/Add mod button |
| CreateCollectionDialog | [modlist/CreateCollectionDialog.tsx](../src/renderer/react/modlist/CreateCollectionDialog.tsx) | Create/update Nexus collection |
| CreateCollectionMenuItem | [modlist/CreateCollectionMenuItem.tsx](../src/renderer/react/modlist/CreateCollectionMenuItem.tsx) | Opens CreateCollectionDialog |
| UpdateAllModsMenuItem | [modlist/UpdateAllModsMenuItem.tsx](../src/renderer/react/modlist/UpdateAllModsMenuItem.tsx) | Update all mods |
| AddSectionHeaderMenuItem | [modlist/AddSectionHeaderMenuItem.tsx](../src/renderer/react/modlist/AddSectionHeaderMenuItem.tsx) | Add a section divider |

### Settings / Other Tabs
| Component | File |
|-----------|------|
| ModManagerSettings | [react/ModManagerSettings.tsx](../src/renderer/react/ModManagerSettings.tsx) |
| ModManagerLogs | [react/ModManagerLogs.tsx](../src/renderer/react/ModManagerLogs.tsx) |
| AppUpdaterDialog | [react/AppUpdaterDialog.tsx](../src/renderer/react/AppUpdaterDialog.tsx) |
| InstallationProgressBar | [react/InstallationProgressBar.tsx](../src/renderer/react/InstallationProgressBar.tsx) |
| ED2R (save editor) | [react/ed2r/ED2R.tsx](../src/renderer/react/ed2r/ED2R.tsx) |

---

## Build / Config Files

| File | Purpose |
|------|---------|
| [package.json](../package.json) | Dev deps, scripts, electron-builder config, overrides |
| [release/app/package.json](../release/app/package.json) | Runtime deps (ship with app) |
| [tsconfig.json](../tsconfig.json) | TypeScript config |
| [.erb/configs/webpack.config.base.ts](../.erb/configs/webpack.config.base.ts) | Shared webpack rules |
| [.erb/configs/webpack.config.main.prod.ts](../.erb/configs/webpack.config.main.prod.ts) | Main process bundle |
| [.erb/configs/webpack.config.renderer.dev.ts](../.erb/configs/webpack.config.renderer.dev.ts) | Renderer dev server |
| [.erb/configs/webpack.config.renderer.prod.ts](../.erb/configs/webpack.config.renderer.prod.ts) | Renderer production bundle |
| [.erb/configs/webpack.paths.ts](../.erb/configs/webpack.paths.ts) | Path constants |
| [.erb/scripts/electron-rebuild.js](../.erb/scripts/electron-rebuild.js) | Native module rebuild |
| [.erb/scripts/prepackage.js](../.erb/scripts/prepackage.js) | Pre-package hook (builds updater) |
| [.github/workflows/main.yml](../.github/workflows/main.yml) | CI/CD pipeline |
| [afterSign.js](../afterSign.js) | macOS codesign hook for electron-builder |
| [typedoc.json](../typedoc.json) | TypeDoc config for API docs |

---

## "Where is the runtime dep for X?"

The **root `package.json`** has dev tools (webpack, TypeScript, electron, etc.).
The **`release/app/package.json`** has what actually ships:
- `@jitl/quickjs-wasmfile-release-asyncify` — mod execution engine
- `quickjs-emscripten-core` — QuickJS bindings
- `koffi` — native module FFI
- `regedit` — Windows registry (game path detection)
- `json5` — JSON5 parser
- `fflate` — ZIP archive (collection upload)

If you add a runtime dependency, add it to `release/app/package.json`, not just the root.
