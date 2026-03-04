import type { ComponentType } from "react";

interface IconProps {
	size?: number;
	className?: string;
}

function DevicesIcon({ size = 24, className }: IconProps) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
			<defs>
				<linearGradient id="devGrad" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#4A9EFF" stopOpacity="0.4" />
					<stop offset="100%" stopColor="#4A9EFF" stopOpacity="0.12" />
				</linearGradient>
				<linearGradient id="devHi" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
					<stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
				</linearGradient>
			</defs>
			<rect
				x="2"
				y="3"
				width="13"
				height="10"
				rx="2"
				fill="url(#devGrad)"
				stroke="#4A9EFF"
				strokeWidth="1"
				strokeOpacity="0.6"
			/>
			<rect x="2.5" y="3.5" width="12" height="5" rx="1.5" fill="url(#devHi)" />
			<path
				d="M5 16h7"
				stroke="#4A9EFF"
				strokeWidth="1"
				strokeLinecap="round"
				strokeOpacity="0.5"
			/>
			<rect
				x="17"
				y="6"
				width="5"
				height="10"
				rx="1.5"
				fill="url(#devGrad)"
				stroke="#4A9EFF"
				strokeWidth="1"
				strokeOpacity="0.35"
			/>
			<rect x="17.5" y="6.5" width="4" height="4" rx="1" fill="url(#devHi)" />
			<circle cx="19.5" cy="14" r="0.5" fill="#4A9EFF" opacity="0.5" />
		</svg>
	);
}

function LocationIcon({ size = 24, className }: IconProps) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
			<defs>
				<linearGradient id="locGrad" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#FF6B6B" stopOpacity="0.4" />
					<stop offset="100%" stopColor="#FF6B6B" stopOpacity="0.12" />
				</linearGradient>
				<linearGradient id="locHi" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
					<stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
				</linearGradient>
			</defs>
			<path
				d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
				fill="url(#locGrad)"
				stroke="#FF6B6B"
				strokeWidth="1"
				strokeOpacity="0.6"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M12 2.5C8.42 2.5 5.5 5.38 5.5 9c0 1.5.7 3.5 1.8 5.5"
				fill="none"
				stroke="#ffffff"
				strokeWidth="1"
				strokeOpacity="0.15"
				strokeLinecap="round"
			/>
			<circle
				cx="12"
				cy="9"
				r="2.5"
				fill="url(#locGrad)"
				stroke="#FF6B6B"
				strokeWidth="1"
				strokeOpacity="0.5"
			/>
		</svg>
	);
}

function AppsIcon({ size = 24, className }: IconProps) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
			<defs>
				<linearGradient id="appGrad" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#4ADE80" stopOpacity="0.4" />
					<stop offset="100%" stopColor="#4ADE80" stopOpacity="0.12" />
				</linearGradient>
				<linearGradient id="appHi" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
					<stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
				</linearGradient>
			</defs>
			<rect
				x="3"
				y="3"
				width="7.5"
				height="7.5"
				rx="2"
				fill="url(#appGrad)"
				stroke="#4ADE80"
				strokeWidth="1"
				strokeOpacity="0.6"
			/>
			<rect x="3.5" y="3.5" width="6.5" height="3.5" rx="1.5" fill="url(#appHi)" />
			<rect
				x="13.5"
				y="3"
				width="7.5"
				height="7.5"
				rx="2"
				fill="url(#appGrad)"
				stroke="#4ADE80"
				strokeWidth="1"
				strokeOpacity="0.35"
			/>
			<rect x="14" y="3.5" width="6.5" height="3.5" rx="1.5" fill="url(#appHi)" />
			<rect
				x="3"
				y="13.5"
				width="7.5"
				height="7.5"
				rx="2"
				fill="url(#appGrad)"
				stroke="#4ADE80"
				strokeWidth="1"
				strokeOpacity="0.35"
			/>
			<rect x="3.5" y="14" width="6.5" height="3.5" rx="1.5" fill="url(#appHi)" />
			<rect
				x="13.5"
				y="13.5"
				width="7.5"
				height="7.5"
				rx="2"
				fill="url(#appGrad)"
				stroke="#4ADE80"
				strokeWidth="1"
				strokeOpacity="0.6"
			/>
			<rect x="14" y="14" width="6.5" height="3.5" rx="1.5" fill="url(#appHi)" />
		</svg>
	);
}

