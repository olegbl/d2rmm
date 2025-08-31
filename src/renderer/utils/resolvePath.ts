export default function resolvePath(...paths: string[]): string {
  const isWindows = window.env.platform === 'win32';
  const pathSeparator = isWindows ? '\\' : '/';
  return paths.join(pathSeparator);
}
