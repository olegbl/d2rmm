/**
 * Error handling utilities for d2s parsing.
 * These utilities help provide better context when parsing errors occur.
 */

/**
 * Wraps an error with additional context about what was being parsed.
 * @param error The original error
 * @param context Description of what was being parsed
 * @returns A new error with enhanced message
 */
export function wrapParsingError(error: unknown, context: string): Error {
  const originalMessage =
    error instanceof Error ? error.message : String(error);
  const newMessage = `${context}:\n${originalMessage}`;

  if (error instanceof Error) {
    // Preserve the original error's stack trace
    const newError = new Error(newMessage);
    newError.stack = error.stack;
    return newError;
  }

  return new Error(newMessage);
}

/**
 * Creates a parsing error with context about the binary stream position.
 * @param message The error message
 * @param bitOffset The bit offset in the stream where the error occurred
 * @param additionalContext Optional additional context
 */
export function createParsingError(
  message: string,
  bitOffset: number,
  additionalContext?: string,
): Error {
  const byteOffset = Math.floor(bitOffset / 8);
  const bitPosition = bitOffset % 8;
  let errorMessage = `${message} at byte offset ${byteOffset}`;

  if (bitPosition !== 0) {
    errorMessage += `, bit ${bitPosition}`;
  }

  errorMessage += ` (bit offset ${bitOffset})`;

  if (additionalContext) {
    errorMessage = `${additionalContext}: ${errorMessage}`;
  }

  return new Error(errorMessage);
}

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