function LogsIcon({ size = 24, className }: IconProps) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
			<defs>
				<linearGradient id="logGrad" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#FBBF24" stopOpacity="0.4" />
					<stop offset="100%" stopColor="#FBBF24" stopOpacity="0.12" />
				</linearGradient>
				<linearGradient id="logHi" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#ffffff" stopOpacity="0.2" />
					<stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
				</linearGradient>
			</defs>
			<rect
				x="3"
				y="3"
				width="18"
				height="18"
				rx="3"
				fill="url(#logGrad)"
				stroke="#FBBF24"
				strokeWidth="1"
				strokeOpacity="0.5"
			/>
			<rect x="3.5" y="3.5" width="17" height="8" rx="2.5" fill="url(#logHi)" />
			<path
				d="M7 8h10"
				stroke="#FBBF24"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeOpacity="0.8"
			/>
			<path
				d="M7 12h7"
				stroke="#FBBF24"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeOpacity="0.5"
			/>
			<path
				d="M7 16h9"
				stroke="#FBBF24"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeOpacity="0.35"
			/>
		</svg>
	);
}

function ScreenshotIcon({ size = 24, className }: IconProps) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
			<defs>
				<linearGradient id="ssGrad" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#A78BFA" stopOpacity="0.4" />
					<stop offset="100%" stopColor="#A78BFA" stopOpacity="0.12" />
				</linearGradient>
				<linearGradient id="ssHi" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
					<stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
				</linearGradient>
			</defs>
			<rect
				x="3"
				y="3"
				width="18"
				height="18"
				rx="3"
				fill="url(#ssGrad)"
				stroke="#A78BFA"
				strokeWidth="1"
				strokeOpacity="0.5"
			/>
			<rect x="3.5" y="3.5" width="17" height="8" rx="2.5" fill="url(#ssHi)" />
			<path
				d="M3 7V5a2 2 0 012-2h2"
				stroke="#A78BFA"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeOpacity="0.8"
			/>
			<path
				d="M17 3h2a2 2 0 012 2v2"
				stroke="#A78BFA"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeOpacity="0.8"
			/>
			<path
				d="M21 17v2a2 2 0 01-2 2h-2"
				stroke="#A78BFA"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeOpacity="0.5"
			/>
			<path
				d="M7 21H5a2 2 0 01-2-2v-2"
				stroke="#A78BFA"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeOpacity="0.5"
			/>
			<circle
				cx="12"
				cy="12"
				r="3"
				fill="url(#ssGrad)"
				stroke="#A78BFA"
				strokeWidth="1"
				strokeOpacity="0.7"
			/>
		</svg>
	);
}

function DeepLinksIcon({ size = 24, className }: IconProps) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
			<defs>
				<linearGradient id="dlGrad" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#22D3EE" stopOpacity="0.4" />
					<stop offset="100%" stopColor="#22D3EE" stopOpacity="0.12" />
				</linearGradient>
				<linearGradient id="dlHi" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#ffffff" stopOpacity="0.2" />
					<stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
				</linearGradient>
			</defs>
			<path
				d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"
				fill="url(#dlGrad)"
				stroke="#22D3EE"
				strokeWidth="1"
				strokeOpacity="0.7"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"
				fill="url(#dlGrad)"
				stroke="#22D3EE"
				strokeWidth="1"
				strokeOpacity="0.45"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

function PushIcon({ size = 24, className }: IconProps) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
			<defs>
				<linearGradient id="pushGrad" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#F472B6" stopOpacity="0.4" />
					<stop offset="100%" stopColor="#F472B6" stopOpacity="0.12" />
				</linearGradient>
				<linearGradient id="pushHi" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
					<stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
				</linearGradient>
			</defs>
			<path
				d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"
				fill="url(#pushGrad)"
				stroke="#F472B6"
				strokeWidth="1"
				strokeOpacity="0.6"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M6.5 8.5A5.5 5.5 0 0112 3c.8 0 1.6.17 2.3.5"
				fill="none"
				stroke="#ffffff"
				strokeWidth="0.8"
				strokeOpacity="0.15"
				strokeLinecap="round"
			/>
			<path
				d="M13.73 21a2 2 0 01-3.46 0"
				stroke="#F472B6"
				strokeWidth="1"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeOpacity="0.5"
			/>
			<circle cx="18" cy="4" r="3" fill="#F472B6" opacity="0.5" />
			<circle cx="18" cy="4" r="1.5" fill="url(#pushHi)" />
		</svg>
	);
}

