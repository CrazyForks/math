#!/usr/bin/env bun
import minify from "../minify.js";

export const run = async () => {
  console.log("Compressing...");
  await minify();

  // Load compiled library
  await import("../lib/mathml.js");

  const { run: runSize } = await import("./size.js"),
    { run: runSpeed } = await import("./speed.js");

  await runSize();
  await runSpeed();
};

if (import.meta.main) {
  await run();
}
