// Vendors Aceternity UI components from the public registry into components/ui.
// Source of truth: https://ui.aceternity.com/registry/<name>.json
// We vendor rather than depend, because Aceternity ships source, not packages.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const COMPONENTS = [
  "resizable-navbar",
  "aurora-background",
  "background-beams",
  "spotlight-new",
  "bento-grid",
  "3d-card",
  "card-spotlight",
  "moving-border",
  "timeline",
  "infinite-moving-cards",
  "text-generate-effect",
  "flip-words",
  "tracing-beam",
  "animated-tooltip",
  "hover-border-gradient",
  "stateful-button",
  "sidebar",
  "tabs",
  "vortex",
];

const root = process.cwd();
const deps = new Set();
let written = 0;

for (const name of COMPONENTS) {
  const url = `https://ui.aceternity.com/registry/${name}.json`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`skip ${name}: HTTP ${res.status}`);
    continue;
  }
  const json = await res.json();
  for (const d of json.dependencies ?? []) deps.add(d);

  for (const file of json.files ?? []) {
    const rel = file.path.replace(/^components\/ui\//, "components/ui/");
    const dest = join(root, rel);
    await mkdir(dirname(dest), { recursive: true });
    const header = `/* Vendored from ui.aceternity.com — registry:${name}. Modifications marked "PHYLAX". */\n`;
    await writeFile(dest, header + file.content);
    written++;
    console.log(`+ ${rel}`);
  }
}

console.log(`\n${written} files written`);
if (deps.size) console.log(`extra deps required: ${[...deps].join(" ")}`);
