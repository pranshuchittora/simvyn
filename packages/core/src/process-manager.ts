import { type ChildProcess, execFile, spawn, type SpawnOptions } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface ProcessManager {
	activeProcesses: Set<ChildProcess>;
	spawn(command: string, args: string[], opts?: SpawnOptions): ChildProcess;
	exec(command: string, args: string[]): Promise<{ stdout: string; stderr: string }>;
	cleanup(): void;
}

export function createProcessManager(): ProcessManager {
	const activeProcesses = new Set<ChildProcess>();

	function removeProcess(child: ChildProcess) {
		activeProcesses.delete(child);
	}

	function cleanup() {
		for (const child of activeProcesses) {
			try {
				child.kill("SIGTERM");
			} catch {
				// already dead
			}
		}
		activeProcesses.clear();
	}

	process.on("SIGINT", cleanup);
	process.on("SIGTERM", cleanup);
	process.on("exit", cleanup);

	return {
		activeProcesses,

		spawn(command: string, args: string[], opts?: SpawnOptions): ChildProcess {
			const child = spawn(command, args, opts ?? {}) as ChildProcess;
			activeProcesses.add(child);
			child.on("exit", () => removeProcess(child));
			child.on("error", () => removeProcess(child));
			return child;
		},

		exec(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
			return execFileAsync(command, args);
		},

		cleanup,
	};
}
