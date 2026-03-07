import { setVerbose } from "@simvyn/core";
import { startServer } from "@simvyn/server";
import type { SimvynModule } from "@simvyn/types";
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
		const dim = "\x1b[2m";
		const yellow = "\x1b[33m";
		const green = "\x1b[32m";
		const cyan = "\x1b[36m";
		const reset = "\x1b[0m";
		console.log();
		console.log(`${dim}  ╭──────────────────────────────────────────╮${reset}`);
		console.log(`${dim}  │                                          │${reset}`);
		console.log(
			`${dim}  │${reset}  ${yellow}Update available:${reset} ${dim}${ctx.version}${reset} → ${green}${result.latest}${reset}       ${dim}│${reset}`,
		);
		console.log(
			`${dim}  │${reset}  Run ${cyan}simvyn upgrade${reset} to update           ${dim}│${reset}`,
		);
		console.log(`${dim}  │                                          │${reset}`);
		console.log(`${dim}  ╰──────────────────────────────────────────╯${reset}`);
		console.log();
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
