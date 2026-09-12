# Changelog

All notable changes to simvyn are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Per-release notes with full commit lists are published on the
[GitHub Releases](https://github.com/pranshuchittora/simvyn/releases) page.

## [Unreleased]

### Fixed

- **Location** — `simvyn location set` on a physical Android device now prints a clear
  "not available on physical Android devices" message instead of an uncaught stack trace,
  and explains that location simulation relies on emulator-only `adb emu geo fix` ([#14](https://github.com/pranshuchittora/simvyn/issues/14))
- **Location** — devices can now be selected by the name shown in `simvyn device list`,
  not just by ID or ID prefix. Ambiguous matches are reported instead of silently
  picking the first one
- **Location** — `set`, `route`, and `clear` now surface adapter failures as readable
  errors and always shut the device manager down cleanly
- **Location (dashboard)** — setting a location from the map applied it to every booted
  device instead of the selected one, because the WebSocket handler only accepted a
  plural `deviceIds` payload while the dashboard sends a singular `deviceId`

### Added

- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `SECURITY.md`
- Issue forms and a pull request template
- MIT License file and README license section

### Changed

- Releases now publish to npm via [trusted publishing](https://docs.npmjs.com/trusted-publishers)
  with OIDC instead of a long-lived `NPM_TOKEN`

## [2.6.8] and earlier

See [GitHub Releases](https://github.com/pranshuchittora/simvyn/releases) for the
history of prior versions.

[unreleased]: https://github.com/pranshuchittora/simvyn/compare/v2.6.8...HEAD
[2.6.8]: https://github.com/pranshuchittora/simvyn/releases/tag/v2.6.8
