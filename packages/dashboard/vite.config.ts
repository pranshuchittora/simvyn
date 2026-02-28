import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

const cliPkg = JSON.parse(readFileSync("../cli/package.json", "utf-8"));

export default defineConfig({
	define: {
		__APP_VERSION__: JSON.stringify(cliPkg.version),
	},
	plugins: [react(), tailwindcss()],
	build: {
		outDir: "../../dist/dashboard",
		emptyOutDir: true,
		minify: false,
		sourcemap: true,
	},
	server: {
		port: 5173,
		proxy: {
			"/api": "http://127.0.0.1:3847",
			"/ws": {
				target: "ws://127.0.0.1:3847",
				ws: true,
			},
		},
	},
});
