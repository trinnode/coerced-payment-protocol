import { readFile } from "node:fs/promises";
import path from "node:path";
import { marked } from "marked";

const ROOT = process.cwd();

/** All public documents are read from the repository at request time. */
export const DOCUMENTS: Record<string, { file: string; title: string; kind: string }> = {
  assessment: {
    file: "docs/00-assessment.md",
    title: "The assessment",
    kind: "Adversarial review",
  },
  flow: { file: "docs/01-master-flow.md", title: "Master flow", kind: "System design" },
  plan: { file: "docs/02-master-plan.md", title: "Master plan", kind: "Gates and kill criteria" },
  safety: {
    file: "docs/03-threat-model-and-safety.md",
    title: "Threat model and safety",
    kind: "Invariants and abuse cases",
  },
  review: {
    file: "docs/04-review-log.md",
    title: "Review log",
    kind: "What changed and why",
  },
  sources: {
    file: "docs/research/source-register.md",
    title: "Source register",
    kind: "Verified · reported · unknown",
  },
  protocol: {
    file: "docs/spec/duress-event-v0.1.md",
    title: "Event protocol v0.1",
    kind: "Specification · draft for criticism",
  },
  governance: { file: "GOVERNANCE.md", title: "Governance", kind: "Decision rights" },
  contributing: { file: "CONTRIBUTING.md", title: "Contributing", kind: "How to argue with us" },
  security: { file: "SECURITY.md", title: "Security", kind: "Reporting a problem" },
};

export async function loadDocument(slug: string) {
  const entry = DOCUMENTS[slug];
  if (!entry) return null;

  // Resolve inside the repository only. No traversal from the URL.
  const filePath = path.resolve(/* turbopackIgnore: true */ ROOT, "..", entry.file);
  const repoRoot = path.resolve(ROOT, "..");
  if (!filePath.startsWith(repoRoot + path.sep)) return null;

  let source: string;
  try {
    source = await readFile(filePath, "utf8");
  } catch {
    return null;
  }

  marked.setOptions({ gfm: true, breaks: false });
  const html = await marked.parse(source);

  return { ...entry, html, source };
}
