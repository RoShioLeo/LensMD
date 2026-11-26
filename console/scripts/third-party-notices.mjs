import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const project = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(
  readFileSync(join(project, "package.json"), "utf8")
);
const seen = new Map();

function locate(name, from) {
  for (let cursor = from; ; cursor = dirname(cursor)) {
    const candidate = join(cursor, "node_modules", name, "package.json");
    if (existsSync(candidate)) return realpathSync(candidate);
    if (cursor === dirname(cursor)) return;
  }
}

function collect(name, from, optional = false) {
  const path = locate(name, from);
  if (!path) {
    if (optional) return;
    throw new Error(`Missing production dependency: ${name}`);
  }
  if (seen.has(path)) return;
  const pkg = JSON.parse(readFileSync(path, "utf8"));
  const dir = dirname(path);
  const licenseFiles = readdirSync(dir).filter((file) =>
    /^(licen[cs]e|copying|notice|copyright)([.\-_]|$)/i.test(file)
  );
  const notices = licenseFiles.map(
    (file) => `--- ${file} ---\n${readFileSync(join(dir, file), "utf8").trim()}`
  );
  const author =
    typeof pkg.author === "string"
      ? pkg.author
      : JSON.stringify(pkg.author ?? "");
  seen.set(
    path,
    [
      `${pkg.name}@${pkg.version}`,
      `License: ${typeof pkg.license === "string" ? pkg.license : JSON.stringify(pkg.license ?? pkg.licenses ?? "See package source")}`,
      `Author: ${author}`,
      `Source: ${typeof pkg.repository === "string" ? pkg.repository : (pkg.repository?.url ?? pkg.homepage ?? "")}`,
      ...notices,
      ...(notices.length
        ? []
        : [
            "This package supplies a license declaration in package.json; no separate license file was included in the installed package.",
          ]),
    ].join("\n\n")
  );
  for (const dependency of Object.keys(pkg.dependencies ?? {})) {
    collect(dependency, dir, dependency in (pkg.optionalDependencies ?? {}));
  }
  for (const dependency of Object.keys(pkg.optionalDependencies ?? {}))
    collect(dependency, dir, true);
}

for (const dependency of Object.keys(manifest.dependencies))
  collect(dependency, project);
const output =
  [
    "LensMD third-party notices",
    "Generated from installed production dependencies. Individual package licenses apply to their respective code.",
    ...[...seen.values()]
      .sort()
      .map((notice) => `\n${"=".repeat(72)}\n\n${notice}`),
  ].join("\n\n") + "\n";
mkdirSync(join(project, "build/generated"), { recursive: true });
writeFileSync(join(project, "build/generated/THIRD_PARTY_NOTICES.txt"), output);
process.stdout.write(
  `Collected license declarations and supplied notices for ${seen.size} production packages.\n`
);
