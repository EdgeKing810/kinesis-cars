export const USERNAME_MIN_LENGTH = 8;

/** Matches a basic email shape: local@domain.tld */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** At least 8 chars, with 1 lowercase, 1 uppercase and 1 non-alphanumeric symbol. */
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

export function isValidEmail(value: string): boolean {
	return EMAIL_REGEX.test(value.trim());
}

export function isValidUsername(value: string): boolean {
	return value.trim().length >= USERNAME_MIN_LENGTH;
}

export function isValidPassword(value: string): boolean {
	return PASSWORD_REGEX.test(value);
}