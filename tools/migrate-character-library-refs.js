const fs = require("fs");
const path = require("path");

const root = process.cwd();
const charactersRoot = path.join(root, "characters");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "library", "manifest.json"), "utf8"));
const ids = Object.values(manifest.collections || {}).flat().map(entry => entry.id).filter(Boolean);
const idByComparable = new Map(ids.map(id => [comparable(id), id]));
const collectionPrefixes = {
  spells: "spells",
  items: "items",
  resources: "resources",
  feats: "feats",
  traits: "traits",
  races: "species",
  species: "species",
};

for (const file of fs.readdirSync(charactersRoot).filter(name => name.endsWith(".json"))) {
  const fullPath = path.join(charactersRoot, file);
  const character = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  let changed = false;

  walk(character, value => {
    if (!value || typeof value !== "object" || value.source !== "library") return;
    const collection = value.libraryCollection;
    const prefix = collectionPrefixes[collection];
    if (!prefix || !value.libraryRef) return;

    if (collection === "races") {
      value.libraryCollection = "species";
      changed = true;
    }

    if (!String(value.libraryRef).startsWith(`${prefix}.`) && !String(value.libraryRef).startsWith("tag:")) {
      value.libraryRef = `${prefix}.${value.libraryRef}`;
      changed = true;
    }

    const normalized = idByComparable.get(comparable(value.libraryRef));
    if (normalized && normalized !== value.libraryRef) {
      value.libraryRef = normalized;
      changed = true;
    }
  });

  if (changed) {
    fs.writeFileSync(fullPath, `${JSON.stringify(character, null, 2)}\n`);
  }
}

function walk(value, visitor) {
  visitor(value);
  if (Array.isArray(value)) {
    value.forEach(item => walk(item, visitor));
    return;
  }
  if (value && typeof value === "object") {
    Object.values(value).forEach(item => walk(item, visitor));
  }
}

function comparable(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9:]+/g, "-").replace(/^-|-$/g, "");
}
