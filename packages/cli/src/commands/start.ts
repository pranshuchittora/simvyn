import { setVerbose } from "@simvyn/core";
import { startServer } from "@simvyn/server";
import type { SimvynModule } from "@simvyn/types";
import boxen from "boxen";
import type { Command } from "commander";
import { checkForUpdate } from "../update-check.js";

interface StartContext {
	dashboardDir: string;
	modules: SimvynModule[];
	version: string;
}

async function runStart(
	cliOpts: { port: string; host: string; open: boolean; verbose?: boolean },
	ctx: StartContext,
): Promise<void> {
	if (cliOpts.verbose) setVerbose(true);

	await startServer({
		port: parseInt(cliOpts.port, 10),
		host: cliOpts.host,
		open: cliOpts.open,
		dashboardDir: ctx.dashboardDir,
		modules: ctx.modules,
		version: ctx.version,
	});

	// Non-blocking update check after server is ready
	checkForUpdate(ctx.version).then((result) => {
		if (!result || !result.needsUpdate) return;
		const yellow = "\x1b[33m";
		const green = "\x1b[32m";
		const cyan = "\x1b[36m";
		const reset = "\x1b[0m";

		const msg = [
			`${yellow}Update available:${reset} ${ctx.version} → ${green}${result.latest}${reset}`,
			`Run ${cyan}simvyn upgrade${reset} to update`,
		].join("\n");

		console.log(
			"\n" +
				boxen(msg, { padding: 1, margin: { left: 2 }, borderStyle: "round", dimBorder: true }) +
				"\n",
		);
	});
}

export function registerStartCommand(program: Command, ctx: StartContext): void {
	program
		.command("start", { isDefault: true })
		.description("Start the simvyn server and open the dashboard")
		.option("-p, --port <number>", "Port to listen on", "3847")
		.option("-H, --host <string>", "Host to bind to", "127.0.0.1")
		.option("--no-open", "Don't open browser automatically")
		.option("-v, --verbose", "Log every adb/simctl command before execution")
		.action((opts) => runStart(opts, ctx));
}
