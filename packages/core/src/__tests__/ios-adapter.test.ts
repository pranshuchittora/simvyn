import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { beforeEach, describe, it, mock } from "node:test";

// Track all calls to verboseExec, verboseSpawn, and fs operations
const calls: { fn: string; args: unknown[] }[] = [];

// Configurable fs mock responses
let readdirMock: (path: string) => Promise<string[]> = (_path: string) => Promise.resolve([]);
let rmMock: (path: string, opts?: any) => Promise<void> = (_path: string, _opts?: any) =>
	Promise.resolve();

// Configurable mock responses — `any` used intentionally for test mock flexibility
let execMock: (
	cmd: string,
	args: string[],
	opts?: any,
) => Promise<{ stdout: string; stderr: string }>;
let spawnMock: (cmd: string, args: string[], opts?: any) => any;

function createMockProcess(stdoutData?: string) {
	const proc = new EventEmitter() as any;
	const stdinEmitter = new EventEmitter() as any;
	stdinEmitter.write = (_data: string) => true;
	stdinEmitter.end = () => {};
	proc.stdin = stdinEmitter;
	proc.stdout = new EventEmitter();
	proc.stderr = new EventEmitter();
	proc.kill = (_signal?: any) => true;
	proc.exitCode = null;

	if (stdoutData !== undefined) {
		process.nextTick(() => {
			proc.stdout.emit("data", Buffer.from(stdoutData));
			proc.emit("close", 0);
		});
	}

	return proc;
}

// Default exec mock: returns empty stdout/stderr
function defaultExecMock(
	_cmd: string,
	_args: string[],
): Promise<{ stdout: string; stderr: string }> {
	return Promise.resolve({ stdout: "", stderr: "" });
}

function defaultSpawnMock(_cmd: string, _args: string[]) {
	return createMockProcess();
}

// We need real fs for most operations (addKeychainCert, collectBugReport, etc.)
// but mock readdir/rm for clearAppData tests
const realFs = await import("node:fs/promises");

mock.module("node:fs/promises", {
	namedExports: {
		mkdir: realFs.mkdir,
		mkdtemp: realFs.mkdtemp,
		readFile: realFs.readFile,
		stat: realFs.stat,
		writeFile: realFs.writeFile,
		readdir(path: string) {
			calls.push({ fn: "readdir", args: [path] });
			return readdirMock(path);
		},
		rm(path: string, opts?: unknown) {
			calls.push({ fn: "rm", args: [path, opts] });
			return rmMock(path, opts);
		},
	},
});

// Register mocks BEFORE importing the adapter
mock.module("../verbose-exec.js", {
	namedExports: {
		verboseExec(cmd: string, args: string[], opts?: unknown) {
			calls.push({ fn: "verboseExec", args: [cmd, args, opts] });
			return execMock(cmd, args, opts);
		},
		verboseSpawn(cmd: string, args: string[], opts?: unknown) {
			calls.push({ fn: "verboseSpawn", args: [cmd, args, opts] });
			return spawnMock(cmd, args, opts);
		},
		setVerbose() {},
	},
});

const { createIosAdapter } = await import("../adapters/ios.js");

