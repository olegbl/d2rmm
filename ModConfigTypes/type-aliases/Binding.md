[**D2RMM Mod API**](../../index.md) • **Docs**

***

[D2RMM Mod API](../../modules.md) / [ModConfigTypes](../index.md) / Binding

# Type alias: Binding\<T\>

> **Binding**\<`T`\>: `T` *extends* `string` ? [`BindingLiteralValue`](BindingLiteralValue.md)\<`string`\> \| [`BindingConfigValue`](BindingConfigValue.md)\<`string`\> \| [`BindingConditional`](BindingConditional.md)\<`boolean`\> : `T` *extends* `number` ? [`BindingLiteralValue`](BindingLiteralValue.md)\<`number`\> \| [`BindingConfigValue`](BindingConfigValue.md)\<`number`\> \| [`BindingConditional`](BindingConditional.md)\<`boolean`\> : `T` *extends* `boolean` ? [`BindingLiteralValue`](BindingLiteralValue.md)\<`boolean`\> \| [`BindingConfigValue`](BindingConfigValue.md)\<`boolean`\> \| [`BindingConditional`](BindingConditional.md)\<`boolean`\> \| [`BindingNot`](BindingNot.md) \| [`BindingAnd`](BindingAnd.md) \| [`BindingOr`](BindingOr.md) \| [`BindingEquals`](BindingEquals.md)\<`string`\> \| [`BindingEquals`](BindingEquals.md)\<`boolean`\> \| [`BindingEquals`](BindingEquals.md)\<`number`\> \| [`BindingNotEquals`](BindingNotEquals.md)\<`string`\> \| [`BindingNotEquals`](BindingNotEquals.md)\<`boolean`\> \| [`BindingNotEquals`](BindingNotEquals.md)\<`number`\> \| [`BindingLessThan`](BindingLessThan.md) \| [`BindingLessThanOrEqual`](BindingLessThanOrEqual.md) \| [`BindingGreaterThan`](BindingGreaterThan.md) \| [`BindingGreaterThanOrEqual`](BindingGreaterThanOrEqual.md) \| [`BindingIncludes`](BindingIncludes.md)\<`string`\> \| [`BindingIncludes`](BindingIncludes.md)\<`number`\> : `T` *extends* `string`[] ? [`BindingLiteralValue`](BindingLiteralValue.md)\<`string`[]\> \| [`BindingConfigValue`](BindingConfigValue.md)\<`string`[]\> \| [`BindingConditional`](BindingConditional.md)\<`boolean`\> : `T` *extends* `number`[] ? [`BindingLiteralValue`](BindingLiteralValue.md)\<`number`[]\> \| [`BindingConfigValue`](BindingConfigValue.md)\<`number`[]\> \| [`BindingConditional`](BindingConditional.md)\<`boolean`\> : [`BindingLiteralValue`](BindingLiteralValue.md)\<`T`\>

## Type parameters

• **T**

## Source

[ModConfigTypes.d.ts:203](https://github.com/olegbl/d2rmm/blob/7b50646c3690465cf5277007fc3d5d33286edb15/src/renderer/ModConfigTypes.d.ts#L203)
