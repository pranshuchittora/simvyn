import { cp, mkdir, rm, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const packageRoot = new URL("packages/cli/", root);
const assets = ["README.md", "LICENSE", "llms.txt", "docs/agents.md", "skills"];

// Check every source before replacing generated assets in the publish directory.
await Promise.all(assets.map((asset) => stat(new URL(asset, root))));
await mkdir(new URL("docs/", packageRoot), { recursive: true });
await rm(new URL("skills/", packageRoot), { recursive: true, force: true });

for (const asset of assets) {
	await cp(new URL(asset, root), new URL(asset, packageRoot), { recursive: true });
}

console.log(`Prepared package documentation and agent skills in ${fileURLToPath(packageRoot)}`);
