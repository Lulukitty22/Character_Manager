const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = process.cwd();
const libraryRoot = path.join(root, "library");
const helperPath = path.join(root, "manager", "scripts", "importers", "library-records.js");
const helperCode = fs.readFileSync(helperPath, "utf8");

vm.runInThisContext(`${helperCode}\nglobalThis.LibraryRecords = LibraryRecords;`);

const collectionFolders = ["classes", "feats", "items", "races", "resources", "spells", "tags", "traits", "species"];
const oldFiles = [];
const records = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".json") || entry.name === "index.json") continue;
    oldFiles.push(full);
  }
}

for (const folder of collectionFolders) {
  walk(path.join(libraryRoot, folder));
}

for (const file of oldFiles) {
  const relative = path.relative(libraryRoot, file).replace(/\\/g, "/");
  const folder = relative.split("/")[0];
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const record = LibraryRecords.normalizeRecord(raw, folder);
  const targetRelative = LibraryRecords.recordPath(record, record.collections[0]).replace(/^library\//, "");
  records.push({ record, oldFile: file, relative: targetRelative });
}

const byPath = new Map();
for (const item of records) {
  let relative = item.relative;
  let counter = 2;
  while (byPath.has(relative)) {
    const parsed = path.posix.parse(relative);
    relative = path.posix.join(parsed.dir, `${parsed.name}-${counter}${parsed.ext}`);
    counter += 1;
  }
  byPath.set(relative, item.record);
}

for (const [relative, record] of byPath.entries()) {
  const target = path.join(libraryRoot, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(record, null, 2)}\n`);
}

for (const oldFile of oldFiles) {
  const relative = path.relative(libraryRoot, oldFile).replace(/\\/g, "/");
  if (!byPath.has(relative) && fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
}

removeEmptyDirs(libraryRoot);

const collections = {};
for (const [relative, record] of byPath.entries()) {
  const rootCollection = LibraryRecords.canonicalCollection((record.collections[0] || relative.split("/")[0]).split("/")[0]);
  if (!collections[rootCollection]) collections[rootCollection] = [];
  collections[rootCollection].push(LibraryRecords.manifestEntry(record, `library/${relative}`, ""));
}

for (const key of Object.keys(collections)) {
  collections[key].sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id)));
}

const manifest = {
  version: 2,
  schemaVersion: 1,
  collections,
};

fs.writeFileSync(path.join(libraryRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
writeIndexes(byPath);

function writeIndexes(recordMap) {
  const indexByDir = new Map();
  for (const [relative, record] of recordMap.entries()) {
    const parts = relative.split("/");
    for (let depth = 1; depth < parts.length; depth += 1) {
      const dir = parts.slice(0, depth).join("/");
      if (!indexByDir.has(dir)) {
        indexByDir.set(dir, {
          schemaVersion: 1,
          id: `index.${dir.replace(/\//g, ".")}`,
          name: title(parts[depth - 1]),
          path: `library/${dir}/index.json`,
          directories: [],
          entries: [],
        });
      }
    }

    const dir = parts.slice(0, -1).join("/");
    const index = indexByDir.get(dir);
    if (index) {
      index.entries.push({
        id: record.id,
        name: record.name,
        collections: record.collections,
        tags: record.tags,
        path: `library/${relative}`,
      });
    }
  }

  for (const [dir, index] of indexByDir.entries()) {
    const childDirs = Array.from(indexByDir.keys())
      .filter(other => other.startsWith(`${dir}/`) && other.split("/").length === dir.split("/").length + 1)
      .map(other => ({
        name: title(other.split("/").at(-1)),
        path: `library/${other}/index.json`,
      }));
    index.directories = childDirs;
    index.entries.sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id)));
    const target = path.join(libraryRoot, dir, "index.json");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `${JSON.stringify(index, null, 2)}\n`);
  }

  const rootIndex = {
    schemaVersion: 1,
    id: "index.library",
    name: "Library",
    path: "library/index.json",
    directories: Array.from(indexByDir.keys())
      .filter(dir => dir.split("/").length === 1)
      .sort()
      .map(dir => ({ name: title(dir), path: `library/${dir}/index.json` })),
    entries: [],
  };
  fs.writeFileSync(path.join(libraryRoot, "index.json"), `${JSON.stringify(rootIndex, null, 2)}\n`);
}

function removeEmptyDirs(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) removeEmptyDirs(full);
  }
  if (dir !== libraryRoot && fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
    fs.rmdirSync(dir);
  }
}

function title(value) {
  return String(value || "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}
