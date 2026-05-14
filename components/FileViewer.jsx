"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function FileViewer({ fileId }) {
  const [fileData, setFileData] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scale, setScale] = useState(100);

  useEffect(() => {
    if (!fileId) {
      setError("No file ID provided");
      setLoading(false);
      console.error("FileViewer: fileId is missing or invalid", fileId);
      return;
    }

    async function fetchFile() {
      try {
        setLoading(true);
        setError("");

        console.log("Fetching file with ID:", fileId);
        const response = await fetch(`/api/download-file/${fileId}?inline=true`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("Download error:", response.status, errorData);
          throw new Error(errorData.error || `Failed to load file (${response.status})`);
        }

        const contentType = response.headers.get("Content-Type") || "application/octet-stream";
        const dispositionHeader = response.headers.get("Content-Disposition") || "";
        const nameMatch = dispositionHeader.match(/filename="?([^";]+)"?/i);
        const name = nameMatch?.[1] || "file";

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        setFileData(url);
        setFileType(contentType);
        setFileName(name);
      } catch (err) {
        console.error("FileViewer error:", err);
        setError(err.message || "Failed to load file");
      } finally {
        setLoading(false);
      }
    }

    fetchFile();

    return () => {
      if (fileData) {
        URL.revokeObjectURL(fileData);
      }
    };
  }, [fileId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-white rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 mx-auto mb-2"></div>
          <p className="text-sm text-black">Loading file...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-red-50 rounded-lg border border-red-200">
        <p className="text-sm text-red-600">Error: {error}</p>
      </div>
    );
  }

  const isImage = fileType?.startsWith("image/");
  const isPdf = fileType === "application/pdf";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-700 truncate">{fileName}</p>
          <p className="text-xs text-zinc-500">{fileType}</p>
        </div>
      </div>

      {isImage && (
        <div className="relative flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="scale" className="text-xs font-medium text-zinc-600">
              Zoom:
            </label>
            <input
              id="scale"
              type="range"
              min="50"
              max="200"
              step="10"
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              className="w-32"
            />
            <span className="text-xs text-zinc-600 w-8">{scale}%</span>
          </div>
          <div className="flex justify-center bg-zinc-100 dark:bg-zinc-900 rounded-lg p-4 overflow-auto max-h-96">
            <img
              src={fileData}
              alt={fileName}
              style={{ transform: `scale(${scale / 100})`, transformOrigin: "top center" }}
              className="transition-transform"
            />
          </div>
        </div>
      )}

      {isPdf && (
        <div className="flex flex-col gap-3 rounded-lg p-4">
          <a
            href={fileData}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-900 font-medium transition-colors w-fit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open PDF in New Tab
          </a>
        </div>
      )}

      {!isImage && !isPdf && (
        <div className="flex items-center justify-center h-48 bg-zinc-100 rounded-lg border border-zinc-300">
          <div className="text-center">
            <svg className="w-12 h-12 text-zinc-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Preview not available for this file type</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">{fileType}</p>
          </div>
        </div>
      )}
    </div>
  );
}
