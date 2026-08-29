import fs from "node:fs";
import path from "node:path";
import { build } from "esbuild";

const root = process.cwd();

const resolveWorkspaceImport = (specifier) => {
  const basePath = path.join(root, "src", specifier.slice(2));
  const candidates = [basePath, `${basePath}.ts`, `${basePath}.tsx`, `${basePath}.js`, `${basePath}.jsx`];
  const resolved = candidates.find((candidate) => fs.existsSync(candidate));
  if (!resolved) throw new Error(`Could not resolve workspace import: ${specifier}`);
  return resolved;
};

await build({
  entryPoints: [path.join(root, "scripts", "final-release-audit.ts")],
  outfile: path.join(root, "tmp", "pdfs", "final-audit", "final-release-audit.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  sourcemap: false,
  plugins: [
    {
      name: "workspace-alias",
      setup(buildApi) {
        buildApi.onResolve({ filter: /^@\// }, (args) => ({
          path: resolveWorkspaceImport(args.path),
        }));
      },
    },
  ],
});
