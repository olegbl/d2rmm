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
 *
 * @since D2RMM v1.6.0
 */
export type BindingLiteralValue<T extends ModConfigSingleValue> = T;

/**
 * Returns the value of the configuration field whose id matches the first parameter (`string`).
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
 *
 * @since D2RMM v1.6.0
 */
export type BindingConfigValue<_T extends ModConfigSingleValue> = [
  operator: 'value',
  id: string,
];

/**
 * Returns whether the configuration section whose id matches the first parameter (`string`) is currently expanded.
 * @example
 * ```
 * {
 *   "id": "MyConfigSection",
 *   "type": "section",
 * },
 * {
 *   // ...
 *   "visible": ["expanded", "MyConfigSection"],
 * },
 * ```
 *
 * @since D2RMM v1.8.0
 */
export type BindingSectionExpanded = [operator: 'expanded', id: string];

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
 *
 * @since D2RMM v1.6.0
 */
export type BindingConditional<T extends ModConfigSingleValue> = [
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
 *
 * @since D2RMM v1.6.0
 */
export type BindingNot = [operator: 'not', binding: Binding<boolean>];

/**
 * Checks if all of the parameters (`boolean`) are true.
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
 *
 * @since D2RMM v1.6.0
 */
export type BindingAnd = [operator: 'and', ...bindings: Binding<boolean>[]];

/**
 * Checks if any of the parameters (`boolean`) are true.
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
 *
 * @since D2RMM v1.6.0
 */
export type BindingOr = [operator: 'or', ...bindings: Binding<boolean>[]];

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
 *
 * @since D2RMM v1.6.0
 */
export type BindingEquals<T extends ModConfigSingleValue> = [
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
 *
 * @since D2RMM v1.6.0
 */
export type BindingNotEquals<T extends ModConfigSingleValue> = [
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
 *
 * @since D2RMM v1.6.0
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
 *
 * @since D2RMM v1.6.0
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
 *
 * @since D2RMM v1.6.0
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
 *
 * @since D2RMM v1.6.0
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
 *
 * @since D2RMM v1.6.0
 */
export type BindingIncludes<T extends ModConfigSingleValue> = [
  operator: 'in',
  binding1: Binding<T>,
  binding2: T extends string
    ? Binding<string[]>
    : T extends number
      ? Binding<number[]>
      : never,
];

/**
 * A binding that can be dynamically evaluated to a `null` value.
 *
 * @since D2RMM v1.6.0
 */
type NullBinding<T extends null = null> =
  | BindingLiteralValue<T>
  | BindingConfigValue<T>
  | BindingConditional<T>;

/**
 * A binding that can be dynamically evaluated to a `string` value.
 *
 * @since D2RMM v1.6.0
 */
type StringBinding<T extends null | string = string> =
  | BindingLiteralValue<T>
  | BindingConfigValue<T>
  | BindingConditional<T>;

/**
 * A binding that can be dynamically evaluated to a `number` value.
 *
 * @since D2RMM v1.6.0
 */
type NumberBinding<T extends null | number = number> =
  | BindingLiteralValue<T>
  | BindingConfigValue<T>
  | BindingConditional<T>;

/**
 * A binding that can be dynamically evaluated to a `boolean` value.
 *
 * @since D2RMM v1.6.0
 */
type BooleanBinding<T extends null | boolean = boolean> =
  | BindingLiteralValue<T>
  | BindingConfigValue<T>
  | BindingSectionExpanded
  | BindingConditional<T>
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
 *
 * @since D2RMM v1.6.0
 */
type StringArrayBinding<T extends null | string[] = string[]> =
  | BindingLiteralValue<T>
  | BindingConfigValue<T>
  | BindingConditional<T>;

/**
 * A binding that can be dynamically evaluated to a `number[]` value.
 *
 * @since D2RMM v1.6.0
 */
type NumberArrayBinding<T extends null | number[] = number[]> =
  | BindingLiteralValue<T>
  | BindingConfigValue<T>
  | BindingConditional<T>;

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
 *
 * @since D2RMM v1.6.0
 */
export type Binding<T extends ModConfigSingleValue> =
  // check type of T and return appropriate Binding type
  T extends null
    ? NullBinding
    : T extends string | null
      ? StringBinding<string | null>
      : T extends string
        ? StringBinding
        : T extends number | null
          ? NumberBinding<number | null>
          : T extends number
            ? NumberBinding
            : T extends boolean | null
              ? BooleanBinding<boolean | null>
              : T extends boolean
                ? BooleanBinding
                : T extends string[] | null
                  ? StringArrayBinding<string[] | null>
                  : T extends string[]
                    ? StringArrayBinding
                    : T extends number[] | null
                      ? NumberArrayBinding<number[] | null>
                      : T extends number[]
                        ? NumberArrayBinding
                        : never;
