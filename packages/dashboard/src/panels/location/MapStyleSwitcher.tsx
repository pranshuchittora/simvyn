import { useState } from "react";

export interface TileStyle {
	id: string;
	name: string;
	url: string;
	attribution: string;
	subdomains?: string;
	maxZoom?: number;
}

export const TILE_STYLES: TileStyle[] = [
	{
		id: "dark",
		name: "Dark",
		url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
		attribution:
			'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
		subdomains: "abcd",
		maxZoom: 20,
	},
	{
		id: "voyager",
		name: "Voyager",
		url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
		attribution:
			'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
		subdomains: "abcd",
		maxZoom: 20,
	},
	{
		id: "dark-contrast",
		name: "Contrast",
		url: "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
		attribution:
			'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
		subdomains: "abcd",
		maxZoom: 20,
	},
	{
		id: "light",
		name: "Light",
		url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
		attribution:
			'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
		subdomains: "abcd",
		maxZoom: 20,
	},
	{
		id: "esri-satellite",
		name: "Satellite",
		url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
		attribution: "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics",
		maxZoom: 19,
	},
	{
		id: "osm",
		name: "Street",
		url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
		attribution:
			'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
		maxZoom: 19,
	},
];

interface Props {
	currentStyleId: string;
	onStyleChange: (style: TileStyle) => void;
}

export function MapStyleSwitcher({ currentStyleId, onStyleChange }: Props) {
	const [open, setOpen] = useState(false);

	return (
		<div className="map-style-switcher">
			<button
				type="button"
				className="glass-button map-style-toggle"
				onClick={() => setOpen(!open)}
				title="Map style"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<title>Map style</title>
					<polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
					<line x1="8" y1="2" x2="8" y2="18" />
					<line x1="16" y1="6" x2="16" y2="22" />
				</svg>
			</button>
			{open && (
				<div className="map-style-menu glass-panel">
					{TILE_STYLES.map((style) => (
						<button
							key={style.id}
							type="button"
							className={`map-style-option ${style.id === currentStyleId ? "active" : ""}`}
							onClick={() => {
								onStyleChange(style);
								setOpen(false);
							}}
						>
							{style.name}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
