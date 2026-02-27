import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
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
