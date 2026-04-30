import { basename, isAbsolute, posix, resolve, sep } from "node:path";

export interface AppBundleManifestEntry {
	field: string;
	relativePath: string;
}

export class AppBundleUploadError extends Error {
	statusCode = 400 as const;

	constructor(message: string) {
		super(message);
		this.name = "AppBundleUploadError";
	}
}

export function assertSafeAppBundleName(bundleName: string): string {
	if (!bundleName) {
		throw new AppBundleUploadError("Bundle name is required");
	}
	if (!bundleName.endsWith(".app")) {
		throw new AppBundleUploadError("Bundle name must end with .app");
	}
	if (basename(bundleName) !== bundleName) {
		throw new AppBundleUploadError("Bundle name must not include a path");
	}
	if (bundleName.includes("/") || bundleName.includes("\\") || bundleName.includes("\0")) {
		throw new AppBundleUploadError("Bundle name contains unsafe characters");
	}

	return bundleName;
}

export function parseAppBundleManifest(raw: string): AppBundleManifestEntry[] {
	let parsed: unknown;

	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new AppBundleUploadError("Bundle manifest must be valid JSON");
	}

	if (!Array.isArray(parsed)) {
		throw new AppBundleUploadError("Bundle manifest must be an array");
	}

	return parsed.map((entry, index) => {
		if (!entry || typeof entry !== "object") {
			throw new AppBundleUploadError(`Bundle manifest entry ${index} must be an object`);
		}

		const { field, relativePath } = entry as Partial<AppBundleManifestEntry>;
		if (typeof field !== "string" || typeof relativePath !== "string") {
			throw new AppBundleUploadError(
				`Bundle manifest entry ${index} must include string field and relativePath`,
			);
		}

		return { field, relativePath };
	});
}

export function validateAppBundleManifest(entries: AppBundleManifestEntry[]): void {
	if (entries.length === 0) {
		throw new AppBundleUploadError("Bundle manifest must include at least one file");
	}

	const fields = new Set<string>();
	const relativePaths = new Set<string>();
	let hasInfoPlist = false;

	for (const entry of entries) {
		if (!/^bundle-file-\d+$/.test(entry.field)) {
			throw new AppBundleUploadError(`Invalid bundle file field: ${entry.field}`);
		}
		if (fields.has(entry.field)) {
			throw new AppBundleUploadError(`Duplicate bundle file field: ${entry.field}`);
		}
		if (relativePaths.has(entry.relativePath)) {
			throw new AppBundleUploadError(`Duplicate bundle relative path: ${entry.relativePath}`);
		}
		if (entry.relativePath === "Info.plist") {
			hasInfoPlist = true;
		}

		fields.add(entry.field);
		relativePaths.add(entry.relativePath);
		resolveBundleFilePath("/tmp/simvyn-manifest-check.app", entry.relativePath);
	}

	if (!hasInfoPlist) {
		throw new AppBundleUploadError("Bundle manifest must include Info.plist");
	}
}

export function resolveBundleFilePath(bundleRoot: string, relativePath: string): string {
	if (!relativePath) {
		throw new AppBundleUploadError("Bundle file path is required");
	}
	if (
		relativePath.includes("\0") ||
		relativePath.includes("\\") ||
		isAbsolute(relativePath) ||
		posix.isAbsolute(relativePath)
	) {
		throw new AppBundleUploadError(`Unsafe bundle file path: ${relativePath}`);
	}

	const rawSegments = relativePath.split("/");
	if (rawSegments.includes("..")) {
		throw new AppBundleUploadError(`Unsafe bundle file path: ${relativePath}`);
	}

	const normalized = posix.normalize(relativePath);
	if (normalized === "." || normalized === ".." || normalized.startsWith("../")) {
		throw new AppBundleUploadError(`Unsafe bundle file path: ${relativePath}`);
	}

	const root = resolve(bundleRoot);
	const destination = resolve(root, normalized);
	if (destination !== root && !destination.startsWith(root + sep)) {
		throw new AppBundleUploadError(`Unsafe bundle file path: ${relativePath}`);
	}

	return destination;
}
