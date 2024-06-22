import { useEffect, useState } from 'react';

function serializeImplicit<T>(value: T): string {
  return String(value);
}

function deserializeImplicit<T>(value: string): T {
  return value as unknown as T;
}

export default function useSavedState<T>(
  key: string,
  initialValue: T,
  serialize: (value: T) => string = serializeImplicit,
  deserialize: (value: string) => T = deserializeImplicit,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const savedValue = localStorage.getItem(key);
    return savedValue != null ? deserialize(savedValue) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, serialize(value));
  }, [key, value, serialize]);

  return [value, setValue];
}
