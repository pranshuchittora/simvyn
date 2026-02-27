import { setVerbose } from "@simvyn/core";
import { startServer } from "@simvyn/server";
import type { Command } from "commander";

async function runStart(opts: {
	port: string;
	host: string;
	open: boolean;
	verbose?: boolean;
}): Promise<void> {
	if (opts.verbose) setVerbose(true);

	await startServer({
		port: parseInt(opts.port, 10),
		host: opts.host,
		open: opts.open,
	});
}

export function registerStartCommand(program: Command): void {
	program
		.command("start", { isDefault: true })
		.description("Start the simvyn server and open the dashboard")
		.option("-p, --port <number>", "Port to listen on", "3847")
		.option("-H, --host <string>", "Host to bind to", "127.0.0.1")
		.option("--no-open", "Don't open browser automatically")
		.option("-v, --verbose", "Log every adb/simctl command before execution")
		.action(runStart);
}
