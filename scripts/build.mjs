import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";
import { init, parse } from "es-module-lexer";

const projectRoot = resolve(import.meta.dirname, "..");
const outputRoot = resolve(projectRoot, "build/extension");

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

await build({
  absWorkingDir: projectRoot,
  entryPoints: [
    "background/service-worker.js",
    "options/options.js"
  ],
  outbase: ".",
  outdir: outputRoot,
  bundle: true,
  splitting: false,
  format: "esm",
  platform: "browser",
  target: "chrome120",
  sourcemap: false,
  minify: true,
  legalComments: "none"
});

const serviceWorkerPath = resolve(outputRoot, "background/service-worker.js");
const serviceWorker = await readFile(serviceWorkerPath, "utf8");
await init;
const [serviceWorkerImports] = parse(serviceWorker);
if (serviceWorkerImports.some(({ type }) => type === "dynamic")) {
  throw new Error("Service Worker bundle contains unsupported dynamic import()");
}

for (const path of ["content", "popup", "icons"]) {
  await cp(resolve(projectRoot, path), resolve(outputRoot, path), { recursive: true });
}
await cp(resolve(projectRoot, "options/options.html"), resolve(outputRoot, "options/options.html"));
await cp(resolve(projectRoot, "options/options.css"), resolve(outputRoot, "options/options.css"));
await cp(resolve(projectRoot, "LICENSE"), resolve(outputRoot, "LICENSE"));
await cp(resolve(projectRoot, "THIRD_PARTY_NOTICES.md"), resolve(outputRoot, "THIRD_PARTY_NOTICES.md"));

const manifest = JSON.parse(await readFile(resolve(projectRoot, "manifest.json"), "utf8"));
manifest.background.type = "module";
await writeFile(resolve(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