describe("iOS Adapter", () => {
	beforeEach(() => {
		calls.length = 0;
		execMock = defaultExecMock;
		spawnMock = defaultSpawnMock;
		readdirMock = (_path: string) => Promise.resolve([]);
		rmMock = (_path: string, _opts?: any) => Promise.resolve();
	});

	describe("isAvailable", () => {
		it("returns true when xcrun simctl succeeds", async () => {
			const adapter = createIosAdapter();
			const result = await adapter.isAvailable();
			assert.equal(result, true);
			assert.equal(calls.length, 1);
			assert.deepEqual(calls[0].args[0], "xcrun");
			assert.deepEqual(calls[0].args[1], ["simctl", "list", "devices", "--json"]);
		});

		it("returns false when xcrun simctl fails", async () => {
			execMock = () => Promise.reject(new Error("xcrun not found"));
			const adapter = createIosAdapter();
			const result = await adapter.isAvailable();
			assert.equal(result, false);
		});
	});

	describe("listDevices", () => {
		it("parses devices from simctl JSON output", async () => {
			execMock = () =>
				Promise.resolve({
					stdout: JSON.stringify({
						devices: {
							"com.apple.CoreSimulator.SimRuntime.iOS-17-5": [
								{
									udid: "AAAA-BBBB",
									name: "iPhone 15 Pro",
									state: "Booted",
									isAvailable: true,
									deviceTypeIdentifier: "com.apple.CoreSimulator.SimDeviceType.iPhone-15-Pro",
								},
								{
									udid: "CCCC-DDDD",
									name: "iPhone 15",
									state: "Shutdown",
									isAvailable: true,
								},
							],
						},
					}),
					stderr: "",
				});
			const adapter = createIosAdapter();
			const devices = await adapter.listDevices();
			assert.equal(devices.length, 2);
			assert.equal(devices[0].id, "AAAA-BBBB");
			assert.equal(devices[0].name, "iPhone 15 Pro");
			assert.equal(devices[0].platform, "ios");
			assert.equal(devices[0].state, "booted");
			assert.equal(devices[0].osVersion, "iOS 17.5");
			assert.equal(devices[0].deviceType, "iPhone 15 Pro");
			assert.equal(devices[0].isAvailable, true);

			assert.equal(devices[1].id, "CCCC-DDDD");
			assert.equal(devices[1].state, "shutdown");
			assert.equal(devices[1].deviceType, "Unknown");
		});

		it("filters out unavailable devices", async () => {
			execMock = () =>
				Promise.resolve({
					stdout: JSON.stringify({
						devices: {
							"com.apple.CoreSimulator.SimRuntime.iOS-17-5": [
								{ udid: "A", name: "Dev1", state: "Booted", isAvailable: true },
								{ udid: "B", name: "Dev2", state: "Shutdown", isAvailable: false },
							],
						},
					}),
					stderr: "",
				});
			const adapter = createIosAdapter();
			const devices = await adapter.listDevices();
			assert.equal(devices.length, 1);
			assert.equal(devices[0].id, "A");
		});

		it("parses runtime keys correctly", async () => {
			execMock = () =>
				Promise.resolve({
					stdout: JSON.stringify({
						devices: {
							"com.apple.CoreSimulator.SimRuntime.iOS-26-2": [
								{ udid: "X", name: "Dev", state: "Shutdown", isAvailable: true },
							],
							"com.apple.CoreSimulator.SimRuntime.watchOS-11-0": [
								{ udid: "Y", name: "Watch", state: "Shutdown", isAvailable: true },
							],
						},
					}),
					stderr: "",
				});
			const adapter = createIosAdapter();
			const devices = await adapter.listDevices();
			assert.equal(devices[0].osVersion, "iOS 26.2");
			assert.equal(devices[1].osVersion, "watchOS 11.0");
		});

		it("maps all device states", async () => {
			const states = ["Booted", "Shutdown", "Creating", "ShuttingDown", "SomethingElse"];
			const expected = ["booted", "shutdown", "creating", "shutting-down", "shutdown"];
			execMock = () =>
				Promise.resolve({
					stdout: JSON.stringify({
						devices: {
							"com.apple.CoreSimulator.SimRuntime.iOS-17-0": states.map((s, i) => ({
								udid: `dev-${i}`,
								name: `Dev ${i}`,
								state: s,
								isAvailable: true,
							})),
						},
					}),
					stderr: "",
				});
			const adapter = createIosAdapter();
			const devices = await adapter.listDevices();
			for (let i = 0; i < states.length; i++) {
				assert.equal(devices[i].state, expected[i]);
			}
		});

		it("returns empty array on error", async () => {
			execMock = () => Promise.reject(new Error("simctl failed"));
			const adapter = createIosAdapter();
			const devices = await adapter.listDevices();
			assert.deepEqual(devices, []);
		});
	});

	describe("boot", () => {
		it("calls xcrun simctl boot with device id", async () => {
			const adapter = createIosAdapter();
			await adapter.boot("device-123");
			assert.equal(calls.length, 1);
			assert.deepEqual(calls[0].args[0], "xcrun");
			assert.deepEqual(calls[0].args[1], ["simctl", "boot", "device-123"]);
		});

		it("swallows 'already booted' error", async () => {
			execMock = () =>
				Promise.reject(
					new Error("Unable to boot device in current state: Booted - already booted"),
				);
			const adapter = createIosAdapter();
			await adapter.boot("device-123"); // should not throw
		});

		it("rethrows other errors", async () => {
			execMock = () => Promise.reject(new Error("Device not found"));
			const adapter = createIosAdapter();
			await assert.rejects(() => adapter.boot("device-123"), { message: "Device not found" });
		});
	});

	describe("shutdown", () => {
		it("calls xcrun simctl shutdown with device id", async () => {
			const adapter = createIosAdapter();
			await adapter.shutdown("device-456");
			assert.equal(calls.length, 1);
			assert.deepEqual(calls[0].args[1], ["simctl", "shutdown", "device-456"]);
		});

		it("swallows 'current state: Shutdown' error", async () => {
			execMock = () =>
				Promise.reject(new Error("Unable to shutdown device in current state: Shutdown"));
			const adapter = createIosAdapter();
			await adapter.shutdown("device-456"); // should not throw
		});

		it("rethrows other errors", async () => {
			execMock = () => Promise.reject(new Error("Unknown error"));
			const adapter = createIosAdapter();
			await assert.rejects(() => adapter.shutdown("device-456"), { message: "Unknown error" });
		});
	});

	describe("erase", () => {
		it("calls xcrun simctl erase with device id", async () => {
			const adapter = createIosAdapter();
			await adapter.erase!("device-789");
			assert.deepEqual(calls[0].args[1], ["simctl", "erase", "device-789"]);
		});
	});

	describe("setLocation", () => {
		it("calls xcrun simctl location set with lat,lon", async () => {
			const adapter = createIosAdapter();
			await adapter.setLocation!("dev-1", 37.7749, -122.4194);
			assert.deepEqual(calls[0].args[1], [
				"simctl",
				"location",
				"dev-1",
				"set",
				"37.7749,-122.4194",
			]);
		});
	});

	describe("clearLocation", () => {
		it("calls xcrun simctl location clear", async () => {
			const adapter = createIosAdapter();
			await adapter.clearLocation!("dev-1");
			assert.deepEqual(calls[0].args[1], ["simctl", "location", "dev-1", "clear"]);
		});
	});

	describe("listApps", () => {
		it("calls simctl listapps and parses plist via plutil", async () => {
			const plistOutput = "fake plist data";
			const parsedApps = {
				"com.example.app": {
					CFBundleIdentifier: "com.example.app",
					CFBundleDisplayName: "Example",
					CFBundleShortVersionString: "1.2.3",
					ApplicationType: "User",
					DataContainer: "file:///data/container",
					Path: "/apps/example.app",
				},
			};

			// First call: verboseExec for simctl listapps
			execMock = () => Promise.resolve({ stdout: plistOutput, stderr: "" });
			// Second call: verboseSpawn for plutil (plistToJson)
			spawnMock = () => createMockProcess(JSON.stringify(parsedApps));

			const adapter = createIosAdapter();
			const apps = await adapter.listApps!("dev-1");

			// Verify simctl listapps was called
			assert.equal(calls[0].fn, "verboseExec");
			assert.deepEqual(calls[0].args[1], ["simctl", "listapps", "dev-1"]);

			// Verify plutil was spawned
			assert.equal(calls[1].fn, "verboseSpawn");
			assert.deepEqual(calls[1].args[0], "plutil");
			assert.deepEqual(calls[1].args[1], ["-convert", "json", "-r", "-o", "-", "--", "-"]);

			assert.equal(apps.length, 1);
			assert.equal(apps[0].bundleId, "com.example.app");
			assert.equal(apps[0].name, "Example");
			assert.equal(apps[0].version, "1.2.3");
			assert.equal(apps[0].type, "user");
			assert.equal(apps[0].dataContainer, "/data/container");
			assert.equal(apps[0].appPath, "/apps/example.app");
		});

		it("falls back to CFBundleName when no display name", async () => {
			const parsedApps = {
				"com.example.app": {
					CFBundleIdentifier: "com.example.app",
					CFBundleName: "ExampleBundle",
					CFBundleVersion: "42",
					ApplicationType: "System",
				},
			};
			execMock = () => Promise.resolve({ stdout: "plist", stderr: "" });
			spawnMock = () => createMockProcess(JSON.stringify(parsedApps));

			const adapter = createIosAdapter();
			const apps = await adapter.listApps!("dev-1");
			assert.equal(apps[0].name, "ExampleBundle");
			assert.equal(apps[0].version, "42");
			assert.equal(apps[0].type, "system");
		});
	});

	describe("installApp", () => {
		it("installs .app bundle directly", async () => {
			const adapter = createIosAdapter();
			await adapter.installApp!("dev-1", "/path/to/MyApp.app");
			assert.equal(calls.length, 1);
			assert.deepEqual(calls[0].args[1], ["simctl", "install", "dev-1", "/path/to/MyApp.app"]);
		});

		// Note: IPA path involves fs operations (mkdtemp, unzip, readdir) that would require
		// additional filesystem mocks — testing the .app path validates the core simctl invocation.
	});

	describe("uninstallApp", () => {
		it("calls xcrun simctl uninstall with device and bundle id", async () => {
			const adapter = createIosAdapter();
			await adapter.uninstallApp!("dev-1", "com.example.app");
			assert.deepEqual(calls[0].args[1], ["simctl", "uninstall", "dev-1", "com.example.app"]);
		});
	});

	describe("launchApp", () => {
		it("calls xcrun simctl launch with device and bundle id", async () => {
			const adapter = createIosAdapter();
			await adapter.launchApp!("dev-1", "com.example.app");
			assert.deepEqual(calls[0].args[1], ["simctl", "launch", "dev-1", "com.example.app"]);
		});
	});

	describe("terminateApp", () => {
		it("calls xcrun simctl terminate with device and bundle id", async () => {
			const adapter = createIosAdapter();
			await adapter.terminateApp!("dev-1", "com.example.app");
			assert.deepEqual(calls[0].args[1], ["simctl", "terminate", "dev-1", "com.example.app"]);
		});
	});

	describe("getAppInfo", () => {
		it("calls simctl appinfo and parses plist result", async () => {
			const appData = {
				CFBundleIdentifier: "com.test.app",
				CFBundleDisplayName: "Test App",
				CFBundleShortVersionString: "2.0",
				ApplicationType: "User",
				DataContainer: "file:///containers/data",
				Path: "/apps/test.app",
			};
			execMock = () => Promise.resolve({ stdout: "plist data", stderr: "" });
			spawnMock = () => createMockProcess(JSON.stringify(appData));

			const adapter = createIosAdapter();
			const info = await adapter.getAppInfo!("dev-1", "com.test.app");

			assert.equal(calls[0].fn, "verboseExec");
			assert.deepEqual(calls[0].args[1], ["simctl", "appinfo", "dev-1", "com.test.app"]);

			assert.notEqual(info, null);
			assert.equal(info!.bundleId, "com.test.app");
			assert.equal(info!.name, "Test App");
			assert.equal(info!.version, "2.0");
			assert.equal(info!.dataContainer, "/containers/data");
		});

		it("returns null on error", async () => {
			execMock = () => Promise.reject(new Error("app not found"));
			const adapter = createIosAdapter();
			const info = await adapter.getAppInfo!("dev-1", "com.missing.app");
			assert.equal(info, null);
		});
	});

	describe("clearAppData", () => {
		it("calls get_app_container then readdir + rm for each entry", async () => {
			execMock = () => Promise.resolve({ stdout: "/path/to/data/container\n", stderr: "" });
			readdirMock = () => Promise.resolve(["Documents", "Library", "tmp"]);

			const adapter = createIosAdapter();
			await adapter.clearAppData!("dev-1", "com.example.app");

			const execCall = calls.find((c) => c.fn === "verboseExec");
			assert.ok(execCall);
			assert.deepEqual(execCall!.args[1], [
				"simctl",
				"get_app_container",
				"dev-1",
				"com.example.app",
				"data",
			]);

			const readdirCall = calls.find((c) => c.fn === "readdir");
			assert.ok(readdirCall);
			assert.equal(readdirCall!.args[0], "/path/to/data/container");

			const rmCalls = calls.filter((c) => c.fn === "rm");
			assert.equal(rmCalls.length, 3);
			assert.equal(rmCalls[0].args[0], "/path/to/data/container/Documents");
			assert.equal(rmCalls[1].args[0], "/path/to/data/container/Library");
			assert.equal(rmCalls[2].args[0], "/path/to/data/container/tmp");
			assert.deepEqual(rmCalls[0].args[1], { recursive: true, force: true });
		});

		it("throws for physical devices", async () => {
			const adapter = createIosAdapter();
			await assert.rejects(() => adapter.clearAppData!("physical:ABCD-1234", "com.example.app"), {
				message: "Clear app data is not available on physical iOS devices",
			});
		});

		it("throws when no data container is found", async () => {
			execMock = () => Promise.resolve({ stdout: "", stderr: "" });
			const adapter = createIosAdapter();
			await assert.rejects(() => adapter.clearAppData!("dev-1", "com.missing.app"), {
				message: "No data container found for com.missing.app",
			});
		});
	});

	describe("openUrl", () => {
		it("calls xcrun simctl openurl with device and url", async () => {
			const adapter = createIosAdapter();
			await adapter.openUrl!("dev-1", "https://example.com");
			assert.deepEqual(calls[0].args[1], ["simctl", "openurl", "dev-1", "https://example.com"]);
		});
	});

	describe("screenshot", () => {
		it("calls xcrun simctl io screenshot with device and path", async () => {
			const adapter = createIosAdapter();
			await adapter.screenshot!("dev-1", "/tmp/screen.png");
			assert.deepEqual(calls[0].args[1], [
				"simctl",
				"io",
				"dev-1",
				"screenshot",
				"/tmp/screen.png",
			]);
		});
	});

	describe("startRecording", () => {
		it("spawns xcrun simctl io recordVideo", async () => {
			const mockProc = createMockProcess();
			spawnMock = () => mockProc;
			const adapter = createIosAdapter();
			const child = await adapter.startRecording!("dev-1", "/tmp/video.mp4");
			assert.equal(calls[0].fn, "verboseSpawn");
			assert.deepEqual(calls[0].args[1], [
				"simctl",
				"io",
				"dev-1",
				"recordVideo",
				"/tmp/video.mp4",
			]);
			assert.equal(child, mockProc);
		});
	});

	describe("stopRecording", () => {
		it("sends SIGINT to child process and waits for close", async () => {
			const mockProc = createMockProcess();
			let killSignal: string | undefined;
			mockProc.kill = (signal?: string) => {
				killSignal = signal as string;
				process.nextTick(() => mockProc.emit("close", 0));
				return true;
			};

			const adapter = createIosAdapter();
			await adapter.stopRecording!(mockProc, "dev-1", "/tmp/video.mp4");
			assert.equal(killSignal, "SIGINT");
		});
	});

	describe("getClipboard", () => {
		it("calls xcrun simctl pbpaste and returns stdout", async () => {
			execMock = () => Promise.resolve({ stdout: "clipboard content", stderr: "" });
			const adapter = createIosAdapter();
			const result = await adapter.getClipboard!("dev-1");
			assert.deepEqual(calls[0].args[1], ["simctl", "pbpaste", "dev-1"]);
			assert.equal(result, "clipboard content");
		});
	});

	describe("setClipboard", () => {
		it("spawns xcrun simctl pbcopy and writes text to stdin", async () => {
			let writtenData = "";
			let stdinEnded = false;
			const mockProc = createMockProcess();
			mockProc.stdin!.write = (data: unknown) => {
				writtenData = data as string;
				return true;
			};
			mockProc.stdin!.end = () => {
				stdinEnded = true;
			};
			spawnMock = () => {
				process.nextTick(() => mockProc.emit("close", 0));
				return mockProc;
			};

			const adapter = createIosAdapter();
			await adapter.setClipboard!("dev-1", "hello world");
			assert.equal(calls[0].fn, "verboseSpawn");
			assert.deepEqual(calls[0].args[1], ["simctl", "pbcopy", "dev-1"]);
			assert.equal(writtenData, "hello world");
			assert.equal(stdinEnded, true);
		});
	});

	describe("addMedia", () => {
		it("calls xcrun simctl addmedia with device and file path", async () => {
			const adapter = createIosAdapter();
			await adapter.addMedia!("dev-1", "/tmp/photo.jpg");
			assert.deepEqual(calls[0].args[1], ["simctl", "addmedia", "dev-1", "/tmp/photo.jpg"]);
		});
	});

	describe("setAppearance", () => {
		it("calls xcrun simctl ui appearance with light mode", async () => {
			const adapter = createIosAdapter();
			await adapter.setAppearance!("dev-1", "light");
			assert.deepEqual(calls[0].args[1], ["simctl", "ui", "dev-1", "appearance", "light"]);
		});

		it("calls xcrun simctl ui appearance with dark mode", async () => {
			const adapter = createIosAdapter();
			await adapter.setAppearance!("dev-1", "dark");
			assert.deepEqual(calls[0].args[1], ["simctl", "ui", "dev-1", "appearance", "dark"]);
		});
	});

	describe("setStatusBar", () => {
		it("calls xcrun simctl status_bar override with mapped flags", async () => {
			const adapter = createIosAdapter();
			await adapter.setStatusBar!("dev-1", {
				time: "9:41",
				batteryLevel: "100",
				cellularBars: "4",
			});
			assert.deepEqual(calls[0].args[1], [
				"simctl",
				"status_bar",
				"dev-1",
				"override",
				"--time",
				"9:41",
				"--batteryLevel",
				"100",
				"--cellularBars",
				"4",
			]);
		});

		it("ignores unknown override keys", async () => {
			const adapter = createIosAdapter();
			await adapter.setStatusBar!("dev-1", {
				time: "10:00",
				unknownKey: "value",
			});
			assert.deepEqual(calls[0].args[1], [
				"simctl",
				"status_bar",
				"dev-1",
				"override",
				"--time",
				"10:00",
			]);
		});

		it("maps all known flag keys", async () => {
			const adapter = createIosAdapter();
			await adapter.setStatusBar!("dev-1", {
				time: "9:41",
				batteryLevel: "100",
				batteryState: "charged",
				cellularBars: "4",
				wifiBars: "3",
				operatorName: "Simvyn",
				dataNetwork: "5g",
			});
			const args = calls[0].args[1] as string[];
			assert.ok(args.includes("--time"));
			assert.ok(args.includes("--batteryLevel"));
			assert.ok(args.includes("--batteryState"));
			assert.ok(args.includes("--cellularBars"));
			assert.ok(args.includes("--wifiBars"));
			assert.ok(args.includes("--operatorName"));
			assert.ok(args.includes("--dataNetwork"));
		});
	});

	describe("clearStatusBar", () => {
		it("calls xcrun simctl status_bar clear", async () => {
			const adapter = createIosAdapter();
			await adapter.clearStatusBar!("dev-1");
			assert.deepEqual(calls[0].args[1], ["simctl", "status_bar", "dev-1", "clear"]);
		});
	});

	describe("grantPermission", () => {
		it("calls xcrun simctl privacy grant with correct order", async () => {
			const adapter = createIosAdapter();
			await adapter.grantPermission!("dev-1", "com.example.app", "camera");
			assert.deepEqual(calls[0].args[1], [
				"simctl",
				"privacy",
				"dev-1",
				"grant",
				"camera",
				"com.example.app",
			]);
		});
	});

	describe("revokePermission", () => {
		it("calls xcrun simctl privacy revoke with correct order", async () => {
			const adapter = createIosAdapter();
			await adapter.revokePermission!("dev-1", "com.example.app", "photos");
			assert.deepEqual(calls[0].args[1], [
				"simctl",
				"privacy",
				"dev-1",
				"revoke",
				"photos",
				"com.example.app",
			]);
		});
	});

	describe("resetPermissions", () => {
		it("calls xcrun simctl privacy reset all with bundle id", async () => {
			const adapter = createIosAdapter();
			await adapter.resetPermissions!("dev-1", "com.example.app");
			assert.deepEqual(calls[0].args[1], [
				"simctl",
				"privacy",
				"dev-1",
				"reset",
				"all",
				"com.example.app",
			]);
		});
	});

	describe("setLocale", () => {
		it("sets both AppleLocale and AppleLanguages", async () => {
			const adapter = createIosAdapter();
			await adapter.setLocale!("dev-1", "fr_FR");
			assert.equal(calls.length, 2);
			assert.deepEqual(calls[0].args[1], [
				"simctl",
				"spawn",
				"dev-1",
				"defaults",
				"write",
				"Apple Global Domain",
				"AppleLocale",
				"-string",
				"fr_FR",
			]);
			assert.deepEqual(calls[1].args[1], [
				"simctl",
				"spawn",
				"dev-1",
				"defaults",
				"write",
				"Apple Global Domain",
				"AppleLanguages",
				"-array",
				"fr",
			]);
		});

		it("extracts language code from locale", async () => {
			const adapter = createIosAdapter();
			await adapter.setLocale!("dev-1", "ja_JP");
			assert.deepEqual((calls[1].args[1] as string[]).slice(-1), ["ja"]);
		});
	});

	describe("setContentSize", () => {
		it("calls xcrun simctl ui content_size", async () => {
			const adapter = createIosAdapter();
			await adapter.setContentSize!("dev-1", "extra-large");
			assert.deepEqual(calls[0].args[1], ["simctl", "ui", "dev-1", "content_size", "extra-large"]);
		});
	});

	describe("setIncreaseContrast", () => {
		it("calls enabled when true", async () => {
			const adapter = createIosAdapter();
			await adapter.setIncreaseContrast!("dev-1", true);
			assert.deepEqual(calls[0].args[1], ["simctl", "ui", "dev-1", "increase_contrast", "enabled"]);
		});

		it("calls disabled when false", async () => {
			const adapter = createIosAdapter();
			await adapter.setIncreaseContrast!("dev-1", false);
			assert.deepEqual(calls[0].args[1], [
				"simctl",
				"ui",
				"dev-1",
				"increase_contrast",
				"disabled",
			]);
		});
	});

	describe("listDeviceTypes", () => {
		it("parses device types from simctl JSON output", async () => {
			execMock = () =>
				Promise.resolve({
					stdout: JSON.stringify({
						devicetypes: [
							{
								identifier: "com.apple.CoreSimulator.SimDeviceType.iPhone-16-Pro",
								name: "iPhone 16 Pro",
							},
							{ identifier: "com.apple.CoreSimulator.SimDeviceType.iPad-Air", name: "iPad Air" },
							{ identifier: "com.apple.CoreSimulator.SimDeviceType.NoName", name: "" },
						],
					}),
					stderr: "",
				});
			const adapter = createIosAdapter();
			const types = await adapter.listDeviceTypes!();
			// filters out entries with empty name
			assert.equal(types.length, 2);
			assert.equal(types[0].identifier, "com.apple.CoreSimulator.SimDeviceType.iPhone-16-Pro");
			assert.equal(types[0].name, "iPhone 16 Pro");
			assert.equal(types[1].name, "iPad Air");
		});

		it("calls xcrun simctl list devicetypes --json", async () => {
			execMock = () => Promise.resolve({ stdout: JSON.stringify({ devicetypes: [] }), stderr: "" });
			const adapter = createIosAdapter();
			await adapter.listDeviceTypes!();
			assert.deepEqual(calls[0].args[1], ["simctl", "list", "devicetypes", "--json"]);
		});
	});

	describe("listRuntimes", () => {
		it("parses runtimes from simctl JSON output", async () => {
			execMock = () =>
				Promise.resolve({
					stdout: JSON.stringify({
						runtimes: [
							{
								identifier: "com.apple.CoreSimulator.SimRuntime.iOS-17-5",
								name: "iOS 17.5",
								version: "17.5",
								isAvailable: true,
							},
							{
								identifier: "com.apple.CoreSimulator.SimRuntime.iOS-16-4",
								name: "iOS 16.4",
								isAvailable: false,
							},
						],
					}),
					stderr: "",
				});
			const adapter = createIosAdapter();
			const runtimes = await adapter.listRuntimes!();
			assert.equal(runtimes.length, 2);
			assert.equal(runtimes[0].identifier, "com.apple.CoreSimulator.SimRuntime.iOS-17-5");
			assert.equal(runtimes[0].name, "iOS 17.5");
			assert.equal(runtimes[0].version, "17.5");
			assert.equal(runtimes[0].isAvailable, true);
			assert.equal(runtimes[1].version, "16.4");
			assert.equal(runtimes[1].isAvailable, false);
		});

		it("calls xcrun simctl list runtimes --json", async () => {
			execMock = () => Promise.resolve({ stdout: JSON.stringify({ runtimes: [] }), stderr: "" });
			const adapter = createIosAdapter();
			await adapter.listRuntimes!();
			assert.deepEqual(calls[0].args[1], ["simctl", "list", "runtimes", "--json"]);
		});
	});

	describe("createDevice", () => {
		it("calls xcrun simctl create with name, type, and optional runtime", async () => {
			execMock = () => Promise.resolve({ stdout: "NEW-UUID-1234\n", stderr: "" });
			const adapter = createIosAdapter();
			const id = await adapter.createDevice!(
				"My Phone",
				"com.apple.CoreSimulator.SimDeviceType.iPhone-16",
				"com.apple.CoreSimulator.SimRuntime.iOS-17-5",
			);
			assert.deepEqual(calls[0].args[1], [
				"simctl",
				"create",
				"My Phone",
				"com.apple.CoreSimulator.SimDeviceType.iPhone-16",
				"com.apple.CoreSimulator.SimRuntime.iOS-17-5",
			]);
			assert.equal(id, "NEW-UUID-1234");
		});

		it("omits runtime when not provided", async () => {
			execMock = () => Promise.resolve({ stdout: "UUID-5678\n", stderr: "" });
			const adapter = createIosAdapter();
			await adapter.createDevice!("Test Device", "com.apple.CoreSimulator.SimDeviceType.iPhone-15");
			assert.deepEqual(calls[0].args[1], [
				"simctl",
				"create",
				"Test Device",
				"com.apple.CoreSimulator.SimDeviceType.iPhone-15",
			]);
		});
	});

	describe("cloneDevice", () => {
		it("calls xcrun simctl clone and returns new device id", async () => {
			execMock = () => Promise.resolve({ stdout: "CLONED-UUID\n", stderr: "" });
			const adapter = createIosAdapter();
			const id = await adapter.cloneDevice!("source-id", "Cloned Device");
			assert.deepEqual(calls[0].args[1], ["simctl", "clone", "source-id", "Cloned Device"]);
			assert.equal(id, "CLONED-UUID");
		});
	});

	describe("renameDevice", () => {
		it("calls xcrun simctl rename with device id and new name", async () => {
			const adapter = createIosAdapter();
			await adapter.renameDevice!("dev-1", "New Name");
			assert.deepEqual(calls[0].args[1], ["simctl", "rename", "dev-1", "New Name"]);
		});
	});

	describe("deleteDevice", () => {
		it("calls xcrun simctl delete with device id", async () => {
			const adapter = createIosAdapter();
			await adapter.deleteDevice!("dev-to-delete");
			assert.deepEqual(calls[0].args[1], ["simctl", "delete", "dev-to-delete"]);
		});

		it("wraps 'Invalid device state' into user-friendly error", async () => {
			execMock = () => Promise.reject(new Error("Invalid device state"));
			const adapter = createIosAdapter();
			await assert.rejects(() => adapter.deleteDevice!("dev-1"), {
				message: "Device must be shut down before deleting",
			});
		});

		it("rethrows other errors as-is", async () => {
			execMock = () => Promise.reject(new Error("Not found"));
			const adapter = createIosAdapter();
			await assert.rejects(() => adapter.deleteDevice!("dev-1"), { message: "Not found" });
		});
	});

	describe("addKeychainCert", () => {
		it("calls xcrun simctl keychain add-root-cert for root certs", async () => {
			// addKeychainCert writes a temp file then calls simctl keychain
			// We can only verify the simctl call since fs operations are real
			// but since verboseExec is mocked, the actual call goes through
			const adapter = createIosAdapter();
			const certData = Buffer.from("fake cert data");
			await adapter.addKeychainCert!("dev-1", certData, true);

			// Should have called xcrun simctl keychain
			const simctlCall = calls.find((c) => {
				const args = c.args[1] as string[];
				return args[0] === "simctl" && args[1] === "keychain";
			});
			assert.ok(simctlCall, "Expected simctl keychain call");
			const args = simctlCall!.args[1] as string[];
			assert.equal(args[0], "simctl");
			assert.equal(args[1], "keychain");
			assert.equal(args[2], "dev-1");
			assert.equal(args[3], "add-root-cert");
			// args[4] is the temp file path
		});

		it("calls xcrun simctl keychain add-cert for non-root certs", async () => {
			const adapter = createIosAdapter();
			const certData = Buffer.from("fake cert");
			await adapter.addKeychainCert!("dev-1", certData, false);

			const simctlCall = calls.find((c) => {
				const args = c.args[1] as string[];
				return args[0] === "simctl" && args[1] === "keychain";
			});
			assert.ok(simctlCall);
			const args = simctlCall!.args[1] as string[];
			assert.equal(args[3], "add-cert");
		});
	});

	describe("resetKeychain", () => {
		it("calls xcrun simctl keychain reset", async () => {
			const adapter = createIosAdapter();
			await adapter.resetKeychain!("dev-1");
			assert.deepEqual(calls[0].args[1], ["simctl", "keychain", "dev-1", "reset"]);
		});
	});

	describe("collectBugReport", () => {
		it("calls xcrun simctl diagnose with timeout and output path", async () => {
			// This also involves fs.mkdir and fs.stat, but since only verboseExec is mocked
			// we need to provide a directory that exists
			execMock = () => Promise.resolve({ stdout: "", stderr: "" });
			const adapter = createIosAdapter();

			// Use /tmp which exists, and mock stat response through the real fs
			// The function calls mkdir + verboseExec + stat
			// We'll test that the correct xcrun command is issued
			try {
				await adapter.collectBugReport!("dev-1", "/tmp/simvyn-test-bug-reports");
			} catch {
				// stat may fail since the file doesn't actually get created (mocked exec)
			}

			const simctlCall = calls.find((c) => {
				const args = c.args[1] as string[];
				return args[0] === "simctl" && args[1] === "diagnose";
			});
			assert.ok(simctlCall, "Expected simctl diagnose call");
			const args = simctlCall!.args[1] as string[];
			assert.equal(args[0], "simctl");
			assert.equal(args[1], "diagnose");
			assert.equal(args[2], "-b");
			assert.equal(args[3], "--output");
			// args[4] is the output path

			// Verify timeout option
			const opts = simctlCall!.args[2] as { timeout: number };
			assert.equal(opts.timeout, 300_000);
		});
	});

	describe("capabilities", () => {
		it("returns expected platform capability strings", async () => {
			const adapter = createIosAdapter();
			const caps = adapter.capabilities();
			const expected = [
				"setLocation",
				"push",
				"screenshot",
				"screenRecord",
				"erase",
				"statusBar",
				"privacy",
				"ui",
				"clipboard",
				"addMedia",
				"logs",
				"deepLinks",
				"appManagement",
				"settings",
				"accessibility",
				"deviceLifecycle",
				"keychain",
				"bugReport",
			];
			assert.deepEqual(caps, expected);
		});

		it("returns an array of correct length", () => {
			const adapter = createIosAdapter();
			assert.equal(adapter.capabilities().length, 18);
		});
	});
});
