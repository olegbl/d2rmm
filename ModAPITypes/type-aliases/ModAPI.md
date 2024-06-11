[**D2RMM Mod API**](../../index.md) • **Docs**

***

[D2RMM Mod API](../../modules.md) / [ModAPITypes](../index.md) / ModAPI

# Type alias: ModAPI

> **ModAPI**: `object`

This is the interface of the global "D2RMM" variable provided to mods at runtime.

## Type declaration

### copyFile()

> **copyFile**: (`src`, `dst`, `overwrite`?) => `void`

Copies a file or directory from the mod directory to the data directory. This
is primarily used for including non-mergeable assets like sprites in your mod.

#### Note

While you can use this API to provide whole new versions of TSV/JSON game
      files to the game, this is an anti-pattern and will dramatically reduce your
      mod's compatibility with other mods. Don't do it. Use the `read*` and `write*`
      APIs instead.

#### Example

```ts
// copy new sprites to the output directory
D2RMM.copyFile(
  'hd', // <mod folder>\hd
  'hd', // <diablo 2 folder>\mods\D2RMM\D2RMM.mpq\data\hd
  true // overwrite any conflicts
);
```

#### Parameters

• **src**: `string`

The path of the file or directory to copy, relative to the mod directory.

• **dst**: `string`

The path of the file or directory to copy to, relative to the data directory.

• **overwrite?**: `boolean`

Whether to overwrite any conflicts.

#### Returns

`void`

### ~~error()~~

> **error**: (`message`) => `void`

Shows an error message to the user.

#### Deprecated

Use `console.error` or `throw new Error` instead.

#### Example

```ts
D2RMM.error('Something went wrong!');
D2RMM.error(new Error('Something went wrong!'));
```

#### Parameters

• **message**: `string` \| `Error`

The message to show.

#### Returns

`void`

### getNextStringID()

> **getNextStringID**: () => `number`

Produces the next valid string ID to use as an identifier in D2R's data files.
The ID is read from `next_string_id.txt`, and then incremented within that file.

#### Returns

`number`

### getVersion()

> **getVersion**: () => `number`

Returns the version of D2RMM.

#### Note

You can use this API to check if the installed version of D2RMM is compatible
      with the APIs that your mod is using.

#### Example

```ts
const version = D2RMM.geteVersion(); // 1.5
```

#### Returns

`number`

### readJson()

> **readJson**: (`filePath`) => [`JSONData`](JSONData.md)

Reads a JSON D2R file.

#### Note

D2R's JSON files don't follow the standard JSON spec. This method will
      ignore any comments, whitespace, and various invalid properties (for example,
      duplicate keys), that D2R might use.

#### Note

The file is either read from D2R game files as specified in D2RMM's config,
      or is the result of previously installed mods already operating on this file.

#### Example

```ts
const profileHD = D2RMM.readJson('global\\ui\\layouts\\_profilehd.json');
profileHD.FontColorRed.r; // 252
```

#### Parameters

• **filePath**: `string`

The path of the file to read, relative to the data directory.

#### Returns

[`JSONData`](JSONData.md)

### readSaveFile()

> **readSaveFile**: (`filePath`) => `Buffer` \| `null`

Reads a save file from the saves directory as a binary Buffer.

#### Example

```ts
const stashData = D2RMM.readSaveFile('SharedStashSoftCoreV2.d2i');
console.log('Save file size: ' + stashData.length);
```

#### Parameters

• **filePath**: `string`

The path of the save file to read, relative to the saves directory.

#### Returns

`Buffer` \| `null`

### readTsv()

> **readTsv**: (`filePath`) => [`TSVData`](TSVData.md)

Reads a TSV (tab separated values in a .txt) D2R file. This is a classic data format used by D2.

#### Note

The last column in the file will probably have a `\r` at the end of its name.

#### Note

The file is either read from D2R game files as specified in D2RMM's config,
      or is the result of previously installed mods already operating on this file.

