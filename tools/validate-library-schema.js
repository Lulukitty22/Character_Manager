const fs = require("fs");
const path = require("path");

const root = process.cwd();
const libraryRoot = path.join(root, "library");
const manifestPath = path.join(libraryRoot, "manifest.json");
const problems = [];
const ids = new Map();

const manifest = readJson(manifestPath);
if (!manifest || manifest.schemaVersion !== 1 || !manifest.collections) {
  problems.push("library/manifest.json is missing schemaVersion 1 or collections.");
}
if (manifest && manifest.version !== 2) {
  problems.push("library/manifest.json must be manifest version 2.");
}

const manifestPaths = new Set();
for (const entries of Object.values(manifest.collections || {})) {
  for (const entry of entries || []) {
    if (!entry.path) {
      problems.push(`Manifest entry ${entry.id || "(unknown)"} is missing path.`);
      continue;
    }
    manifestPaths.add(entry.path.replace(/\\/g, "/"));
    if (!fs.existsSync(path.join(root, entry.path))) {
      problems.push(`Manifest path does not exist: ${entry.path}`);
    }
  }
}

for (const file of walk(libraryRoot)) {
  const relative = path.relative(root, file).replace(/\\/g, "/");
  const data = readJson(file);
  if (!data) continue;
  if (relative.endsWith("/index.json") || relative === "library/index.json" || relative === "library/manifest.json") {
    validateIndex(relative, data);
    continue;
  }

  validateRecord(relative, data);
  if (!manifestPaths.has(relative)) {
    problems.push(`Record is not listed in manifest: ${relative}`);
  }
}

for (const [id, files] of ids.entries()) {
  if (files.length > 1) {
    problems.push(`Duplicate id ${id}: ${files.join(", ")}`);
  }
}

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}

console.log(`Library schema OK: ${ids.size} records, ${manifestPaths.size} manifest entries.`);

function validateRecord(relative, data) {
  if (data.schemaVersion !== 1) problems.push(`${relative}: schemaVersion must be 1.`);
  if (!data.id) problems.push(`${relative}: missing id.`);
  if (!data.name) problems.push(`${relative}: missing name.`);
  if (!Array.isArray(data.collections)) problems.push(`${relative}: collections must be an array.`);
  if (!Array.isArray(data.tags)) problems.push(`${relative}: tags must be an array.`);
  if (!Array.isArray(data.sourceReferences)) problems.push(`${relative}: sourceReferences must be an array.`);
  if (!data.features || typeof data.features !== "object" || Array.isArray(data.features)) problems.push(`${relative}: features must be an object.`);
  if (typeof data.desc !== "string") problems.push(`${relative}: desc must be a string.`);
  if (data.id) {
    const list = ids.get(data.id) || [];
    list.push(relative);
    ids.set(data.id, list);
  }
}

function validateIndex(relative, data) {
  if (data.schemaVersion !== 1 && relative !== "library/manifest.json") problems.push(`${relative}: index schemaVersion must be 1.`);
  if (!data.id && relative !== "library/manifest.json") problems.push(`${relative}: index missing id.`);
  if (Array.isArray(data.entries)) {
    for (const entry of data.entries) {
      if (entry.path && !fs.existsSync(path.join(root, entry.path))) {
        problems.push(`${relative}: entry path does not exist: ${entry.path}`);
      }
    }
  }
  if (Array.isArray(data.directories)) {
    for (const entry of data.directories) {
      if (entry.path && !fs.existsSync(path.join(root, entry.path))) {
        problems.push(`${relative}: directory index path does not exist: ${entry.path}`);
      }
    }
  }
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    problems.push(`${path.relative(root, file).replace(/\\/g, "/")}: invalid JSON (${error.message})`);
    return null;
  }
}

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    if (entry.isFile() && entry.name.endsWith(".json")) files.push(full);
  }
  return files;
}
