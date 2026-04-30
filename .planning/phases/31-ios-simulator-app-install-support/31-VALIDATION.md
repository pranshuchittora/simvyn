---
phase: 31
slug: ios-simulator-app-install-support
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-01
---

# Phase 31 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js `node:test` with `tsx` loader |
| **Config file** | none |
| **Quick run command** | `node --import tsx --test packages/modules/app-management/upload-utils.test.ts packages/core/src/__tests__/ios-adapter.test.ts` |
| **Full suite command** | `npm run typecheck && npm run build -w @simvyn/dashboard && npm run lint` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --import tsx --test packages/modules/app-management/upload-utils.test.ts packages/core/src/__tests__/ios-adapter.test.ts`
- **After every plan wave:** Run `npm run typecheck && npm run build -w @simvyn/dashboard && npm run lint`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 31-01-01 | 01 | 1 | APP-BUNDLE-UPLOAD | T-31-01 | Bundle paths cannot escape temp app dir | unit | `node --import tsx --test packages/modules/app-management/upload-utils.test.ts` | W0 | pending |
| 31-01-02 | 01 | 1 | APP-BUNDLE-UPLOAD | T-31-02 | Server rejects non-iOS/non-simulator bundle uploads | static/typecheck | `npm run typecheck` | existing | pending |
| 31-02-01 | 02 | 2 | APP-BUNDLE-UI | T-31-03 | UI accepts IPA/APK files and iOS `.app` directories only | build | `npm run build -w @simvyn/dashboard` | existing | pending |
| 31-02-02 | 02 | 2 | APP-BUNDLE-DOCS | N/A | Docs mention IPA, APK, and iOS simulator `.app` bundles | grep | `rg "iOS simulator .*\\.app|IPA, APK" README.md packages/cli/README.md packages/dashboard/src/components/HomeScreen.tsx` | existing | pending |

---

## Wave 0 Requirements

- [ ] `packages/modules/app-management/upload-utils.test.ts` - unit coverage for path sanitization, manifest validation, missing files, and missing `Info.plist`
- [ ] `packages/modules/app-management/upload-utils.ts` - testable helper surface for bundle reconstruction validation

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Installing a real `.app` simulator build from the dashboard | APP-BUNDLE-UAT | Requires a booted iOS simulator and a valid simulator build directory | Start dashboard, select a booted iOS simulator, browse/drop `MyApp.app`, confirm success status and refreshed app list |
| Platform rejection messaging | APP-BUNDLE-UAT | Requires selecting different device types in the live dashboard | Try the same `.app` bundle on Android and physical iOS; confirm clear rejection message |

---

## Validation Sign-Off

- [x] All planned tasks have automated verify commands or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all missing test references
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