#### Example

```ts
const treasureclassex = D2RMM.readTsv('global\\excel\\treasureclassex.txt');
console.log('There are ' + treasureclassex.rows.length + ' treasure classes!');
console.log('Each treasure class has ' + treasureclassex.headers.length + ' properties!');
```

#### Parameters

• **filePath**: `string`

The path of the file to read, relative to the data directory.

#### Returns

[`TSVData`](TSVData.md)

### readTxt()

> **readTxt**: (`filePath`) => `string`

Reads a plain text D2R file.

#### Note

The file is either read from D2R game files as specified in D2RMM's config,
      or is the result of previously installed mods already operating on this file.

#### Example

```ts
const nextStringIDRaw = D2RMM.readJson('local\\next_string_id.txt');
let nextStringID = nextStringIDRaw.match(/[0-9]+/)[0]; // next valid string id
```

#### Parameters

• **filePath**: `string`

The path of the file to read, relative to the data directory.

#### Returns

`string`

### writeJson()

> **writeJson**: (`filePath`, `data`) => `void`

Writes a JSON D2R file.

#### Example

```ts
// change red colored text to bright green!
const profileHD = D2RMM.readJson('global\\ui\\layouts\\_profilehd.json');
profileHD.FontColorRed = {r: 0, b: 0, g: 255, a: 255};
D2RMM.writeJson('global\\ui\\layouts\\_profilehd.json', profileHD);
```

#### Parameters

• **filePath**: `string`

The path of the file to write, relative to the data directory.

• **data**: [`JSONData`](JSONData.md)

The JSON data to write.

#### Returns

`void`

### writeSaveFile()

> **writeSaveFile**: (`filePath`, `data`) => `void`

Writes a save file to the saves directory as a binary Buffer.

#### Example

```ts
const stashData = D2RMM.readSaveFile('SharedStashSoftCoreV2.d2i');
D2RMM.writeSaveFile('SharedStashSoftCoreV2.d2i', Buffer.concat([stashData, EXTRA_STASH_TAB]));
```

#### Parameters

• **filePath**: `string`

The path of the save file to write, relative to the saves directory.

• **data**: `Buffer`

The binary data of the save file to write.

#### Returns

`void`

### writeTsv()

> **writeTsv**: (`filePath`, `data`) => `void`

Writes a TSV (tab separated values in a .txt) D2R file. This is a classic data format used by D2.

#### Example

```ts
const treasureclassex = D2RMM.readTsv('global\\excel\\treasureclassex.txt');
treasureclassex.rows.forEach(row => {
  // D2R TSV files sometimes have blank rows
  if (row['Treasure Class'] !== '') {
    row.NoDrop = 1;
  }
});
D2RMM.writeTsv('global\\excel\\treasureclassex.txt', treasureclassex);
```

#### Parameters

• **filePath**: `string`

The path of the file to write, relative to the data directory.

• **data**: [`TSVData`](TSVData.md)

The TSV data to write.

#### Returns

`void`

### writeTxt()

> **writeTxt**: (`filePath`, `data`) => `void`

Writes a plain text D2R file.

#### Example

```ts
const nextStringIDRaw = D2RMM.readTxt('local\\next_string_id.txt');
let nextStringID = nextStringIDRaw.match(/[0-9]+/)[0]; // next valid string id
nextStringID ++;
nextStringIDRaw.replace(/[0-9]+/, nextStringID);
D2RMM.writeTxt('local\\next_string_id.txt', nextStringIDRaw);
```

#### Parameters

• **filePath**: `string`

The path of the file to write, relative to the data directory.

• **data**: `string`

The raw text data to write.

#### Returns

`void`

## Source

[ModAPITypes.d.ts:4](https://github.com/olegbl/d2rmm/blob/7b50646c3690465cf5277007fc3d5d33286edb15/src/renderer/ModAPITypes.d.ts#L4)
