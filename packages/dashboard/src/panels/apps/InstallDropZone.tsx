import { useCallback, useEffect, useRef, useState } from "react";

const PACKAGE_ERROR = "Only .ipa, .apk, and iOS simulator .app bundles are accepted";
const APP_BUNDLE_PLATFORM_ERROR = ".app bundles can only be installed on iOS simulators";

interface InstallDropZoneProps {
	deviceId: string;
	devicePlatform: "ios" | "android";
	isPhysicalIos: boolean;
	onInstallComplete: () => void;
}

interface BundleUploadFile {
	file: File;
	relativePath: string;
}

function readDirectoryEntries(directory: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> {
	const reader = directory.createReader();
	const entries: FileSystemEntry[] = [];

	return new Promise((resolve, reject) => {
		const readBatch = () => {
			reader.readEntries((batch) => {
				if (batch.length === 0) {
					resolve(entries);
					return;
				}
				entries.push(...batch);
				readBatch();
			}, reject);
		};

		readBatch();
	});
}

function readFileEntry(entry: FileSystemFileEntry): Promise<File> {
	return new Promise((resolve, reject) => {
		entry.file(resolve, reject);
	});
}

async function collectBundleFiles(
	directory: FileSystemDirectoryEntry,
	prefix = "",
): Promise<BundleUploadFile[]> {
	const entries = await readDirectoryEntries(directory);
	const collected: BundleUploadFile[] = [];

	for (const entry of entries) {
		const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
		if (entry.isFile) {
			const file = await readFileEntry(entry as FileSystemFileEntry);
			collected.push({ file, relativePath });
		} else if (entry.isDirectory) {
			collected.push(
				...(await collectBundleFiles(entry as FileSystemDirectoryEntry, relativePath)),
			);
		}
	}

	return collected;
}

function extractBundleInputFiles(files: File[]): { bundleName: string; files: BundleUploadFile[] } {
	let bundleName = "";
	const bundleFiles: BundleUploadFile[] = [];

	for (const file of files) {
		const [rootName, ...rest] = file.webkitRelativePath.split("/");
		if (!rootName || rest.length === 0) {
			throw new Error(PACKAGE_ERROR);
		}
		if (!bundleName) {
			bundleName = rootName;
		}
		if (bundleName !== rootName) {
			throw new Error(PACKAGE_ERROR);
		}

		bundleFiles.push({ file, relativePath: rest.join("/") });
	}

	return { bundleName, files: bundleFiles };
}

function statusClassName(status: string) {
	return status.startsWith("Error") || status === "Network error during upload"
		? "text-red-400"
		: "text-green-400";
}

export default function InstallDropZone({
	deviceId,
	devicePlatform,
	isPhysicalIos,
	onInstallComplete,
}: InstallDropZoneProps) {
	const [dragOver, setDragOver] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [status, setStatus] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const bundleInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (bundleInputRef.current) {
			bundleInputRef.current.webkitdirectory = true;
			bundleInputRef.current.multiple = true;
		}
	}, []);

	const handleFile = useCallback(
		async (file: File) => {
			const ext = file.name.split(".").pop()?.toLowerCase();
			if (ext !== "ipa" && ext !== "apk") {
				setStatus(`Error: ${PACKAGE_ERROR}`);
				return;
			}

			setUploading(true);
			setStatus(`Installing ${file.name}...`);

			const formData = new FormData();
			formData.append("file", file);

			try {
				const res = await fetch(`/api/modules/apps/install/${deviceId}`, {
					method: "POST",
					body: formData,
				});
				if (!res.ok) {
					const data = await res.json().catch(() => ({ error: "Install failed" }));
					setStatus(`Error: ${data.error || "Install failed"}`);
				} else {
					setStatus(`Installed ${file.name}`);
					onInstallComplete();
				}
			} catch {
				setStatus("Network error during upload");
			} finally {
				setUploading(false);
			}
		},
		[deviceId, onInstallComplete],
	);

	const uploadAppBundle = useCallback(
		async (bundleName: string, files: BundleUploadFile[]) => {
			if (devicePlatform !== "ios" || isPhysicalIos) {
				setStatus(`Error: ${APP_BUNDLE_PLATFORM_ERROR}`);
				return;
			}
			if (!bundleName.endsWith(".app")) {
				setStatus("Error: Select a directory whose name ends with .app");
				return;
			}
			if (!files.some((file) => file.relativePath === "Info.plist")) {
				setStatus("Error: This .app bundle is missing Info.plist");
				return;
			}

			setUploading(true);
			setStatus(`Installing ${bundleName}...`);

			const formData = new FormData();
			const manifest = files.map((bundleFile, index) => {
				const field = `bundle-file-${index}`;
				formData.append(field, bundleFile.file);
				return { field, relativePath: bundleFile.relativePath };
			});

			formData.append("uploadType", "app-bundle");
			formData.append("bundleName", bundleName);
			formData.append("manifest", JSON.stringify(manifest));

			try {
				const res = await fetch(`/api/modules/apps/install/${deviceId}`, {
					method: "POST",
					body: formData,
				});
				if (!res.ok) {
					const data = await res.json().catch(() => ({ error: "Install failed" }));
					setStatus(`Error: ${data.error || "Install failed"}`);
				} else {
					setStatus(`Installed ${bundleName}`);
					onInstallComplete();
				}
			} catch {
				setStatus("Network error during upload");
			} finally {
				setUploading(false);
			}
		},
		[deviceId, devicePlatform, isPhysicalIos, onInstallComplete],
	);

	const handleDrop = useCallback(
		async (e: React.DragEvent) => {
			e.preventDefault();
			setDragOver(false);

			const entries = Array.from(e.dataTransfer.items)
				.map((item) => item.webkitGetAsEntry())
				.filter((entry): entry is FileSystemEntry => Boolean(entry));
			const appDirectories = entries.filter(
				(entry): entry is FileSystemDirectoryEntry =>
					entry.isDirectory && entry.name.endsWith(".app"),
			);

			if (appDirectories.length === 1) {
				try {
					const bundleFiles = await collectBundleFiles(appDirectories[0]);
					await uploadAppBundle(appDirectories[0].name, bundleFiles);
				} catch {
					setStatus(`Error: ${PACKAGE_ERROR}`);
				}
				return;
			}

			const file = Array.from(e.dataTransfer.files).find((candidate) => {
				const ext = candidate.name.split(".").pop()?.toLowerCase();
				return ext === "ipa" || ext === "apk";
			});
			if (file) {
				await handleFile(file);
				return;
			}

			setStatus(`Error: ${PACKAGE_ERROR}`);
		},
		[handleFile, uploadAppBundle],
	);

	function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (file) handleFile(file);
		e.target.value = "";
	}

	function handleBundleInput(e: React.ChangeEvent<HTMLInputElement>) {
		const files = Array.from(e.target.files ?? []);
		if (files.length > 0) {
			try {
				const bundle = extractBundleInputFiles(files);
				void uploadAppBundle(bundle.bundleName, bundle.files);
			} catch (err) {
				setStatus(`Error: ${(err as Error).message}`);
			}
		}
		e.target.value = "";
	}

	return (
		<div
			onDragOver={(e) => {
				e.preventDefault();
				setDragOver(true);
			}}
			onDragEnter={(e) => {
				e.preventDefault();
				setDragOver(true);
			}}
			onDragLeave={() => setDragOver(false)}
			onDrop={handleDrop}
			className={`glass-drop-zone p-4 ${dragOver ? "drag-over" : ""}`}
		>
			{uploading ? (
				<div className="flex items-center justify-center gap-2 text-sm text-text-secondary">
					<span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
					{status}
				</div>
			) : (
				<div className="space-y-3">
					<p className="text-sm text-text-secondary">
						Drop IPA, APK, or iOS .app bundle here to install
					</p>
					<div className="flex flex-wrap items-center justify-center gap-2">
						<button
							type="button"
							onClick={() => fileInputRef.current?.click()}
							className="glass-button-primary"
						>
							Browse IPA/APK File
						</button>
						<button
							type="button"
							onClick={() => bundleInputRef.current?.click()}
							className="glass-button"
						>
							Browse .app Bundle
						</button>
					</div>
					<input
						ref={fileInputRef}
						type="file"
						accept=".ipa,.apk"
						onChange={handleFileInput}
						className="hidden"
					/>
					<input ref={bundleInputRef} type="file" onChange={handleBundleInput} className="hidden" />
					{status && !uploading && (
						<p className={`text-xs mt-1 ${statusClassName(status)}`}>{status}</p>
					)}
				</div>
			)}
		</div>
	);
}
