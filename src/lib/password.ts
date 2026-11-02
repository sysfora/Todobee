export const MIN_PASSWORD = 8;

/** Returns an error message, or null when the password change is valid. */
export function passwordChangeError(current: string, next: string, confirm: string): string | null {
  if (!current) return "Enter your current password.";
  if (next.length < MIN_PASSWORD)
    return `New password must be at least ${MIN_PASSWORD} characters.`;
  if (next === current) return "New password must be different from the current one.";
  if (next !== confirm) return "The new passwords don't match.";
  return null;
}
