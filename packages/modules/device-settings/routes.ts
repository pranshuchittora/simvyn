import { isPhysicalDevice } from "@simvyn/core";
import type {} from "@simvyn/server";
import type { Device } from "@simvyn/types";
import type { FastifyInstance } from "fastify";

export async function settingsRoutes(fastify: FastifyInstance) {
	fastify.post<{ Body: { deviceId: string; mode: "light" | "dark" } }>(
		"/appearance",
		async (req, reply) => {
			const { deviceId, mode } = req.body;
			const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
			if (!device) return reply.status(404).send({ error: "Device not found" });
			if (device.state !== "booted")
				return reply.status(400).send({ error: "Device must be booted" });

			const adapter = fastify.deviceManager.getAdapter(device.platform);
			if (!adapter?.setAppearance)
				return reply.status(400).send({ error: "Appearance not supported for this platform" });

			try {
				await adapter.setAppearance(device.id, mode);
				return { success: true };
			} catch (err) {
				return reply.status(500).send({ error: (err as Error).message });
			}
		},
	);

	fastify.post<{ Body: { deviceId: string; overrides: Record<string, string> } }>(
		"/status-bar",
		async (req, reply) => {
			const { deviceId, overrides } = req.body;
			const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
			if (!device) return reply.status(404).send({ error: "Device not found" });
			if (device.state !== "booted")
				return reply.status(400).send({ error: "Device must be booted" });

			const adapter = fastify.deviceManager.getAdapter(device.platform);
			if (!adapter?.setStatusBar)
				return reply
					.status(400)
					.send({ error: "Status bar override not supported for this platform" });

			try {
				await adapter.setStatusBar(device.id, overrides);
				return { success: true };
			} catch (err) {
				return reply.status(500).send({ error: (err as Error).message });
			}
		},
	);

	fastify.post<{ Body: { deviceId: string } }>("/status-bar/clear", async (req, reply) => {
		const { deviceId } = req.body;
		const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
		if (!device) return reply.status(404).send({ error: "Device not found" });
		if (device.state !== "booted")
			return reply.status(400).send({ error: "Device must be booted" });

		const adapter = fastify.deviceManager.getAdapter(device.platform);
		if (!adapter?.clearStatusBar)
			return reply.status(400).send({ error: "Status bar clear not supported for this platform" });

		try {
			await adapter.clearStatusBar(device.id);
			return { success: true };
		} catch (err) {
			return reply.status(500).send({ error: (err as Error).message });
		}
	});

	fastify.post<{ Body: { deviceId: string; bundleId: string; permission: string } }>(
		"/permission/grant",
		async (req, reply) => {
			const { deviceId, bundleId, permission } = req.body;
			const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
			if (!device) return reply.status(404).send({ error: "Device not found" });
			if (device.state !== "booted")
				return reply.status(400).send({ error: "Device must be booted" });

			const adapter = fastify.deviceManager.getAdapter(device.platform);
			if (!adapter?.grantPermission)
				return reply
					.status(400)
					.send({ error: "Grant permission not supported for this platform" });

			try {
				await adapter.grantPermission(device.id, bundleId, permission);
				return { success: true };
			} catch (err) {
				return reply.status(500).send({ error: (err as Error).message });
			}
		},
	);

	fastify.post<{ Body: { deviceId: string; bundleId: string; permission: string } }>(
		"/permission/revoke",
		async (req, reply) => {
			const { deviceId, bundleId, permission } = req.body;
			const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
			if (!device) return reply.status(404).send({ error: "Device not found" });
			if (device.state !== "booted")
				return reply.status(400).send({ error: "Device must be booted" });

			const adapter = fastify.deviceManager.getAdapter(device.platform);
			if (!adapter?.revokePermission)
				return reply
					.status(400)
					.send({ error: "Revoke permission not supported for this platform" });

			try {
				await adapter.revokePermission(device.id, bundleId, permission);
				return { success: true };
			} catch (err) {
				return reply.status(500).send({ error: (err as Error).message });
			}
		},
	);

	fastify.post<{ Body: { deviceId: string; bundleId: string } }>(
		"/permission/reset",
		async (req, reply) => {
			const { deviceId, bundleId } = req.body;
			const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
			if (!device) return reply.status(404).send({ error: "Device not found" });
			if (device.state !== "booted")
				return reply.status(400).send({ error: "Device must be booted" });

			const adapter = fastify.deviceManager.getAdapter(device.platform);
			if (!adapter?.resetPermissions)
				return reply
					.status(400)
					.send({ error: "Reset permissions not supported for this platform" });

			try {
				await adapter.resetPermissions(device.id, bundleId);
				return { success: true };
			} catch (err) {
				return reply.status(500).send({ error: (err as Error).message });
			}
		},
	);

	fastify.post<{ Body: { deviceId: string; locale: string } }>("/locale", async (req, reply) => {
		const { deviceId, locale } = req.body;
		const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
		if (!device) return reply.status(404).send({ error: "Device not found" });
		if (device.state !== "booted")
			return reply.status(400).send({ error: "Device must be booted" });

		const adapter = fastify.deviceManager.getAdapter(device.platform);
		if (!adapter?.setLocale)
			return reply.status(400).send({ error: "Locale not supported for this platform" });

		try {
			await adapter.setLocale(device.id, locale);
			return { success: true };
		} catch (err) {
			return reply.status(500).send({ error: (err as Error).message });
		}
	});

	fastify.post<{ Body: { deviceId: string; size: string } }>(
		"/content-size",
		async (req, reply) => {
			const { deviceId, size } = req.body;
			const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
			if (!device) return reply.status(404).send({ error: "Device not found" });
			if (device.state !== "booted")
				return reply.status(400).send({ error: "Device must be booted" });

			const adapter = fastify.deviceManager.getAdapter(device.platform);
			if (!adapter?.setContentSize)
				return reply.status(400).send({ error: "Content size not supported for this platform" });

			try {
				await adapter.setContentSize(device.id, size);
				return { success: true };
			} catch (err) {
				return reply.status(500).send({ error: (err as Error).message });
			}
		},
	);

	fastify.post<{ Body: { deviceId: string; enabled: boolean } }>(
		"/increase-contrast",
		async (req, reply) => {
			const { deviceId, enabled } = req.body;
			const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
			if (!device) return reply.status(404).send({ error: "Device not found" });
			if (device.state !== "booted")
				return reply.status(400).send({ error: "Device must be booted" });

			const adapter = fastify.deviceManager.getAdapter(device.platform);
			if (!adapter?.setIncreaseContrast)
				return reply
					.status(400)
					.send({ error: "Increase contrast not supported for this platform" });

			try {
				await adapter.setIncreaseContrast(device.id, enabled);
				return { success: true };
			} catch (err) {
				return reply.status(500).send({ error: (err as Error).message });
			}
		},
	);

	fastify.post<{ Body: { deviceId: string; enabled: boolean } }>(
		"/talkback",
		async (req, reply) => {
			const { deviceId, enabled } = req.body;
			const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
			if (!device) return reply.status(404).send({ error: "Device not found" });
			if (device.state !== "booted")
				return reply.status(400).send({ error: "Device must be booted" });

			const adapter = fastify.deviceManager.getAdapter(device.platform);
			if (!adapter?.setTalkBack)
				return reply.status(400).send({ error: "TalkBack not supported for this platform" });

			try {
				await adapter.setTalkBack(device.id, enabled);
				return { success: true };
			} catch (err) {
				return reply.status(500).send({ error: (err as Error).message });
			}
		},
	);

	fastify.post<{ Body: { deviceId: string; orientation: string } }>(
		"/orientation",
		async (req, reply) => {
			const { deviceId, orientation } = req.body;
			const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
			if (!device) return reply.status(404).send({ error: "Device not found" });
			if (device.state !== "booted")
				return reply.status(400).send({ error: "Device must be booted" });

			const adapter = fastify.deviceManager.getAdapter(device.platform);
			if (!adapter?.setOrientation)
				return reply.status(400).send({ error: "Orientation not supported for this platform" });

			try {
				await adapter.setOrientation(device.id, orientation);
				return { success: true };
			} catch (err) {
				return reply.status(500).send({ error: (err as Error).message });
			}
		},
	);

	fastify.get<{ Querystring: { deviceId: string } }>("/capabilities", async (req, reply) => {
		const { deviceId } = req.query;
		const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
		if (!device) return reply.status(404).send({ error: "Device not found" });

		const adapter = fastify.deviceManager.getAdapter(device.platform);
		const isPhysical = device.deviceType === "Physical" || isPhysicalDevice(deviceId);
		const isIosPhysical = isPhysical && device.platform === "ios";

		return {
			appearance: !!adapter?.setAppearance && !isIosPhysical,
			statusBar: !!adapter?.setStatusBar && !isPhysical,
			permissions: !!adapter?.grantPermission && !isIosPhysical,
			resetPermissions: !!adapter?.resetPermissions && !isIosPhysical,
			locale: !!adapter?.setLocale && !isPhysical,
			contentSize: !!adapter?.setContentSize && !isIosPhysical,
			increaseContrast: !!adapter?.setIncreaseContrast && !isIosPhysical,
			talkBack: !!adapter?.setTalkBack,
			portForward: !!adapter?.addForward,
			displayOverride: !!adapter?.setDisplaySize,
			batterySimulation: !!adapter?.setBattery,
			inputInjection: !!adapter?.inputTap,
			bugReport: !!adapter?.collectBugReport,
			orientation: !!adapter?.setOrientation,
			fileSystem: !isIosPhysical,
			database: !isIosPhysical,
		};
	});
}
