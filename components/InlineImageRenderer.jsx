"use client";
import { useState } from "react";

export default function InlineImageRenderer({ item }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const body = item.body || "";
  const regex = /\[\[IMG_(\d+)\]\]/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(body)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", text: body.slice(lastIndex, match.index) });
    }
    parts.push({ type: "img", idx: Number(match[1]) });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < body.length) {
    parts.push({ type: "text", text: body.slice(lastIndex) });
  }

  const images = item.images || [];
  const captions = item.captions || [];

  return (
    <div>
      {parts.map((p, i) => {
        if (p.type === "text") {
          return (
            <p key={i} className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 whitespace-pre-line">
              {p.text}
            </p>
          );
        }

        const src = images[p.idx];
        if (!src) return null;

        return (
          <figure key={i} className="m-0 mt-4 flex flex-col items-center">
            <button
              type="button"
              onClick={() => {
                setIndex(p.idx);
                setOpen(true);
              }}
              className="w-full text-left"
            >
              <img
                src={src}
                alt={item.title || `image-${p.idx + 1}`}
                className="w-[90%] mx-auto h-auto max-h-[840px] object-contain rounded border border-slate-200"
              />
            </button>
            {captions[p.idx] && <figcaption className="mt-2 text-xs text-slate-500 text-center">{captions[p.idx]}</figcaption>}
          </figure>
        );
      })}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setOpen(false)}
        >
          <div className="relative flex items-center gap-4 max-w-[95%] max-h-[95%]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setIndex((index - 1 + images.length) % images.length)}
              className="rounded bg-white/10 p-2 text-white hover:bg-white/20"
              aria-label="previous"
            >
              ‹
            </button>

            <div className="flex flex-col items-center gap-3 max-w-[80vw] max-h-[80vh]">
              <img src={images[index]} alt={`lightbox-${index + 1}`} className="max-w-[80vw] max-h-[80vh] object-contain rounded" />
              {captions[index] && <div className="text-sm text-white/90 text-center max-w-[80vw]">{captions[index]}</div>}
            </div>

            <button
              onClick={() => setIndex((index + 1) % images.length)}
              className="rounded bg-white/10 p-2 text-white hover:bg-white/20"
              aria-label="next"
            >
              ›
            </button>

            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 rounded bg-white/10 p-2 text-white hover:bg-white/20"
              aria-label="close"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
