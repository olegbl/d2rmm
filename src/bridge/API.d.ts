import { SerializableType } from './Serializable';

type ShallowEqual<X, Y> = X extends Y ? (Y extends X ? true : false) : false;

// prettier-ignore
type DeepEqual<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends
  (<T>() => T extends Y ? 1 : 2) ? true : false;

type IsValidOrInterface<TValue, TValid> =
  // if the value is valid
  TValue extends TValid
    ? true
    : // if the value is an interface and all of its values are valid
      ShallowEqual<
          TValue,
          {
            [K in keyof TValue as IsValidOrInterface<
              TValue[K],
              TValid
            > extends true
              ? K
              : never]: TValue[K];
          }
        > extends true
      ? true
      : false;

type BaseAPI<T, TValidArgument, TValidReturn, TValidReturnVoid = void> = {
  [K in keyof T as T[K] extends (...args: infer TArgs) => infer TReturn
    ? IsValidOrInterface<TArgs, TValidArgument[]> extends true
      ? IsValidOrInterface<TReturn, TValidReturn> extends true
        ? K
        : IsValidOrInterface<TReturn, TValidReturnVoid> extends true
          ? K
          : never
      : never
    : never]: T[K];
};

type AsBaseAPI<T, TArgument, TReturn, TReturnVoid = void> =
  ShallowEqual<T, BaseAPI<T, TArgument, TReturn, TReturnVoid>> extends true
    ? T
    : never;

type AnyAPIMethod<TArgument, TReturn, TReturnVoid = void> =
  | ((...args: TArgument[]) => TReturn)
  | ((...args: TArgument[]) => TReturnVoid);

export type AsyncSerializableAPI<T> = BaseAPI<
  T,
  SerializableType,
  Promise<SerializableType>,
  Promise<void>
>;

export type AsAsyncSerializableAPI<T> = AsBaseAPI<
  T,
  SerializableType,
  Promise<SerializableType>,
  Promise<void>
>;

export type AnyAsyncSerializableAPIMethod = AnyAPIMethod<
  SerializableType,
  Promise<SerializableType>,
  Promise<void>
>;
