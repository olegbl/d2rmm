export function isNotNull<T>(input: T | null | undefined): input is T {
  return input != null;
}
