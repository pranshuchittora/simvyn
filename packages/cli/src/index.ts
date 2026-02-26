#!/usr/bin/env node

import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { registerStartCommand } from "./commands/start.js";
import { registerDeviceCommand } from "./commands/device.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const pkg = require("../package.json");

const program = new Command();
program
	.name("simvyn")
	.version(pkg.version)
	.description("Universal mobile device devtool");

registerStartCommand(program);
registerDeviceCommand(program);

// Discover module CLI registrars from modules directory
const modulesDir = resolve(__dirname, "..", "..", "modules");
try {
	const { getModuleCLIRegistrars } = await import("@simvyn/server");
	const registrars = await getModuleCLIRegistrars(modulesDir);
	for (const { register } of registrars) {
		register(program);
	}
} catch {
	// Module discovery failed — CLI still works for built-in commands
}

program.parse();
