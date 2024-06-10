[d2rmm](../README.md) / [Modules](../modules.md) / ModConfigTypes

# Module: ModConfigTypes

## Table of contents

### Type Aliases

- [Binding](ModConfigTypes.md#binding)
- [BindingAnd](ModConfigTypes.md#bindingand)
- [BindingConditional](ModConfigTypes.md#bindingconditional)
- [BindingConfigValue](ModConfigTypes.md#bindingconfigvalue)
- [BindingEquals](ModConfigTypes.md#bindingequals)
- [BindingGreaterThan](ModConfigTypes.md#bindinggreaterthan)
- [BindingGreaterThanOrEqual](ModConfigTypes.md#bindinggreaterthanorequal)
- [BindingIncludes](ModConfigTypes.md#bindingincludes)
- [BindingLessThan](ModConfigTypes.md#bindinglessthan)
- [BindingLessThanOrEqual](ModConfigTypes.md#bindinglessthanorequal)
- [BindingLiteralValue](ModConfigTypes.md#bindingliteralvalue)
- [BindingNot](ModConfigTypes.md#bindingnot)
- [BindingNotEquals](ModConfigTypes.md#bindingnotequals)
- [BindingOr](ModConfigTypes.md#bindingor)
- [ModConfig](ModConfigTypes.md#modconfig)
- [ModConfigField](ModConfigTypes.md#modconfigfield)
- [ModConfigFieldBase](ModConfigTypes.md#modconfigfieldbase)
- [ModConfigFieldCheckbox](ModConfigTypes.md#modconfigfieldcheckbox)
- [ModConfigFieldNumber](ModConfigTypes.md#modconfigfieldnumber)
- [ModConfigFieldOrSection](ModConfigTypes.md#modconfigfieldorsection)
- [ModConfigFieldSection](ModConfigTypes.md#modconfigfieldsection)
- [ModConfigFieldSelect](ModConfigTypes.md#modconfigfieldselect)
- [ModConfigFieldText](ModConfigTypes.md#modconfigfieldtext)
- [ModConfigSingleValue](ModConfigTypes.md#modconfigsinglevalue)
- [ModConfigValue](ModConfigTypes.md#modconfigvalue)

## Type Aliases

### Binding

Ƭ **Binding**<`T`\>: `T` extends `string` ? [`BindingLiteralValue`](ModConfigTypes.md#bindingliteralvalue)<`string`\> \| [`BindingConfigValue`](ModConfigTypes.md#bindingconfigvalue)<`string`\> \| [`BindingConditional`](ModConfigTypes.md#bindingconditional)<`boolean`\> : `T` extends `number` ? [`BindingLiteralValue`](ModConfigTypes.md#bindingliteralvalue)<`number`\> \| [`BindingConfigValue`](ModConfigTypes.md#bindingconfigvalue)<`number`\> \| [`BindingConditional`](ModConfigTypes.md#bindingconditional)<`boolean`\> : `T` extends `boolean` ? [`BindingLiteralValue`](ModConfigTypes.md#bindingliteralvalue)<`boolean`\> \| [`BindingConfigValue`](ModConfigTypes.md#bindingconfigvalue)<`boolean`\> \| [`BindingConditional`](ModConfigTypes.md#bindingconditional)<`boolean`\> \| [`BindingNot`](ModConfigTypes.md#bindingnot) \| [`BindingAnd`](ModConfigTypes.md#bindingand) \| [`BindingOr`](ModConfigTypes.md#bindingor) \| [`BindingEquals`](ModConfigTypes.md#bindingequals)<`string`\> \| [`BindingEquals`](ModConfigTypes.md#bindingequals)<`boolean`\> \| [`BindingEquals`](ModConfigTypes.md#bindingequals)<`number`\> \| [`BindingNotEquals`](ModConfigTypes.md#bindingnotequals)<`string`\> \| [`BindingNotEquals`](ModConfigTypes.md#bindingnotequals)<`boolean`\> \| [`BindingNotEquals`](ModConfigTypes.md#bindingnotequals)<`number`\> \| [`BindingLessThan`](ModConfigTypes.md#bindinglessthan) \| [`BindingLessThanOrEqual`](ModConfigTypes.md#bindinglessthanorequal) \| [`BindingGreaterThan`](ModConfigTypes.md#bindinggreaterthan) \| [`BindingGreaterThanOrEqual`](ModConfigTypes.md#bindinggreaterthanorequal) \| [`BindingIncludes`](ModConfigTypes.md#bindingincludes)<`string`\> \| [`BindingIncludes`](ModConfigTypes.md#bindingincludes)<`number`\> : `T` extends `string`[] ? [`BindingLiteralValue`](ModConfigTypes.md#bindingliteralvalue)<`string`[]\> \| [`BindingConfigValue`](ModConfigTypes.md#bindingconfigvalue)<`string`[]\> \| [`BindingConditional`](ModConfigTypes.md#bindingconditional)<`boolean`\> : `T` extends `number`[] ? [`BindingLiteralValue`](ModConfigTypes.md#bindingliteralvalue)<`number`[]\> \| [`BindingConfigValue`](ModConfigTypes.md#bindingconfigvalue)<`number`[]\> \| [`BindingConditional`](ModConfigTypes.md#bindingconditional)<`boolean`\> : [`BindingLiteralValue`](ModConfigTypes.md#bindingliteralvalue)<`T`\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Defined in

[ModConfigTypes.d.ts:148](https://github.com/olegbl/d2rmm/blob/2c14c11/src/renderer/ModConfigTypes.d.ts#L148)

___

### BindingAnd

Ƭ **BindingAnd**: [operator: "and", binding1: Binding<boolean\>, binding2: Binding<boolean\>]

#### Defined in

[ModConfigTypes.d.ts:90](https://github.com/olegbl/d2rmm/blob/2c14c11/src/renderer/ModConfigTypes.d.ts#L90)

___

### BindingConditional

Ƭ **BindingConditional**<`T`\>: [operator: "if", condition: Binding<boolean\>, thenBinding: Binding<T\>, elseBinding: Binding<T\>]

#### Type parameters

| Name |
| :------ |
| `T` |

#### Defined in

[ModConfigTypes.d.ts:81](https://github.com/olegbl/d2rmm/blob/2c14c11/src/renderer/ModConfigTypes.d.ts#L81)

___

### BindingConfigValue

Ƭ **BindingConfigValue**<`_T`\>: [operator: "value", id: string]

#### Type parameters

| Name | Type |
| :------ | :------ |
| `_T` | extends [`ModConfigSingleValue`](ModConfigTypes.md#modconfigsinglevalue) |

#### Defined in

[ModConfigTypes.d.ts:76](https://github.com/olegbl/d2rmm/blob/2c14c11/src/renderer/ModConfigTypes.d.ts#L76)

___

### BindingEquals

Ƭ **BindingEquals**<`T`\>: [operator: "eq", binding1: Binding<T\>, binding2: Binding<T\>]

#### Type parameters

| Name |
| :------ |
| `T` |

#### Defined in

[ModConfigTypes.d.ts:102](https://github.com/olegbl/d2rmm/blob/2c14c11/src/renderer/ModConfigTypes.d.ts#L102)

___

### BindingGreaterThan

Ƭ **BindingGreaterThan**: [operator: "gt", binding1: Binding<number\>, binding2: Binding<number\>]

#### Defined in

[ModConfigTypes.d.ts:126](https://github.com/olegbl/d2rmm/blob/2c14c11/src/renderer/ModConfigTypes.d.ts#L126)

___

### BindingGreaterThanOrEqual

Ƭ **BindingGreaterThanOrEqual**: [operator: "gte", binding1: Binding<number\>, binding2: Binding<number\>]

#### Defined in

[ModConfigTypes.d.ts:132](https://github.com/olegbl/d2rmm/blob/2c14c11/src/renderer/ModConfigTypes.d.ts#L132)

___

### BindingIncludes

Ƭ **BindingIncludes**<`T`\>: [operator: "in", binding1: Binding<T\>, binding2: T extends string ? Binding<string[]\> : T extends number ? Binding<number[]\> : never]

#### Type parameters

| Name |
| :------ |
| `T` |

#### Defined in

[ModConfigTypes.d.ts:138](https://github.com/olegbl/d2rmm/blob/2c14c11/src/renderer/ModConfigTypes.d.ts#L138)

___

### BindingLessThan

Ƭ **BindingLessThan**: [operator: "lt", binding1: Binding<number\>, binding2: Binding<number\>]

#### Defined in

[ModConfigTypes.d.ts:114](https://github.com/olegbl/d2rmm/blob/2c14c11/src/renderer/ModConfigTypes.d.ts#L114)

___

### BindingLessThanOrEqual

Ƭ **BindingLessThanOrEqual**: [operator: "lte", binding1: Binding<number\>, binding2: Binding<number\>]

#### Defined in

[ModConfigTypes.d.ts:120](https://github.com/olegbl/d2rmm/blob/2c14c11/src/renderer/ModConfigTypes.d.ts#L120)

___

### BindingLiteralValue

Ƭ **BindingLiteralValue**<`T`\>: `T`

Rules allow you to configure complex behavior for the configuration form based on
the current values of the configuration. For example, you can show or hide certain
fields based on the value of another field.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Defined in

[ModConfigTypes.d.ts:74](https://github.com/olegbl/d2rmm/blob/2c14c11/src/renderer/ModConfigTypes.d.ts#L74)

___

### BindingNot

Ƭ **BindingNot**: [operator: "not", binding: Binding<boolean\>]

#### Defined in

[ModConfigTypes.d.ts:88](https://github.com/olegbl/d2rmm/blob/2c14c11/src/renderer/ModConfigTypes.d.ts#L88)

___

### BindingNotEquals

Ƭ **BindingNotEquals**<`T`\>: [operator: "neq", binding1: Binding<T\>, binding2: Binding<T\>]

#### Type parameters

| Name |
| :------ |
| `T` |

#### Defined in

[ModConfigTypes.d.ts:108](https://github.com/olegbl/d2rmm/blob/2c14c11/src/renderer/ModConfigTypes.d.ts#L108)

___

### BindingOr

Ƭ **BindingOr**: [operator: "or", binding1: Binding<boolean\>, binding2: Binding<boolean\>]

#### Defined in

[ModConfigTypes.d.ts:96](https://github.com/olegbl/d2rmm/blob/2c14c11/src/renderer/ModConfigTypes.d.ts#L96)

___

### ModConfig

Ƭ **ModConfig**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `author?` | `string` |
| `config?` | readonly [`ModConfigFieldOrSection`](ModConfigTypes.md#modconfigfieldorsection)[] |
| `description?` | `string` |
| `name` | `string` |
| `version?` | `string` |
| `website?` | `string` |

#### Defined in

[ModConfigTypes.d.ts:2](https://github.com/olegbl/d2rmm/blob/2c14c11/src/renderer/ModConfigTypes.d.ts#L2)

___

### ModConfigField

Ƭ **ModConfigField**: [`ModConfigFieldCheckbox`](ModConfigTypes.md#modconfigfieldcheckbox) \| [`ModConfigFieldNumber`](ModConfigTypes.md#modconfigfieldnumber) \| [`ModConfigFieldText`](ModConfigTypes.md#modconfigfieldtext) \| [`ModConfigFieldSelect`](ModConfigTypes.md#modconfigfieldselect)

#### Defined in

[ModConfigTypes.d.ts:21](https://github.com/olegbl/d2rmm/blob/2c14c11/src/renderer/ModConfigTypes.d.ts#L21)

___

### ModConfigFieldBase

Ƭ **ModConfigFieldBase**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `description` | `string` |
| `id` | `string` |
| `name` | `string` |
| `visible?` | [`Binding`](ModConfigTypes.md#binding)<`boolean`\> |

#### Defined in

[ModConfigTypes.d.ts:54](https://github.com/olegbl/d2rmm/blob/2c14c11/src/renderer/ModConfigTypes.d.ts#L54)

___

### ModConfigFieldCheckbox

Ƭ **ModConfigFieldCheckbox**: [`ModConfigFieldBase`](ModConfigTypes.md#modconfigfieldbase) & { `defaultValue`: `boolean` ; `type`: ``"checkbox"``  }

#### Defined in

[ModConfigTypes.d.ts:27](https://github.com/olegbl/d2rmm/blob/2c14c11/src/renderer/ModConfigTypes.d.ts#L27)

___

### ModConfigFieldNumber

Ƭ **ModConfigFieldNumber**: [`ModConfigFieldBase`](ModConfigTypes.md#modconfigfieldbase) & { `defaultValue`: `number` ; `maxValue?`: `number` ; `minValue?`: `number` ; `type`: ``"number"``  }

#### Defined in

[ModConfigTypes.d.ts:32](https://github.com/olegbl/d2rmm/blob/2c14c11/src/renderer/ModConfigTypes.d.ts#L32)

___

### ModConfigFieldOrSection

Ƭ **ModConfigFieldOrSection**: [`ModConfigFieldSection`](ModConfigTypes.md#modconfigfieldsection) \| [`ModConfigField`](ModConfigTypes.md#modconfigfield)

#### Defined in

[ModConfigTypes.d.ts:11](https://github.com/olegbl/d2rmm/blob/2c14c11/src/renderer/ModConfigTypes.d.ts#L11)

___

### ModConfigFieldSection

Ƭ **ModConfigFieldSection**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `children?` | readonly [`ModConfigFieldOrSection`](ModConfigTypes.md#modconfigfieldorsection)[] |
| `defaultExpanded?` | `boolean` |
| `id` | `string` |
| `name` | `string` |
| `type` | ``"section"`` |

#### Defined in

[ModConfigTypes.d.ts:13](https://github.com/olegbl/d2rmm/blob/2c14c11/src/renderer/ModConfigTypes.d.ts#L13)

___

### ModConfigFieldSelect

Ƭ **ModConfigFieldSelect**: [`ModConfigFieldBase`](ModConfigTypes.md#modconfigfieldbase) & { `defaultValue`: `string` ; `options`: { `description?`: `string` ; `label`: `string` ; `value`: [`ModConfigSingleValue`](ModConfigTypes.md#modconfigsinglevalue)  }[] ; `type`: ``"select"``  }

#### Defined in

[ModConfigTypes.d.ts:44](https://github.com/olegbl/d2rmm/blob/2c14c11/src/renderer/ModConfigTypes.d.ts#L44)

___

### ModConfigFieldText

Ƭ **ModConfigFieldText**: [`ModConfigFieldBase`](ModConfigTypes.md#modconfigfieldbase) & { `defaultValue`: `number` ; `type`: ``"text"``  }

#### Defined in

[ModConfigTypes.d.ts:39](https://github.com/olegbl/d2rmm/blob/2c14c11/src/renderer/ModConfigTypes.d.ts#L39)

___

### ModConfigSingleValue

Ƭ **ModConfigSingleValue**: `string` \| `number` \| `boolean` \| `string`[] \| `number`[]

#### Defined in

[ModConfigTypes.d.ts:61](https://github.com/olegbl/d2rmm/blob/2c14c11/src/renderer/ModConfigTypes.d.ts#L61)

___

### ModConfigValue

Ƭ **ModConfigValue**: `Readonly`<{ `[key: string]`: [`ModConfigSingleValue`](ModConfigTypes.md#modconfigsinglevalue);  }\>

#### Defined in

[ModConfigTypes.d.ts:64](https://github.com/olegbl/d2rmm/blob/2c14c11/src/renderer/ModConfigTypes.d.ts#L64)