function FsIcon({ size = 24, className }: IconProps) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
			<defs>
				<linearGradient id="fsGrad" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.4" />
					<stop offset="100%" stopColor="#2DD4BF" stopOpacity="0.12" />
				</linearGradient>
				<linearGradient id="fsHi" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
					<stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
				</linearGradient>
			</defs>
			<path
				d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"
				fill="url(#fsGrad)"
				stroke="#2DD4BF"
				strokeWidth="1"
				strokeOpacity="0.6"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M2.5 6l8.5 0 1.5-2.5"
				fill="none"
				stroke="#ffffff"
				strokeWidth="0.8"
				strokeOpacity="0.15"
				strokeLinecap="round"
			/>
			<path
				d="M9 14h6"
				stroke="#2DD4BF"
				strokeWidth="1"
				strokeLinecap="round"
				strokeOpacity="0.4"
			/>
		</svg>
	);
}

function DatabaseIcon({ size = 24, className }: IconProps) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
			<defs>
				<linearGradient id="dbGrad" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#818CF8" stopOpacity="0.4" />
					<stop offset="100%" stopColor="#818CF8" stopOpacity="0.12" />
				</linearGradient>
				<linearGradient id="dbHi" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
					<stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
				</linearGradient>
			</defs>
			<ellipse
				cx="12"
				cy="5"
				rx="8"
				ry="3"
				fill="url(#dbGrad)"
				stroke="#818CF8"
				strokeWidth="1"
				strokeOpacity="0.6"
			/>
			<ellipse cx="12" cy="5" rx="7" ry="1.8" fill="url(#dbHi)" />
			<path
				d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5"
				fill="url(#dbGrad)"
				stroke="#818CF8"
				strokeWidth="1"
				strokeOpacity="0.6"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3"
				stroke="#818CF8"
				strokeWidth="1"
				strokeOpacity="0.35"
			/>
		</svg>
	);
}

function DeviceSettingsIcon({ size = 24, className }: IconProps) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
			<defs>
				<linearGradient id="setGrad" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#94A3B8" stopOpacity="0.35" />
					<stop offset="100%" stopColor="#94A3B8" stopOpacity="0.1" />
				</linearGradient>
				<linearGradient id="setHi" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#ffffff" stopOpacity="0.2" />
					<stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
				</linearGradient>
			</defs>
			<path
				d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 010 4h-.09c-.658.003-1.25.396-1.51 1z"
				fill="url(#setGrad)"
				stroke="#94A3B8"
				strokeWidth="1"
				strokeOpacity="0.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<circle
				cx="12"
				cy="12"
				r="3"
				fill="url(#setGrad)"
				stroke="#94A3B8"
				strokeWidth="1"
				strokeOpacity="0.7"
			/>
			<circle cx="12" cy="12" r="2" fill="url(#setHi)" />
		</svg>
	);
}

function CrashLogsIcon({ size = 24, className }: IconProps) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
			<defs>
				<linearGradient id="crashGrad" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#F87171" stopOpacity="0.4" />
					<stop offset="100%" stopColor="#F87171" stopOpacity="0.12" />
				</linearGradient>
				<linearGradient id="crashHi" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
					<stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
				</linearGradient>
			</defs>
			<path
				d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
				fill="url(#crashGrad)"
				stroke="#F87171"
				strokeWidth="1"
				strokeOpacity="0.6"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M10.8 4.5l-7.5 13"
				fill="none"
				stroke="#ffffff"
				strokeWidth="0.8"
				strokeOpacity="0.15"
				strokeLinecap="round"
			/>
			<path
				d="M12 9v4"
				stroke="#F87171"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeOpacity="0.7"
			/>
			<circle cx="12" cy="17" r="0.8" fill="#F87171" opacity="0.7" />
		</svg>
	);
}

function MediaIcon({ size = 24, className }: IconProps) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
			<defs>
				<linearGradient id="mediaGrad" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#34D399" stopOpacity="0.4" />
					<stop offset="100%" stopColor="#34D399" stopOpacity="0.12" />
				</linearGradient>
				<linearGradient id="mediaHi" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
					<stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
				</linearGradient>
			</defs>
			<rect
				x="3"
				y="3"
				width="18"
				height="18"
				rx="2"
				fill="url(#mediaGrad)"
				stroke="#34D399"
				strokeWidth="1"
				strokeOpacity="0.6"
			/>
			<rect x="3.5" y="3.5" width="17" height="8" rx="1.5" fill="url(#mediaHi)" />
			<path
				d="M3 16l5-5 4 4 3-3 6 6"
				stroke="#34D399"
				strokeWidth="1"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeOpacity="0.5"
			/>
			<circle cx="8.5" cy="8.5" r="1.5" fill="#34D399" opacity="0.5" />
		</svg>
	);
}

