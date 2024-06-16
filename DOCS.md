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
