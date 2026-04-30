# Phase 31: iOS Simulator .app Install Support - Pattern Map

**Mapped:** 2026-05-01
**Scope:** Backend multipart upload/reconstruction, dashboard install drop zone, docs copy

## Target Files and Closest Analogs

| Target File | Role | Closest Existing Analog | Reuse Pattern |
|-------------|------|-------------------------|---------------|
| `packages/modules/app-management/routes.ts` | Fastify route that streams multipart upload to temp storage and invokes adapter method | `packages/modules/media/routes.ts` | Register `@fastify/multipart`, validate booted device, check adapter capability, create `mkdtemp`, stream with `pipeline`, clean temp dir in `finally` |
| `packages/modules/app-management/upload-utils.ts` | Pure helper for bundle-name, manifest, and path containment validation | `packages/modules/file-system/ios-fs.ts` plus Node path/fs helpers in routes | Keep filesystem/path logic isolated and testable; use Node built-ins rather than ad hoc string writes |
| `packages/modules/app-management/upload-utils.test.ts` | Node test coverage for upload helper security checks | `packages/core/src/__tests__/ios-adapter.test.ts` | Use `node:test` + `node:assert/strict` style with focused unit assertions |
| `packages/dashboard/src/panels/apps/InstallDropZone.tsx` | Dashboard file/drop upload control for App Management | Existing `InstallDropZone.tsx` and `packages/dashboard/src/panels/MediaPanel.tsx` | Preserve local upload state, hidden file input, `FormData`, status copy, spinner, `.glass-drop-zone` styling |
| `packages/dashboard/src/components/HomeScreen.tsx` | Quick-start tip copy | Existing tips array in same file | Update one concise tip, no layout change |
| `README.md` / `packages/cli/README.md` | User-facing install capability docs | Existing App Management and CLI reference sections | Replace IPA/APK-only wording with IPA/APK/iOS simulator `.app` wording |

## Concrete Code Excerpts

### Multipart Temp Upload Pattern

From `packages/modules/media/routes.ts`:

```typescript
await fastify.register(multipart, {
	limits: { fileSize: 500_000_000 },
});

const data = await req.file();
if (!data) return reply.status(400).send({ error: "No file uploaded" });

const tmpDir = await mkdtemp(join(tmpdir(), "simvyn-media-"));
const filePath = join(tmpDir, data.filename);

try {
	await pipeline(data.file, createWriteStream(filePath));
	await adapter.addMedia(device.id, filePath);
	return { success: true, filename: data.filename };
} finally {
	await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
}
```

Phase 31 should keep this structure for single-file `.ipa`/`.apk` installs and extend it for multipart bundle-file parts.

### Current App Install Gap

From `packages/modules/app-management/routes.ts`:

```typescript
const data = await req.file();
if (!data) return reply.status(400).send({ error: "No file uploaded" });

const tmpDir = await mkdtemp(join(tmpdir(), "simvyn-upload-"));
const filePath = join(tmpDir, data.filename);

try {
	await pipeline(data.file, createWriteStream(filePath));
	await adapter.installApp(device.id, filePath);
	return { success: true };
} finally {
	await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
}
```

This is file-only; directory bundles require `req.parts()` plus explicit manifest validation.

### Existing Dashboard Upload Pattern

From `packages/dashboard/src/panels/apps/InstallDropZone.tsx`:

```typescript
const formData = new FormData();
formData.append("file", file);

const res = await fetch(`/api/modules/apps/install/${deviceId}`, {
	method: "POST",
	body: formData,
});
```

Phase 31 must preserve this exact single-file request shape for `.ipa` and `.apk`.

### Existing Multi-File Drop Pattern

From `packages/dashboard/src/panels/MediaPanel.tsx`:

```typescript
const files = Array.from(e.dataTransfer.files);
for (const file of files) {
	uploadFile(file);
}
```

For `.app` bundles this is insufficient because directory structure matters; use `DataTransferItem.webkitGetAsEntry()` traversal instead.

### Adapter Install Support Already Exists

From `packages/core/src/adapters/ios.ts`:

```typescript
let installPath = appPath;
let tmpDir: string | undefined;

if (appPath.endsWith(".ipa")) {
	tmpDir = await mkdtemp(join(tmpdir(), "simvyn-ipa-"));
	await verboseExec("unzip", ["-q", appPath, "-d", tmpDir]);
	const entries = await readdir(join(tmpDir, "Payload"));
	const appBundle = entries.find((e) => e.endsWith(".app"));
	if (!appBundle) throw new Error("No .app found in IPA");
	installPath = join(tmpDir, "Payload", appBundle);
}

try {
	await verboseExec("xcrun", ["simctl", "install", deviceId, installPath]);
} finally {
	if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
}
```

The backend should pass a reconstructed directory path ending in `.app` to this existing method.

### Existing Adapter Test Coverage

From `packages/core/src/__tests__/ios-adapter.test.ts`:

```typescript
it("installs .app bundle directly", async () => {
	const adapter = createIosAdapter();
	await adapter.installApp!("dev-1", "/path/to/MyApp.app");
	assert.equal(calls.length, 1);
	assert.deepEqual(calls[0].args[1], ["simctl", "install", "dev-1", "/path/to/MyApp.app"]);
});
```

No new adapter command test is required unless implementation touches `ios.ts`; Phase 31 should add upload helper tests instead.

## Data Flow

1. Dashboard validates selected package.
2. Single-file `.ipa`/`.apk` uses existing `file` multipart field.
3. `.app` directory uses `uploadType=app-bundle`, `bundleName`, JSON `manifest`, and one `bundle-file-N` file part per manifest entry.
4. Server validates device is a booted iOS simulator.
5. Server validates manifest and reconstructs `tmpDir/{bundleName}/{relativePath}` with containment checks.
6. Server calls `adapter.installApp(device.id, reconstructedBundlePath)`.
7. Existing WebSocket/list refresh behavior remains unchanged through `onInstallComplete`/`app-installed` refresh paths.

## Landmines

- Browser file inputs do not expose directory selection through React typings; set `input.webkitdirectory = true` imperatively through a ref.
- `DataTransfer.files` flattens directories and can lose relative paths; directory drop needs `DataTransferItem.webkitGetAsEntry()`.
- Multipart filenames are untrusted and may not preserve paths. Use manifest field names as the source of truth.
- Never write bundle files with raw manifest paths. Normalize and resolve under the target bundle directory.
- Do not route `.app` bundle uploads to Android or physical iOS. Server-side enforcement is mandatory even if the UI validates first.
- Do not add a client-side zipping dependency; multipart streaming is sufficient and keeps the dashboard lean.

