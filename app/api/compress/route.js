import { prepareCompressedUpload } from '@/lib/file-compression';

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const quality = 70; // Hardcoded compression quality for both images and PDFs

    if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
      return Response.json({ error: "A valid file is required." }, { status: 400 });
    }

    try {
      const prepared = await prepareCompressedUpload(file, { fallbackToOriginal: false, quality });

      return new Response(prepared.buffer, {
        status: 200,
        headers: {
          "Content-Type": prepared.contentType,
          "Content-Disposition": `attachment; filename="${prepared.filename}"`,
          "X-Output-Format": prepared.contentType === "application/pdf" ? "pdf" : "webp",
          "X-Compression-Quality": String(quality),
          "X-Original-Bytes": String(prepared.originalSize),
          "X-Compressed-Bytes": String(prepared.compressedSize),
        },
      });
    } catch (err) {
      console.error("Compress error:", err);

      const message = err?.message || "Image compression failed.";
      const status = message === "Only image and PDF files are supported." ? 400 : 500;

      return Response.json({ error: message }, { status });
    }
  } catch (error) {
    console.error("Compress error:", error);
    return Response.json(
      { error: error?.message || "Image compression failed." },
      { status: 500 }
    );
  }
}