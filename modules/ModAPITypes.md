[D2RMM Mod API](../README.md) / [Modules](../modules.md) / ModAPITypes

# Module: ModAPITypes

## Table of contents

### Type Aliases

- [JSONData](ModAPITypes.md#jsondata)
- [JSONDataValue](ModAPITypes.md#jsondatavalue)
- [JSONDataValues](ModAPITypes.md#jsondatavalues)
- [ModAPI](ModAPITypes.md#modapi)
- [TSVData](ModAPITypes.md#tsvdata)
- [TSVDataHeader](ModAPITypes.md#tsvdataheader)
- [TSVDataRow](ModAPITypes.md#tsvdatarow)

## Type Aliases

### JSONData

Ƭ **JSONData**: `Object`

The parsed data of a JSON file.

#### Index signature

▪ [key: `string`]: [`JSONDataValues`](ModAPITypes.md#jsondatavalues) \| [`JSONData`](ModAPITypes.md#jsondata)

#### Defined in

[ModAPITypes.d.ts:194](https://github.com/olegbl/d2rmm/blob/5f125c1/src/renderer/ModAPITypes.d.ts#L194)

___

### JSONDataValue

Ƭ **JSONDataValue**: `string` \| `number` \| `boolean`

A single value in a JSON data structure.

#### Defined in

[ModAPITypes.d.ts:184](https://github.com/olegbl/d2rmm/blob/5f125c1/src/renderer/ModAPITypes.d.ts#L184)

___

### JSONDataValues

Ƭ **JSONDataValues**: [`JSONDataValue`](ModAPITypes.md#jsondatavalue) \| [`JSONDataValue`](ModAPITypes.md#jsondatavalue)[]

One or more value in a JSON data structure.

#### Defined in

[ModAPITypes.d.ts:189](https://github.com/olegbl/d2rmm/blob/5f125c1/src/renderer/ModAPITypes.d.ts#L189)

___

### ModAPI

Ƭ **ModAPI**: `Object`

This is the interface of the global "D2RMM" variable provided to mods at runtime.

#### Type declaration

| Name | Type |
| :------ | :------ |
| `copyFile` | (`src`: `string`, `dst`: `string`, `overwrite?`: `boolean`) => `void` |
| `error` | (`message`: `string` \| `Error`) => `void` |
| `getNextStringID` | () => `number` |
| `getVersion` | () => `number` |
| `readJson` | (`filePath`: `string`) => [`JSONData`](ModAPITypes.md#jsondata) |
| `readSaveFile` | (`filePath`: `string`) => ``null`` \| `Buffer` |
| `readTsv` | (`filePath`: `string`) => [`TSVData`](ModAPITypes.md#tsvdata) |
| `readTxt` | (`filePath`: `string`) => `string` |
| `writeJson` | (`filePath`: `string`, `data`: [`JSONData`](ModAPITypes.md#jsondata)) => `void` |
| `writeSaveFile` | (`filePath`: `string`, `data`: `Buffer`) => `void` |
| `writeTsv` | (`filePath`: `string`, `data`: [`TSVData`](ModAPITypes.md#tsvdata)) => `void` |
| `writeTxt` | (`filePath`: `string`, `data`: `string`) => `void` |

#### Defined in

[ModAPITypes.d.ts:4](https://github.com/olegbl/d2rmm/blob/5f125c1/src/renderer/ModAPITypes.d.ts#L4)

___

### TSVData

Ƭ **TSVData**: `Object`

The parsed data of a TSV file.

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `headers` | [`TSVDataHeader`](ModAPITypes.md#tsvdataheader)[] | List of headers in the TSV file. |
| `rows` | [`TSVDataRow`](ModAPITypes.md#tsvdatarow)[] | List of rows in the TSV file. |

#### Defined in

[ModAPITypes.d.ts:170](https://github.com/olegbl/d2rmm/blob/5f125c1/src/renderer/ModAPITypes.d.ts#L170)

___

### TSVDataHeader

Ƭ **TSVDataHeader**: `string`

The name of a column in a TSV file.

#### Defined in

[ModAPITypes.d.ts:158](https://github.com/olegbl/d2rmm/blob/5f125c1/src/renderer/ModAPITypes.d.ts#L158)

___

### TSVDataRow

Ƭ **TSVDataRow**: `Object`

A single row in a TSV file.

#### Index signature

▪ [header: [`TSVDataHeader`](ModAPITypes.md#tsvdataheader)]: `string`

#### Defined in

[ModAPITypes.d.ts:163](https://github.com/olegbl/d2rmm/blob/5f125c1/src/renderer/ModAPITypes.d.ts#L163)
