/**
 * Extract unique @username mentions from text.
 * Matches @username where username contains alphanumeric, underscore, or dot.
 * Returns usernames without the @ prefix.
 */
export function extractMentions(text: string): string[] {
  const mentionRegex = /@([a-zA-Z0-9_.]+)/g;
  const mentions: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = mentionRegex.exec(text)) !== null) {
    const username = match[1];
    if (!mentions.includes(username)) {
      mentions.push(username);
    }
  }

  return mentions;
}