function ClipboardIcon({ size = 24, className }: IconProps) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
			<defs>
				<linearGradient id="clipGrad" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#38BDF8" stopOpacity="0.4" />
					<stop offset="100%" stopColor="#38BDF8" stopOpacity="0.12" />
				</linearGradient>
				<linearGradient id="clipHi" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
					<stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
				</linearGradient>
			</defs>
			<path
				d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"
				fill="url(#clipGrad)"
				stroke="#38BDF8"
				strokeWidth="1"
				strokeOpacity="0.6"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<rect x="4.5" y="4.5" width="15" height="8" rx="1.5" fill="url(#clipHi)" />
			<rect
				x="8"
				y="2"
				width="8"
				height="4"
				rx="1"
				fill="url(#clipGrad)"
				stroke="#38BDF8"
				strokeWidth="1"
				strokeOpacity="0.7"
			/>
			<rect x="8.5" y="2.5" width="7" height="2" rx="0.5" fill="url(#clipHi)" />
			<path
				d="M9 14l2 2 4-4"
				stroke="#38BDF8"
				strokeWidth="1"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeOpacity="0.5"
			/>
		</svg>
	);
}

function CollectionsIcon({ size = 24, className }: IconProps) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
			<defs>
				<linearGradient id="colGrad" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#E879F9" stopOpacity="0.4" />
					<stop offset="100%" stopColor="#E879F9" stopOpacity="0.12" />
				</linearGradient>
				<linearGradient id="colHi" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
					<stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
				</linearGradient>
			</defs>
			<rect
				x="4"
				y="2"
				width="16"
				height="12"
				rx="2.5"
				fill="url(#colGrad)"
				stroke="#E879F9"
				strokeWidth="1"
				strokeOpacity="0.6"
			/>
			<rect x="4.5" y="2.5" width="15" height="5.5" rx="2" fill="url(#colHi)" />
			<rect
				x="6"
				y="6"
				width="16"
				height="12"
				rx="2.5"
				fill="url(#colGrad)"
				stroke="#E879F9"
				strokeWidth="1"
				strokeOpacity="0.45"
			/>
			<rect
				x="3"
				y="10"
				width="16"
				height="12"
				rx="2.5"
				fill="url(#colGrad)"
				stroke="#E879F9"
				strokeWidth="1"
				strokeOpacity="0.35"
			/>
			<path
				d="M7 16h8"
				stroke="#E879F9"
				strokeWidth="1"
				strokeLinecap="round"
				strokeOpacity="0.5"
			/>
			<path
				d="M7 19h5"
				stroke="#E879F9"
				strokeWidth="1"
				strokeLinecap="round"
				strokeOpacity="0.3"
			/>
		</svg>
	);
}

function ToolSettingsIcon({ size = 24, className }: IconProps) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
			<defs>
				<linearGradient id="toolGrad" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#F59E0B" stopOpacity="0.4" />
					<stop offset="100%" stopColor="#F59E0B" stopOpacity="0.12" />
				</linearGradient>
				<linearGradient id="toolHi" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#ffffff" stopOpacity="0.2" />
					<stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
				</linearGradient>
			</defs>
			<path
				d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"
				fill="url(#toolGrad)"
				stroke="#F59E0B"
				strokeWidth="1"
				strokeOpacity="0.6"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M15 5.5l3-3c.5.3 1.2.8 1.8 1.6"
				fill="none"
				stroke="#ffffff"
				strokeWidth="0.8"
				strokeOpacity="0.15"
				strokeLinecap="round"
			/>
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
	"device-settings": DeviceSettingsIcon,
	"crash-logs": CrashLogsIcon,
	collections: CollectionsIcon,
	media: MediaIcon,
	clipboard: ClipboardIcon,
	"tool-settings": ToolSettingsIcon,
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
	"device-settings": "Device Settings",
	"crash-logs": "Crashes",
	collections: "Collections",
	media: "Media",
	clipboard: "Clipboard",
	"tool-settings": "Tool Settings",
};
