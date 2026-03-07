import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setVerbose } from "@simvyn/core";
import { Command } from "commander";
import { allModules } from "./all-modules.js";
import { registerDeviceCommand } from "./commands/device.js";
import { registerStartCommand } from "./commands/start.js";
import { checkForUpdate } from "./update-check.js";

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
registerStartCommand(program, { dashboardDir, modules: allModules, version: pkg.version });
registerDeviceCommand(program);

// Upgrade command
program
	.command("upgrade")
	.description("Upgrade simvyn to the latest version")
	.action(async () => {
		const cyan = "\x1b[36m";
		const green = "\x1b[32m";
		const dim = "\x1b[2m";
		const reset = "\x1b[0m";

		console.log(`${dim}Checking for updates...${reset}`);
		const result = await checkForUpdate(pkg.version);

		if (!result) {
			console.log("Could not reach npm registry. Check your internet connection.");
			process.exitCode = 1;
			return;
		}
		if (!result.needsUpdate) {
			console.log(`${green}Already on the latest version${reset} ${dim}(${pkg.version})${reset}`);
			return;
		}

		console.log(`Upgrading ${dim}${pkg.version}${reset} → ${green}${result.latest}${reset}\n`);
		try {
			execSync("npm install -g simvyn@latest", { stdio: "inherit" });
			console.log(`\n${green}Successfully upgraded to ${result.latest}${reset}`);
		} catch {
			console.error(
				`\n${cyan}npm install failed.${reset} Try manually: ${cyan}npm install -g simvyn@latest${reset}`,
			);
			process.exitCode = 1;
		}
	});

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
