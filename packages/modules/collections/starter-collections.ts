import type { Collection } from "@simvyn/types";

const FIXED_DATE = "2026-01-01T00:00:00.000Z";

export const STARTER_IDS = new Set([
	"a0000000-0000-4000-8000-000000000001",
	"a0000000-0000-4000-8000-000000000002",
	"a0000000-0000-4000-8000-000000000003",
]);

export function getStarterCollections(): Collection[] {
	return [
		{
			id: "a0000000-0000-4000-8000-000000000001",
			name: "Dark Mode + Japanese Locale",
			description: "Common testing setup for i18n dark mode screenshots",
			steps: [
				{
					id: "b0000000-0000-4000-8000-000000000001",
					actionId: "set-appearance",
					params: { mode: "dark" },
				},
				{
					id: "b0000000-0000-4000-8000-000000000002",
					actionId: "set-locale",
					params: { locale: "ja_JP" },
				},
				{
					id: "b0000000-0000-4000-8000-000000000008",
					actionId: "restart-device",
					params: {},
				},
			],
			schemaVersion: 1,
			createdAt: FIXED_DATE,
			updatedAt: FIXED_DATE,
		},
		{
			id: "a0000000-0000-4000-8000-000000000002",
			name: "Screenshot Setup",
			description: "Prepare device for clean App Store screenshots",
			steps: [
				{
					id: "b0000000-0000-4000-8000-000000000003",
					actionId: "set-status-bar",
					params: {
						overrides:
							'{"time":"9:41","batteryState":"charged","batteryLevel":"100","cellularMode":"active","cellularBars":"4","wifiBars":"3"}',
					},
				},
				{
					id: "b0000000-0000-4000-8000-000000000004",
					actionId: "set-appearance",
					params: { mode: "light" },
				},
			],
			schemaVersion: 1,
			createdAt: FIXED_DATE,
			updatedAt: FIXED_DATE,
		},
		{
			id: "a0000000-0000-4000-8000-000000000003",
			name: "Reset Device State",
			description: "Quick cleanup after testing",
			steps: [
				{
					id: "b0000000-0000-4000-8000-000000000005",
					actionId: "set-appearance",
					params: { mode: "light" },
				},
				{
					id: "b0000000-0000-4000-8000-000000000006",
					actionId: "clear-status-bar",
					params: {},
				},
				{
					id: "b0000000-0000-4000-8000-000000000007",
					actionId: "clear-location",
					params: {},
				},
				{
					id: "b0000000-0000-4000-8000-000000000009",
					actionId: "restart-device",
					params: {},
				},
			],
			schemaVersion: 1,
			createdAt: FIXED_DATE,
			updatedAt: FIXED_DATE,
		},
	];
}
