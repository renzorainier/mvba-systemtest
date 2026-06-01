"use client";

import { useEffect, useState } from "react";

export default function Lightbox({ images = [], captions = [] }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "ArrowLeft") setIndex((value) => (value - 1 + images.length) % images.length);
      if (event.key === "ArrowRight") setIndex((value) => (value + 1) % images.length);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [images.length, open]);

  if (!images.length) return null;

  return (
    <div className="mt-4">
      <div className="grid grid-cols-1 gap-6">
        {images.map((src, imageIndex) => (
          <figure key={src + imageIndex} className="m-0 flex flex-col items-center">
            <button
              type="button"
              onClick={() => {
                setIndex(imageIndex);
                setOpen(true);
              }}
              className="w-full text-left"
            >
              <img
                src={src}
                alt={`help-${imageIndex + 1}`}
                className="mx-auto h-auto max-h-[840px] w-[90%] rounded border border-slate-200 object-contain"
              />
            </button>

            {captions[imageIndex] && (
              <figcaption className="mt-2 max-w-3xl text-center text-xs text-slate-500">
                {captions[imageIndex]}
              </figcaption>
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
          <div className="relative flex max-h-[95%] max-w-[95%] items-center gap-4" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setIndex((value) => (value - 1 + images.length) % images.length)}
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
              onClick={() => setIndex((value) => (value + 1) % images.length)}
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
