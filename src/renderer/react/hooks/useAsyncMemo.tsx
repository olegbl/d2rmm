import { useEffect, useState } from 'react';

export function useAsyncMemo<T>(getValue: () => Promise<T>): T | null {
  const [value, setValue] = useState<T | null>(null);
  useEffect(() => {
    getValue().then(setValue).catch(console.error);
  }, [getValue]);
  return value;
}
