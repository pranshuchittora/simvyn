import { resolve, dirname } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface StartOptions {
	port?: number;
	host?: string;
	open?: boolean;
}

export async function startServer(opts: StartOptions = {}): Promise<void> {
	const port = opts.port ?? 3847;
	const host = opts.host ?? "127.0.0.1";
	const shouldOpen = opts.open !== false;

	// dashboard dist is at monorepo root dist/dashboard/
	const dashboardDir = resolve(__dirname, "..", "..", "..", "dist", "dashboard");
	const hasDashboard = existsSync(dashboardDir);

	if (!hasDashboard) {
		console.log("Dashboard not built yet. Run: npm run build -w @simvyn/dashboard");
		console.log("Starting server without dashboard...\n");
	}

	// modules dir at packages/modules/
	const modulesDir = resolve(__dirname, "..", "..", "modules");

	const app = await createApp({
		port,
		host,
		modulesDir,
		dashboardDir: hasDashboard ? dashboardDir : undefined,
		logger: { level: "warn" },
	});

	await app.listen({ port, host });

	const url = `http://${host}:${port}`;
	console.log(`\nsimvyn running at ${url}\n`);

	if (shouldOpen) {
		try {
			const openMod = await import("open");
			const openFn = openMod.default ?? openMod;
			await openFn(url);
		} catch {
			console.log(`Open ${url} in your browser`);
		}
	}

	const shutdown = async () => {
		console.log("\nShutting down...");
		await app.close();
		process.exit(0);
	};

	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);
}
