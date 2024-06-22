import { ModConfigSingleValue } from './ModConfigValue';

/**
 * A literal JSON value.
 * @example
 * ```
 * {
 *   // ...
 *   "visible": true,
 * },
 * ```
 */
export type BindingLiteralValue<T> = T;

/**
 * Returns the value of a configuration field.
 * @example
 * ```
 * {
 *   "id": "MyConfigField",
 *   "type": "checkbox",
 * },
 * {
 *   // ...
 *   "visible": ["value", "MyConfigField"],
 * },
 */
export type BindingConfigValue<_T extends ModConfigSingleValue> = [
  operator: 'value',
  id: string,
];

/**
 * If the first parameter (`boolean`) is true, returns the second parameter (`T`), otherwise returns the third parameter (`T`).
 * @remarks
 * The type of the second and third parameters must be the same.
 * @example
 * ```
 * {
 *   "id": "MyConfigField",
 *   "type": "checkbox",
 * },
 * {
 *   // ...
 *   "visible": ["if", ["value", "MyConfigField"], true, false],
 * },
 * ```
 */
export type BindingConditional<T> = [
  operator: 'if',
  condition: Binding<boolean>,
  thenBinding: Binding<T>,
  elseBinding: Binding<T>,
];

/**
 * Checks if the parameter (`boolean`) is false.
 * @example
 * ```
 * {
 *   "id": "MyConfigField",
 *   "type": "checkbox",
 * },
 * {
 *   // ...
 *   "visible": ["not", ["value", "MyConfigField"]],
 * },
 * ```
 */
export type BindingNot = [operator: 'not', binding: Binding<boolean>];

/**
 * Checks if both the first parameters (`boolean`) and the second parameter (`boolean`) are both true.
 * @example
 * ```
 * {
 *   "id": "MyConfigField1",
 *   "type": "checkbox",
 * },
 * {
 *   "id": "MyConfigField2",
 *   "type": "checkbox",
 * },
 * {
 *   // ...
 *   "visible": ["and", ["value", "MyConfigField1"], ["value", "MyConfigField2"]],
 * },
 * ```
 */
export type BindingAnd = [
  operator: 'and',
  binding1: Binding<boolean>,
  binding2: Binding<boolean>,
];

/**
 * Checks if either the first parameters (`boolean`) or the second parameter (`boolean`) is true.
 * @example
 * ```
 * {
 *   "id": "MyConfigField1",
 *   "type": "checkbox",
 * },
 * {
 *   "id": "MyConfigField2",
 *   "type": "checkbox",
 * },
 * {
 *   // ...
 *   "visible": ["or", ["value", "MyConfigField1"], ["value", "MyConfigField2"]],
 * },
 * ```
 */
export type BindingOr = [
  operator: 'or',
  binding1: Binding<boolean>,
  binding2: Binding<boolean>,
];

/**
 * Checks if the first parameter (`T`) is equal to the second parameter (`T`).
 * @example
 * ```
 * {
 *   "id": "MyConfigField",
 *   "type": "number",
 * },
 * {
 *   // ...
 *   "visible": ["eq", ["value", "MyConfigField"], 123],
 * },
 * ```
 */
export type BindingEquals<T> = [
  operator: 'eq',
  binding1: Binding<T>,
  binding2: Binding<T>,
];

/**
 * Checks if the first parameter (`T`) is not equal to the second parameter (`T`).
 * @example
 * ```
 * {
 *   "id": "MyConfigField",
 *   "type": "number",
 * },
 * {
 *   // ...
 *   "visible": ["neq", ["value", "MyConfigField"], 123],
 * },
 * ```
 */
export type BindingNotEquals<T> = [
  operator: 'neq',
  binding1: Binding<T>,
  binding2: Binding<T>,
];

/**
 * Checks if the first parameter (`number`) is less than the second parameter (`number`).
 * @example
 * ```
 * {
 *   "id": "MyConfigField",
 *   "type": "number",
 * },
 * {
 *   // ...
 *   "visible": ["lt", ["value", "MyConfigField"], 123],
 * },
 * ```
 */
export type BindingLessThan = [
  operator: 'lt',
  binding1: Binding<number>,
  binding2: Binding<number>,
];

