import { setVerbose } from "@simvyn/core";
import { startServer } from "@simvyn/server";
import type { SimvynModule } from "@simvyn/types";
import type { Command } from "commander";

interface StartContext {
	dashboardDir: string;
	modules: SimvynModule[];
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
