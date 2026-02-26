# Phase 7: File System & Database Inspector - Research

**Researched:** 2026-02-26
**Domain:** Mobile device file system access, SQLite inspection, key-value store reading
**Confidence:** HIGH

## Summary

This phase adds two major modules to the simvyn monorepo: a **file-system** module for browsing, downloading, uploading, and editing files within iOS simulator and Android emulator app sandboxes, and a **database** module for inspecting SQLite databases, SharedPreferences (Android), and NSUserDefaults (iOS).

The two platforms have fundamentally different access models. **iOS simulators** store app sandboxes directly on the host filesystem (`~/Library/Developer/CoreSimulator/Devices/<udid>/data/...`), meaning file operations are regular Node.js `fs` calls — no `simctl` needed for reads/writes. **Android** requires `adb pull`/`adb push` for file transfer and `adb shell run-as <package>` for accessing private app data on debug builds.

For SQLite inspection, **better-sqlite3** is the correct choice. It opens database files directly via the SQLite C API, supports WAL-mode databases with concurrent readers/writers, and provides a synchronous API ideal for server request-response patterns. The alternative **sql.js** (WASM) would require loading the entire file into memory, which **does not work with WAL-mode databases** since uncommitted WAL data isn't in the main .db file.

**Primary recommendation:** Build two separate modules (`file-system` and `database`), both following the existing module manifest pattern. Use direct `fs` access for iOS and `adb` commands for Android. Use `better-sqlite3` with `{ readonly: true }` for safe database inspection of active app databases, with a copy-to-temp strategy for write operations.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FS-01 | Browse iOS simulator app sandboxes via `simctl get_app_container` + direct filesystem access | iOS adapter already has `listApps` returning `dataContainer` paths. `simctl get_app_container <device> <bundleId> data` returns host path. Direct `fs.readdir` works — verified on live simulator. |
| FS-02 | Browse Android app files via `adb pull`/`adb push` and `adb shell run-as` for debug apps | `adb shell run-as <package> ls <path>` for debug app private data. `adb shell ls /sdcard/...` for shared storage. `adb pull`/`adb push` for file transfer. |
| FS-03 | Download files from device to host | iOS: direct `fs.readFile` (host path). Android: `adb pull <remote> <local>` to temp dir, then stream to client. |
| FS-04 | Upload files from host to device | iOS: direct `fs.writeFile` (host path). Android: write to temp, then `adb push <local> <remote>`. |
| FS-05 | Edit text files inline in dashboard with save-back | Read file content via FS-03 pattern, display in textarea/code editor, save via FS-04 pattern. Detect binary vs text via file extension or content sniffing. |
| FS-06 | CLI subcommands: `simvyn fs ls`, `simvyn fs pull`, `simvyn fs push` | Follow existing CLI pattern from app-management module: headless commands that create own adapters/DeviceManager. |
| DB-01 | Detect and list SQLite databases within app containers | Recursive file search for `.db`, `.sqlite`, `.sqlite3` extensions within data container path. Also check magic bytes (`SQLite format 3\000`) for extensionless files. |
| DB-02 | Browse SQLite tables — show schema, row counts, column types | better-sqlite3 `PRAGMA table_list` + `PRAGMA table_info(tableName)` + `SELECT count(*) FROM tableName`. |
| DB-03 | View table data with pagination and sorting | `SELECT * FROM tableName ORDER BY ? LIMIT ? OFFSET ?` with better-sqlite3 `.all()`. Column metadata via `.columns()`. |
| DB-04 | Edit individual cell values and write back to database | Open writable copy (copy .db + .wal + .shm to temp), apply UPDATE, copy back. Never write to actively-used database. |
| DB-05 | Run arbitrary SQL queries with results display | better-sqlite3 `.prepare(sql).all()` with `.columns()` for result metadata. Wrap in try/catch for SqliteError. |
| DB-06 | View SharedPreferences (Android) as key-value table | `adb shell run-as <package> cat /data/data/<package>/shared_prefs/<file>.xml` — parse XML key-value pairs. |
| DB-07 | View NSUserDefaults (iOS) as key-value table via plist reading | Direct file read from `<dataContainer>/Library/Preferences/<bundleId>.plist`, convert with `plutil -convert json`. Verified: files are binary plist format. |
| DB-08 | CLI subcommands: `simvyn db list`, `simvyn db query` | Follow existing CLI pattern. `db list` finds SQLite files. `db query` opens with better-sqlite3, runs SQL, prints tabular output. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | ^12.6.2 | SQLite database access | Synchronous API, WAL-mode support, readonly mode, `.columns()` for schema introspection, prebuilt binaries via `prebuild-install`. Only viable option for reading WAL-mode databases in active use. |
| @fastify/multipart | ^9.4.0 | File upload handling | Already used by app-management module. Handles multipart file uploads for `fs push` via dashboard. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/better-sqlite3 | ^7.6.x | TypeScript types for better-sqlite3 | Dev dependency for type safety |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| better-sqlite3 | sql.js (WASM) | sql.js loads entire db into memory — **cannot read WAL-mode data** that hasn't been checkpointed. Zero native deps but fundamentally broken for our use case of inspecting active app databases. |
| better-sqlite3 | sqlite3 (async) | Callback-based async API is harder to use. No `.columns()` method. better-sqlite3 is significantly faster and more ergonomic. |
| plutil (macOS) | plist npm package | plutil is already used in the codebase and is guaranteed available on macOS. No additional dependency needed. |

