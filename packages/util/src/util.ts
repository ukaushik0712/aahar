/**
 * Check if the given input is a valid phone number.
 * Only tests Indian Phone numbers for now.
 */
export function isValidPhoneNumber(number: string) {
	const cleaned = number.replace(/\s+/g, '');
	return /^(?:(?:\+91|91))?[6-9]\d{9}$/.test(cleaned);
}
