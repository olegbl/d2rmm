export default function throttle<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  timeoutMs: number,
): (...args: TArgs) => void {
  // TODO: figure out why we're using NodeJS types instead of DOM types in here
  let timeoutID: NodeJS.Timeout | null = null;
  let lastExecutionTime = 0;
  return (...args) => {
    if (timeoutID != null) {
      clearTimeout(timeoutID);
    }
    const remainingTimeoutMs = timeoutMs - (Date.now() - lastExecutionTime);
    if (remainingTimeoutMs < 0) {
      fn(...args);
      lastExecutionTime = Date.now();
    } else {
      timeoutID = setTimeout(() => {
        timeoutID = null;
        lastExecutionTime = Date.now();
        fn(...args);
      }, remainingTimeoutMs);
    }
  };
}
