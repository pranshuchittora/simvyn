import { cp, mkdir, rm, stat } from "node:fs/promises";
import { basename, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const packageRoot = new URL("packages/cli/", root);
const directories = ["skills", "extensions", "prompts"];
const assets = ["README.md", "LICENSE", "llms.txt", "docs/agents.md", ...directories];

// Ship only extension sources: no tests, tsconfig, or output from a stray tsc run.
function isPackaged(source) {
	if (!source.includes(`${sep}extensions${sep}`)) return true;
	if (basename(source) === "__tests__" || source.endsWith(".d.ts")) return false;
	return ["", ".ts"].includes(extname(source));
}

// Check every source before replacing generated assets in the publish directory.
await Promise.all(assets.map((asset) => stat(new URL(asset, root))));
await mkdir(new URL("docs/", packageRoot), { recursive: true });
for (const directory of directories) {
	await rm(new URL(`${directory}/`, packageRoot), { recursive: true, force: true });
}

for (const asset of assets) {
	await cp(new URL(asset, root), new URL(asset, packageRoot), {
		recursive: true,
		filter: isPackaged,
	});
}

console.log(`Prepared package documentation and Pi resources in ${fileURLToPath(packageRoot)}`);
