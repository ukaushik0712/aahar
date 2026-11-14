import { createConfig } from '@aahar/tsdown';

export default createConfig({
	entry: ['./src/**/*.ts'],
	root: 'src',
	dts: true
});
