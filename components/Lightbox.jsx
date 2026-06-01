"use client";
import { useEffect, useState } from "react";

export default function Lightbox({ images = [], captions = [] }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % images.length);
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, images.length]);

  if (!images || images.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="grid gap-6 grid-cols-1 items-start">
        {images.map((src, i) => (
            <figure key={i} className="m-0 flex justify-center">
            <button
              type="button"
              onClick={() => {
                setIndex(i);
                setOpen(true);
              }}
              className="w-full text-left"
            >
                <img
                  src={src}
                  alt={`help-${i + 1}`}
                  className="w-[90%] mx-auto h-auto max-h-[840px] object-contain rounded border border-slate-200"
                />
            </button>
            {captions?.[i] && (
              <figcaption className="mt-1 text-xs text-slate-500">{captions[i]}</figcaption>
            )}
          </figure>
        ))}
      </div>

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

            <img
              src={images[index]}
              alt={`lightbox-${index + 1}`}
              className="max-w-[80vw] max-h-[80vh] object-contain rounded"
            />

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

            {captions?.[index] && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-sm text-white/90">
                {captions[index]}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
