import { defineConfig } from 'tsdown';

export default defineConfig({
	entry: ['./src/**/*.ts'],
	root: 'src',
	dts: true,
	target: false,
	sourcemap: true,
	shims: true,
	unbundle: true,
	fixedExtension: false
});
