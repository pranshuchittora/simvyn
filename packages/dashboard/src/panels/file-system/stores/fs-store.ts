import { toast } from "sonner";
import { create } from "zustand";

interface FileEntry {
	name: string;
	path: string;
	isDirectory: boolean;
	size: number;
	modified: string;
}

interface FsStore {
	entries: FileEntry[];
	currentPath: string;
	loading: boolean;
	editingFile: { path: string; content: string; original: string } | null;
	error: string | null;

	fetchEntries: (deviceId: string, bundleId: string, path?: string) => Promise<void>;
	downloadFile: (deviceId: string, bundleId: string, filePath: string) => void;
	uploadFile: (deviceId: string, bundleId: string, destPath: string, file: File) => Promise<void>;
	openFile: (deviceId: string, bundleId: string, filePath: string) => Promise<void>;
	saveFile: (
		deviceId: string,
		bundleId: string,
		filePath: string,
		content: string,
	) => Promise<void>;
	closeEditor: () => void;
}

export type { FileEntry };

const TEXT_EXTENSIONS = new Set([
	".txt",
	".json",
	".xml",
	".plist",
	".sql",
	".csv",
	".html",
	".css",
	".js",
	".ts",
	".md",
	".log",
	".cfg",
	".ini",
	".yaml",
	".yml",
]);

function isTextFile(name: string) {
	const dot = name.lastIndexOf(".");
	if (dot === -1) return false;
	return TEXT_EXTENSIONS.has(name.slice(dot).toLowerCase());
}

export { isTextFile };

export const useFsStore = create<FsStore>((set, get) => ({
	entries: [],
	currentPath: ".",
	loading: false,
	editingFile: null,
	error: null,

	fetchEntries: async (deviceId, bundleId, path = ".") => {
		set({ loading: true, error: null });
		try {
			const res = await fetch(
				`/api/modules/fs/ls/${deviceId}/${bundleId}?path=${encodeURIComponent(path)}`,
			);
			if (!res.ok) {
				const data = await res.json().catch(() => null);
				set({
					error: data?.error || data?.message || `Server error (${res.status})`,
					loading: false,
				});
				return;
			}
			const data = await res.json();
			set({ entries: data.entries, currentPath: path, loading: false });
		} catch (err) {
			set({ error: err instanceof Error ? err.message : "Network error", loading: false });
		}
	},

	downloadFile: (deviceId, bundleId, filePath) => {
		const url = `/api/modules/fs/pull/${deviceId}/${bundleId}?path=${encodeURIComponent(filePath)}`;
		const a = document.createElement("a");
		a.href = url;
		a.download = filePath.split("/").pop() || "file";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	},

	uploadFile: async (deviceId, bundleId, destPath, file) => {
		try {
			const form = new FormData();
			form.append("file", file);
			const res = await fetch(
				`/api/modules/fs/push/${deviceId}/${bundleId}?path=${encodeURIComponent(destPath + "/" + file.name)}`,
				{
					method: "POST",
					body: form,
				},
			);
			if (!res.ok) {
				const data = await res.json().catch(() => ({ error: "Upload failed" }));
				toast.error(data.error || "Upload failed");
				return;
			}
			toast.success(`Uploaded ${file.name}`);
			get().fetchEntries(deviceId, bundleId, get().currentPath);
		} catch {
			toast.error("Upload failed");
		}
	},

	openFile: async (deviceId, bundleId, filePath) => {
		try {
			const res = await fetch(
				`/api/modules/fs/read/${deviceId}/${bundleId}?path=${encodeURIComponent(filePath)}`,
			);
			if (!res.ok) {
				const data = await res.json().catch(() => ({ error: "Cannot read file" }));
				toast.error(data.error || "Cannot read file");
				return;
			}
			const data = await res.json();
			let content = data.content;
			if (filePath.endsWith(".json")) {
				try {
					content = JSON.stringify(JSON.parse(content), null, 2);
				} catch {
					/* keep as-is */
				}
			}
			set({ editingFile: { path: filePath, content, original: content } });
		} catch {
			toast.error("Failed to open file");
		}
	},

	saveFile: async (deviceId, bundleId, filePath, content) => {
		try {
			const res = await fetch(`/api/modules/fs/write/${deviceId}/${bundleId}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ path: filePath, content }),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({ error: "Save failed" }));
				toast.error(data.error || "Save failed");
				return;
			}
			toast.success("File saved");
			set({ editingFile: null });
		} catch {
			toast.error("Save failed");
		}
	},

	closeEditor: () => set({ editingFile: null }),
}));
