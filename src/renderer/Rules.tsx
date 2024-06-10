// import { RuleValue } from './ModConfigTypes';

import {
  ModConfigSingleValue,
  ModConfigValue,
  RuleValue,
} from './ModConfigTypes';

export function parseValue<T extends ModConfigSingleValue>(
  value: RuleValue<T>,
  config: ModConfigValue
): T {
  if (
    Array.isArray(value) &&
    value.length > 1 &&
    typeof value[0] === 'string'
  ) {
    const [op] = value;
    if (op === 'value' && value.length === 2 && typeof value[1] === 'string') {
      return config[value[1]] as T; // no way to validate correct type of JSON parsed data
    }
    if (op === 'not' && value.length === 2) {
      const arg1 = parseValue(value[1], config);
      if (typeof arg1 === 'boolean') {
        return !arg1 as T;
      }
    }
    if (op === 'and' && value.length === 3) {
      const arg1 = parseValue(value[1], config);
      const arg2 = parseValue(value[2], config);
      if (typeof arg1 === 'boolean' && typeof arg2 === 'boolean') {
        return (arg1 && arg2) as T;
      }
    }
    if (op === 'or' && value.length === 3) {
      const arg1 = parseValue(value[1], config);
      const arg2 = parseValue(value[2], config);
      if (typeof arg1 === 'boolean' && typeof arg2 === 'boolean') {
        return (arg1 || arg2) as T;
      }
    }
    if (op === 'eq' && value.length === 3) {
      const arg1 = parseValue(value[1], config);
      const arg2 = parseValue(value[2], config);
      if (typeof arg1 === 'string' && typeof arg2 === 'string') {
        return (arg1 === arg2) as T;
      }
      if (typeof arg1 === 'boolean' && typeof arg2 === 'boolean') {
        return (arg1 === arg2) as T;
      }
      if (typeof arg1 === 'number' && typeof arg2 === 'number') {
        return (arg1 === arg2) as T;
      }
    }
    if (op === 'neq' && value.length === 3) {
      const arg1 = parseValue(value[1], config);
      const arg2 = parseValue(value[2], config);
      if (typeof arg1 === 'string' && typeof arg2 === 'string') {
        return (arg1 !== arg2) as T;
      }
      if (typeof arg1 === 'boolean' && typeof arg2 === 'boolean') {
        return (arg1 !== arg2) as T;
      }
      if (typeof arg1 === 'number' && typeof arg2 === 'number') {
        return (arg1 !== arg2) as T;
      }
    }
    if (op === 'lt' && value.length === 3) {
      const arg1 = parseValue(value[1], config);
      const arg2 = parseValue(value[2], config);
      if (typeof arg1 === 'number' && typeof arg2 === 'number') {
        return (arg1 < arg2) as T;
      }
    }
    if (op === 'lte' && value.length === 3) {
      const arg1 = parseValue(value[1], config);
      const arg2 = parseValue(value[2], config);
      if (typeof arg1 === 'number' && typeof arg2 === 'number') {
        return (arg1 <= arg2) as T;
      }
    }
    if (op === 'gt' && value.length === 3) {
      const arg1 = parseValue(value[1], config);
      const arg2 = parseValue(value[2], config);
      if (typeof arg1 === 'number' && typeof arg2 === 'number') {
        return (arg1 > arg2) as T;
      }
    }
    if (op === 'gte' && value.length === 3) {
      const arg1 = parseValue(value[1], config);
      const arg2 = parseValue(value[2], config);
      if (typeof arg1 === 'number' && typeof arg2 === 'number') {
        return (arg1 >= arg2) as T;
      }
    }
    if (op === 'in' && value.length === 3) {
      const arg1 = parseValue(value[1], config);
      const arg2 = parseValue(value[2], config);
      if (
        typeof arg1 === 'string' &&
        Array.isArray(arg2) &&
        arg2.length > 0 &&
        typeof arg2[0] === 'string'
      ) {
        return (arg2 as string[]).includes(arg1) as T;
      }
      if (
        typeof arg1 === 'number' &&
        Array.isArray(arg2) &&
        arg2.length > 0 &&
        typeof arg2[0] === 'number'
      ) {
        return (arg2 as number[]).includes(arg1) as T;
      }
    }
  }
  return value as ModConfigSingleValue as T;
}
