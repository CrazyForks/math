#!/usr/bin/env bun
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { init } from "mathjax";
import sharp from "sharp";

const FORMULAS = {
  euler: "e^{i\\pi} + 1 = 0",
  schrodinger:
    "i\\hbar\\frac{\\partial}{\\partial t}\\Psi(x,t) = \\left[-\\frac{\\hbar^2}{2m}\\frac{\\partial^2}{\\partial x^2} + V(x)\\right]\\Psi(x,t)",
  maxwell: "\\nabla \\times \\mathbf{E} = -\\frac{\\partial \\mathbf{B}}{\\partial t}",
  quadratic: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",
};

const main = async () => {
  const MathJax = await init({
    loader: { load: ["input/tex", "output/svg"] },
  });

  const blogSvgDir = join(import.meta.dirname, "../blog/svg");
  mkdirSync(blogSvgDir, { recursive: true });

  // 1. Generate formula SVGs, PNGs, and AVIFs
  for (const [name, tex] of Object.entries(FORMULAS)) {
    const node = MathJax.tex2svg(tex);
    const html = MathJax.startup.adaptor.outerHTML(node);

    const match = html.match(/<svg[^>]*>([\s\S]*?)<\/svg>/);
    if (match) {
      let svg = match[0];

      const viewBoxMatch = svg.match(/viewBox="([^"]+)"/);
      if (viewBoxMatch) {
        const [vx, vy, vw, vh] = viewBoxMatch[1].split(/\s+/).map(Number);
        const paddingY = Math.round(vh * 0.25);
        const newVy = vy - paddingY;
        const newVh = vh + paddingY * 2;

        const ratio = newVh / vh;
        svg = svg.replace(
          /viewBox="[^"]+"/,
          'viewBox="' + vx + " " + newVy + " " + vw + " " + newVh + '"',
        );

        svg = svg.replace(/height="([^"]+)"/, (_, h) => {
          const val = parseFloat(h);
          const unit = h.replace(/[0-9.]/g, "");
          return 'height="' + (val * ratio).toFixed(3) + unit + '"';
        });
        svg = svg.replace(/width="([^"]+)"/, (_, w) => {
          const val = parseFloat(w);
          const unit = w.replace(/[0-9.]/g, "");
          return 'width="' + (val * ratio).toFixed(3) + unit + '"';
        });
      }

      const svgPath = join(blogSvgDir, name + ".svg");
      writeFileSync(svgPath, svg);
      console.log("Generated " + svgPath);

      // Convert to PNG
      const pngPath = join(blogSvgDir, name + ".png");
      await sharp(svgPath, { density: 300 }).png().toFile(pngPath);
      console.log("Generated PNG: " + pngPath);

      // Convert to AVIF (lossy compression, quality: 85)
      const avifPath = join(blogSvgDir, name + ".avif");
      await sharp(svgPath, { density: 300 }).avif({ quality: 85 }).toFile(avifPath);
      console.log("Generated AVIF: " + avifPath);
    }
  }

  // 2. Convert demo SVGs (size.svg and speed.svg) to PNGs and AVIFs
  const demoDir = join(import.meta.dirname, "../demo");
  const demoSvgs = ["size.svg", "speed.svg"];
  for (const file of demoSvgs) {
    const svgPath = join(demoDir, file);
    const pngPath = join(demoDir, file.replace(".svg", ".png"));
    const avifPath = join(demoDir, file.replace(".svg", ".avif"));

    try {
      await sharp(svgPath, { density: 300 }).png().toFile(pngPath);
      console.log("Generated demo PNG: " + pngPath);

      await sharp(svgPath, { density: 300 }).avif({ quality: 85 }).toFile(avifPath);
      console.log("Generated demo AVIF: " + avifPath);
    } catch (err) {
      console.error("Failed to convert demo SVG " + file + ":", err);
    }
  }
};

main();
