import { useState } from "react";
import { toast } from "sonner";

interface Capabilities {
	contentSize: boolean;
	increaseContrast: boolean;
	talkBack: boolean;
}

interface Props {
	deviceId: string;
	capabilities: Capabilities;
}

const CONTENT_SIZES = [
	"extra-small",
	"small",
	"medium",
	"large",
	"extra-large",
	"extra-extra-large",
	"extra-extra-extra-large",
	"accessibility-medium",
	"accessibility-large",
	"accessibility-extra-large",
	"accessibility-extra-extra-large",
	"accessibility-extra-extra-extra-large",
] as const;

export default function AccessibilitySection({ deviceId, capabilities }: Props) {
	const [contentSize, setContentSize] = useState("medium");
	const [contrastEnabled, setContrastEnabled] = useState(false);
	const [talkBackEnabled, setTalkBackEnabled] = useState(false);

	const applyContentSize = async (size: string) => {
		setContentSize(size);
		try {
			const res = await fetch("/api/modules/device-settings/content-size", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ deviceId, size }),
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Failed to set content size");
			}
			toast.success(`Content size set to ${size}`);
		} catch (err) {
			toast.error((err as Error).message);
		}
	};

	const toggleContrast = async (enabled: boolean) => {
		setContrastEnabled(enabled);
		try {
			const res = await fetch("/api/modules/device-settings/increase-contrast", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ deviceId, enabled }),
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Failed to toggle contrast");
			}
			toast.success(enabled ? "Increased contrast enabled" : "Increased contrast disabled");
		} catch (err) {
			toast.error((err as Error).message);
		}
	};

	const toggleTalkBack = async (enabled: boolean) => {
		setTalkBackEnabled(enabled);
		try {
			const res = await fetch("/api/modules/device-settings/talkback", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ deviceId, enabled }),
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Failed to toggle TalkBack");
			}
			toast.success(enabled ? "TalkBack enabled" : "TalkBack disabled");
		} catch (err) {
			toast.error((err as Error).message);
		}
	};

	const applyPreset = (name: string) => {
		switch (name) {
			case "large-text":
				applyContentSize("extra-large");
				break;
			case "extra-large":
				applyContentSize("accessibility-large");
				break;
			case "high-contrast":
				toggleContrast(true);
				break;
			case "default":
				applyContentSize("medium");
				toggleContrast(false);
				break;
		}
	};

	const showIosPresets = capabilities.contentSize || capabilities.increaseContrast;

	return (
		<div className="rounded-xl bg-bg-surface/10 border-b border-border p-4 space-y-3">
			<h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide">
				Accessibility
			</h2>

			{/* Quick Presets */}
			{showIosPresets && (
				<div className="space-y-1.5">
					<p className="text-[10px] text-text-muted">Quick Presets</p>
					<div className="flex flex-wrap gap-1.5">
						{capabilities.contentSize && (
							<>
								<button
									type="button"
									onClick={() => applyPreset("large-text")}
									className={`glass-button ${contentSize === "extra-large" ? "bg-accent-blue/20 text-accent-blue border-accent-blue/30" : ""}`}
								>
									Large Text
								</button>
								<button
									type="button"
									onClick={() => applyPreset("extra-large")}
									className={`glass-button ${contentSize === "accessibility-large" ? "bg-accent-blue/20 text-accent-blue border-accent-blue/30" : ""}`}
								>
									Extra Large
								</button>
							</>
						)}
						{capabilities.increaseContrast && (
							<button
								type="button"
								onClick={() => applyPreset("high-contrast")}
								className={`glass-button ${contrastEnabled ? "bg-accent-blue/20 text-accent-blue border-accent-blue/30" : ""}`}
							>
								High Contrast
							</button>
						)}
						<button
							type="button"
							onClick={() => applyPreset("default")}
							className={`glass-button ${contentSize === "medium" && !contrastEnabled ? "bg-accent-blue/20 text-accent-blue border-accent-blue/30" : ""}`}
						>
							Default
						</button>
					</div>
				</div>
			)}

			<div className="space-y-3">
				{/* Content Size (iOS) */}
				{capabilities.contentSize && (
					<div className="space-y-1">
						<p className="text-[10px] text-text-muted">Content Size</p>
						<select
							value={contentSize}
							onChange={(e) => applyContentSize(e.target.value)}
							className="glass-select w-full"
						>
							{CONTENT_SIZES.map((s) => (
								<option key={s} value={s}>
									{s}
								</option>
							))}
						</select>
					</div>
				)}

				{/* Increase Contrast (iOS) */}
				{capabilities.increaseContrast && (
					<div className="flex items-center justify-between gap-3">
						<p className="text-xs text-text-secondary">Increase Contrast</p>
						<button
							type="button"
							onClick={() => toggleContrast(!contrastEnabled)}
							className={`glass-button ${
								contrastEnabled ? "bg-accent-blue/20 text-accent-blue border-accent-blue/30" : ""
							}`}
						>
							{contrastEnabled ? "On" : "Off"}
						</button>
					</div>
				)}

				{/* TalkBack (Android) */}
				{capabilities.talkBack && (
					<div className="flex items-center justify-between gap-3">
						<p className="text-xs text-text-secondary">TalkBack</p>
						<button
							type="button"
							onClick={() => toggleTalkBack(!talkBackEnabled)}
							className={`glass-button ${
								talkBackEnabled ? "bg-accent-blue/20 text-accent-blue border-accent-blue/30" : ""
							}`}
						>
							{talkBackEnabled ? "On" : "Off"}
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
