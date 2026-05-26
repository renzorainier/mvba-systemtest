"use client";

import { useId, useState } from "react";

export default function FileUpload({
  onUpload,
  onCompress,
  accept = "*",
  label = "Upload File",
  endpoint = "/api/upload-file",
  compressEndpoint = "/api/compress",
}) {
  const inputId = useId();
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const [isCompressing, setIsCompressing] = useState(false);


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

    // 16MB file limit
    const MAX_SIZE = 16 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError("File size must be less than 16MB.");
      return;
    }

    setSelectedFile(file);
    setError("");
    
    // Compress file if onCompress callback is provided
    if (onCompress) {
      compressAndUpload(file);
    } else if (onUpload) {
      // Call onUpload callback with the File object if no compression
      onUpload(file);
    }
  }

  async function compressAndUpload(file) {
    try {
      setIsCompressing(true);
      setError("");
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(compressEndpoint, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Compression failed');
      }
      
      // Get compressed file as blob
      const compressedBlob = await response.blob();
      const contentType = response.headers.get('Content-Type');
      const fileName = response.headers.get('Content-Disposition')?.match(/filename="?([^"]+)"?/)?.[1] || file.name;
      
      // Create a new File object from the compressed blob
      const compressedFile = new File([compressedBlob], fileName, { type: contentType });
      
      // Call both callbacks with the compressed file
      if (onCompress) {
        onCompress({
          originalFile: file,
          compressedFile: compressedFile,
          originalSize: file.size,
          compressedSize: compressedFile.size,
        });
      }
      
      if (onUpload) {
        onUpload(compressedFile);
      }
    } catch (err) {
      setError(err.message || 'Failed to compress file');
      console.error('Compression error:', err);
    } finally {
      setIsCompressing(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={inputId}
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
          stroke={error ? "red" : "black"}
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
        ) : isCompressing ? (
          <>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span>Compressing file...</span>
          </>
        ) : (
          <>
            <span>Drag and drop a file here or click to browse</span>
            <span className="text-xs">Only PDF, JPG, and PNG files are allowed</span>
          </>
        )}
      </label>
      <input
        id={inputId}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="sr-only"
        onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
      />
    </div>
  );
}
