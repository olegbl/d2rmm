import { useCallback, useState } from 'react';

export function useIsFocused(): [
  isFocused: boolean,
  onFocus: () => void,
  onBlur: () => void,
] {
  const [isFocused, setIsFocused] = useState(false);
  const onFocus = useCallback(() => setIsFocused(true), []);
  const onBlur = useCallback(() => setIsFocused(false), []);
  return [isFocused, onFocus, onBlur];
}