**Installation:**
```bash
npm install better-sqlite3 -w @simvyn/module-database
npm install -D @types/better-sqlite3 -w @simvyn/module-database
```

## Architecture Patterns

### Recommended Module Structure
```
packages/modules/
├── file-system/
│   ├── manifest.ts          # SimvynModule: name="fs", routes + ws-handler + cli
│   ├── routes.ts             # Fastify REST routes for FS operations
│   ├── ws-handler.ts         # WS channel "fs" for real-time tree updates
│   ├── ios-fs.ts             # iOS-specific filesystem operations (direct fs access)
│   ├── android-fs.ts         # Android-specific filesystem operations (adb commands)
│   ├── package.json
│   └── tsconfig.json
├── database/
│   ├── manifest.ts           # SimvynModule: name="database", routes + ws-handler + cli
│   ├── routes.ts             # Fastify REST routes for DB operations
│   ├── ws-handler.ts         # WS channel "database"
│   ├── sqlite-inspector.ts   # SQLite operations via better-sqlite3
│   ├── prefs-reader.ts       # SharedPreferences + NSUserDefaults reading
│   ├── package.json
│   └── tsconfig.json
```

```
packages/dashboard/src/panels/
├── FileSystemPanel.tsx       # Panel registration for file-system module
├── file-system/
│   ├── FileBrowser.tsx        # Tree view + file list
│   ├── FileEditor.tsx         # Text file editor with save
│   ├── stores/
│   │   └── fs-store.ts        # Zustand store for file tree state
├── DatabasePanel.tsx          # Panel registration for database module
├── database/
│   ├── DatabaseBrowser.tsx    # DB list + table browser
│   ├── TableViewer.tsx        # Paginated table data view
│   ├── SqlEditor.tsx          # SQL query editor + results
│   ├── PrefsViewer.tsx        # Key-value prefs display
│   ├── stores/
│   │   └── db-store.ts        # Zustand store for database state
```

### Pattern 1: Platform-Specific File System Adapters
**What:** Separate iOS and Android FS implementations behind a common interface, dispatched by platform at the route/ws-handler level.
**When to use:** Every FS operation — the two platforms have fundamentally different access models.
**Example:**
```typescript
// ios-fs.ts — direct host filesystem access
import { readdir, stat, readFile, writeFile, copyFile } from "node:fs/promises";
import { join } from "node:path";

export async function iosListDir(containerPath: string, relativePath: string) {
  const fullPath = join(containerPath, relativePath);
  const entries = await readdir(fullPath, { withFileTypes: true });
  return entries.map(e => ({
    name: e.name,
    isDirectory: e.isDirectory(),
    path: join(relativePath, e.name),
  }));
}

export async function iosReadFile(containerPath: string, relativePath: string) {
  return readFile(join(containerPath, relativePath));
}

export async function iosWriteFile(containerPath: string, relativePath: string, data: Buffer) {
  await writeFile(join(containerPath, relativePath), data);
}
```

