#!/usr/bin/env bun
import { execSync } from "node:child_process";
import { join } from "node:path";
import rJson from "@3-/read/rJson.js";
import render from "@3-/mdt/render.js";
import write from "@3-/write";
import minify from "./minify.js";
import { run } from "./sh/benchmark.js";

const DIR = import.meta.dirname,
  LIB_DIR = join(DIR, "lib");

const main = async () => {
  const pkg_path = join(DIR, "package.json"),
    pkg = rJson(pkg_path),
    readme_promise = render(join(DIR, "README.mdt")),
    version_parts = pkg.version.split(".");

  version_parts[2] = String(Number(version_parts[2]) + 1);

  const next_version = version_parts.join("."),
    readme = await readme_promise;

  write(join(DIR, "README.md"), readme);

  await minify();

  pkg.version = next_version;

  const pkg_lib = { ...pkg };
  delete pkg_lib.devDependencies;
  delete pkg_lib.files;
  pkg_lib.exports = {
    ".": "./mathml.js",
    "./*": "./*",
  };

  write(join(LIB_DIR, "package.json"), JSON.stringify(pkg_lib));
  write(join(LIB_DIR, "README.md"), readme);

  await run();

  execSync("npm publish --access=public --registry=https://registry.npmjs.org/", {
    cwd: LIB_DIR,
    stdio: "inherit",
  });

  write(pkg_path, JSON.stringify(pkg, null, 2) + "\n");

  console.log("Successfully prepared dist files. Version bumped to: " + next_version);
};

export default main;

if (import.meta.main) {
  await main();
}
