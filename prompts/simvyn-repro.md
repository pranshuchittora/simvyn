---
description: Reproduce a mobile app bug with simvyn and collect evidence
argument-hint: "<bundle-id> [what goes wrong]"
---

Reproduce this issue on a simulator, emulator, or connected device with simvyn, then report the evidence.

App: $1
Issue: ${@:2}

1. List devices and choose the booted device that matches the app. If the choice is unclear or nothing suitable is booted, ask me before booting or switching devices.
2. Confirm the app is installed with `app info`, then launch it.
3. Capture logs with simvyn_logs while the issue reproduces, filtering by the app's process name when you know it. Drive Android with `input` commands. The CLI cannot tap on iOS, so tell me which steps to perform before you start a capture long enough for me to do them.
4. Take a screenshot with simvyn_screenshot and look at the result.
5. Report the device, app version, steps, expected and actual behavior, relevant log lines, and artifact paths. Say what you could not verify.

Do not uninstall the app, clear its data, or change device settings unless I ask.
