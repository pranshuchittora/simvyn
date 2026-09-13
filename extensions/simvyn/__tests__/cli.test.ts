import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { readTail, rejectionReason, runProcess, stopProcess } from "../cli.ts";

const node = process.execPath;
let dir: string;

before(async () => {
	dir = await mkdtemp(join(tmpdir(), "simvyn-pi-"));
});

after(async () => {
	await rm(dir, { recursive: true, force: true });
});

describe("rejectionReason", () => {
	it("allows subcommands, help, and version", () => {
		assert.equal(rejectionReason(["device", "list", "--json"]), undefined);
		assert.equal(rejectionReason(["-v", "app", "list", "emulator-5554"]), undefined);
		assert.equal(rejectionReason(["help", "logs"]), undefined);
		assert.equal(rejectionReason(["--version"]), undefined);
	});

	it("rejects arguments that would start the dashboard", () => {
		assert.match(rejectionReason(["--verbose"]) ?? "", /dashboard server/);
		assert.match(rejectionReason(["start", "--no-open"]) ?? "", /\/simvyn/);
	});

	it("points long-running commands at their bounded tools", () => {
		assert.match(rejectionReason(["logs", "emulator-5554"]) ?? "", /simvyn_logs/);
		assert.match(rejectionReason(["record", "emulator-5554"]) ?? "", /simvyn_record/);
		assert.ok(rejectionReason(["upgrade"]));
	});
});

describe("runProcess", () => {
	it("captures output without color codes and reports the exit code", async () => {
		const script =
			'console.log("\\u001b[31mout\\u001b[0m"); console.error("err"); process.exitCode = 3';
		const result = await runProcess(node, ["-e", script], { cwd: dir });
		assert.equal(result.code, 3);
		assert.equal(result.output, "out\nerr\n");
	});

	it("keeps only the last redraw of progress lines", async () => {
		const script = 'process.stdout.write("Progress: 10%\\rProgress: 90%\\r\\ndone\\r\\n")';
		const result = await runProcess(node, ["-e", script], { cwd: dir });
		assert.equal(result.output, "Progress: 90%\ndone\n");
	});

	it("stops a stream with SIGINT once its capture window ends", async () => {
		const script = `
			process.on("SIGINT", () => process.stdout.write("stopped\\n", () => process.exit(0)));
			console.error("waiting for device");
			setTimeout(() => {
				console.error("Streaming logs");
				setInterval(() => console.log("line"), 10);
			}, 100);
		`;
		const file = join(dir, "stream.log");
		const startedAt = Date.now();
		const result = await runProcess(node, ["-e", script], {
			cwd: dir,
			stdoutFile: file,
			window: { ms: 300, startMarker: /^Streaming /m, startTimeoutMs: 5000, graceMs: 2000 },
		});
		const content = await readFile(file, "utf8");

		assert.equal(result.started, true);
		assert.equal(result.stopped, true);
		assert.equal(result.code, 0);
		assert.ok(Date.now() - startedAt >= 400);
		assert.match(content, /^line\n[\s\S]*stopped\n$/);
		assert.equal(result.stdoutLines, content.split("\n").length - 1);
		assert.equal(result.output, "waiting for device\nStreaming logs\n");
	});

	it("reports a stream that ends before its capture window", async () => {
		const script = 'console.error("Streaming logs"); setTimeout(() => {}, 50)';
		const result = await runProcess(node, ["-e", script], {
			cwd: dir,
			window: { ms: 5000, startMarker: /^Streaming /m, startTimeoutMs: 5000, graceMs: 2000 },
		});
		assert.equal(result.started, true);
		assert.equal(result.stopped, false);
		assert.equal(result.code, 0);
	});

	it("stops a process that never announces its stream", async () => {
		const result = await runProcess(node, ["-e", "setInterval(() => {}, 1000)"], {
			cwd: dir,
			window: { ms: 5000, startMarker: /^Streaming /m, startTimeoutMs: 100, graceMs: 2000 },
		});
		assert.equal(result.started, false);
		assert.equal(result.signal, "SIGINT");
	});

	it("marks commands stopped by the timeout", async () => {
		const result = await runProcess(node, ["-e", "setInterval(() => {}, 1000)"], {
			cwd: dir,
			timeoutMs: 100,
		});
		assert.equal(result.timedOut, true);
		assert.equal(result.signal, "SIGINT");
	});

	it("stops the process when the tool call is aborted", async () => {
		const controller = new AbortController();
		setTimeout(() => controller.abort(), 100);
		const result = await runProcess(node, ["-e", "setInterval(() => {}, 1000)"], {
			cwd: dir,
			signal: controller.signal,
		});
		assert.equal(result.aborted, true);
		assert.equal(result.signal, "SIGINT");
	});
});

describe("stopProcess", () => {
	it("escalates to SIGTERM when SIGINT is ignored", async () => {
		const script =
			'process.on("SIGINT", () => {}); console.log("ready"); setInterval(() => {}, 1000)';
		const child = spawn(node, ["-e", script], { stdio: ["ignore", "pipe", "ignore"] });
		await once(child.stdout, "data");
		await stopProcess(child, 100);
		assert.equal(child.signalCode, "SIGTERM");
	});
});

describe("readTail", () => {
	it("returns complete lines from the end of a file", async () => {
		const file = join(dir, "tail.jsonl");
		await writeFile(file, "first line\nsecond line\nthird line\n");
		assert.equal(await readTail(file, 1000), "first line\nsecond line\nthird line\n");
		assert.equal(await readTail(file, 16), "third line\n");
	});
});
