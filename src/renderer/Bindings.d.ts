import { ModConfigSingleValue } from './ModConfigValue';

export type BindingLiteralValue<T> = T;

export type BindingConfigValue<_T extends ModConfigSingleValue> = [
  operator: 'value',
  id: string
];

export type BindingConditional<T> = [
  operator: 'if',
  condition: Binding<boolean>,
  thenBinding: Binding<T>,
  elseBinding: Binding<T>
];

export type BindingNot = [operator: 'not', binding: Binding<boolean>];

export type BindingAnd = [
  operator: 'and',
  binding1: Binding<boolean>,
  binding2: Binding<boolean>
];

export type BindingOr = [
  operator: 'or',
  binding1: Binding<boolean>,
  binding2: Binding<boolean>
];

export type BindingEquals<T> = [
  operator: 'eq',
  binding1: Binding<T>,
  binding2: Binding<T>
];

export type BindingNotEquals<T> = [
  operator: 'neq',
  binding1: Binding<T>,
  binding2: Binding<T>
];

export type BindingLessThan = [
  operator: 'lt',
  binding1: Binding<number>,
  binding2: Binding<number>
];

export type BindingLessThanOrEqual = [
  operator: 'lte',
  binding1: Binding<number>,
  binding2: Binding<number>
];

export type BindingGreaterThan = [
  operator: 'gt',
  binding1: Binding<number>,
  binding2: Binding<number>
];

export type BindingGreaterThanOrEqual = [
  operator: 'gte',
  binding1: Binding<number>,
  binding2: Binding<number>
];

export type BindingIncludes<T> = [
  operator: 'in',
  binding1: Binding<T>,
  binding2: T extends string
    ? Binding<string[]>
    : T extends number
    ? Binding<number[]>
    : never
];

export type Binding<T> =
  // string
  T extends string
    ?
        | BindingLiteralValue<string>
        | BindingConfigValue<string>
        | BindingConditional<boolean>
    : // number
    T extends number
    ?
        | BindingLiteralValue<number>
        | BindingConfigValue<number>
        | BindingConditional<boolean>
    : // boolean
    T extends boolean
    ?
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
        | BindingIncludes<number>
    : // string[]
    T extends string[]
    ?
        | BindingLiteralValue<string[]>
        | BindingConfigValue<string[]>
        | BindingConditional<boolean>
    : // number[]
    T extends number[]
    ?
        | BindingLiteralValue<number[]>
        | BindingConfigValue<number[]>
        | BindingConditional<boolean>
    : // fallthrough
      BindingLiteralValue<T>;
