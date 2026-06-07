export default {
  entry: [
    "dev.js",
    "dist.js",
    "minify.js",
    "extract/run.js",
    "sh/check.js",
    "sh/stringAnalyze.js",
    "sh/unicodeUnescape.js",
    "test/compare.test.js",
  ],
  ignore: ["demo/**"],
  ignoreDependencies: ["@mathjax/mathjax-mhchem-font-extension", "oxfmt", "oxlint"],
};
