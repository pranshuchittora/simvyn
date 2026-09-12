#!/usr/bin/env node
import { spawn } from "node:child_process";
import { constants, accessSync, readFileSync, realpathSync, statSync } from "node:fs";
import { delimiter, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const activeKey = "SIMVYN_SKILL_LAUNCHER_ACTIVE";
const ownPath = realpathSync(fileURLToPath(import.meta.url));
const scriptDir = dirname(ownPath);

function isFile(path, executable = false) {
	try {
		accessSync(path, executable ? constants.X_OK : constants.R_OK);
		return statSync(path).isFile() && realpathSync(path) !== ownPath;
	} catch {
		return false;
	}
}

function findCli() {
	const root = resolve(scriptDir, "../../..");
	const rootName = packageName(root);
	if (rootName === "simvyn") {
		const path = resolve(root, "dist/index.js");
		if (isFile(path)) return { command: process.execPath, args: [path] };
	} else if (
		rootName === "simvyn-monorepo" &&
		packageName(resolve(root, "packages/cli")) === "simvyn"
	) {
		const path = resolve(root, "packages/cli/dist/index.js");
		if (isFile(path)) return { command: process.execPath, args: [path] };
	}
	for (const directory of (process.env.PATH ?? "").split(delimiter)) {
		if (!directory) continue;
		const path = resolve(directory, "simvyn");
		if (isFile(path, true)) return { command: path, args: [] };
	}
	return null;
}

function packageName(directory) {
	try {
		return JSON.parse(readFileSync(resolve(directory, "package.json"), "utf8")).name;
	} catch {
		return null;
	}
}

function main() {
	if (process.env[activeKey]) {
		console.error(
			"Simvyn skill launcher: recursive CLI invocation detected. Use the real Simvyn executable.",
		);
		process.exitCode = 1;
		return;
	}
	const cli = findCli();
	if (!cli) {
		console.error(
			"Simvyn CLI not found. Install simvyn, or build the Simvyn checkout with npm run build:release, then retry. No packages were downloaded.",
		);
		process.exitCode = 127;
		return;
	}

	const child = spawn(cli.command, [...cli.args, ...process.argv.slice(2)], {
		stdio: "inherit",
		env: { ...process.env, [activeKey]: "1" },
		// A separate process group prevents a terminal SIGINT reaching the CLI twice.
		// The launcher forwards it once, allowing recording/log cleanup to finish.
		detached: process.platform !== "win32",
	});
	const handlers = new Map();
	for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
		const handler = () => child.kill(signal);
		handlers.set(signal, handler);
		process.on(signal, handler);
	}
	function removeHandlers() {
		for (const [signal, handler] of handlers) process.off(signal, handler);
	}
	let spawnFailed = false;
	child.once("error", (error) => {
		spawnFailed = true;
		removeHandlers();
		console.error(`Simvyn skill launcher: ${error.message}`);
		process.exitCode = error.code === "ENOENT" ? 127 : 1;
	});
	child.once("close", (code, signal) => {
		removeHandlers();
		if (spawnFailed) return;
		if (signal) {
			process.kill(process.pid, signal);
		} else if (code !== null) {
			process.exitCode = code;
		}
	});
}

main();
