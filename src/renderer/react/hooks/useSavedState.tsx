import { useEffect, useState } from 'react';

function serializeImplicit<T>(value: T): string {
  return String(value);
}

function deserializeImplicit<T>(value: string): T {
  // TODO: just use JSON.stringify / JSON.parse for all saved state
  //       but needs a migration path for existing users

  // hack around stringified null and undefined values since the string
  // versions of these values aren't actually valid for any existing use case
  if (value === 'null') {
    return null as unknown as T;
  }
  if (value === 'undefined') {
    return undefined as unknown as T;
  }

  return value as unknown as T;
}

export default function useSavedState<T>(
  key: string,
  initialValue: T,
  serialize: (value: T) => string = serializeImplicit,
  deserialize: (value: string) => T = deserializeImplicit,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const savedValue = localStorage.getItem(key);
      return savedValue != null ? deserialize(savedValue) : initialValue;
    } catch (e) {
      console.error(e);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, serialize(value));
    } catch (e) {
      console.error(e);
    }
  }, [key, value, serialize]);

  return [value, setValue];
}
