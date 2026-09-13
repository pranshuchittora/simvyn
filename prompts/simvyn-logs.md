---
description: Capture device logs with simvyn and summarize problems
argument-hint: "[process-or-regex] [seconds]"
---

Capture logs from the booted simulator, emulator, or device with simvyn_logs and summarize them. If several devices are booted, ask me which one to use.

Filter: $1
Seconds: $2

Use the filter as a process or message regex when given. Capture at level warning unless I ask for more detail, for 15 seconds when no duration is given. Group repeated messages, highlight errors and crashes with their timestamps and processes, and include the full capture path.
