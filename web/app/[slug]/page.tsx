import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { loadDocument, DOCUMENTS } from "@/lib/docs";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";

export function generateStaticParams() {
  return Object.keys(DOCUMENTS).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = await loadDocument(slug);
  return { title: doc?.title ?? "Document", description: doc?.kind };
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = await loadDocument(slug);
  if (!doc) notFound();

  return (
    <>
      <SiteNav />
      <main id="main" className="pt-28">
      <div className="container-page pt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-y border-line py-5">
          <p className="mono-label">{doc.kind}</p>
          <p className="font-mono text-[0.6875rem] text-faint">source: {doc.file}</p>
        </div>
        {slug === "protocol" && (
          <div className="mt-8 grid gap-8 border-b border-line pb-8 md:grid-cols-[minmax(0,1fr)_18rem]">
            <div>
              <p className="font-display text-2xl leading-snug text-ink">
                A minimal, signed signal. Not an accusation, not an instruction.
              </p>
              <p className="mt-4 max-w-[62ch] text-sm leading-relaxed text-muted">
                The protocol carries an institution, an episode, a bank-authenticated
                confidence, a value band and a signature. It carries no name, no
                account number, no location and no free text. It does not hold,
                freeze, reverse or initiate anything.
              </p>
            </div>
            <div className="border-l border-line pl-5">
              <p className="mono-label mb-3">Read this first</p>
              <ul className="space-y-2 text-xs leading-relaxed text-faint">
                <li>Draft v0.1 — no institution has implemented it.</li>
                <li>`RECEIVED_NOT_VERIFIED` and `UNKNOWN` are first-class states.</li>
                <li>Late events are accepted; future-dated events are rejected.</li>
              </ul>
              <Link href="/safety" className="mt-4 inline-block text-xs text-guard underline underline-offset-4">
                Safety invariants →
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="container-page grid gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <article className="doc-prose min-w-0">
          <div dangerouslySetInnerHTML={{ __html: doc.html }} />
        </article>

        <aside className="hidden lg:block">
          <div className="sticky top-28">
            <p className="mono-label mb-4">In this record</p>
            <ul className="space-y-2.5 border-l border-line pl-4">
              {Object.entries(DOCUMENTS).map(([key, d]) => (
                <li key={key}>
                  <Link
                    href={`/${key}`}
                    className={`text-[0.8125rem] transition-colors ${
                      key === slug ? "text-guard" : "text-faint hover:text-ink"
                    }`}
                  >
                    {d.title}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-8 border-t border-line pt-5">
              <p className="mono-label mb-2">Source</p>
              <p className="break-all font-mono text-[0.7rem] leading-relaxed text-faint">
                {doc.file}
              </p>
            </div>
          </div>
        </aside>
      </div>
      </main>
      <SiteFooter />
    </>
  );
}
