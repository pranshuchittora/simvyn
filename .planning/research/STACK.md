# Stack Research

**Domain:** Local-first developer tool (web dashboard + CLI + Node.js server)
**Researched:** 2026-02-26
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| TypeScript | ^5.9.3 | Language | Full-stack type safety across monorepo. Shared types for WebSocket protocol, device models, module interfaces. No alternative worth considering. |
| Node.js | >=22.12.0 | Runtime | Required by Vite 7. Native ESM, `node:test` available but Vitest better. Node 22 is current LTS (Oct 2025). |
| React | ^19.2.4 | UI framework | Proven for sim-location. React 19 has use() hook for async data, Actions for server mutations, improved Suspense. Matches existing team experience. |
| Vite | ^7.3.1 | Frontend build + dev server | Instant HMR, native ESM. Vite 7 drops Node 18 support (requires ^20.19.0 or >=22.12.0). Uses Rolldown internally now (Rust bundler replacing esbuild for production). sim-location already on Vite 7 — proven path. |
| Fastify | ^5.7.4 | HTTP server | 2-3x faster than Express. First-class TypeScript support with type providers. Plugin architecture maps 1:1 to Simvyn's module system. Schema-based validation with JSON Schema via built-in AJV. Encapsulation model isolates module routes/state. Pino logging built-in. |
| Tailwind CSS | ^4.2.1 | Styling | v4 is a complete rewrite: CSS-first config (no tailwind.config.js), Lightning CSS engine (10x faster), `@theme` directive. Perfect for glass-morphism with `backdrop-blur`, `bg-opacity`, custom properties. Scales to 16+ module UIs where hand-written CSS fails. |
| Zustand | ^5.0.11 | Client state management | Tiny (1.2kB), no boilerplate, dual access (React hooks + imperative getState()). Proven in sim-location for device state, playback state. v5 drops deprecated APIs, cleaner TypeScript. Vanilla store mode works without React for shared logic. |
| Zod | ^4.3.6 | Schema validation | TypeScript-first validation for WebSocket messages, CLI args, config files, module manifests. v4 is 2x faster than v3, new `z.mini` for bundle-sensitive code. Shared schemas = single source of truth for types. |

### Server & Communication

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| @fastify/websocket | ^11.2.0 | WebSocket integration | Wraps `ws` with Fastify route integration. Attach WS handlers to specific routes. Each module gets its own WS namespace. |
| ws | ^8.19.0 | WebSocket library | Transitive via @fastify/websocket. Fastest pure-JS WebSocket. sim-location already uses it. |
| Pino | ^10.3.1 | Structured logging | Built into Fastify. JSON output, child loggers per module. pino-pretty for dev. 5x faster than winston. |

### CLI

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Commander | ^14.0.3 | CLI framework | Mature, well-typed, subcommand support for module CLI registration. 14.x requires Node >=20. Simpler than yargs for declarative command definition. |
| picocolors | ^1.1.1 | Terminal colors | 3x smaller than chalk, no dependencies, same API surface needed. chalk v5 is ESM-only which complicates CJS interop in CLI tools. |
| ora | ^9.3.0 | Terminal spinners | For long-running CLI ops (boot simulator, install APK). ESM-only but CLI will be ESM anyway. |
| open | ^11.0.0 | Open browser | Auto-open dashboard URL on `simvyn` start. Cross-platform. |

### Frontend

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| @vitejs/plugin-react | ^5.1.4 | Vite React plugin | Babel-based Fast Refresh. Compatible with Vite 7. |
| @tailwindcss/vite | ^4.2.1 | Tailwind Vite plugin | Zero-config Tailwind v4 integration for Vite. Replaces postcss plugin approach from v3. |
| motion (framer-motion) | ^12.34.3 | Animation | Spring physics animations for Liquid Glass aesthetic. `motion` is the new package name (wraps framer-motion). Layout animations, AnimatePresence for mount/unmount, gesture support. |
| lucide-react | ^0.575.0 | Icons | Tree-shakeable SVG icons. 1500+ icons covering device, file, network, settings domains. Consistent stroke-based style fits glass UI. |
| clsx | ^2.1.1 | Class merging | Tiny (239B) conditional className utility. Works with Tailwind v4. |
| @xterm/xterm | ^6.0.0 | Terminal in browser | For device log streaming in dashboard. Handles ANSI colors, virtualized scrolling for 100k+ log lines. |

