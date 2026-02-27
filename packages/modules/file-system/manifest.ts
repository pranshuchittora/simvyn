import type { SimvynModule } from "@simvyn/types";
import { fsRoutes } from "./routes.js";

const fileSystemModule: SimvynModule = {
	name: "fs",
	version: "0.1.0",
	description: "File system browser — browse, download, upload, and edit app sandbox files",
	icon: "folder-open",

	async register(fastify, _opts) {
		await fastify.register(fsRoutes);
	},

	cli(program) {
		const fs = program.command("fs").description("File system commands");

		fs.command("ls <device> <bundle-id> [path]")
			.description("List files in an app's data container")
			.action(async (deviceId: string, bundleId: string, path: string | undefined) => {
				const { createAvailableAdapters, createDeviceManager } = await import("@simvyn/core");
				const adapters = await createAvailableAdapters();
				const dm = createDeviceManager(adapters);
				try {
					const devices = await dm.refresh();
					const target = devices.find((d) => d.id === deviceId || d.id.startsWith(deviceId));
					if (!target) {
						console.error(`Device not found: ${deviceId}`);
						process.exit(1);
					}
					if (target.state !== "booted") {
						console.error("Device must be booted");
						process.exit(1);
					}

					const relativePath = path ?? ".";
					let entries: Array<{
						name: string;
						path: string;
						isDirectory: boolean;
						size: number;
						modified: string;
					}>;

					if (target.platform === "ios") {
						const { iosGetContainerPath, iosListDir } = await import("./ios-fs.js");
						const containerPath = await iosGetContainerPath(target.id, bundleId);
						entries = await iosListDir(containerPath, relativePath);
					} else {
						const { androidListDir } = await import("./android-fs.js");
						entries = await androidListDir(target.id, bundleId, relativePath);
					}

					if (entries.length === 0) {
						console.log("Empty directory");
						return;
					}

					const header = ["Type", "Size", "Modified", "Name"];
					const rows = entries.map((e) => [
						e.isDirectory ? "D" : "F",
						e.isDirectory ? "-" : formatSize(e.size),
						e.modified.slice(0, 16).replace("T", " "),
						e.name,
					]);
					const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
					const pad = (s: string, w: number) => s + " ".repeat(Math.max(0, w - s.length));

					console.log(header.map((h, i) => pad(h, widths[i])).join("  "));
					console.log(widths.map((w) => "-".repeat(w)).join("  "));
					for (const row of rows) {
						console.log(row.map((c, i) => pad(c, widths[i])).join("  "));
					}
				} finally {
					dm.stop();
				}
			});

		fs.command("pull <device> <bundle-id> <remote-path> [local-path]")
			.description("Download a file from an app's data container")
			.action(
				async (
					deviceId: string,
					bundleId: string,
					remotePath: string,
					localPath: string | undefined,
				) => {
					const { basename } = await import("node:path");
					const { writeFile } = await import("node:fs/promises");
					const { createAvailableAdapters, createDeviceManager } = await import("@simvyn/core");
					const adapters = await createAvailableAdapters();
					const dm = createDeviceManager(adapters);
					try {
						const devices = await dm.refresh();
						const target = devices.find((d) => d.id === deviceId || d.id.startsWith(deviceId));
						if (!target) {
							console.error(`Device not found: ${deviceId}`);
							process.exit(1);
						}
						if (target.state !== "booted") {
							console.error("Device must be booted");
							process.exit(1);
						}

						const dest = localPath ?? `./${basename(remotePath)}`;
						let buffer: Buffer;

						if (target.platform === "ios") {
							const { iosGetContainerPath, iosReadFile } = await import("./ios-fs.js");
							const containerPath = await iosGetContainerPath(target.id, bundleId);
							buffer = await iosReadFile(containerPath, remotePath);
						} else {
							const { androidPullFile } = await import("./android-fs.js");
							buffer = await androidPullFile(target.id, bundleId, remotePath);
						}

						await writeFile(dest, buffer);
						console.log(`Downloaded ${remotePath} to ${dest}`);
					} finally {
						dm.stop();
					}
				},
			);

		fs.command("push <device> <bundle-id> <local-path> <remote-path>")
			.description("Upload a file to an app's data container")
			.action(async (deviceId: string, bundleId: string, localPath: string, remotePath: string) => {
				const { readFile } = await import("node:fs/promises");
				const { createAvailableAdapters, createDeviceManager } = await import("@simvyn/core");
				const adapters = await createAvailableAdapters();
				const dm = createDeviceManager(adapters);
				try {
					const devices = await dm.refresh();
					const target = devices.find((d) => d.id === deviceId || d.id.startsWith(deviceId));
					if (!target) {
						console.error(`Device not found: ${deviceId}`);
						process.exit(1);
					}
					if (target.state !== "booted") {
						console.error("Device must be booted");
						process.exit(1);
					}

					if (target.platform === "ios") {
						const { iosGetContainerPath, iosWriteFile } = await import("./ios-fs.js");
						const containerPath = await iosGetContainerPath(target.id, bundleId);
						const buf = await readFile(localPath);
						await iosWriteFile(containerPath, remotePath, buf);
					} else {
						const { androidPushFile } = await import("./android-fs.js");
						await androidPushFile(target.id, bundleId, localPath, remotePath);
					}

					console.log(`Uploaded ${localPath} to ${remotePath}`);
				} finally {
					dm.stop();
				}
			});
	},

	capabilities: ["fileSystem"],
};

function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes}B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
	if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}G`;
}

export default fileSystemModule;