```typescript
// android-fs.ts — adb-based file access
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const execFileAsync = promisify(execFile);

export async function androidListDir(deviceId: string, packageName: string, remotePath: string) {
  // For debug apps: adb shell run-as <package> ls -la <path>
  // For shared storage: adb shell ls -la <path>
  const { stdout } = await execFileAsync("adb", [
    "-s", deviceId, "shell", "run-as", packageName, "ls", "-la", remotePath
  ]);
  return parseAndroidLsOutput(stdout);
}

export async function androidPullFile(deviceId: string, packageName: string, remotePath: string): Promise<Buffer> {
  const tmpDir = await mkdtemp(join(tmpdir(), "simvyn-pull-"));
  const localPath = join(tmpDir, "file");
  try {
    // For debug apps: copy via run-as to accessible location, then pull
    await execFileAsync("adb", [
      "-s", deviceId, "shell", "run-as", packageName, "cp", remotePath, "/data/local/tmp/simvyn_transfer"
    ]);
    await execFileAsync("adb", ["-s", deviceId, "pull", "/data/local/tmp/simvyn_transfer", localPath]);
    await execFileAsync("adb", ["-s", deviceId, "shell", "rm", "/data/local/tmp/simvyn_transfer"]);
    return readFile(localPath);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}
```

### Pattern 2: SQLite Inspector with Copy-on-Write for Mutations
**What:** Open databases readonly for browsing/queries, copy to temp for write operations, copy back after mutation.
**When to use:** All SQLite database access.
**Example:**
```typescript
// sqlite-inspector.ts
import Database from "better-sqlite3";
import { copyFile } from "node:fs/promises";
import { join } from "node:path";

export function openReadonly(dbPath: string): Database.Database {
  return new Database(dbPath, { readonly: true, timeout: 10000 });
}

export function getTables(db: Database.Database) {
  const tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  ).all() as { name: string }[];
  return tables.map(t => {
    const info = db.prepare(`PRAGMA table_info("${t.name}")`).all();
    const count = db.prepare(`SELECT count(*) as count FROM "${t.name}"`).pluck().get() as number;
    return { name: t.name, columns: info, rowCount: count };
  });
}

export function queryTable(db: Database.Database, table: string, opts: {
  limit: number;
  offset: number;
  orderBy?: string;
  orderDir?: "ASC" | "DESC";
}) {
  const order = opts.orderBy ? `ORDER BY "${opts.orderBy}" ${opts.orderDir ?? "ASC"}` : "";
  const stmt = db.prepare(`SELECT * FROM "${table}" ${order} LIMIT ? OFFSET ?`);
  const rows = stmt.all(opts.limit, opts.offset);
  const columns = stmt.columns();
  return { rows, columns };
}

export function runQuery(db: Database.Database, sql: string) {
  const stmt = db.prepare(sql);
  if (stmt.reader) {
    const rows = stmt.all();
    const columns = stmt.columns();
    return { type: "rows" as const, rows, columns };
  }
  const info = stmt.run();
  return { type: "run" as const, changes: info.changes };
}
```

### Pattern 3: Plist/SharedPreferences Reading
**What:** Read key-value stores from platform-specific formats.
**When to use:** DB-06 (SharedPreferences) and DB-07 (NSUserDefaults).
**Example:**
```typescript
// prefs-reader.ts
import { execFile, spawn } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { promisify } from "node:util";
import { join } from "node:path";

const execFileAsync = promisify(execFile);

// iOS: read binary plist from host filesystem, convert to JSON via plutil
export async function readNSUserDefaults(dataContainer: string, bundleId: string) {
  const prefsDir = join(dataContainer, "Library", "Preferences");
  const plistPath = join(prefsDir, `${bundleId}.plist`);
  const json = await plistToJson(plistPath);
  return JSON.parse(json);
}

// Reuse existing pattern from ios.ts
function plistToJson(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("plutil", ["-convert", "json", "-r", "-o", "-", filePath]);
    let out = "";
    let err = "";
    proc.stdout.on("data", (d: Buffer) => { out += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { err += d.toString(); });
    proc.on("close", (code) =>
      code === 0 ? resolve(out) : reject(new Error(`plutil exit ${code}: ${err}`))
    );
  });
}

// Android: read SharedPreferences XML via adb shell run-as
export async function readSharedPreferences(deviceId: string, packageName: string) {
  // List .xml files in shared_prefs directory
  const { stdout: listing } = await execFileAsync("adb", [
    "-s", deviceId, "shell", "run-as", packageName,
    "ls", `/data/data/${packageName}/shared_prefs/`
  ]);
  const files = listing.trim().split("\n").filter(f => f.endsWith(".xml"));

  const result: Record<string, Record<string, unknown>> = {};
  for (const file of files) {
    const { stdout: xml } = await execFileAsync("adb", [
      "-s", deviceId, "shell", "run-as", packageName,
      "cat", `/data/data/${packageName}/shared_prefs/${file}`
    ]);
    result[file] = parseSharedPrefsXml(xml);
  }
  return result;
}

function parseSharedPrefsXml(xml: string): Record<string, unknown> {
  // SharedPreferences XML format:
  // <map>
  //   <string name="key">value</string>
  //   <int name="key" value="42" />
  //   <boolean name="key" value="true" />
  //   <float name="key" value="3.14" />
  //   <long name="key" value="123456789" />
  //   <set name="key"><string>a</string><string>b</string></set>
  // </map>
  // Parse with regex — XML is simple and well-defined for SharedPreferences
  const entries: Record<string, unknown> = {};
  // ... regex-based parsing (no XML library needed for this simple format)
  return entries;
}
```

