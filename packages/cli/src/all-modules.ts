import type { SimvynModule } from "@simvyn/types";

import appManagement from "../../modules/app-management/manifest.js";
import clipboard from "../../modules/clipboard/manifest.js";
import collections from "../../modules/collections/manifest.js";
import crashLogs from "../../modules/crash-logs/manifest.js";
import database from "../../modules/database/manifest.js";
import deepLinks from "../../modules/deep-links/manifest.js";
import deviceManagement from "../../modules/device-management/manifest.js";
import deviceSettings from "../../modules/device-settings/manifest.js";
import fileSystem from "../../modules/file-system/manifest.js";
import location from "../../modules/location/manifest.js";
import logViewer from "../../modules/log-viewer/manifest.js";
import media from "../../modules/media/manifest.js";
import push from "../../modules/push/manifest.js";
import screenshot from "../../modules/screenshot/manifest.js";

export const allModules: SimvynModule[] = [
	deviceManagement,
	location,
	appManagement,
	logViewer,
	screenshot,
	deepLinks,
	push,
	fileSystem,
	database,
	deviceSettings,
	crashLogs,
	media,
	clipboard,
	collections,
];
