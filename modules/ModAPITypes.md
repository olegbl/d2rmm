[d2rmm](../README.md) / [Modules](../modules.md) / ModAPITypes

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

#### Index signature

▪ [key: `string`]: [`JSONDataValues`](ModAPITypes.md#jsondatavalues) \| [`JSONData`](ModAPITypes.md#jsondata)

#### Defined in

[ModAPITypes.d.ts:160](https://github.com/olegbl/d2rmm/blob/5c09ea6/src/renderer/ModAPITypes.d.ts#L160)

___

### JSONDataValue

Ƭ **JSONDataValue**: `string` \| `number` \| `boolean`

#### Defined in

[ModAPITypes.d.ts:156](https://github.com/olegbl/d2rmm/blob/5c09ea6/src/renderer/ModAPITypes.d.ts#L156)

___

### JSONDataValues

Ƭ **JSONDataValues**: [`JSONDataValue`](ModAPITypes.md#jsondatavalue) \| [`JSONDataValue`](ModAPITypes.md#jsondatavalue)[]

#### Defined in

[ModAPITypes.d.ts:158](https://github.com/olegbl/d2rmm/blob/5c09ea6/src/renderer/ModAPITypes.d.ts#L158)

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

[ModAPITypes.d.ts:4](https://github.com/olegbl/d2rmm/blob/5c09ea6/src/renderer/ModAPITypes.d.ts#L4)

___

### TSVData

Ƭ **TSVData**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `headers` | [`TSVDataHeader`](ModAPITypes.md#tsvdataheader)[] |
| `rows` | [`TSVDataRow`](ModAPITypes.md#tsvdatarow)[] |

#### Defined in

[ModAPITypes.d.ts:151](https://github.com/olegbl/d2rmm/blob/5c09ea6/src/renderer/ModAPITypes.d.ts#L151)

___

### TSVDataHeader

Ƭ **TSVDataHeader**: `string`

#### Defined in

[ModAPITypes.d.ts:145](https://github.com/olegbl/d2rmm/blob/5c09ea6/src/renderer/ModAPITypes.d.ts#L145)

___

### TSVDataRow

Ƭ **TSVDataRow**: `Object`

#### Index signature

▪ [header: [`TSVDataHeader`](ModAPITypes.md#tsvdataheader)]: `string`

#### Defined in

[ModAPITypes.d.ts:147](https://github.com/olegbl/d2rmm/blob/5c09ea6/src/renderer/ModAPITypes.d.ts#L147)