### Pattern 4: Container Path Resolution
**What:** Resolve an app's sandbox path from device + bundleId, abstracting platform differences.
**When to use:** Entry point for all FS and DB operations.
**Example:**
```typescript
// Reuse existing adapter.getAppInfo() which returns dataContainer
async function resolveContainer(deviceId: string, bundleId: string, adapter: PlatformAdapter) {
  const info = await adapter.getAppInfo!(deviceId, bundleId);
  if (!info?.dataContainer) throw new Error(`No data container found for ${bundleId}`);
  return info.dataContainer;
}

// For iOS: dataContainer is a host filesystem path (e.g. /Users/.../Containers/Data/Application/UUID)
// For Android: dataContainer is a device path (e.g. /data/data/com.example.app)
```

### Anti-Patterns to Avoid
- **Opening active databases for writing directly:** Never open a WAL-mode database with write access while the app is running. Copy to temp, modify, copy back.
- **Using `exec` instead of `execFile` for adb commands:** The codebase uses `execFile` exclusively to prevent shell injection. Continue this pattern.
- **Parsing `ls` output on Android without handling edge cases:** Android `ls -la` output varies across API levels. Parse defensively. Consider using `stat` for individual files when precision matters.
- **Reading the entire database into memory:** For large databases, use pagination (LIMIT/OFFSET). Never load all rows at once.
- **Assuming all apps have debug access on Android:** `run-as` only works for debuggable apps. Non-debug APKs will fail. Fall back to `/sdcard/` paths or show clear error.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SQLite database access | Custom `sqlite3` CLI wrapper | better-sqlite3 | CLI-based approach can't do pagination, schema introspection, or handle concurrent access properly. better-sqlite3 gives full programmatic control. |
| Binary plist parsing | Custom binary plist parser | `plutil` (macOS system tool) | Binary plist format is complex. `plutil` is guaranteed available on macOS (the only platform running iOS simulators) and already used in the codebase. |
| SharedPreferences XML parsing | Full XML parser library | Regex-based parsing | SharedPreferences XML is extremely simple and well-defined (`<map>` with typed child elements). Adding an XML dependency for this is overkill. |
| File MIME type detection | Custom magic byte sniffer | File extension mapping | For the text-editor use case, extension-based detection (`.json`, `.xml`, `.txt`, `.plist`, `.sql`) is sufficient. No need for `file-type` or `mmmagic` libraries. |

**Key insight:** This phase is about *orchestrating existing platform tools* (simctl, adb, plutil, better-sqlite3) rather than reimplementing their functionality. The complexity is in the glue code and platform abstraction, not in the individual operations.

## Common Pitfalls

### Pitfall 1: WAL-Mode Database Locking
**What goes wrong:** Opening an active WAL-mode database for writing while the app is running causes `SQLITE_BUSY` errors or corrupts the database.
**Why it happens:** WAL mode allows one writer at a time. The running app holds the write lock. If simvyn also tries to write, they conflict.
**How to avoid:** Always open databases with `{ readonly: true }` for browsing/queries. For write operations (DB-04), copy the database files (.db + .wal + .shm) to a temp directory, modify the copy, then copy back. Warn the user that the app may need to restart to pick up changes.
**Warning signs:** `SQLITE_BUSY` errors, `SqliteError` with code `SQLITE_BUSY`.

