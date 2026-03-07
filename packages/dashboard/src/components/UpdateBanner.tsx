import { X } from "lucide-react";
import { useEffect, useState } from "react";

interface UpdateInfo {
	current: string;
	latest: string;
	needsUpdate: boolean;
}

export default function UpdateBanner() {
	const [info, setInfo] = useState<UpdateInfo | null>(null);
	const [dismissed, setDismissed] = useState(false);

	useEffect(() => {
		if (sessionStorage.getItem("simvyn-update-dismissed")) return;

		fetch("/api/update-check")
			.then((res) => res.json())
			.then((data: UpdateInfo) => {
				if (data.needsUpdate) setInfo(data);
			})
			.catch(() => {});
	}, []);

	if (!info || dismissed) return null;

	return (
		<div
			style={{
				background: "rgba(40, 40, 55, 0.50)",
				backdropFilter: "blur(20px) saturate(1.4)",
				WebkitBackdropFilter: "blur(20px) saturate(1.4)",
				border: "1px solid rgba(255, 255, 255, 0.08)",
				borderRadius: "12px",
			}}
			className="flex items-center justify-between px-4 py-2 mx-4 mt-2 text-sm"
		>
			<span>
				Update available: <span className="text-green-400">{info.current}</span>
				<span className="text-text-muted"> → </span>
				<span className="text-green-400">{info.latest}</span>
			</span>
			<div className="flex items-center gap-3">
				<code className="text-text-muted text-xs bg-white/5 px-1.5 py-0.5 rounded">
					simvyn upgrade
				</code>
				<a
					href={`https://github.com/pranshuchittora/simvyn/releases/tag/v${info.latest}`}
					target="_blank"
					rel="noopener noreferrer"
					className="text-blue-400 hover:text-blue-300 underline"
				>
					View release →
				</a>
				<button
					type="button"
					onClick={() => {
						setDismissed(true);
						sessionStorage.setItem("simvyn-update-dismissed", "true");
					}}
					className="text-text-muted hover:text-text-primary"
				>
					<X size={14} />
				</button>
			</div>
		</div>
	);
}
