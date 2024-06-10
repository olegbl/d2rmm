[D2RMM Mod API](../README.md) / [Modules](../modules.md) / ConsoleAPITypes

# Module: ConsoleAPITypes

## Table of contents

### Type Aliases

- [ConsoleAPI](ConsoleAPITypes.md#consoleapi)

## Type Aliases

### ConsoleAPI

Ƭ **ConsoleAPI**: `Object`

A console interface similar to that provided by the DOM or Node.
It will print to D2RMM's logs tab.

**`see`** https://developer.mozilla.org/en-US/docs/Web/API/Console

#### Type declaration

| Name | Type |
| :------ | :------ |
| `debug` | (...`args`: `unknown`[]) => `void` |
| `error` | (...`args`: `unknown`[]) => `void` |
| `log` | (...`args`: `unknown`[]) => `void` |
| `warn` | (...`args`: `unknown`[]) => `void` |

#### Defined in

[ConsoleAPITypes.d.ts:6](https://github.com/olegbl/d2rmm/blob/5f125c1/src/renderer/ConsoleAPITypes.d.ts#L6)
