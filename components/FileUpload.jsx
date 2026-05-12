"use client";

import { useState } from "react";

export default function FileUpload({
  onUpload,
  accept = "*",
  label = "Upload File",
  endpoint = "/api/upload-file",
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);


  function handleFileSelect(file) {
    if (!file) return;
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    const isAllowedType = allowedExtensions.includes(fileExtension) || 
                          file.type === 'application/pdf' || 
                          file.type === 'image/jpeg' || 
                          file.type === 'image/png';

    if (!isAllowedType) {
      setError("Only PDF, JPG, and PNG files are allowed.");
      return;
    }

    setSelectedFile(file);
    setError("");
  }

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="image-input"
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFileSelect(e.dataTransfer.files?.[0] || null);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-10 text-center text-sm transition-colors ${
          isDragging
            ? "border-zinc-900 bg-zinc-300 text-zinc-900 dark:border-zinc-100"
            : "border-zinc-300 bg-white text-zinc-700 dark:border-zinc-700"
        }`}
      >
        {/* File Icon */}
        <svg
          className="h-8 w-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        {selectedFile ? (
          <span className="text-sm font-medium">{selectedFile.name}</span>
        ) : error ? (
          <span className="text-sm text-red-500">{error}</span>
        ) : (
          <>
            <span>Drag and drop a PDF, JPG, JPEG, or PNG file here</span>
            <span className="text-xs">or click to browse</span>
          </>
        )}
      </label>
      <input
        id="image-input"
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="sr-only"
        onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
      />
    </div>
  );
}
