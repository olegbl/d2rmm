[D2RMM Mod API](../README.md) / [Modules](../modules.md) / ModConfigTypes

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

[ModConfigTypes.d.ts:203](https://github.com/olegbl/d2rmm/blob/5f125c1/src/renderer/ModConfigTypes.d.ts#L203)

___

### BindingAnd

Ƭ **BindingAnd**: [operator: "and", binding1: Binding<boolean\>, binding2: Binding<boolean\>]

#### Defined in

[ModConfigTypes.d.ts:145](https://github.com/olegbl/d2rmm/blob/5f125c1/src/renderer/ModConfigTypes.d.ts#L145)

___

### BindingConditional

Ƭ **BindingConditional**<`T`\>: [operator: "if", condition: Binding<boolean\>, thenBinding: Binding<T\>, elseBinding: Binding<T\>]

#### Type parameters

| Name |
| :------ |
| `T` |

#### Defined in

[ModConfigTypes.d.ts:136](https://github.com/olegbl/d2rmm/blob/5f125c1/src/renderer/ModConfigTypes.d.ts#L136)

___

### BindingConfigValue

Ƭ **BindingConfigValue**<`_T`\>: [operator: "value", id: string]

#### Type parameters

| Name | Type |
| :------ | :------ |
| `_T` | extends [`ModConfigSingleValue`](ModConfigTypes.md#modconfigsinglevalue) |

#### Defined in

[ModConfigTypes.d.ts:131](https://github.com/olegbl/d2rmm/blob/5f125c1/src/renderer/ModConfigTypes.d.ts#L131)

___

### BindingEquals

Ƭ **BindingEquals**<`T`\>: [operator: "eq", binding1: Binding<T\>, binding2: Binding<T\>]

#### Type parameters

| Name |
| :------ |
| `T` |

#### Defined in

[ModConfigTypes.d.ts:157](https://github.com/olegbl/d2rmm/blob/5f125c1/src/renderer/ModConfigTypes.d.ts#L157)

___

### BindingGreaterThan

Ƭ **BindingGreaterThan**: [operator: "gt", binding1: Binding<number\>, binding2: Binding<number\>]

#### Defined in

[ModConfigTypes.d.ts:181](https://github.com/olegbl/d2rmm/blob/5f125c1/src/renderer/ModConfigTypes.d.ts#L181)

___

### BindingGreaterThanOrEqual

Ƭ **BindingGreaterThanOrEqual**: [operator: "gte", binding1: Binding<number\>, binding2: Binding<number\>]

#### Defined in

[ModConfigTypes.d.ts:187](https://github.com/olegbl/d2rmm/blob/5f125c1/src/renderer/ModConfigTypes.d.ts#L187)

___

### BindingIncludes

Ƭ **BindingIncludes**<`T`\>: [operator: "in", binding1: Binding<T\>, binding2: T extends string ? Binding<string[]\> : T extends number ? Binding<number[]\> : never]

#### Type parameters

| Name |
| :------ |
| `T` |

#### Defined in

[ModConfigTypes.d.ts:193](https://github.com/olegbl/d2rmm/blob/5f125c1/src/renderer/ModConfigTypes.d.ts#L193)

___

### BindingLessThan

Ƭ **BindingLessThan**: [operator: "lt", binding1: Binding<number\>, binding2: Binding<number\>]

#### Defined in

[ModConfigTypes.d.ts:169](https://github.com/olegbl/d2rmm/blob/5f125c1/src/renderer/ModConfigTypes.d.ts#L169)

___

### BindingLessThanOrEqual

Ƭ **BindingLessThanOrEqual**: [operator: "lte", binding1: Binding<number\>, binding2: Binding<number\>]

#### Defined in

[ModConfigTypes.d.ts:175](https://github.com/olegbl/d2rmm/blob/5f125c1/src/renderer/ModConfigTypes.d.ts#L175)

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

[ModConfigTypes.d.ts:129](https://github.com/olegbl/d2rmm/blob/5f125c1/src/renderer/ModConfigTypes.d.ts#L129)

___

### BindingNot

Ƭ **BindingNot**: [operator: "not", binding: Binding<boolean\>]

#### Defined in

[ModConfigTypes.d.ts:143](https://github.com/olegbl/d2rmm/blob/5f125c1/src/renderer/ModConfigTypes.d.ts#L143)

___

### BindingNotEquals

Ƭ **BindingNotEquals**<`T`\>: [operator: "neq", binding1: Binding<T\>, binding2: Binding<T\>]

#### Type parameters

| Name |
| :------ |
| `T` |

#### Defined in

[ModConfigTypes.d.ts:163](https://github.com/olegbl/d2rmm/blob/5f125c1/src/renderer/ModConfigTypes.d.ts#L163)

___

### BindingOr

Ƭ **BindingOr**: [operator: "or", binding1: Binding<boolean\>, binding2: Binding<boolean\>]

#### Defined in

[ModConfigTypes.d.ts:151](https://github.com/olegbl/d2rmm/blob/5f125c1/src/renderer/ModConfigTypes.d.ts#L151)

___

### ModConfig

Ƭ **ModConfig**: `Object`

This is the structure of the "mod.json" file that D2RMM mods should provide.

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `author?` | `string` | The author of the mod. |
| `config?` | readonly [`ModConfigFieldOrSection`](ModConfigTypes.md#modconfigfieldorsection)[] | The configuration for the mod. This allows the mod to set up a custom configuration UI that the user can interact with to customize the behavior of the mod. |
| `description?` | `string` | A short description of the mod. |
| `name` | `string` | The name of the mod. |
| `version?` | `string` | The version of the mod. |
| `website?` | `string` | The website of the mod. Ideally, this should link to the Nexus Mods page for the mod. |

#### Defined in

[ModConfigTypes.d.ts:4](https://github.com/olegbl/d2rmm/blob/5f125c1/src/renderer/ModConfigTypes.d.ts#L4)

___

### ModConfigField

Ƭ **ModConfigField**: [`ModConfigFieldCheckbox`](ModConfigTypes.md#modconfigfieldcheckbox) \| [`ModConfigFieldNumber`](ModConfigTypes.md#modconfigfieldnumber) \| [`ModConfigFieldText`](ModConfigTypes.md#modconfigfieldtext) \| [`ModConfigFieldSelect`](ModConfigTypes.md#modconfigfieldselect)

Represents a single configuration field.

#### Defined in

[ModConfigTypes.d.ts:51](https://github.com/olegbl/d2rmm/blob/5f125c1/src/renderer/ModConfigTypes.d.ts#L51)

___

### ModConfigFieldBase

Ƭ **ModConfigFieldBase**: `Object`

Represents the base structure of any configuration field.

#### Type declaration

| Name | Type |
| :------ | :------ |
| `description` | `string` |
| `id` | `string` |
| `name` | `string` |
| `visible?` | [`Binding`](ModConfigTypes.md#binding)<`boolean`\> |

#### Defined in

[ModConfigTypes.d.ts:103](https://github.com/olegbl/d2rmm/blob/5f125c1/src/renderer/ModConfigTypes.d.ts#L103)

___

### ModConfigFieldCheckbox

Ƭ **ModConfigFieldCheckbox**: [`ModConfigFieldBase`](ModConfigTypes.md#modconfigfieldbase) & { `defaultValue`: `boolean` ; `type`: ``"checkbox"``  }

Represents a boolean (true/false) configuration field that will be represented
as a checkbox or toggle element in the configuration UI.

#### Defined in

[ModConfigTypes.d.ts:61](https://github.com/olegbl/d2rmm/blob/5f125c1/src/renderer/ModConfigTypes.d.ts#L61)

___

### ModConfigFieldNumber

Ƭ **ModConfigFieldNumber**: [`ModConfigFieldBase`](ModConfigTypes.md#modconfigfieldbase) & { `defaultValue`: `number` ; `maxValue?`: `number` ; `minValue?`: `number` ; `type`: ``"number"``  }

Represents a number configuration field that will be represented as a number
input in the configuration UI.

#### Defined in

[ModConfigTypes.d.ts:70](https://github.com/olegbl/d2rmm/blob/5f125c1/src/renderer/ModConfigTypes.d.ts#L70)

___

### ModConfigFieldOrSection

Ƭ **ModConfigFieldOrSection**: [`ModConfigFieldSection`](ModConfigTypes.md#modconfigfieldsection) \| [`ModConfigField`](ModConfigTypes.md#modconfigfield)

Represents a single configuration field or section.

#### Defined in

[ModConfigTypes.d.ts:35](https://github.com/olegbl/d2rmm/blob/5f125c1/src/renderer/ModConfigTypes.d.ts#L35)

___

### ModConfigFieldSection

Ƭ **ModConfigFieldSection**: `Object`

Represents a section in the configuration UI that can contain other fields or sections.

#### Type declaration

| Name | Type |
| :------ | :------ |
| `children?` | readonly [`ModConfigFieldOrSection`](ModConfigTypes.md#modconfigfieldorsection)[] |
| `defaultExpanded?` | `boolean` |
| `id` | `string` |
| `name` | `string` |
| `type` | ``"section"`` |

#### Defined in

[ModConfigTypes.d.ts:40](https://github.com/olegbl/d2rmm/blob/5f125c1/src/renderer/ModConfigTypes.d.ts#L40)

___

### ModConfigFieldSelect

Ƭ **ModConfigFieldSelect**: [`ModConfigFieldBase`](ModConfigTypes.md#modconfigfieldbase) & { `defaultValue`: `string` ; `options`: { `description?`: `string` ; `label`: `string` ; `value`: [`ModConfigSingleValue`](ModConfigTypes.md#modconfigsinglevalue)  }[] ; `type`: ``"select"``  }

Represents a select configuration field that will be represented as a dropdown
select element in the configuration UI.

#### Defined in

[ModConfigTypes.d.ts:90](https://github.com/olegbl/d2rmm/blob/5f125c1/src/renderer/ModConfigTypes.d.ts#L90)

___

### ModConfigFieldText

Ƭ **ModConfigFieldText**: [`ModConfigFieldBase`](ModConfigTypes.md#modconfigfieldbase) & { `defaultValue`: `number` ; `type`: ``"text"``  }

Represents a text configuration field that will be represented as a text input
in the configuration UI.

#### Defined in

[ModConfigTypes.d.ts:81](https://github.com/olegbl/d2rmm/blob/5f125c1/src/renderer/ModConfigTypes.d.ts#L81)

___

### ModConfigSingleValue

Ƭ **ModConfigSingleValue**: `string` \| `number` \| `boolean` \| `string`[] \| `number`[]

Represents the valid value of any single configuration field.

#### Defined in

[ModConfigTypes.d.ts:113](https://github.com/olegbl/d2rmm/blob/5f125c1/src/renderer/ModConfigTypes.d.ts#L113)

___

### ModConfigValue

Ƭ **ModConfigValue**: `Readonly`<{ `[key: string]`: [`ModConfigSingleValue`](ModConfigTypes.md#modconfigsinglevalue);  }\>

This is the structure of the mod config as it is passed to the
mod's implementation.

#### Defined in

[ModConfigTypes.d.ts:119](https://github.com/olegbl/d2rmm/blob/5f125c1/src/renderer/ModConfigTypes.d.ts#L119)
