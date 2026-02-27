const LOG_BUFFER_SIZE = 200;

export interface ConsoleEntry {
	level: string;
	message: string;
	timestamp: string;
}

const entries: ConsoleEntry[] = [];

const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;
const originalInfo = console.info;

function capture(level: string, args: unknown[]) {
	const message = args
		.map((a) => {
			if (typeof a === "string") return a;
			try {
				return JSON.stringify(a);
			} catch {
				return String(a);
			}
		})
		.join(" ");

	entries.push({ level, message, timestamp: new Date().toISOString() });
	if (entries.length > LOG_BUFFER_SIZE) entries.shift();
}

console.log = (...args: unknown[]) => {
	capture("log", args);
	originalLog.apply(console, args);
};
console.warn = (...args: unknown[]) => {
	capture("warn", args);
	originalWarn.apply(console, args);
};
console.error = (...args: unknown[]) => {
	capture("error", args);
	originalError.apply(console, args);
};
console.info = (...args: unknown[]) => {
	capture("info", args);
	originalInfo.apply(console, args);
};

window.addEventListener("error", (e) => {
	capture("error", [`Uncaught: ${e.message} at ${e.filename}:${e.lineno}:${e.colno}`]);
});

window.addEventListener("unhandledrejection", (e) => {
	capture("error", [`Unhandled rejection: ${e.reason}`]);
});

export function getConsoleLogs(): ConsoleEntry[] {
	return [...entries];
}
