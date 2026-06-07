import { join } from "node:path";
import katex from "katex";
import mathjax from "mathjax";
import rJson from "@3-/read/rJson.js";
import FORMULAS from "../demo/const/formulas.js";
import convert from "../lib/mathml.js";
import { generate } from "./chart.js";

const ROOT = join(import.meta.dirname, "..");

export const run = async () => {
  const MathJax = await mathjax.init({
      loader: { load: ["input/tex"] },
    }),
    pkg = rJson(join(ROOT, "package.json")),
    pkg_name = pkg.name,
    pkg_version = pkg.version;

  const runOurs = () => {
      for (const f of FORMULAS) {
        try {
          convert(f, true);
        } catch {}
      }
    },
    runKatex = () => {
      for (const f of FORMULAS) {
        try {
          katex.renderToString(f, { output: "mathml", displayMode: true, strict: "ignore" });
        } catch {}
      }
    },
    runMathjax = async () => {
      for (const f of FORMULAS) {
        try {
          await MathJax.tex2mmlPromise(f, { display: true });
        } catch {}
      }
    };

  // Warmup
  for (let i = 0; i < 10; ++i) {
    runOurs();
    runKatex();
    await runMathjax();
  }

  let start_time, time_ours, time_katex, time_mathjax;

  start_time = performance.now();
  for (let i = 0; i < 1000; ++i) {
    runOurs();
  }
  time_ours = performance.now() - start_time;

  start_time = performance.now();
  for (let i = 0; i < 1000; ++i) {
    runKatex();
  }
  time_katex = performance.now() - start_time;

  start_time = performance.now();
  for (let i = 0; i < 100; ++i) {
    await runMathjax();
  }
  time_mathjax = performance.now() - start_time;

  const total_formulas = FORMULAS.length,
    ops_ours = Math.round((1000 * total_formulas) / (time_ours / 1000)),
    ops_katex = Math.round((1000 * total_formulas) / (time_katex / 1000)),
    ops_mathjax = Math.round((100 * total_formulas) / (time_mathjax / 1000));

  const perf_results = [
      [pkg_name + " v" + pkg_version + " (Ours)", ops_ours, "1.0 ⭐️"],
      ["KaTeX", ops_katex, (ops_ours / ops_katex).toFixed(1)],
      ["MathJax", ops_mathjax, (ops_ours / ops_mathjax).toFixed(1)],
    ],
    rows = [
      ["Library", "Ops/sec", "Time Ratio"],
      [":---", ":---:", ":---:"],
      ...perf_results.map(([name, ops, ratio]) => [
        name,
        ops.toLocaleString() + " ops/s",
        ratio === "1.0 ⭐️" ? ratio : ratio + "x",
      ]),
    ];

  console.log("\n### Performance Comparison Benchmark (using formulas.js)\n");
  console.log(rows.map((row) => "| " + row.join(" | ") + " |").join("\n"));

  // Generate SVG content using shared chart helper
  const dev_deps = pkg.devDependencies || {},
    cleanVersion = (ver) => ver.replace(/^[^\d]+/, ""),
    versions = {
      KaTeX: cleanVersion(dev_deps.katex || "0.17.0"),
      MathJax: cleanVersion(dev_deps.mathjax || "4.1.2"),
    },
    chart_data = perf_results.map(([name, ops, ratio], idx) => {
      const is_ours = idx === 0;
      return {
        name: is_ours ? pkg_name : name,
        version: is_ours
          ? "v" + pkg_version
          : name === "KaTeX"
            ? "v" + versions.KaTeX
            : "v" + versions.MathJax,
        value: ops,
        label: ops >= 1000 ? (ops / 1000).toFixed(0) + "k ops/s" : ops + " ops/s",
        ratio,
        is_ours,
      };
    });

  generate("speed.svg", chart_data, false, "x slower");
};
