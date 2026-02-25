import type { PlatformCapability } from "./device.js";

export interface SimvynModule {
	name: string;
	version: string;
	description: string;
	icon?: string;
	register: (fastify: any, opts: any) => Promise<void>;
	cli?: (program: any) => void;
	capabilities?: PlatformCapability[];
}
