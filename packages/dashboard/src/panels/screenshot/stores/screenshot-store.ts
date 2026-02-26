import { toast } from "sonner";
import { create } from "zustand";

interface CaptureEntry {
	type: "screenshot" | "recording";
	filename: string;
	timestamp: string;
	deviceId: string;
	deviceName: string;
	duration?: number;
}

interface ScreenshotStore {
	captures: CaptureEntry[];
	isRecording: Record<string, boolean>;
	loading: boolean;
	captureScreenshot: (deviceId: string) => Promise<void>;
	startRecording: (deviceId: string) => Promise<void>;
	stopRecording: (deviceId: string) => Promise<void>;
	fetchHistory: () => Promise<void>;
	downloadFile: (filename: string) => void;
	copyToClipboard: (filename: string) => Promise<void>;
}

export type { CaptureEntry };

export const useScreenshotStore = create<ScreenshotStore>((set, get) => ({
	captures: [],
	isRecording: {},
	loading: false,

	captureScreenshot: async (deviceId) => {
		try {
			const res = await fetch(`/api/modules/screenshot/capture/${deviceId}`, { method: "POST" });
			if (!res.ok) {
				const data = await res.json().catch(() => ({ error: "Capture failed" }));
				toast.error(data.error || "Capture failed");
				return;
			}
			const data = await res.json();
			toast.success("Screenshot captured");
			set((s) => ({
				captures: [
					{
						type: "screenshot",
						filename: data.filename,
						timestamp: new Date().toISOString(),
						deviceId,
						deviceName: data.deviceName ?? deviceId,
					},
					...s.captures,
				],
			}));
		} catch {
			toast.error("Network error capturing screenshot");
		}
	},

	startRecording: async (deviceId) => {
		try {
			const res = await fetch(`/api/modules/screenshot/record/start/${deviceId}`, {
				method: "POST",
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({ error: "Failed to start recording" }));
				toast.error(data.error || "Failed to start recording");
				return;
			}
			set((s) => ({ isRecording: { ...s.isRecording, [deviceId]: true } }));
			toast.success("Recording started");
		} catch {
			toast.error("Network error starting recording");
		}
	},

	stopRecording: async (deviceId) => {
		try {
			const res = await fetch(`/api/modules/screenshot/record/stop/${deviceId}`, {
				method: "POST",
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({ error: "Failed to stop recording" }));
				toast.error(data.error || "Failed to stop recording");
				return;
			}
			const data = await res.json();
			set((s) => ({
				isRecording: { ...s.isRecording, [deviceId]: false },
				captures: [
					{
						type: "recording",
						filename: data.filename,
						timestamp: new Date().toISOString(),
						deviceId,
						deviceName: data.deviceName ?? deviceId,
						duration: data.duration,
					},
					...s.captures,
				],
			}));
			toast.success("Recording saved");
		} catch {
			toast.error("Network error stopping recording");
		}
	},

	fetchHistory: async () => {
		set({ loading: true });
		try {
			const res = await fetch("/api/modules/screenshot/history");
			if (!res.ok) {
				set({ loading: false });
				return;
			}
			const data = await res.json();
			set({ captures: data.entries ?? [], loading: false });
		} catch {
			set({ loading: false });
		}
	},

	downloadFile: (filename) => {
		window.open(`/api/modules/screenshot/download/${filename}`, "_blank");
	},

	copyToClipboard: async (filename) => {
		try {
			const res = await fetch(`/api/modules/screenshot/download/${filename}`);
			if (!res.ok) {
				toast.error("Failed to fetch image for clipboard");
				return;
			}
			const blob = await res.blob();
			await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
			toast.success("Copied to clipboard");
		} catch {
			toast.error("Failed to copy to clipboard");
		}
	},
}));
