import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	target: "node22",
	platform: "node",
	outDir: "dist",
	clean: true,
	dts: false,
	sourcemap: false,
	minify: false,
	outputOptions: {
		banner: "#!/usr/bin/env node",
		entryFileNames: "[name].js",
		chunkFileNames: "[name]-[hash].js",
	},
	// Workspace code is bundled; published npm dependencies stay external.
	deps: {
		alwaysBundle: [/^@simvyn\//],
	},
});
