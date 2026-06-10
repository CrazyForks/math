#!/usr/bin/env bun
import minify from "./minify.js";
import ROOT_DIR from "./sh/ROOT.js";
import runPublish from "@1-/dist/run.js";

const main = async () => {
  await minify(ROOT_DIR);
  await runPublish(ROOT_DIR, "lib");
};

export default main;

if (import.meta.main) {
  await main();
}
