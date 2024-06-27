export function uuid(): string {
  const part1 = Math.random().toString(16).slice(2, 10);
  const part2 = Math.random().toString(16).slice(2, 6);
  const part3 = Math.random().toString(16).slice(2, 6);
  const part4 = Math.random().toString(16).slice(2, 6);
  const part5 = Math.random().toString(16).slice(2, 14);
  return `${part1}-${part2}-${part3}-${part4}-${part5}`;
}
