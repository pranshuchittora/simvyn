import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	assertSafeAppBundleName,
	parseAppBundleManifest,
	resolveBundleFilePath,
	validateAppBundleManifest,
} from "./upload-utils.js";

describe("app bundle upload helpers", () => {
	it("accepts MyApp.app as a safe bundle name", () => {
		assert.equal(assertSafeAppBundleName("MyApp.app"), "MyApp.app");
	});

	it("rejects MyApp", () => {
		assert.throws(() => assertSafeAppBundleName("MyApp"), /must end with .app/);
	});

	it("rejects ../MyApp.app", () => {
		assert.throws(() => assertSafeAppBundleName("../MyApp.app"), /must not include a path/);
	});

	it("rejects Nested/MyApp.app", () => {
		assert.throws(() => assertSafeAppBundleName("Nested/MyApp.app"), /must not include a path/);
	});

	it("parses a manifest containing Info.plist", () => {
		const manifest = parseAppBundleManifest(
			JSON.stringify([{ field: "bundle-file-0", relativePath: "Info.plist" }]),
		);

		assert.deepEqual(manifest, [{ field: "bundle-file-0", relativePath: "Info.plist" }]);
	});

	it("rejects malformed JSON", () => {
		assert.throws(() => parseAppBundleManifest("{"), /valid JSON/);
	});

	it("rejects duplicate fields", () => {
		assert.throws(
			() =>
				validateAppBundleManifest([
					{ field: "bundle-file-0", relativePath: "Info.plist" },
					{ field: "bundle-file-0", relativePath: "PkgInfo" },
				]),
			/Duplicate bundle file field/,
		);
	});

	it("rejects duplicate relative paths", () => {
		assert.throws(
			() =>
				validateAppBundleManifest([
					{ field: "bundle-file-0", relativePath: "Info.plist" },
					{ field: "bundle-file-1", relativePath: "Info.plist" },
				]),
			/Duplicate bundle relative path/,
		);
	});

	it("rejects a manifest missing Info.plist", () => {
		assert.throws(
			() => validateAppBundleManifest([{ field: "bundle-file-0", relativePath: "PkgInfo" }]),
			/must include Info.plist/,
		);
	});

	it("resolveBundleFilePath returns a path ending with /tmp/MyApp.app/Info.plist", () => {
		assert.equal(
			resolveBundleFilePath("/tmp/MyApp.app", "Info.plist"),
			"/tmp/MyApp.app/Info.plist",
		);
	});

	it("rejects path traversal", () => {
		assert.throws(() => resolveBundleFilePath("/tmp/MyApp.app", "../Info.plist"), /Unsafe/);
	});

	it("rejects /absolute/Info.plist", () => {
		assert.throws(() => resolveBundleFilePath("/tmp/MyApp.app", "/absolute/Info.plist"), /Unsafe/);
	});

	it("rejects Contents\\Info.plist", () => {
		assert.throws(() => resolveBundleFilePath("/tmp/MyApp.app", "Contents\\Info.plist"), /Unsafe/);
	});
});
