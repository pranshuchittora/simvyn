import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	target: "node22",
	platform: "node",
	outDir: "dist",
	clean: true,
	splitting: false,
	sourcemap: false,
	minify: false,
	banner: {
		js: "#!/usr/bin/env node",
	},
	// Bundle all workspace packages into the output
	noExternal: [/^@simvyn\//],
	// Keep real npm dependencies external (installed by npm)
	external: [
		"fastify",
		"@fastify/static",
		"@fastify/websocket",
		"fastify-plugin",
		"@fastify/multipart",
		"better-sqlite3",
		"@tmcw/togeojson",
		"@xmldom/xmldom",
		"commander",
		"open",
		"cfonts",
	],
});
