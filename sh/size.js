import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import envPaths from "env-paths";
import rJson from "@3-/read/rJson.js";
import { generate } from "./chart.js";

const ROOT = join(import.meta.dirname, ".."),
  gzSize = (buf) =>
    typeof Bun !== "undefined" ? Bun.gzipSync(buf).byteLength : gzipSync(buf).byteLength,
  formatSize = (bytes) => (bytes / 1024).toFixed(2) + " KB",
  cleanVersion = (ver) => ver.replace(/^[^\d]+/, ""),
  CACHE_DIR = envPaths("webc-math-benchmark").cache;

export const run = async () => {
  const local_path = join(ROOT, "lib", "mathml.js"),
    pkg = rJson(join(ROOT, "package.json")),
    pkg_name = pkg.name,
    pkg_version = pkg.version,
    local_code = readFileSync(local_path),
    local_raw = local_code.byteLength,
    local_gz = gzSize(local_code),
    results = [[pkg_name + " v" + pkg_version + " (Ours)", local_raw, local_gz, "1.0 ⭐️"]],
    dev_deps = pkg.devDependencies || {},
    versions = {
      KaTeX: cleanVersion(dev_deps.katex || "0.17.0"),
      MathJax: cleanVersion(dev_deps.mathjax || "4.1.2"),
    };

  mkdirSync(CACHE_DIR, { recursive: true });

  for (const name of ["KaTeX", "MathJax"]) {
    const version = versions[name],
      cache_path = join(CACHE_DIR, name.toLowerCase() + "-" + version + ".js");

    let uint8;
    if (existsSync(cache_path)) {
      uint8 = readFileSync(cache_path);
    } else {
      const url =
        name === "KaTeX"
          ? "https://cdn.jsdelivr.net/npm/katex@" + version + "/dist/katex.min.js"
          : "https://cdn.jsdelivr.net/npm/mathjax@" +
            version +
            (version.startsWith("4") ? "/tex-mml-chtml.js" : "/es5/tex-mml-chtml.js");

      console.log("Fetching " + name + " v" + version + " from jsDelivr...");
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Fetch failed: " + url + " status: " + response.status);
      }
      const buf = await response.arrayBuffer();
      uint8 = new Uint8Array(buf);
      writeFileSync(cache_path, uint8);
    }

    const raw = uint8.byteLength,
      gz = gzSize(uint8),
      ratio = (gz / local_gz).toFixed(1);

    results.push([name, raw, gz, ratio]);
  }

  const rows = [
    ["Library", "Raw Size", "Gzip Size", "Size Ratio"],
    [":---", ":---:", ":---:", ":---:"],
    ...results.map(([name, raw, gz, ratio]) => [name, formatSize(raw), formatSize(gz), ratio]),
  ];

  console.log("\n### Size Comparison Benchmark\n");
  console.log(rows.map((row) => "| " + row.join(" | ") + " |").join("\n"));

  // Generate SVG content using shared chart helper
  const chart_data = results.map(([name, _raw, gz, ratio], idx) => {
    const is_ours = idx === 0;
    return {
      name: is_ours ? pkg_name : name,
      version: is_ours
        ? "v" + pkg_version
        : name === "KaTeX"
          ? "v" + versions.KaTeX
          : "v" + versions.MathJax,
      value: gz,
      label: (gz / 1024).toFixed(2) + " KB",
      ratio,
      is_ours,
    };
  });

  generate("size.svg", chart_data, true, "x");
};
