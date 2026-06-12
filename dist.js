#!/usr/bin/env bun
import minify from "./minify.js";
import ROOT_DIR from "./sh/ROOT.js";

const main = async () => {
  await minify(ROOT_DIR);
};

export default main;

if (import.meta.main) {
  await main();
}
