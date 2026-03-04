import type { ChildProcess } from "node:child_process";
import type { Platform, PlatformAdapter } from "@simvyn/types";

interface ActiveRecording {
	process: ChildProcess;
	outputPath: string;
	deviceId: string;
	platform: Platform;
	startTime: number;
}

const recordings = new Map<string, ActiveRecording>();

export async function startRecording(
	deviceId: string,
	platform: Platform,
	adapter: PlatformAdapter,
	outputDir: string,
): Promise<{ outputPath: string }> {
	if (recordings.has(deviceId)) {
		throw new Error(`Already recording on device ${deviceId}`);
	}
	if (!adapter.startRecording) {
		throw new Error(`Recording not supported for ${platform}`);
	}

	const timestamp = Date.now();
	const safeName = deviceId.replace(/[^a-zA-Z0-9-]/g, "_");
	const outputPath = `${outputDir}/recording-${safeName}-${timestamp}.mp4`;

	const child = await adapter.startRecording(deviceId, outputPath);
	recordings.set(deviceId, {
		process: child,
		outputPath,
		deviceId,
		platform,
		startTime: timestamp,
	});

	return { outputPath };
}

export async function stopRecording(
	deviceId: string,
	adapter: PlatformAdapter,
): Promise<{ outputPath: string; duration: number }> {
	const rec = recordings.get(deviceId);
	if (!rec) {
		throw new Error(`No active recording for device ${deviceId}`);
	}
	if (!adapter.stopRecording) {
		throw new Error(`Stop recording not supported`);
	}

	try {
		await adapter.stopRecording(rec.process, rec.deviceId, rec.outputPath);
	} finally {
		recordings.delete(deviceId);
	}
	const duration = Math.round((Date.now() - rec.startTime) / 1000);

	return { outputPath: rec.outputPath, duration };
}

export function isRecording(deviceId: string): boolean {
	return recordings.has(deviceId);
}

export function getActiveRecordings(): string[] {
	return Array.from(recordings.keys());
}
