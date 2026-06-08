'use client';

import React, { useRef, useEffect } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';

/**
 * Full-screen print preview overlay.
 * While active it greys out the whole system behind it and renders the
 * provided HTML inside an isolated iframe. A Back button (upper-left)
 * returns the user to the normal page; Print sends the iframe to print.
 *
 * Props:
 *   html    - the full document HTML string to preview/print (null = closed)
 *   onClose - called when the user clicks Back
 */
export default function PrintPreview({ html, onClose }) {
  const iframeRef = useRef(null);

  // Render the HTML into the iframe whenever it changes.
  useEffect(() => {
    if (!html) return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
  }, [html]);

  // Lock background scrolling and allow Esc to go back while open.
  useEffect(() => {
    if (!html) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [html, onClose]);

  if (!html) return null;

  const handlePrint = () => {
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  };

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Grey backdrop disabling the rest of the system */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

      {/* Toolbar: Back (upper-left) + Print */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
        >
          <Printer className="h-4 w-4" />
          Print
        </button>
      </div>

      {/* Preview surface */}
      <div className="absolute inset-0 flex items-center justify-center p-4 pt-16">
        <iframe
          ref={iframeRef}
          title="Print preview"
          className="h-full w-full max-w-5xl rounded-lg bg-white shadow-2xl"
        />
      </div>
    </div>
  );
}
