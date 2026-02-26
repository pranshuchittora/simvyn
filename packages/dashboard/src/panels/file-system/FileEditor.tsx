import { Save, X } from "lucide-react";
import { useState } from "react";
import { useFsStore } from "./stores/fs-store";

interface FileEditorProps {
	deviceId: string;
	bundleId: string;
}

export default function FileEditor({ deviceId, bundleId }: FileEditorProps) {
	const editingFile = useFsStore((s) => s.editingFile);
	const saveFile = useFsStore((s) => s.saveFile);
	const closeEditor = useFsStore((s) => s.closeEditor);
	const [content, setContent] = useState(editingFile?.content ?? "");

	if (!editingFile) return null;

	const hasChanges = content !== editingFile.original;

	const handleClose = () => {
		if (hasChanges && !window.confirm("You have unsaved changes. Close anyway?")) return;
		closeEditor();
	};

	const handleSave = () => {
		saveFile(deviceId, bundleId, editingFile.path, content);
	};

	return (
		<div className="flex flex-col gap-3">
			{/* Header */}
			<div className="flex items-center justify-between">
				<span className="text-xs text-text-secondary font-mono truncate max-w-[60%]">
					{editingFile.path}
				</span>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleSave}
						className="glass-button-primary flex items-center gap-1.5"
					>
						<Save size={14} />
						Save
					</button>
					<button
						type="button"
						onClick={handleClose}
						className="glass-button flex items-center gap-1.5"
					>
						<X size={14} />
						Close
					</button>
				</div>
			</div>

			{/* Editor */}
			<div className="glass-panel overflow-hidden">
				<textarea
					value={content}
					onChange={(e) => setContent(e.target.value)}
					spellCheck={false}
					className="glass-textarea h-[calc(100vh-240px)]"
				/>
			</div>
		</div>
	);
}