### Process Execution

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| tinyexec | ^1.0.2 | Shell command execution | Zero-dependency, tiny alternative to execa for spawning `simctl`/`adb`. Returns stdout/stderr as strings. For simple fire-and-get-output commands. |
| node:child_process (spawn) | built-in | Streaming process execution | Use raw `spawn` for long-running streams: `adb logcat`, `simctl io` screen recording. tinyexec doesn't handle streaming well. No extra dependency needed. |

### Data & Persistence

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| better-sqlite3 | ^12.6.2 | SQLite browsing | For the SQLite database browser module — reading app databases from simulator/device sandboxes. Synchronous API is fine for local tool. Native addon: use prebuild for distribution. |
| JSON files (node:fs) | built-in | Config/state persistence | ~/.simvyn/ stores module state, device preferences, favorites as JSON. No database dependency for tool's own state. Matches sim-location's proven approach. |
| nanoid | ^5.1.6 | Unique IDs | For session IDs, request correlation, device aliases. URL-safe, 118 bytes. |

### Development & Build

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| tsup | ^8.5.1 | Package building | Bundle server/CLI packages for npm publish. esbuild-powered, handles CJS/ESM dual output, .d.ts generation. |
| tsx | ^4.21.0 | TypeScript execution | Run TS files directly during dev (`tsx watch src/server.ts`). Used by Vite internally. |
| Vitest | ^4.0.18 | Testing | Vite-native test runner. Same config as app. Workspace support for monorepo. Fast watch mode. Jest-compatible API. |
| @biomejs/biome | ^2.4.4 | Lint + Format | Single tool replacing ESLint + Prettier. 20-100x faster (Rust). Opinionated defaults match project needs. Less config debt than eslint flat config migration. |
| npm workspaces | built-in | Monorepo | Native to npm, zero tooling overhead. Sufficient for 5-10 packages. Turborepo/nx overkill for this scale. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| chokidar | ^5.0.0 | File watching | Module auto-discovery, config hot-reload, watching app sandbox changes. v5 drops Node 18, pure ESM. |
| @tanstack/react-query | ^5.90.21 | Server state | Optional: if REST endpoints grow complex. Overkill initially — Zustand + WebSocket covers most state. Add when needed. |
| react-router (v7) | ^7.13.1 | Client routing | If dashboard grows beyond single-page. Module-based routes. Probably unnecessary — sidebar + content panel is simpler with Zustand tab state. |

## Installation

