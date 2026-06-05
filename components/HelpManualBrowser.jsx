"use client";

import { useMemo, useState } from "react";
import InlineImageRenderer from "@/components/InlineImageRenderer";

function matchesQuery(text, query) {
  return String(text || "").toLowerCase().includes(query);
}

function SectionNavItem({ item }) {
  return (
    <li>
      <a
        href={`#${item.id}`}
        className="block rounded-xl border border-transparent px-3 py-2 text-sm transition-colors hover:border-blue-100 hover:bg-blue-50 hover:text-blue-900 text-slate-600"
      >
        <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{item.number}</span>
        <span className="mt-1 block leading-snug">{item.title}</span>
      </a>
    </li>
  );
}

export default function HelpManualBrowser({ sections, isAdmin }) {
  const [query, setQuery] = useState("");

  const filteredSections = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) return sections;

    return sections
      .map((section) => {
        const sectionMatches =
          matchesQuery(section.number, normalized) ||
          matchesQuery(section.title, normalized) ||
          matchesQuery(section.description, normalized);

        const items = section.items.filter((item) =>
          [item.number, item.title, item.body, item.id].some((value) => matchesQuery(value, normalized)),
        );

        if (sectionMatches || items.length > 0) {
          return { ...section, items };
        }

        return null;
      })
      .filter(Boolean);
  }, [query, sections]);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
      <main className="space-y-10 lg:order-1">
        {filteredSections.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-600">
            No matching sections or items found.
          </div>
        ) : (
          filteredSections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-8 border-b border-slate-200 pb-8">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Section {section.number}</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{section.title}</h2>
                </div>
                {section.adminOnly && (
                  <span className="inline-flex w-fit rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600">Admin only</span>
                )}
              </div>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 whitespace-pre-line">{section.description}</p>

              <div className="mt-6 space-y-6">
                {section.items.map((item) => (
                  <article key={item.id} id={item.id} className="scroll-mt-8 border-l-2 border-slate-200 pl-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{item.number}</p>
                    <h3 className="mt-1 text-base font-semibold text-slate-950">{item.title}</h3>
                    <InlineImageRenderer item={item} />
                  </article>
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      <aside className="lg:sticky lg:top-8 lg:self-start lg:order-2">
        <div className="space-y-4">
          <div className="sticky top-4 z-10 border-b border-slate-200 bg-white pb-4">
            <label htmlFor="manual-search" className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Search manual
            </label>
            <input
              id="manual-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sections, tasks, or errors"
              className="mt-2 w-full border-0 border-b border-slate-300 bg-transparent px-0 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-0"
            />
          </div>

          <div className="mt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Contents</p>
            <nav
              aria-label="User manual sections"
              className="max-h-[calc(100vh-14rem)] space-y-2 overflow-y-auto pr-2"
            >
              {filteredSections.map((section, index) => (
                <details key={section.id} className="group border-b border-slate-200 pb-2" open={index === 0}>
                  <summary className="cursor-pointer list-none py-1 outline-none transition hover:text-slate-950">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{section.number}</span>
                        <span className="mt-1 block text-sm font-medium text-slate-800">{section.title}</span>
                      </div>
                      <span className="mt-1 text-slate-400 transition-transform group-open:rotate-180">⌄</span>
                    </div>
                  </summary>

                  <div className="mt-2 space-y-2 pl-0">
                    <p className="text-xs leading-5 text-slate-500">{section.description}</p>
                    <ol className="space-y-1">
                      {section.items.map((item) => (
                        <SectionNavItem key={item.id} item={item} />
                      ))}
                    </ol>
                  </div>
                </details>
              ))}
              <p className="mt-3 text-xs text-slate-500">Quick Tip: If an image looks small, click it to view a larger version.</p>
            </nav>

            {!isAdmin && (
              <div className="mt-4 border-t border-slate-200 pt-3 text-sm text-slate-600">
                Admin-only operations are hidden for your current role.
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
