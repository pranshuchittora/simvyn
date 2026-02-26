#!/usr/bin/env node

import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { registerDeviceCommand } from "./commands/device.js";
import { registerStartCommand } from "./commands/start.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const pkg = require("../package.json");

const program = new Command();
program.name("simvyn").version(pkg.version).description("Universal mobile device devtool");

registerStartCommand(program);
registerDeviceCommand(program);

// Discover module CLI registrars from modules directory
const modulesDir = resolve(__dirname, "..", "..", "modules");
try {
	const { getModuleCLIRegistrars } = await import("@simvyn/server");
	const registrars = await getModuleCLIRegistrars(modulesDir);
	for (const { name, register } of registrars) {
		try {
			register(program);
		} catch {
			// Skip modules whose CLI conflicts with built-in commands (e.g. device)
		}
	}
} catch {
	// Module discovery failed — CLI still works for built-in commands
}

program.parse();
