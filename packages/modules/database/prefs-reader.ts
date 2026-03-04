import { execFile } from "node:child_process";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// iOS NSUserDefaults

export async function readNSUserDefaults(
	dataContainer: string,
	bundleId: string,
): Promise<Record<string, unknown>> {
	const plistPath = join(dataContainer, "Library", "Preferences", `${bundleId}.plist`);
	try {
		const { stdout } = await execFileAsync("plutil", [
			"-convert",
			"json",
			"-r",
			"-o",
			"-",
			plistPath,
		]);
		return JSON.parse(stdout);
	} catch {
		return {};
	}
}

export async function listPlistFiles(dataContainer: string): Promise<string[]> {
	const prefsDir = join(dataContainer, "Library", "Preferences");
	try {
		const entries = await readdir(prefsDir);
		return entries.filter((e) => e.endsWith(".plist"));
	} catch {
		return [];
	}
}

// Android SharedPreferences

export interface PrefEntry {
	key: string;
	value: unknown;
	type: string;
}

export async function readSharedPreferences(
	deviceId: string,
	packageName: string,
): Promise<Record<string, PrefEntry[]>> {
	if (deviceId.startsWith("avd:"))
		throw new Error("Device must be booted for SharedPreferences access");

	let fileList: string;
	try {
		const { stdout } = await execFileAsync("adb", [
			"-s",
			deviceId,
			"shell",
			"run-as",
			packageName,
			"ls",
			`/data/data/${packageName}/shared_prefs/`,
		]);
		fileList = stdout.trim();
	} catch (err) {
		const msg = (err as Error).message;
		if (msg.includes("not debuggable") || msg.includes("is not debuggable")) {
			throw new Error(
				`Package ${packageName} is not debuggable — SharedPreferences access requires a debug build`,
				{ cause: err },
			);
		}
		return {};
	}

	if (!fileList) return {};

	const files = fileList.split("\n").filter((f) => f.endsWith(".xml"));
	const result: Record<string, PrefEntry[]> = {};

	for (const file of files) {
		try {
			const { stdout } = await execFileAsync("adb", [
				"-s",
				deviceId,
				"shell",
				"run-as",
				packageName,
				"cat",
				`/data/data/${packageName}/shared_prefs/${file}`,
			]);
			result[file] = parseSharedPrefsXml(stdout);
		} catch {
			// skip unreadable files
		}
	}

	return result;
}

export function parseSharedPrefsXml(xml: string): PrefEntry[] {
	const entries: PrefEntry[] = [];

	// <string name="key">value</string>
	for (const m of xml.matchAll(/<string name="([^"]+)">([\s\S]*?)<\/string>/g)) {
		entries.push({ key: m[1], value: m[2], type: "string" });
	}

	// <int name="key" value="N" />
	for (const m of xml.matchAll(/<int name="([^"]+)" value="([^"]+)"\s*\/>/g)) {
		entries.push({ key: m[1], value: parseInt(m[2], 10), type: "int" });
	}

	// <boolean name="key" value="true|false" />
	for (const m of xml.matchAll(/<boolean name="([^"]+)" value="([^"]+)"\s*\/>/g)) {
		entries.push({ key: m[1], value: m[2] === "true", type: "boolean" });
	}

	// <float name="key" value="N.N" />
	for (const m of xml.matchAll(/<float name="([^"]+)" value="([^"]+)"\s*\/>/g)) {
		entries.push({ key: m[1], value: parseFloat(m[2]), type: "float" });
	}

	// <long name="key" value="N" />
	for (const m of xml.matchAll(/<long name="([^"]+)" value="([^"]+)"\s*\/>/g)) {
		entries.push({ key: m[1], value: parseInt(m[2], 10), type: "long" });
	}

	// <set name="key"><string>a</string>...</set>
	for (const m of xml.matchAll(/<set name="([^"]+)">([\s\S]*?)<\/set>/g)) {
		const values: string[] = [];
		for (const s of m[2].matchAll(/<string>([\s\S]*?)<\/string>/g)) {
			values.push(s[1]);
		}
		entries.push({ key: m[1], value: values, type: "set" });
	}

	return entries;
}
