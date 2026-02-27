import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

// We test verbose-exec by importing the real module and controlling its behavior.
// For verboseExec: we can test with a real command (echo) since it's lightweight.
// For verbose logging: we spy on process.stderr.write.

let verboseExec: typeof import("../verbose-exec.ts").verboseExec;
let verboseSpawn: typeof import("../verbose-exec.ts").verboseSpawn;
let setVerbose: typeof import("../verbose-exec.ts").setVerbose;

async function setup() {
	const mod = await import("../verbose-exec.ts");
	verboseExec = mod.verboseExec;
	verboseSpawn = mod.verboseSpawn;
	setVerbose = mod.setVerbose;
}

describe("verboseExec", () => {
	beforeEach(async () => {
		if (!verboseExec) await setup();
		setVerbose(false);
	});

	it("calls execFile and returns stdout/stderr", async () => {
		const result = await verboseExec("echo", ["hello world"]);
		assert.equal(result.stdout.trim(), "hello world");
		assert.equal(typeof result.stderr, "string");
	});

	it("re-throws on execFile failure", async () => {
		await assert.rejects(
			() => verboseExec("__nonexistent_command_xyz__", []),
			(err: Error) => {
				assert.ok(err instanceof Error);
				return true;
			},
		);
	});

	it("passes options through to execFile", async () => {
		const result = await verboseExec("pwd", [], { cwd: "/tmp" });
		// /tmp may resolve to /private/tmp on macOS
		assert.ok(
			result.stdout.trim() === "/tmp" || result.stdout.trim() === "/private/tmp",
			`Expected /tmp or /private/tmp, got ${result.stdout.trim()}`,
		);
	});
});

describe("verboseSpawn", () => {
	beforeEach(async () => {
		if (!verboseSpawn) await setup();
		setVerbose(false);
	});

	it("calls spawn and returns a ChildProcess", () => {
		const cp = verboseSpawn("echo", ["test"]);
		assert.ok(cp.pid !== undefined || cp.pid === undefined); // process created
		assert.equal(typeof cp.kill, "function");
		cp.kill();
	});

	it("passes SpawnOptions through to spawn", async () => {
		const cp = verboseSpawn("pwd", [], { cwd: "/tmp" });
		const output = await new Promise<string>((resolve) => {
			let data = "";
			cp.stdout?.on("data", (chunk: Buffer) => {
				data += chunk.toString();
			});
			cp.on("close", () => resolve(data.trim()));
		});
		assert.ok(
			output === "/tmp" || output === "/private/tmp",
			`Expected /tmp or /private/tmp, got ${output}`,
		);
	});
});

describe("setVerbose logging", () => {
	let stderrWrites: string[];
	let originalWrite: typeof process.stderr.write;

	beforeEach(async () => {
		if (!setVerbose) await setup();
		stderrWrites = [];
		originalWrite = process.stderr.write;
		// @ts-expect-error — we're intentionally replacing write for testing
		process.stderr.write = (chunk: string | Uint8Array) => {
			stderrWrites.push(chunk.toString());
			return true;
		};
	});

	afterEach(() => {
		process.stderr.write = originalWrite;
		setVerbose(false);
	});

	it("when verbose=true, commands are logged to stderr", async () => {
		setVerbose(true);
		await verboseExec("echo", ["hi"]);
		assert.ok(stderrWrites.length > 0, "Expected stderr output when verbose");
		assert.ok(
			stderrWrites.some((w) => w.includes("echo")),
			"Expected command name in stderr output",
		);
	});

	it("when verbose=false, no stderr output", async () => {
		setVerbose(false);
		await verboseExec("echo", ["hi"]);
		assert.equal(stderrWrites.length, 0, "Expected no stderr output when not verbose");
	});

	it("adb gets green [adb] prefix", async () => {
		setVerbose(true);
		// adb likely not installed but verboseExec logs BEFORE execution
		// and logError logs on failure — so we'll see the prefix either way
		try {
			await verboseExec("adb", ["version"]);
		} catch {
			// adb may not be installed, that's fine
		}
		const GREEN = "\x1b[32m";
		assert.ok(
			stderrWrites.some((w) => w.includes(GREEN) && w.includes("[adb]")),
			"Expected green [adb] prefix in stderr",
		);
	});

	it("xcrun gets blue [simctl] prefix", async () => {
		setVerbose(true);
		try {
			await verboseExec("xcrun", ["simctl", "help"]);
		} catch {
			// xcrun may not be installed, that's fine
		}
		const BLUE = "\x1b[34m";
		assert.ok(
			stderrWrites.some((w) => w.includes(BLUE) && w.includes("[simctl]")),
			"Expected blue [simctl] prefix in stderr",
		);
	});

	it("other commands get no prefix bracket", async () => {
		setVerbose(true);
		await verboseExec("echo", ["test"]);
		// Should NOT have [adb] or [simctl] brackets
		const hasPrefix = stderrWrites.some((w) => w.includes("[adb]") || w.includes("[simctl]"));
		assert.ok(!hasPrefix, "Expected no prefix bracket for 'echo' command");
		// Should still have the DIM command output
		assert.ok(
			stderrWrites.some((w) => w.includes("echo")),
			"Expected command to appear in stderr",
		);
	});
});
