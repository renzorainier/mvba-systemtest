import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import mupdf from "mupdf";

export const runtime = "nodejs";

// Get compression quality from form data in the frontend
function parseQuality(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 80;
  return Math.max(10, Math.min(100, Math.round(numeric)));
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const quality = parseQuality(formData.get("quality"));

    if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
      return Response.json({ error: "A valid file is required." }, { status: 400 });
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const filenameBase = (file.name || "file").replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]/g, "_") || "file";

    // Compress images using sharp
    if (file.type?.startsWith("image/")) {
      const outputBuffer = await sharp(inputBuffer)
        .rotate()
        .webp({ quality })
        .toBuffer();

      const outputFilename = `${filenameBase}.compressed.webp`;

      return new Response(outputBuffer, {
        status: 200,
        headers: {
          "Content-Type": "image/webp",
          "Content-Disposition": `attachment; filename="${outputFilename}"`,
          "X-Output-Format": "webp",
          "X-Compression-Quality": String(quality),
          "X-Original-Bytes": String(inputBuffer.length),
          "X-Compressed-Bytes": String(outputBuffer.length),
        },
      });
    }

    // Compress PDFs using mupdf (pdf to image) -> sharp (JPEG compression) -> pdf-lib (embed image back to PDF)
    if (file.type === "application/pdf" || (file.name || "").toLowerCase().endsWith(".pdf")) {
      try {
        const document = new mupdf.PDFDocument(inputBuffer);
        const pageCount = document.countPages();

        const pdfDoc = await PDFDocument.create();

        // Process each page
        for (let pageNum = 0; pageNum < pageCount; pageNum++) {
          // Render PDF page at higher DPI for better quality
          const page = document.loadPage(pageNum);
          const bbox = page.getBounds();
          const originalWidth = bbox[2] - bbox[0];
          const originalHeight = bbox[3] - bbox[1];

          // Render at 2x scale (144 DPI)
          // Use white background by rendering to white pixmap first
          const pixmap = page.toPixmap(mupdf.Matrix.scale(2, 2), mupdf.ColorSpace.DeviceRGB, false);
          
          // Fill with white background by converting to PNG and then using sharp to ensure white bg
          const pngData = pixmap.asPNG();

          // Compress to JPEG using quality slider for lossy compression
          // Flatten to white background to ensure no transparency
          const compressedImage = await sharp(Buffer.from(pngData))
            .flatten({ background: '#FFFFFF' })
            .jpeg({ quality, progressive: true })
            .toBuffer();

          // Embed with scaled dimensions to maintain original page size
          const embeddedImage = await pdfDoc.embedJpg(compressedImage);
          const newPage = pdfDoc.addPage([originalWidth, originalHeight]);
          newPage.drawImage(embeddedImage, { 
            x: 0, 
            y: 0, 
            width: originalWidth, 
            height: originalHeight 
          });
        }

        const outputPdfBuffer = await pdfDoc.save();
        
        // Fallback: if compressed is larger than original, return original
        const finalBuffer = outputPdfBuffer.length > inputBuffer.length ? inputBuffer : outputPdfBuffer;
        const finalBytes = finalBuffer.length;
        const outputFilename = `${filenameBase}.compressed.pdf`;

        return new Response(finalBuffer, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${outputFilename}"`,
            "X-Output-Format": "pdf",
            "X-Compression-Quality": String(quality),
            "X-Original-Bytes": String(inputBuffer.length),
            "X-Compressed-Bytes": String(finalBytes),
          },
        });
      } catch (err) {
        console.error("PDF compression failed:", err);
        return Response.json(
          { error: "Failed to compress PDF: " + err.message },
          { status: 500 }
        );
      }
    }

    return Response.json({ error: "Only image and PDF files are supported." }, { status: 400 });
  } catch (error) {
    console.error("Compress error:", error);
    return Response.json(
      { error: error?.message || "Image compression failed." },
      { status: 500 }
    );
  }
}