### Pitfall 2: Android `run-as` Only Works for Debug Apps
**What goes wrong:** `adb shell run-as <package> ls /data/data/<package>/` fails with "Package not debuggable" for release builds.
**Why it happens:** Android enforces app sandbox security. `run-as` requires `android:debuggable="true"` in the app manifest.
**How to avoid:** Try `run-as` first, catch the error, and fall back to informing the user. For release builds, only `/sdcard/Android/data/<package>/` (shared external storage) is accessible without root. Show a clear "debug build required" message in the UI.
**Warning signs:** `run-as` returns exit code 1 with "not debuggable" in stderr.

### Pitfall 3: iOS Simulator Container Paths Change
**What goes wrong:** Cached container paths become stale after the app is uninstalled and reinstalled, or after a simulator erase.
**Why it happens:** iOS generates new UUIDs for app containers on install. The path `~/Library/Developer/CoreSimulator/Devices/<udid>/data/Containers/Data/Application/<UUID>/` uses a different UUID each time.
**How to avoid:** Always resolve the container path fresh via `simctl get_app_container` or `listapps` before operations. Never cache container paths across operations.
**Warning signs:** `ENOENT` errors on previously valid paths.

### Pitfall 4: Large File Transfer Timeouts
**What goes wrong:** Downloading or uploading large files (e.g., database files > 100MB) from Android via `adb pull`/`adb push` times out.
**Why it happens:** `execFile` has a default timeout and buffer limit.
**How to avoid:** Use `spawn` (not `execFile`) for large file transfers, pipe output to file via streams. Or use `execFileAsync` with `{ maxBuffer: Infinity, timeout: 0 }` options.
**Warning signs:** `ERR_CHILD_PROCESS_STDIO_MAXBUFFER` or timeout errors on large files.

