# Security Policy

## Supported Versions

simvyn follows semantic versioning and ships fixes on the latest minor release. Only the most recent published version receives security updates.

| Version | Supported |
| ------- | --------- |
| 2.6.x   | Yes       |
| < 2.6   | No        |

Always upgrade to the latest release before reporting an issue:

```bash
npm install -g simvyn@latest
```

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues, discussions, or pull requests.**

Report them privately through GitHub Security Advisories:

**[Report a vulnerability →](https://github.com/pranshuchittora/simvyn/security/advisories/new)**

This creates a private advisory visible only to you and the maintainers.

### What to include

The more of this you can provide, the faster we can confirm and fix the issue:

- Type of issue (command injection, path traversal, arbitrary file write, etc.)
- Affected version and the full paths of the source files involved
- Step-by-step instructions to reproduce
- Proof-of-concept, if you have one
- Impact — what an attacker can achieve

### What to expect

- **Acknowledgement** within 72 hours
- **Initial assessment** within 7 days, including whether we consider it in scope
- **Fix and disclosure** coordinated with you; we will credit you in the advisory and release notes unless you prefer otherwise

Please give us a reasonable window to ship a fix before any public disclosure.

## Threat Model

simvyn is a **local developer tool**. By design it:

- Binds a Fastify server to localhost and opens a dashboard in your browser
- Shells out to `xcrun simctl`, `xcrun devicectl`, and `adb`
- Reads and writes files inside app sandboxes on connected devices
- Stores module data under your user profile directory

It is **not** designed to be exposed to untrusted networks. Running simvyn on a
publicly reachable interface gives anyone who can reach it the ability to run
device commands and read device files. Please don't do that, and don't report
"the server has no authentication" as a vulnerability — it is expected for a
localhost-only tool.

Findings we are very interested in:

- Command injection through device names, bundle IDs, file paths, or other user-supplied input that reaches a shell
- Path traversal in the file browser or media/app upload handlers that escapes the intended directory
- Anything that lets a malicious web page in your browser reach the local server and act on your devices (CSRF / DNS rebinding)
- Vulnerabilities in the published npm tarball or the release pipeline

## Supply Chain

Releases are published to npm via [trusted publishing](https://docs.npmjs.com/trusted-publishers) from a GitHub Actions workflow, with no long-lived npm tokens. Every published version carries a [provenance attestation](https://docs.npmjs.com/generating-provenance-statements) linking the tarball back to the exact commit and workflow run that built it.

You can verify a published version with:

```bash
npm audit signatures
```
