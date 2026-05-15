const MIN_PASSWORD_LENGTH = 8;

type PasswordValidationResult =
  | { ok: true }
  | { ok: false; error: string };

export function validatePasswordStrength(password: string): PasswordValidationResult {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: "Password must be at least 8 characters long." };
  }

  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return { ok: false, error: "Password must include at least one letter and one number." };
  }

  return { ok: true };
}
