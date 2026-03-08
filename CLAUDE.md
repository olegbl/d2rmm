# D2RMM — Claude Code Guide

D2RMM is an **Electron + React + TypeScript** desktop app — a mod manager for Diablo II: Resurrected. It uses `electron-react-boilerplate` as its structural foundation with webpack for bundling.

---

## Development Commands

```bash
yarn start          # Dev mode (launches webpack-dev-server + Electron)
yarn build          # Production build (main + renderer)
yarn package        # Full release build (electron-builder → zip/dmg)
yarn test           # Jest unit tests
yarn lint           # ESLint
yarn typecheck      # tsc --noEmit
yarn docs           # Generate TypeDoc site
yarn build:updater  # Build auto-updater binaries (requires pkg)
yarn build:casclib  # Build CascLib native module (requires node-gyp)
```

> CI uses `npm` (not yarn), despite `yarn.lock`. Local dev uses `yarn`. Node v22 required.

---

## Architecture Overview

Three distinct processes communicate via a type-safe IPC/RPC system:

```
Renderer (React UI)
    ↕ IPC (consumeAPI / provideAPI)
Main Process (Electron)
    ↕ Worker thread messages
Worker Thread (heavy lifting: mod install, Nexus API, file I/O)
```

All inter-process calls are typed through **bridge interfaces** in [src/bridge/](src/bridge/). See [.claude/architecture.md](.claude/architecture.md) for the full IPC pattern.

---

## Directory Structure

```
src/
├── bridge/          # Type definitions shared across all processes (IPC contracts)
├── main/            # Electron main process
│   └── worker/      # Worker thread implementations
├── renderer/        # React frontend
│   └── react/
│       ├── context/ # React Context providers + custom hooks (business logic)
│       ├── modlist/ # Mod list UI components
│       ├── ed2r/    # D2 save file editor
│       ├── mmsettings/  # App settings UI
│       └── hooks/   # Generic React hooks
├── shared/          # Code used by both main and renderer
├── types/           # Ambient TypeScript type definitions
└── updater/         # Auto-updater binary source
```

Key config locations:

- `.erb/configs/` — webpack configs (main prod, renderer dev/prod, base, paths)
- `.erb/scripts/` — build scripts (electron-rebuild, prepackage, clean, etc.)
- `.github/workflows/main.yml` — CI/CD (5 jobs: check-version, build-windows, build-macos, release, docs)
- `release/app/package.json` — runtime dependencies (what ships in the app)

---

## Key Files to Know

| What                           | Where                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------ |
| Root app entry (Electron main) | [src/main/main.ts](src/main/main.ts)                                                       |
| IPC routing                    | [src/main/IPC.ts](src/main/IPC.ts)                                                         |
| Core mod installation logic    | [src/main/worker/BridgeAPI.ts](src/main/worker/BridgeAPI.ts)                               |
| Nexus Mods integration         | [src/main/worker/ModUpdaterAPI.ts](src/main/worker/ModUpdaterAPI.ts)                       |
| nxm:// protocol handler        | [src/main/NxmProtocolAPI.ts](src/main/NxmProtocolAPI.ts)                                   |
| Root React component           | [src/renderer/react/App.tsx](src/renderer/react/App.tsx)                                   |
| Mod list UI                    | [src/renderer/react/modlist/ModList.tsx](src/renderer/react/modlist/ModList.tsx)           |
| Bridge type: core API          | [src/bridge/BridgeAPI.d.ts](src/bridge/BridgeAPI.d.ts)                                     |
| Bridge type: Nexus API         | [src/bridge/ModUpdaterAPI.d.ts](src/bridge/ModUpdaterAPI.d.ts)                             |
| Bridge type: Nexus data types  | [src/bridge/NexusModsAPI.d.ts](src/bridge/NexusModsAPI.d.ts)                               |
| Webpack renderer dev config    | [.erb/configs/webpack.config.renderer.dev.ts](.erb/configs/webpack.config.renderer.dev.ts) |

---

## Adding a New Feature (Checklist)

### New IPC-backed feature (most common):

1. **Define the type** in the appropriate `src/bridge/*.d.ts` file
2. **Implement** in `src/main/worker/` (or `src/main/` for non-worker APIs)
3. **Expose** via `provideAPI()` in the worker/main entry
4. **Consume** in React via `consumeAPI()` — wrap in a custom hook under `src/renderer/react/context/hooks/`
5. **Wire the hook** into a Context provider if it needs to be globally accessible, or call it directly from a component

### New UI component:

- Place in `src/renderer/react/modlist/` (mod actions/menus) or appropriate subdirectory
- Use MUI components (`@mui/material`)
- Dialog management: use `useDialogContext()` from `DialogContext`
- Toast notifications: use `useToastContext()`
- Nexus API key access: use `useNexusModsContext()`
- Mod list access: use `useModsContext()`

### New dialog:

- Create a `MyFeatureDialog.tsx` component
- Use `useDialogContext().showDialog(...)` to open it
- See [src/renderer/react/modlist/CreateCollectionDialog.tsx](src/renderer/react/modlist/CreateCollectionDialog.tsx) as a recent example

---

## IPC Quick Reference

```typescript
// In worker (src/main/worker/SomeAPI.ts):
provideAPI('SomeAPI', {
  doThing: async (arg: string): Promise<Result> => { ... }
});

// In renderer hook:
const api = consumeAPI<ISomeAPI>('SomeAPI');
const result = await api.doThing('value');
```

All arguments and return values must be serializable (no functions, no class instances, no Buffers — use number[] for binary).

Full IPC architecture details: [.claude/architecture.md](.claude/architecture.md)

---

## React State Management

App.tsx wraps content with 18+ context providers. Key ones:

| Context            | Hook                    | What it provides                 |
| ------------------ | ----------------------- | -------------------------------- |
| `ModsContext`      | `useModsContext()`      | Mod list, enabled state, reorder |
| `NexusModsContext` | `useNexusModsContext()` | API key, auth state, rate limits |
| `DialogContext`    | `useDialogContext()`    | `showDialog()`, `hideDialog()`   |
| `InstallContext`   | `useInstallContext()`   | Installation progress/status     |
| `ToastContext`     | `useToastContext()`     | Toast notifications              |
| `LogContext`       | `useLogContext()`       | App logging                      |

State persistence: use `useSavedState(key, defaultValue)` for localStorage-backed state.

---

## Important Constraints

- **All bridge args/returns must be serializable** — no Buffers, no class instances, no functions
- **Worker thread for heavy I/O** — never do file I/O or Nexus API calls directly from renderer or main process; route through the worker
- **Path safety** — all file paths go through `validatePathIsSafe()` in BridgeAPI.ts
- **No yarn in CI** — CI uses `npm run` commands despite `yarn.lock` being present locally
- **CascLib excluded from CI** — the GitHub dependency for CascLib is removed before `npm install` in CI and cloned separately
- **Two `package.json` files** — root (devDependencies) and `release/app/package.json` (runtime deps that ship with the app); adding a runtime dependency requires adding it to `release/app/package.json`

---

## Nexus Mods Integration

Nexus uses two APIs:

- **REST v1** (`api.nexusmods.com/v1`) — mod info, file lists, download links
- **GraphQL v2** (`api.nexusmods.com/v2/graphql`) — collections, user data

Collection upload flow: fetch files → build manifest → get S3 pre-signed URL → upload ZIP (`fflate.zipSync({'collection.json': bytes})`) → call GraphQL mutation.

Key types: `ICollectionPayload`, `ICollectionManifest` in [src/bridge/NexusModsAPI.d.ts](src/bridge/NexusModsAPI.d.ts).

**Full API reference** (endpoints, GraphQL queries/mutations, gotchas, how to research undocumented APIs via [node-nexus-api](https://github.com/Nexus-Mods/node-nexus-api) and [Vortex](https://github.com/Nexus-Mods/Vortex)): [.claude/nexus-mods-api.md](.claude/nexus-mods-api.md)

---

## Build / Packaging Notes

- `release/app/` is the "inner" package — electron-builder packages it; its `node_modules` is what ships
- Native modules (CascLib, koffi) are unpacked from ASAR via `asarUnpack` patterns
- macOS builds are arm64 only (CascLib.dylib is arm64-only)
- Updater binaries are built by `prepackage` script, not checked into git
- `@electron/rebuild` v4 requires Node ≥22.12.0

More details: [.claude/architecture.md](.claude/architecture.md) | [.claude/patterns.md](.claude/patterns.md) | [.claude/codebase-map.md](.claude/codebase-map.md) | [.claude/localization.md](.claude/localization.md)

---

## Working with D2RMM Mods

**Any time you work on a D2RMM mod — creating, debugging, modifying, or reviewing — read the relevant knowledge files below first before searching game files or guessing at APIs/formats.**

| File                                                           | Contents — read when...                                                                           |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| [.claude/d2r-modding-api.md](.claude/d2r-modding-api.md)       | **Always** — D2RMM global API, `mod.json` schema, config fields, color codes, localization format |
| [.claude/d2r-game-files.md](.claude/d2r-game-files.md)         | Game data file paths, column meanings, gem/rune keys — read when touching any game data file      |
| [.claude/d2r-game-mechanics.md](.claude/d2r-game-mechanics.md) | Item drops, TC chaining, NoDrop, quality rolls, affixes — read when touching drop/loot systems    |
| [.claude/d2r-mod-examples.md](.claude/d2r-mod-examples.md)     | Annotated patterns from real mods — read when unsure how to implement something                   |

Use the `/create-mod` skill for guided assistance writing new mods from scratch.

Example mods: https://github.com/olegbl/d2rmm.mods (local path in [.claude/local.md](.claude/local.md) if available)
External references: https://olegbl.github.io/d2rmm/ · https://locbones.github.io/D2R_DataGuide/ · https://d2mods.info/forum/kb/
