# D2RMM Code Patterns & Conventions

## TypeScript Conventions

- **Strict mode** — `strict: true` in tsconfig. No `any` without good reason.
- **`satisfies` operator** — use `satisfies IMyAPI` when providing an API to get type checking without widening the type
- **Type-only imports** — use `import type { ... }` for types from bridge files (they're `.d.ts` only)
- **Path aliases** — source roots are aliased. Use `'bridge/BridgeAPI'` not `'../../bridge/BridgeAPI'`
  - `bridge/` → `src/bridge/`
  - `renderer/` → `src/renderer/`
  - `main/` → `src/main/`
  - `shared/` → `src/shared/`

## React Patterns

### Context Provider Pattern
New global state goes in a new context file:

```typescript
// src/renderer/react/context/MyNewContext.tsx
import { createContext, useContext, useState } from 'react';

type MyNewContextType = { value: string; setValue: (v: string) => void };

const MyNewContext = createContext<MyNewContextType | null>(null);

export function MyNewContextProvider({ children }: { children: React.ReactNode }) {
  const [value, setValue] = useState('');
  return <MyNewContext.Provider value={{ value, setValue }}>{children}</MyNewContext.Provider>;
}

export function useMyNewContext(): MyNewContextType {
  const ctx = useContext(MyNewContext);
  if (ctx == null) throw new Error('useMyNewContext must be used within MyNewContextProvider');
  return ctx;
}
```

Then add `<MyNewContextProvider>` to the provider stack in `App.tsx`.

### `useSavedState` — Persisted State
For state that should survive app restarts:

```typescript
import useSavedState from 'renderer/react/hooks/useSavedState';

const [apiKey, setApiKey] = useSavedState<string>('nexus-api-key', '');
// Automatically reads/writes to localStorage with the given key
```

### `useAsyncCallback` — Async Actions with Loading State
```typescript
import useAsyncCallback from 'renderer/react/hooks/useAsyncCallback';

const [handleSave, isSaving] = useAsyncCallback(async () => {
  await api.doSomething();
}, [api]);

// In JSX: <Button onClick={handleSave} disabled={isSaving}>Save</Button>
```

### Dialog Pattern
Use `useDialogContext()` to show any React component as a modal:

```typescript
const { showDialog, hideDialog } = useDialogContext();

// Show:
showDialog('my-dialog-id', (
  <MyDialog onClose={() => hideDialog('my-dialog-id')} />
));

// Dialogs are rendered by <DialogRenderer /> in App.tsx
// The id is just a string key; use something unique
```

## IPC / API Patterns

### Worker API — Standard Structure
```typescript
// src/main/worker/MyAPI.ts
import { provideAPI } from './IPC';
import type { IMyAPI } from 'bridge/MyAPI';

export async function initMyAPI(): Promise<void> {
  provideAPI('MyAPI', {
    myMethod: async (arg: string): Promise<string> => {
      return 'result';
    },
  } satisfies IMyAPI);
}
```

### Consuming APIs in Worker (calling main process APIs)
The worker can call main process APIs too, using the same pattern:

```typescript
// In a worker init function:
const shellAPI = consumeAPI<IShellAPI>('ShellAPI');
await shellAPI.openExternal('https://example.com');
```

### HTTP Requests in Worker
Use `RequestAPI` for HTTP requests (goes through main process):

```typescript
const requestAPI = consumeAPI<IRequestAPI>('RequestAPI');
const response = await requestAPI.request({
  method: 'GET',
  url: 'https://api.nexusmods.com/v1/...',
  headers: { apikey: nexusApiKey },
});
```

Or use native `fetch()` directly in the worker (Node.js 22 has global fetch):
```typescript
const response = await fetch('https://api.nexusmods.com/v2/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', apikey },
  body: JSON.stringify({ query, variables }),
});
```

## File Naming Conventions

- **Components**: `PascalCase.tsx` (e.g., `CreateCollectionDialog.tsx`)
- **Hooks**: `useCamelCase.tsx` (e.g., `useModInstaller.tsx`)
- **Contexts**: `PascalCaseContext.tsx`
- **Worker APIs**: `PascalCaseAPI.ts` with an `initPascalCaseAPI()` function
- **Bridge types**: `PascalCaseAPI.d.ts`
- **Menu items**: `DescriptiveNameMenuItem.tsx`
- **Dialog components**: `DescriptiveNameDialog.tsx`

## MUI Component Usage

The project uses Material-UI v5 (`@mui/material`). Patterns:

```typescript
// Layout
import { Box, Stack, Typography, Divider } from '@mui/material';
// Form
import { TextField, Select, MenuItem, ToggleButton, ToggleButtonGroup } from '@mui/material';
// Feedback
import { CircularProgress, Chip, Alert } from '@mui/material';
// Dialogs
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
// Menus
import { Menu, MenuItem as MuiMenuItem, ListItemIcon, ListItemText } from '@mui/material';
// Icons
import SomeIcon from '@mui/icons-material/SomeName';
```

Use `sx` prop for one-off styles, not inline style objects.

## Nexus Mods GraphQL

The worker uses GraphQL v2 directly with `fetch()`. Pattern:

```typescript
const query = `
  query MyQuery($param: String!) {
    myField(param: $param) { id name }
  }
`;

const response = await fetch('https://api.nexusmods.com/v2/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    apikey: nexusApiKey,
  },
  body: JSON.stringify({ query, variables: { param: 'value' } }),
});

const data = await response.json();
if (data.errors) throw new Error(data.errors[0].message);
return data.data.myField;
```

Known working query patterns are in [src/main/worker/ModUpdaterAPI.ts](../src/main/worker/ModUpdaterAPI.ts).

## Error Handling

- Worker API errors are serialized (`name`, `message`, `stack`) and re-thrown in the caller
- Use `try/catch` in hooks that call APIs; surface errors via toast or dialog
- Don't swallow errors silently — log them or show to user

## Mod List Operations

The `ModsContext` exposes:
```typescript
{
  mods: Mod[];                    // ordered mod list (includes section headers)
  enabledMods: Set<string>;       // mod IDs that are enabled
  setModEnabled: (id, enabled) => void;
  reorderMods: (from, to) => void;
  addMod: (mod) => void;
  removeMod: (id) => void;
  setSectionHeaders: (fn) => void; // functional update for section header state
  setItemsOrder: (fn) => void;    // functional update for item ordering
}
```

Section headers and mods are in the same list. Use `mod.info.type === 'section'` or similar to distinguish them.

## Security Patterns

- **Path validation**: All file operations in BridgeAPI.ts go through `validatePathIsSafe()` to prevent directory traversal
- **No shell injection**: Never concatenate user input into shell commands; use `execute()` with args array
- **IPC serialization**: All data crossing process boundaries must be JSON-serializable — no functions, no class instances, no circular references
- **Content Security Policy**: The renderer has a strict CSP (no eval, no inline scripts beyond what webpack needs)

## Testing

Tests live alongside source files or in `__tests__/` directories. Run with:
```bash
yarn test           # all tests
yarn test -- --watch  # watch mode
```

Jest with `@testing-library/react` for component tests.

## Linting

ESLint with airbnb config. Key rules:
- No unused vars
- Prefer `const` over `let`
- Import ordering enforced
- No console statements in renderer (use LogContext)

Fix automatically where possible: `yarn lint --fix`