```bash
# Root package.json workspaces setup
# packages: ["packages/*"]

# Core server
npm install fastify @fastify/websocket @fastify/static @fastify/cors zod pino

# CLI
npm install commander picocolors ora open nanoid

# Process execution
npm install tinyexec

# Frontend (in packages/dashboard)
npm install react react-dom zustand motion lucide-react clsx @xterm/xterm

# SQLite browser module
npm install better-sqlite3

# Dev dependencies (root)
npm install -D typescript @biomejs/biome vitest tsup tsx @types/node

# Dev dependencies (dashboard)
npm install -D vite @vitejs/plugin-react @tailwindcss/vite tailwindcss @types/react @types/react-dom
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Fastify 5 | Express 5 | Never for this project. Express has no built-in validation, no encapsulation, slower. Express 5 finally stable but lacks Fastify's plugin model that maps to Simvyn's module architecture. |
| Fastify 5 | raw node:http | Only if dependency count is critical. sim-location proved it works but won't scale to 16+ modules with proper routing, validation, error handling. |
| Tailwind v4 | Hand-written CSS | Only for < 3 views. sim-location's 1200-line CSS shows this breaks down. Tailwind's utility classes + `@apply` handle glass-morphism just fine. |
| Zustand 5 | Jotai | If you prefer atomic state model. Both from same team (pmndrs). Zustand better for imperative access patterns needed by WebSocket handlers updating state outside React. |
| Zustand 5 | Redux Toolkit | Never. Massive boilerplate for a local tool's state needs. |
| Commander 14 | yargs | If you need very complex option parsing or interactive prompts. Commander is simpler for subcommand-per-module pattern. |
| tinyexec | execa 9 | If you need advanced piping, streaming transforms, or process groups. execa is 40+ dependencies. tinyexec is zero-dependency and sufficient for `simctl`/`adb` output capture. |
| tinyexec | node:child_process | For streaming outputs (logcat, screen recording). Use raw spawn for these. tinyexec for fire-and-forget commands. |
| Biome 2 | ESLint + Prettier | If you need very specific ESLint plugins (react-hooks, accessibility). Biome covers 95% of cases at 100x speed. Worth trying Biome first, fallback to ESLint if specific rule needed. |
| npm workspaces | pnpm workspaces | If install speed is critical. pnpm is faster but npm workspaces are simpler, more universally available, sufficient for this scale. |
| npm workspaces | Turborepo/nx | Only at 20+ packages. Adds complexity. npm workspaces + tsup covers build orchestration for 5-10 packages. |
| motion 12 | CSS animations | For simple transitions. motion adds ~35kB but spring physics and layout animations are central to Liquid Glass aesthetic. Worth the bundle. |
| Pino 10 | winston | Never. Pino is 5x faster and already integrated with Fastify. winston is bloated. |
| Vitest 4 | Jest | Never. Vitest uses same Vite config, faster, native ESM, workspace support. Jest requires separate config and babel transforms. |
| better-sqlite3 | sql.js (wasm) | If you need pure JS (no native compilation). better-sqlite3 is 10x faster and Simvyn is a local tool — native addon is fine. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Express | No encapsulation model, no schema validation, no TypeScript-first design, slower | Fastify 5 |
| chalk (v5+) | ESM-only, heavier than needed, 3 dependencies | picocolors (zero-dep, 3x smaller) |
| webpack | Slow, complex config, Vite is the standard for new React projects | Vite 7 |
| Electron | Massive overhead for a web dashboard. Simvyn is a web UI served by Node.js, not a desktop app | Fastify + Vite (serve static + WS) |
| Socket.io | Bloated (200kB client), unnecessary fallback transports for local tool. WebSocket is always available on localhost | ws via @fastify/websocket |
| Tailwind v3 | v4 is stable, v3 config model is deprecated direction, v4 is 10x faster builds | Tailwind v4 |
| class-variance-authority (cva) | Adds abstraction over Tailwind classes. Not needed — direct Tailwind + clsx is simpler for a tool UI | clsx + Tailwind directly |
| Redux / MobX | Overkill state management for a local developer tool | Zustand 5 |
| Nest.js | Full enterprise framework, massive overhead for a local tool's HTTP API | Fastify 5 (directly) |
| dotenv | Node 22+ has native --env-file flag. A local tool shouldn't need .env files anyway — it reads system state (simulators, adb). | node:process.env or --env-file flag |
| Mongoose / Prisma / Drizzle | No database to ORM into. Simvyn uses JSON files for its own state and reads SQLite databases from apps (read-only browsing). | better-sqlite3 (for app DB browsing), JSON files (for Simvyn state) |
| Next.js / Remix / Astro | SSR frameworks are for deployed web apps. Simvyn is a local tool serving a SPA. | Vite SPA + Fastify API server |

## Stack Patterns by Variant

**If macOS (full iOS + Android support):**
- All modules available
- simctl + adb process execution
- iOS-specific modules: Simulator lifecycle, push notifications via `simctl push`, location via `simctl location`

**If Linux/Windows (Android-only):**
- iOS modules gracefully degrade (hidden in UI, CLI subcommands print "macOS required")
- adb-only process execution
- Platform detection at module registration time, not runtime

**If distributing via npx (no local install):**
- tsup bundles server + CLI into minimal dist
- better-sqlite3 needs prebuild binaries — document in install instructions
- Dashboard built as static assets, served by @fastify/static

## Monorepo Structure

```
packages/
  shared/        # Types, Zod schemas, WebSocket protocol, device model
  server/        # Fastify server, module loader, WS hub
  cli/           # Commander CLI, module command registration
  dashboard/     # React + Vite SPA
  modules/       # Each feature module (location, logs, files, etc.)
