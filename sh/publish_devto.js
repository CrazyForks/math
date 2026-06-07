#!/usr/bin/env bun
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, resolve, dirname, relative, extname } from "path";
import { execSync } from "child_process";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import cliProgress from "cli-progress";
import sharp from "sharp";
import apiKey from "../../conf/share/dev.to.js";

const main = async () => {
  const argv = yargs(hideBin(process.argv))
    .usage("Usage: $0 <doc_path_or_url>")
    .demandCommand(1, "Please specify the markdown document path or URL").argv;

  let docInput = argv._[0];
  const repoRoot = resolve(import.meta.dirname, "..");

  // Support resolving GitHub web URLs or Raw URLs to local repo paths
  if (docInput.startsWith("http")) {
    const gitMatch = docInput.match(/blob\/[^/]+\/(.+)$/);
    if (gitMatch) {
      docInput = gitMatch[1];
    } else {
      const rawMatch = docInput.match(/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/[^/]+\/(.+)$/);
      if (rawMatch) {
        docInput = rawMatch[1];
      }
    }
  }

  // Find absolute path of the markdown document
  const docPath = resolve(repoRoot, docInput);
  if (!existsSync(docPath)) {
    console.error("Markdown document not found at: " + docPath);
    process.exit(1);
  }

  const docDir = dirname(docPath);
  const markdown = readFileSync(docPath, "utf8");

  // Extract all markdown image links: ![alt](url)
  const imageRegex = /!\[.*?\]\((.*?)\)/g;
  const rawUrls = [...markdown.matchAll(imageRegex)].map((m) => m[1]);

  // Filters to find project-related images (local files or github raw urls of our repo)
  const imagesToProcess = [];
  for (const url of rawUrls) {
    let relativeRepoPath = "";

    if (url.startsWith("http")) {
      // If it's our own github raw url, we extract the relative path
      const projectRawPrefix = "https://raw.githubusercontent.com/webc-site/math/dev/";
      if (url.startsWith(projectRawPrefix)) {
        relativeRepoPath = url.replace(projectRawPrefix, "");
      } else {
        // External URLs are ignored
        continue;
      }
    } else {
      // It's a relative path from the document directory
      const absoluteImgPath = resolve(docDir, url);
      relativeRepoPath = relative(repoRoot, absoluteImgPath);
    }

    // Check if the original file exists locally
    const originalLocalPath = resolve(repoRoot, relativeRepoPath);
    if (existsSync(originalLocalPath)) {
      imagesToProcess.push({
        originalUrl: url,
        relativeRepoPath: relativeRepoPath,
        localPath: originalLocalPath,
      });
    }
  }

  // We will convert them to AVIF (lossy compression) and upload them to GitHub
  console.log("Found " + imagesToProcess.length + " project images to process.");

  const progressBar = new cliProgress.SingleBar(
    {
      format: "Processing images |{bar}| {percentage}% | {value}/{total} Chunks",
      hideCursor: true,
    },
    cliProgress.Presets.shades_classic,
  );

  progressBar.start(imagesToProcess.length, 0);

  const replacements = [];
  for (const img of imagesToProcess) {
    const ext = extname(img.relativeRepoPath).toLowerCase();
    let targetRelativePath = img.relativeRepoPath;
    let targetLocalPath = img.localPath;

    // Convert SVG/PNG/JPG to AVIF if they are not already AVIF
    if (ext !== ".avif") {
      targetRelativePath = img.relativeRepoPath.replace(new RegExp(ext + "$"), ".avif");
      targetLocalPath = resolve(repoRoot, targetRelativePath);

      // Perform conversion using sharp
      const isSvg = ext === ".svg";
      const options = isSvg ? { density: 300 } : {};
      await sharp(img.localPath, options).avif({ quality: 85 }).toFile(targetLocalPath);
    }

    // Git add the target image
    execSync('git add "' + targetLocalPath + '"', { cwd: repoRoot });

    // Track the URL replacements to do later in the body
    const newUrl = "https://raw.githubusercontent.com/webc-site/math/dev/" + targetRelativePath;
    replacements.push({
      oldUrl: img.originalUrl,
      newUrl: newUrl,
    });

    progressBar.increment();
  }

  progressBar.stop();

  // Commit and Push new AVIF images to GitHub dev branch
  console.log("Uploading (pushing) images to GitHub dev branch...");
  try {
    execSync('git commit -m "upload images for Dev.to publication" --allow-empty', {
      cwd: repoRoot,
    });
    execSync("git push origin dev", { cwd: repoRoot });
    console.log("Images pushed successfully.");
  } catch (err) {
    console.error("Failed to push images to GitHub:", err.message);
    process.exit(1);
  }

  // Process markdown body
  const lines = markdown.split("\n");
  const title = lines[0].replace(/^#\s+/, "").trim();
  let body = lines.slice(1).join("\n").trim();

  // Apply URL replacements
  for (const rep of replacements) {
    // Escape special regex characters in oldUrl
    const escaped = rep.oldUrl.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    body = body.replace(new RegExp(escaped, "g"), rep.newUrl);
  }

  // Also catch any other leftover .svg extension and change it to .avif for raw urls
  body = body.replace(/\.svg/g, ".avif");

  // Read existing article ID if it exists
  const idPath = join(repoRoot, "blog/devto_id.json");
  let articleId = null;
  if (existsSync(idPath)) {
    try {
      const config = JSON.parse(readFileSync(idPath, "utf8"));
      articleId = config.id || null;
    } catch {
      // Ignored
    }
  }

  const payload = {
    article: {
      title: title,
      published: true,
      body_markdown: body,
      tags: ["javascript", "webdev", "opensource", "math"],
    },
  };

  let url = "https://dev.to/api/articles";
  let method = "POST";

  if (articleId) {
    url = "https://dev.to/api/articles/" + articleId;
    method = "PUT";
    console.log("Updating existing Dev.to article (ID: " + articleId + "): " + title);
  } else {
    console.log("Publishing new Dev.to article: " + title);
  }

  const response = await fetch(url, {
    method: method,
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      "User-Agent": "webc-site-math-publisher",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (response.ok) {
    console.log("Published successfully to Dev.to: " + data.url);
    if (!articleId && data.id) {
      writeFileSync(idPath, JSON.stringify({ id: data.id }, null, 2));
      console.log("Saved article ID to " + idPath);
    }
  } else {
    console.error("Failed to publish/update:", data);
    process.exit(1);
  }
};

main();
