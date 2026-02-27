import type { ComponentType } from "react";

interface IconProps {
	size?: number;
	className?: string;
}

function DevicesIcon({ size = 24, className }: IconProps) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
			<rect
				x="2"
				y="3"
				width="13"
				height="10"
				rx="2"
				stroke="#4A9EFF"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path d="M5 16h7" stroke="#4A9EFF" strokeWidth="1.5" strokeLinecap="round" />
			<rect
				x="17"
				y="6"
				width="5"
				height="10"
				rx="1.5"
				stroke="#4A9EFF"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				opacity="0.5"
			/>
			<circle cx="19.5" cy="14" r="0.5" fill="#4A9EFF" opacity="0.5" />
		</svg>
	);
}

function LocationIcon({ size = 24, className }: IconProps) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
			<path
				d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
				stroke="#FF6B6B"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<circle cx="12" cy="9" r="2.5" stroke="#FF6B6B" strokeWidth="1.5" opacity="0.5" />
		</svg>
	);
}

function AppsIcon({ size = 24, className }: IconProps) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
			<rect
				x="3"
				y="3"
				width="7.5"
				height="7.5"
				rx="2"
				stroke="#4ADE80"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<rect
				x="13.5"
				y="3"
				width="7.5"
				height="7.5"
				rx="2"
				stroke="#4ADE80"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				opacity="0.5"
			/>
			<rect
				x="3"
				y="13.5"
				width="7.5"
				height="7.5"
				rx="2"
				stroke="#4ADE80"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				opacity="0.5"
			/>
			<rect
				x="13.5"
				y="13.5"
				width="7.5"
				height="7.5"
				rx="2"
				stroke="#4ADE80"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

function LogsIcon({ size = 24, className }: IconProps) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
			<path d="M4 6h16" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" />
			<path d="M4 10h12" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
			<path d="M4 14h14" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" />
			<path d="M4 18h8" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
		</svg>
	);
}

function ScreenshotIcon({ size = 24, className }: IconProps) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
			<path
				d="M3 7V5a2 2 0 012-2h2"
				stroke="#A78BFA"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M17 3h2a2 2 0 012 2v2"
				stroke="#A78BFA"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M21 17v2a2 2 0 01-2 2h-2"
				stroke="#A78BFA"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				opacity="0.5"
			/>
			<path
				d="M7 21H5a2 2 0 01-2-2v-2"
				stroke="#A78BFA"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				opacity="0.5"
			/>
			<circle cx="12" cy="12" r="3" stroke="#A78BFA" strokeWidth="1.5" />
		</svg>
	);
}

function DeepLinksIcon({ size = 24, className }: IconProps) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
			<path
				d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"
				stroke="#22D3EE"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"
				stroke="#22D3EE"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				opacity="0.5"
			/>
		</svg>
	);
}

function PushIcon({ size = 24, className }: IconProps) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
			<path
				d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"
				stroke="#F472B6"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M13.73 21a2 2 0 01-3.46 0"
				stroke="#F472B6"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				opacity="0.5"
			/>
			<circle cx="18" cy="4" r="3" fill="#F472B6" opacity="0.4" />
		</svg>
	);
}

function FsIcon({ size = 24, className }: IconProps) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
			<path
				d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"
				stroke="#2DD4BF"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path d="M9 14h6" stroke="#2DD4BF" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
		</svg>
	);
}

function DatabaseIcon({ size = 24, className }: IconProps) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
			<ellipse cx="12" cy="5" rx="8" ry="3" stroke="#818CF8" strokeWidth="1.5" />
			<path
				d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5"
				stroke="#818CF8"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3"
				stroke="#818CF8"
				strokeWidth="1.5"
				opacity="0.4"
			/>
		</svg>
	);
}

function SettingsIcon({ size = 24, className }: IconProps) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
			<circle cx="12" cy="12" r="3" stroke="#94A3B8" strokeWidth="1.5" />
			<path
				d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 010 4h-.09c-.658.003-1.25.396-1.51 1z"
				stroke="#94A3B8"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				opacity="0.4"
			/>
		</svg>
	);
}

function CrashLogsIcon({ size = 24, className }: IconProps) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
			<path
				d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
				stroke="#F87171"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path d="M12 9v4" stroke="#F87171" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
			<circle cx="12" cy="17" r="0.5" fill="#F87171" />
		</svg>
	);
}

function MediaIcon({ size = 24, className }: IconProps) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
			<rect
				x="3"
				y="3"
				width="18"
				height="18"
				rx="2"
				stroke="#34D399"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M3 16l5-5 4 4 3-3 6 6"
				stroke="#34D399"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				opacity="0.5"
			/>
			<circle cx="8.5" cy="8.5" r="1.5" fill="#34D399" opacity="0.4" />
		</svg>
	);
}

function ClipboardIcon({ size = 24, className }: IconProps) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
			<path
				d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"
				stroke="#38BDF8"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<rect
				x="8"
				y="2"
				width="8"
				height="4"
				rx="1"
				stroke="#38BDF8"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M9 14l2 2 4-4"
				stroke="#38BDF8"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				opacity="0.5"
			/>
		</svg>
	);
}

function ToolSettingsIcon({ size = 24, className }: IconProps) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
			<path
				d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"
				stroke="#F59E0B"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

function DevUtilsIcon({ size = 24, className }: IconProps) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
			<path
				d="M15.7 5.3L18.7 2.3a1 1 0 011.4 0l1.6 1.6a1 1 0 010 1.4l-3 3"
				stroke="#F97316"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M15.7 5.3l-7.3 7.3a2 2 0 00-.5.8l-1.2 3.8a.5.5 0 00.6.6l3.8-1.2a2 2 0 00.8-.5l7.3-7.3"
				stroke="#F97316"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				opacity="0.5"
			/>
			<path d="M4 20h16" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
		</svg>
	);
}

export type { IconProps };

export const moduleIconMap: Record<string, ComponentType<IconProps>> = {
	devices: DevicesIcon,
	location: LocationIcon,
	apps: AppsIcon,
	logs: LogsIcon,
	screenshot: ScreenshotIcon,
	"deep-links": DeepLinksIcon,
	push: PushIcon,
	fs: FsIcon,
	database: DatabaseIcon,
	settings: SettingsIcon,
	"crash-logs": CrashLogsIcon,
	media: MediaIcon,
	clipboard: ClipboardIcon,
	"tool-settings": ToolSettingsIcon,
	"dev-utils": DevUtilsIcon,
};

export const moduleLabelMap: Record<string, string> = {
	devices: "Devices",
	location: "Location",
	apps: "Apps",
	logs: "Logs",
	screenshot: "Screenshots",
	"deep-links": "Deep Links",
	push: "Push",
	fs: "Files",
	database: "Database",
	settings: "Settings",
	"crash-logs": "Crashes",
	media: "Media",
	clipboard: "Clipboard",
	"tool-settings": "Tool Settings",
	"dev-utils": "Dev Utils",
};