/**
 * Checks if the first parameter (`number`) is less than or equal to the second parameter (`number`).
 * @example
 * ```
 * {
 *   "id": "MyConfigField",
 *   "type": "number",
 * },
 * {
 *   // ...
 *   "visible": ["lte", ["value", "MyConfigField"], 123],
 * },
 * ```
 */
export type BindingLessThanOrEqual = [
  operator: 'lte',
  binding1: Binding<number>,
  binding2: Binding<number>,
];

/**
 * Checks if the first parameter (`number`) is greater than the second parameter (`number`).
 * @example
 * ```
 * {
 *   "id": "MyConfigField",
 *   "type": "number",
 * },
 * {
 *   // ...
 *   "visible": ["gt", ["value", "MyConfigField"], 123],
 * },
 * ```
 */
export type BindingGreaterThan = [
  operator: 'gt',
  binding1: Binding<number>,
  binding2: Binding<number>,
];

/**
 * CHecks if the first parameter (`number`) is greater than or equal to the second parameter (`number`).
 * @example
 * ```
 * {
 *   "id": "MyConfigField",
 *   "type": "number",
 * },
 * {
 *   // ...
 *   "visible": ["gte", ["value", "MyConfigField"], 123],
 * },
 * ```
 */
export type BindingGreaterThanOrEqual = [
  operator: 'gte',
  binding1: Binding<number>,
  binding2: Binding<number>,
];

/**
 * Checks if the first parameter (`string` or `number`) is a part of the second parameter (`string[]` or `number[]`).
 * @example
 * ```
 * {
 *   "id": "MyConfigField",
 *   "type": "text",
 * },
 * {
 *   // ...
 *   "visible": ["in", "foo", ["value", "MyConfigField"]],
 * },
 * ```
 */
export type BindingIncludes<T> = [
  operator: 'in',
  binding1: Binding<T>,
  binding2: T extends string
    ? Binding<string[]>
    : T extends number
      ? Binding<number[]>
      : never,
];

/**
 * A binding that can be dynamically evaluated to a `string` value.
 */
type StringBinding =
  | BindingLiteralValue<string>
  | BindingConfigValue<string>
  | BindingConditional<boolean>;

/**
 * A binding that can be dynamically evaluated to a `number` value.
 */
type NumberBinding =
  | BindingLiteralValue<number>
  | BindingConfigValue<number>
  | BindingConditional<boolean>;

/**
 * A binding that can be dynamically evaluated to a `boolean` value.
 */
type BooleanBinding =
  | BindingLiteralValue<boolean>
  | BindingConfigValue<boolean>
  | BindingConditional<boolean>
  | BindingNot
  | BindingAnd
  | BindingOr
  | BindingEquals<string>
  | BindingEquals<boolean>
  | BindingEquals<number>
  | BindingNotEquals<string>
  | BindingNotEquals<boolean>
  | BindingNotEquals<number>
  | BindingLessThan
  | BindingLessThanOrEqual
  | BindingGreaterThan
  | BindingGreaterThanOrEqual
  | BindingIncludes<string>
  | BindingIncludes<number>;

/**
 * A binding that can be dynamically evaluated to a `string[]` value.
 */
type StringArrayBinding =
  | BindingLiteralValue<string[]>
  | BindingConfigValue<string[]>
  | BindingConditional<boolean>;

/**
 * A binding that can be dynamically evaluated to a `number[]` value.
 */
type NumberArrayBinding =
  | BindingLiteralValue<number[]>
  | BindingConfigValue<number[]>
  | BindingConditional<boolean>;

/**
 * A binding that can be dynamically evaluated to a value.
 * @example
 * ```
 * {
 *   "id": "MyConfigField",
 *   "type": "checkbox",
 * },
 * {
 *   // ...
 *   "visible": ["value", "MyConfigField"],
 * },
 * ```
 */
export type Binding<T> =
  // check type of T and return appropriate Binding type
  T extends string
    ? StringBinding
    : T extends number
      ? NumberBinding
      : T extends boolean
        ? BooleanBinding
        : T extends string[]
          ? StringArrayBinding
          : T extends number[]
            ? NumberArrayBinding
            : BindingLiteralValue<T>;
