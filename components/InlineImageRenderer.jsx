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
      {parts.map((part, partIndex) => {
        if (part.type === "text") {
          return (
            <p key={partIndex} className="mt-2 max-w-3xl whitespace-pre-line text-sm leading-6 text-slate-600">
              {part.text}
            </p>
          );
        }

        const src = images[part.idx];
        if (!src) return null;

        return (
          <figure key={partIndex} className="m-0 mt-4 flex flex-col items-center">
            <button
              type="button"
              onClick={() => {
                setIndex(part.idx);
                setOpen(true);
              }}
              className="w-full text-left"
            >
              <img
                src={src}
                alt={item.title || `image-${part.idx + 1}`}
                className="mx-auto h-auto max-h-[840px] w-[90%] rounded border border-slate-200 object-contain"
              />
            </button>

            {captions[part.idx] && (
              <figcaption className="mt-2 max-w-3xl text-center text-xs text-slate-500">
                {captions[part.idx]}
              </figcaption>
            )}
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
          <div className="relative flex max-h-[95%] max-w-[95%] items-center gap-4" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setIndex((index - 1 + images.length) % images.length)}
              className="rounded bg-white/10 p-2 text-white hover:bg-white/20"
              aria-label="previous"
            >
              ‹
            </button>

            <div className="flex max-w-[80vw] flex-col items-center gap-3">
              <img
                src={images[index]}
                alt={`lightbox-${index + 1}`}
                className="max-h-[80vh] max-w-[80vw] rounded object-contain"
              />
              {captions[index] && (
                <div className="max-w-[80vw] text-center text-sm text-white/90">
                  {captions[index]}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIndex((index + 1) % images.length)}
              className="rounded bg-white/10 p-2 text-white hover:bg-white/20"
              aria-label="next"
            >
              ›
            </button>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 rounded bg-white/10 p-2 text-white hover:bg-white/20"
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
