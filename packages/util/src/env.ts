/**
 * Type-safe environment variable parsing with strict overload inference.
 */

export function parseEnvString(key: string): string;
export function parseEnvString(key: string, defaultValue: string): string;
export function parseEnvString(key: string, defaultValue: null): string | null;
export function parseEnvString(key: string, defaultValue?: string | null): string | null {
	const val = process.env[key];

	if (val !== undefined && val.trim() !== '') return val;
	if (defaultValue !== undefined) return defaultValue;

	throw new Error(`[@aahar/env]: Environment variable "${key}" is required but was not set.`);
}

export function parseEnvNumber(key: string): number;
export function parseEnvNumber(key: string, defaultValue: number): number;
export function parseEnvNumber(key: string, defaultValue: null): number | null;
export function parseEnvNumber(key: string, defaultValue?: number | null): number | null {
	const val = process.env[key];

	if (val !== undefined && val.trim() !== '') return Number(val);
	if (defaultValue !== undefined) return defaultValue;

	throw new Error(`[@aahar/env]: Environment variable "${key}" is required but was not set.`);
}