### Pitfall 5: SQLite Table Names Requiring Quoting
**What goes wrong:** SQL queries fail when table or column names contain special characters, spaces, or are reserved words.
**Why it happens:** User databases may have any valid SQLite identifier as a table name.
**How to avoid:** Always quote identifiers with double quotes in generated SQL: `SELECT * FROM "table-name"`. Use parameterized queries for values but not for identifiers (SQLite doesn't support parameterized identifiers).
**Warning signs:** `SQLITE_ERROR` with "near" in the message for unquoted identifiers.

### Pitfall 6: Binary Files in Text Editor
**What goes wrong:** Opening a binary file (database, image, compiled asset) in the text editor corrupts it on save or shows garbage.
**Why it happens:** Text editor assumes UTF-8 encoding.
**How to avoid:** Check file type before offering edit. Use extension-based detection: only offer inline editing for known text extensions (`.json`, `.xml`, `.txt`, `.plist`, `.sql`, `.csv`, `.html`, `.css`, `.js`). For plist files, convert binary plist to XML plist before editing, convert back on save.
**Warning signs:** File content displays as mojibake or replacement characters.

## Code Examples

### Opening a WAL-Mode Database Safely (Verified from better-sqlite3 docs)
```typescript
import Database from "better-sqlite3";

// Open readonly with generous timeout for busy databases
const db = new Database("/path/to/app.db", {
  readonly: true,
  timeout: 10000, // 10s wait for SQLITE_BUSY
});

// Get all tables with schema info
const tables = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
).all();

for (const { name } of tables as { name: string }[]) {
  const columns = db.prepare(`PRAGMA table_info("${name}")`).all();
  const count = db.prepare(`SELECT count(*) as c FROM "${name}"`).pluck().get();
  console.log(`${name}: ${count} rows, columns:`, columns);
}

db.close();
```

### iOS App Container Discovery (Verified on live simulator)
```typescript
import { execFile } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import { promisify } from "node:util";
import { join } from "node:path";

const execFileAsync = promisify(execFile);

// Get specific container type
async function getAppContainer(deviceId: string, bundleId: string, containerType: "app" | "data" | "groups" = "data") {
  const { stdout } = await execFileAsync("xcrun", [
    "simctl", "get_app_container", deviceId, bundleId, containerType
  ]);
  return stdout.trim();
}

// Container types:
// "app"    → the .app bundle (read-only, contains the compiled app)
// "data"   → the data container (read-write, Documents/Library/tmp)
// "groups" → shared App Group containers
// "<group-id>" → specific app group container

// Direct filesystem access (iOS simulators only)
async function browseContainer(containerPath: string, relativePath: string = ".") {
  const fullPath = join(containerPath, relativePath);
  const entries = await readdir(fullPath, { withFileTypes: true });
  return Promise.all(entries.map(async (entry) => {
    const entryPath = join(fullPath, entry.name);
    const stats = await stat(entryPath);
    return {
      name: entry.name,
      path: join(relativePath, entry.name),
      isDirectory: entry.isDirectory(),
      size: stats.size,
      modified: stats.mtime.toISOString(),
    };
  }));
}
```

### Android File Access via ADB (Verified from adb help output)
```typescript
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const execFileAsync = promisify(execFile);

// List files in a debug app's private data directory
async function androidLs(deviceId: string, packageName: string, path: string) {
  try {
    const { stdout } = await execFileAsync("adb", [
      "-s", deviceId, "shell", "run-as", packageName, "ls", "-la", path
    ]);
    return parseAndroidLs(stdout);
  } catch (err) {
    if ((err as Error).message?.includes("not debuggable")) {
      throw new Error(`Package ${packageName} is not debuggable. Only debug builds can be inspected.`);
    }
    throw err;
  }
}

// Pull a file from a debug app
async function androidPull(deviceId: string, packageName: string, remotePath: string): Promise<Buffer> {
  const tmpDir = await mkdtemp(join(tmpdir(), "simvyn-pull-"));
  const localFile = join(tmpDir, "file");
  try {
    // Copy from private data to accessible location via run-as
    const tmpRemote = "/data/local/tmp/simvyn_transfer";
    await execFileAsync("adb", [
      "-s", deviceId, "shell", "run-as", packageName, "cp", remotePath, tmpRemote
    ]);
    // Pull from accessible location to host
    await execFileAsync("adb", ["-s", deviceId, "pull", tmpRemote, localFile]);
    // Clean up device temp file
    await execFileAsync("adb", ["-s", deviceId, "shell", "rm", tmpRemote]);
    return readFile(localFile);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

// Push a file to a debug app
async function androidPush(deviceId: string, packageName: string, localPath: string, remotePath: string) {
  const tmpRemote = "/data/local/tmp/simvyn_transfer";
  await execFileAsync("adb", ["-s", deviceId, "push", localPath, tmpRemote]);
  await execFileAsync("adb", [
    "-s", deviceId, "shell", "run-as", packageName, "cp", tmpRemote, remotePath
  ]);
  await execFileAsync("adb", ["-s", deviceId, "shell", "rm", tmpRemote]);
}
```

### NSUserDefaults Plist Reading (Verified on live simulator)
```typescript
// Plist files are in: <dataContainer>/Library/Preferences/<bundleId>.plist
// Format: binary plist (verified with `file` command)
// Conversion: plutil -convert json -r -o - <path>

import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

async function readPlistAsJson(plistPath: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const proc = spawn("plutil", ["-convert", "json", "-r", "-o", "-", plistPath]);
    let out = "";
    let err = "";
    proc.stdout.on("data", (d: Buffer) => { out += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { err += d.toString(); });
    proc.on("close", (code) => {
      if (code === 0) {
        try { resolve(JSON.parse(out)); }
        catch { reject(new Error(`Invalid JSON from plutil: ${out.slice(0, 200)}`)); }
      } else {
        reject(new Error(`plutil exit ${code}: ${err}`));
      }
    });
  });
}

async function listPrefsFiles(dataContainer: string): Promise<string[]> {
  const prefsDir = join(dataContainer, "Library", "Preferences");
  try {
    const files = await readdir(prefsDir);
    return files.filter(f => f.endsWith(".plist"));
  } catch {
    return [];
  }
}
```

### SharedPreferences XML Parsing
```typescript
// SharedPreferences XML format (well-defined, simple):
// <?xml version='1.0' encoding='utf-8' standalone='yes' ?>
// <map>
//   <string name="user_name">John</string>
//   <int name="age" value="30" />
//   <boolean name="premium" value="true" />
//   <float name="rating" value="4.5" />
//   <long name="timestamp" value="1234567890" />
//   <set name="tags"><string>a</string><string>b</string></set>
// </map>

function parseSharedPrefsXml(xml: string): Array<{ key: string; value: unknown; type: string }> {
  const entries: Array<{ key: string; value: unknown; type: string }> = [];

  // Match typed elements with name attribute
  const stringRegex = /<string name="([^"]+)">([^<]*)<\/string>/g;
  const valueRegex = /<(int|boolean|float|long) name="([^"]+)" value="([^"]+)" \/>/g;

  let match: RegExpExecArray | null;
  while ((match = stringRegex.exec(xml)) !== null) {
    entries.push({ key: match[1], value: match[2], type: "string" });
  }
  while ((match = valueRegex.exec(xml)) !== null) {
    const [, type, key, val] = match;
    let parsed: unknown = val;
    if (type === "int" || type === "long") parsed = Number(val);
    else if (type === "float") parsed = parseFloat(val);
    else if (type === "boolean") parsed = val === "true";
    entries.push({ key, value: parsed, type });
  }
  return entries;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| sql.js (WASM, in-memory) | better-sqlite3 (native, file-based) | better-sqlite3 widely adopted ~2020+ | Can read WAL databases, synchronous API, much better performance |
| SQLite readonly impossible for WAL | WAL readonly supported since SQLite 3.22.0 (2018) | 2018 | Can safely read WAL databases if -shm/-wal files exist |
| `simctl get_app_container` manual | `simctl listapps` returns all container paths | Available in recent Xcode | Batch container resolution instead of per-app commands |

**Deprecated/outdated:**
- `sqlite3` npm package (async callbacks): Superseded by better-sqlite3 for most server-side use cases
- `adb backup` for extracting app data: Deprecated in Android 12+, use `adb shell run-as` instead

## Open Questions

1. **Android `run-as` + `cp` for database files with WAL**
   - What we know: `run-as` allows executing commands as the app user. `cp` can copy files.
   - What's unclear: When copying a WAL-mode SQLite database via `cp`, do we need to also copy the .wal and .shm files? On Android, these files may be in the same directory. If we only copy the .db file, we may miss uncommitted WAL data.
   - Recommendation: Copy all three files (.db, .db-wal, .db-shm) when they exist. For readonly access, this ensures we see the latest data. Test during implementation.

2. **Large database performance in better-sqlite3**
   - What we know: better-sqlite3 is synchronous and opens the file directly. Large databases should work fine with pagination.
   - What's unclear: For very large databases (>1GB), opening with readonly might be slow. The `timeout` option's interaction with readonly mode is unclear for iOS simulator databases.
   - Recommendation: Start with `{ readonly: true, timeout: 10000 }`. If performance issues arise, consider `db.backup()` to create a temp snapshot for heavy querying. Test with real app databases during implementation.

3. **Android emulator vs physical device file access**
   - What we know: Both use `adb`. Emulators and USB devices share the same adb interface.
   - What's unclear: Whether `/data/local/tmp/` is always writable and available as a transfer staging area on all Android versions.
   - Recommendation: Use `/data/local/tmp/` as the staging path. Fall back to `/sdcard/` if it fails. This is what most Android development tools do.

## Sources

### Primary (HIGH confidence)
- better-sqlite3 API docs (raw GitHub, verified Feb 2026) — full API including readonly, timeout, columns(), backup()
- SQLite WAL documentation (sqlite.org/wal.html, updated 2025-05-31) — WAL concurrency model, readonly database support, SQLITE_BUSY scenarios
- `xcrun simctl help get_app_container` — verified container types (app, data, groups, specific group ID)
- `adb help` output — verified push/pull syntax with compression options
- Live iOS simulator verification — confirmed: data containers are host filesystem paths, plist files are binary format, plutil conversion works, SQLite databases use WAL mode

### Secondary (MEDIUM confidence)
- Android `run-as` behavior — based on established Android development patterns and adb documentation. The debug-only limitation is well-known and documented.
- SharedPreferences XML format — based on Android source code. The format has been stable since Android 1.0.

### Tertiary (LOW confidence)
- `/data/local/tmp/` availability across Android versions — based on common practice but not formally documented. Needs validation during implementation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — better-sqlite3 is the clear winner, verified via docs and WAL compatibility analysis. sql.js fundamentally broken for WAL databases.
- Architecture: HIGH — module structure follows established patterns in the codebase. Platform-specific adapters match existing ios.ts/android.ts pattern.
- File system access: HIGH for iOS (verified on live simulator), MEDIUM for Android (based on adb docs and established patterns, no live device to test).
- Database inspection: HIGH — better-sqlite3 API verified, WAL behavior documented by SQLite official docs.
- Pitfalls: HIGH — WAL locking, run-as limitations, and container path staleness are well-documented issues.

**Research date:** 2026-02-26
**Valid until:** 2026-03-26 (30 days — stable domain, platform tools change slowly)
