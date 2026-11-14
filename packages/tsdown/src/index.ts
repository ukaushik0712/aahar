import { defineConfig, type UserConfig } from 'tsdown';

export const createConfig = (overrides?: UserConfig) =>
	defineConfig({
		target: false,
		sourcemap: true,
		shims: true,
		dts: false,
		unbundle: true,
		fixedExtension: false,
		...overrides
	});

export { defineConfig, type UserConfig } from 'tsdown';
