import type { Command } from "commander";
import { startServer } from "@simvyn/server";

async function runStart(opts: { port: string; host: string; open: boolean }): Promise<void> {
	await startServer({
		port: parseInt(opts.port, 10),
		host: opts.host,
		open: opts.open,
	});
}

export function registerStartCommand(program: Command): void {
	// `simvyn start` — explicit subcommand (also the default when no subcommand given)
	program
		.command("start", { isDefault: true })
		.description("Start the simvyn server and open the dashboard")
		.option("-p, --port <number>", "Port to listen on", "3847")
		.option("-H, --host <string>", "Host to bind to", "127.0.0.1")
		.option("--no-open", "Don't open browser automatically")
		.action(runStart);
}
