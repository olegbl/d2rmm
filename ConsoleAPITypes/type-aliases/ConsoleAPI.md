[**D2RMM Mod API**](../../index.md) • **Docs**

***

[D2RMM Mod API](../../modules.md) / [ConsoleAPITypes](../index.md) / ConsoleAPI

# Type alias: ConsoleAPI

> **ConsoleAPI**: `object`

A console interface similar to that provided by the DOM or Node.
It will print to D2RMM's logs tab.

## See

https://developer.mozilla.org/en-US/docs/Web/API/Console

## Type declaration

### debug()

> **debug**: (...`args`) => `void`

#### Parameters

• ...**args**: `unknown`[]

#### Returns

`void`

### error()

> **error**: (...`args`) => `void`

#### Parameters

• ...**args**: `unknown`[]

#### Returns

`void`

### log()

> **log**: (...`args`) => `void`

#### Parameters

• ...**args**: `unknown`[]

#### Returns

`void`

### warn()

> **warn**: (...`args`) => `void`

#### Parameters

• ...**args**: `unknown`[]

#### Returns

`void`

## Source

[ConsoleAPITypes.d.ts:6](https://github.com/olegbl/d2rmm/blob/7b50646c3690465cf5277007fc3d5d33286edb15/src/renderer/ConsoleAPITypes.d.ts#L6)
