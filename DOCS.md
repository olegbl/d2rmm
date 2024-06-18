## Getting Started

To create a new D2RMM mod, you first need to create a new folder in `<D2RMM>/mods/` directory. (e.g. `<D2RMM>/mods/MyNewMod/`).

When you have your new folder, create two plaintext files within: `mod.json` and `mod.js`. The first (`mod.json`) is a file that describes your mod (what is it called, who is the author, does it have options for the user to customize, etc...). The second (`mod.js`) is a JavaScript file that uses the API provided by D2RMM to modify game files during the mod intallation process.

See examples below of what to put inside of these plaintext files.

## Runtime

The runtime of any D2RMM mod (`mod.js` or `mod.ts`) is provided with these additional global variables:

```
const D2RMM: ModAPI;
const config: ModConfigValue;
const console: ConsoleAPI;
```

See [`ModAPI`](interfaces/ModAPI.ModAPI.html), [`ModConfigValue`](types/ModConfigValue.ModConfigValue.html), and [`ConsoleAPI`](interfaces/ConsoleAPI.ConsoleAPI.html) for their type definitions.

### Example `mod.js`:

```
if (D2RMM.getVersion() < 1.5) {
  throw new Error('This mod requires D2RMM version 1.5 or newer!');
}

D2RMM.writeJson('local\\lng\\strings\\foo.json', {foo: 'foo!'});

if (config.isBarEnabled) {
  console.log('Feature bar is enabled!');
  D2RMM.writeJson('local\\lng\\strings\\bar.json', {bar: 'bar!'});
}
```

## Configuration

The configuration file of any D2RMM mod (`mod.json`) follows the format defined by [`ModConfig`](interfaces/ModConfig.ModConfig.html).

### Example `mod.json`:

```
{
  "name": "My New Mod",
  "description": "Best mod ever. Does great things! This is a terrible description.",
  "author": "myname",
  "website": "https://www.nexusmods.com/diablo2resurrected/mods/123456789",
  "version": "1.0",
}
```

## TypeScript Support

D2RMM supports mods written in TypeScript. Simply create `mod.ts` instead of `mod.js`.

### Type Checking & Auto Completion

If you are working inside of D2RMM's `mods` directory, you should have type checking and auto completion available automatically in any IDE that supports TypeScript (such as [VS Code](https://code.visualstudio.com/)) through the presence of `types.d.ts` in D2RMM's directory. If you wish to author mods elsewhere, simply copy that `types.d.ts` file to your preferred workspace.

### Multi-File Support

TypeScript mods also support ES6 style `import`/`export` syntax to allow you to split up your mod across multiple files.
