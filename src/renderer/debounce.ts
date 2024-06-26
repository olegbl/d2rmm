export default function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  timeoutMs: number,
): (...args: TArgs) => void {
  // TODO: figure out why we're using NodeJS types instead of DOM types in here
  let timeoutID: NodeJS.Timeout | null = null;
  return (...args) => {
    if (timeoutID != null) {
      clearTimeout(timeoutID);
    }
    timeoutID = setTimeout(() => {
      timeoutID = null;
      fn(...args);
    }, timeoutMs);
  };
}
