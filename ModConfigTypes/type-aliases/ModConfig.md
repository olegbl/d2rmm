[**D2RMM Mod API**](../../index.md) • **Docs**

***

[D2RMM Mod API](../../modules.md) / [ModConfigTypes](../index.md) / ModConfig

# Type alias: ModConfig

> **ModConfig**: `object`

This is the structure of the "mod.json" file that D2RMM mods should provide.

## Type declaration

### author?

> `optional` **author**: `string`

The author of the mod.

### config?

> `optional` **config**: readonly [`ModConfigFieldOrSection`](ModConfigFieldOrSection.md)[]

The configuration for the mod. This allows the mod to set up a custom configuration UI
that the user can interact with to customize the behavior of the mod.

### description?

> `optional` **description**: `string`

A short description of the mod.

### name

> **name**: `string`

The name of the mod.

### version?

> `optional` **version**: `string`

The version of the mod.

### website?

> `optional` **website**: `string`

The website of the mod. Ideally, this should link to the Nexus Mods page for the mod.

## Source

[ModConfigTypes.d.ts:4](https://github.com/olegbl/d2rmm/blob/7b50646c3690465cf5277007fc3d5d33286edb15/src/renderer/ModConfigTypes.d.ts#L4)
