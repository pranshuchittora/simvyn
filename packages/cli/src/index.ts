import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setVerbose } from "@simvyn/core";
import { Command } from "commander";
import { allModules } from "./all-modules.js";
import { registerDeviceCommand } from "./commands/device.js";
import { registerStartCommand } from "./commands/start.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const pkg = require("../package.json");

const program = new Command();
program.name("simvyn").version(pkg.version).description("Universal mobile device devtool");
program.option("-v, --verbose", "Log every adb/simctl command before execution");

program.hook("preAction", (thisCommand) => {
	const opts = thisCommand.optsWithGlobals();
	if (opts.verbose) setVerbose(true);
});

// Bundled: dist/dashboard/ next to dist/index.js
// Dev: dist/dashboard/ at monorepo root
let dashboardDir = join(__dirname, "dashboard");
if (!existsSync(dashboardDir)) {
	dashboardDir = resolve(__dirname, "..", "..", "..", "dist", "dashboard");
}
registerStartCommand(program, { dashboardDir, modules: allModules });
registerDeviceCommand(program);

// Register CLI commands from all modules
for (const mod of allModules) {
	if (mod.cli && typeof mod.cli === "function") {
		try {
			mod.cli(program);
		} catch {
			// Skip modules whose CLI conflicts with built-in commands
		}
	}
}

program.parse();
