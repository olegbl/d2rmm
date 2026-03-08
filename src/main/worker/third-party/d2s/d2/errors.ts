/**
 * Error handling utilities for d2s parsing.
 * These utilities help provide better context when parsing errors occur.
 */

/**
 * Formats character information for error messages.
 */
export function formatCharContext(char: {
  header?: { class?: string; level?: number; name?: string };
}): string {
  const parts: string[] = [];

  if (char.header?.name) {
    parts.push(`name: ${char.header.name}`);
  }

  if (char.header?.class) {
    parts.push(`class: ${char.header.class}`);
  }

  if (char.header?.level !== undefined) {
    parts.push(`level: ${char.header.level}`);
  }

  return parts.length > 0 ? `Character(${parts.join(', ')})` : 'Character';
}
