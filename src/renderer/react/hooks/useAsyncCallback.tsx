import { useCallback } from 'react';

export default function useAsyncCallback<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  deps: React.DependencyList,
) {
  return useCallback(
    async (...args: TArgs): Promise<TReturn> => {
      try {
        return await fn(...args);
      } catch (error) {
        console.error(String(error));
        throw error;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );
}
