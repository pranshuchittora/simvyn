export interface PushTemplate {
	id: string;
	name: string;
	description: string;
	payload: Record<string, unknown>;
}

export const pushTemplates: PushTemplate[] = [
	{
		id: "basic",
		name: "Basic Alert",
		description: "Simple alert with title and body",
		payload: {
			aps: {
				alert: { title: "Title", body: "Body" },
			},
		},
	},
	{
		id: "badge",
		name: "Badge Update",
		description: "Update app badge number",
		payload: {
			aps: { badge: 1 },
		},
	},
	{
		id: "sound",
		name: "Alert with Sound",
		description: "Alert notification with default sound",
		payload: {
			aps: {
				alert: { title: "Title", body: "Body" },
				sound: "default",
			},
		},
	},
	{
		id: "silent",
		name: "Silent Push",
		description: "Content-available silent notification for background fetch",
		payload: {
			aps: { "content-available": 1 },
		},
	},
	{
		id: "rich",
		name: "Rich Notification",
		description: "Notification with subtitle, category, and custom data",
		payload: {
			aps: {
				alert: { title: "Title", subtitle: "Subtitle", body: "Body" },
				category: "MESSAGE",
				"mutable-content": 1,
			},
			customKey: "customValue",
		},
	},
	{
		id: "action",
		name: "Action Buttons",
		description: "Notification with action category for interactive buttons",
		payload: {
			aps: {
				alert: { title: "Title", body: "Body" },
				category: "ACTION_CATEGORY",
			},
		},
	},
];
