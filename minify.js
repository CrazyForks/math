#!/usr/bin/env bun
import swc from "@swc/core";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import Table from "cli-table3";
import { build } from "vite";

const root = import.meta.dirname,
  out_dir = join(root, "lib"),
  buildAndMinify = async (name) => {
    const src_file = join(root, "src", name + ".js"),
      out_file = join(out_dir, name + ".js"),
      map_file = join(out_dir, name + ".js.map"),
      build_res = await build({
        configFile: false,
        logLevel: "warn",
        build: {
          lib: {
            entry: src_file,
            formats: ["es"],
            fileName: () => name + ".js",
          },
          write: false,
          minify: false,
        },
      }),
      bundled_code = Array.isArray(build_res)
        ? build_res[0].output[0].code
        : build_res.output[0].code,
      result = await swc.minify(bundled_code, {
        compress: {
          unused: true,
          dead_code: true,
          inline: 3,
          passes: 3,
          comparisons: true,
          conditionals: true,
          evaluate: true,
          booleans: true,
          loops: true,
          sequences: true,
          unsafe: true,
          pure_getters: true,
          toplevel: true,
        },
        mangle: {
          toplevel: true,
        },
        module: true,
        sourceMap: true,
      }),
      clean_code = result.code.replace(/\n\/\/# sourceMappingURL=.*\s*$/, ""),
      map_obj = JSON.parse(result.map);

    writeFileSync(out_file, clean_code, "utf8");
    map_obj.sources = ["../src/" + name + ".js"];
    writeFileSync(map_file, JSON.stringify(map_obj), "utf8");

    const gzip_buf = gzipSync(Buffer.from(clean_code, "utf8")),
      gzip_size = gzip_buf.length;

    return [clean_code.length, gzip_size];
  },
  minify = async () => {
    mkdirSync(out_dir, { recursive: true });

    const [mathml_raw, mathml_gz] = await buildAndMinify("mathml"),
      [md_raw, md_gz] = await buildAndMinify("md"),
      table = new Table({
        head: ["File", "Minified Size", "Gzipped Size"],
      });

    table.push(
      [
        "mathml.js",
        (mathml_raw / 1024).toFixed(2) + " KB (" + mathml_raw + " B)",
        (mathml_gz / 1024).toFixed(2) + " KB (" + mathml_gz + " B)",
      ],
      [
        "md.js",
        (md_raw / 1024).toFixed(2) + " KB (" + md_raw + " B)",
        (md_gz / 1024).toFixed(2) + " KB (" + md_gz + " B)",
      ],
    );

    console.log(table.toString());
  };

export default minify;

if (import.meta.main) {
  await minify();
}