```

**Why this split:**
- `shared` — single source of truth for TypeScript types and Zod schemas used by server, CLI, and dashboard
- `server` and `cli` are the two entry points (dashboard served as static by server)
- `dashboard` builds to static assets, copied into server's dist
- `modules` — each module is a folder exporting server routes, WS handlers, CLI commands, and dashboard UI components

**npm workspaces config (root package.json):**
```json
{
  "workspaces": ["packages/*", "packages/modules/*"]
}
```

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Vite 7.3.1 | Node ^20.19.0 or >=22.12.0 | Dropped Node 18 support. Uses Rolldown internally. |
| Vite 7.3.1 | @vitejs/plugin-react ^5.1.4 | v5 explicitly supports Vite 7. |
| Vite 7.3.1 | @tailwindcss/vite ^4.2.1 | Tailwind vite plugin supports Vite ^5, ^6, ^7. |
| Vitest 4.0.18 | Vite ^6.0.0 or ^7.0.0 | Vitest 4 supports both Vite 6 and 7. |
| React 19.2.4 | react-dom 19.2.4 | Must match exactly. |
| React 19.2.4 | Zustand ^5.0.11 | Zustand 5 supports React >=18. |
| React 19.2.4 | motion ^12.34.3 | motion supports React ^18 or ^19. |
| Fastify 5.7.4 | @fastify/websocket ^11.2.0 | v11 is for Fastify 5.x. |
| Fastify 5.7.4 | Node >=20 | Fastify 5 dropped Node 18. |
| TypeScript 5.9.3 | Zod ^4.3.6 | Zod 4 requires TS >=5.0. |
| tsup 8.5.1 | esbuild ^0.27.0 | tsup 8 uses esbuild 0.27. |
| Commander 14.0.3 | Node >=20 | Dropped Node 18. |
| better-sqlite3 12.6.2 | Node 20.x, 22.x, 23.x, 24.x, 25.x | Prebuild binaries for these versions. |
| chokidar 5.0.0 | Node >= 20.19.0 | v5 dropped Node 18. |

**Minimum Node.js version for this stack: 22.12.0** (dictated by Vite 7). Recommend Node 22 LTS.

## Sources

- npm registry (registry.npmjs.org) — all version numbers verified against latest published versions as of 2026-02-26 (HIGH confidence)
- Vite 7.3.1: engines `"node": "^20.19.0 || >=22.12.0"`, uses Rolldown (confirmed from package.json devDependencies)
- Fastify 5.7.4: dependencies include pino ^10.1.0, fast-json-stringify ^6, find-my-way ^9
- Tailwind 4.2.1: @tailwindcss/vite peer depends on `vite: "^5.2.0 || ^6 || ^7"`
- Vitest 4.0.18: peer depends on `vite: "^6.0.0 || ^7.0.0"`
- Zustand 5.0.11: peer depends on `react: ">=18.0.0"` (optional — also works without React)
- Zod 4.3.6: exports `./mini` for bundle-optimized usage
- motion 12.34.3: wrapper around framer-motion, peer depends on `react: "^18.0.0 || ^19.0.0"`
- @fastify/websocket 11.2.0: depends on `ws: "^8.16.0"`, `fastify-plugin: "^5.0.0"`
- Commander 14.0.3: engines `"node": ">=20"`
- better-sqlite3 12.6.2: engines `"node": "20.x || 22.x || 23.x || 24.x || 25.x"`
- @biomejs/biome 2.4.4: Rust-based, covers format + lint
- Existing reference: sim-location at /Users/pranshu/github/sim-location uses raw node:http, ws, React 19, Vite 7, Zustand (confirmed from PROJECT.md)

---
*Stack research for: Simvyn — universal mobile device devtool*
*Researched: 2026-02-26*
