import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import mupdf from 'mupdf';

const DEFAULT_QUALITY = 70;

const sanitizeFilenameBase = (name) => {
  const baseName = String(name || 'file')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_');

  return baseName || 'file';
};

export async function prepareCompressedUpload(file, { quality = DEFAULT_QUALITY, fallbackToOriginal = true } = {}) {
  if (!file || typeof file.arrayBuffer !== 'function') {
    throw new Error('A valid file is required.');
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());
  const originalName = file.name || 'file';
  const filenameBase = sanitizeFilenameBase(originalName);
  const contentType = file.type || 'application/octet-stream';

  if (contentType.startsWith('image/')) {
    const outputBuffer = await sharp(inputBuffer)
      .rotate()
      .webp({ quality })
      .toBuffer();

    return {
      buffer: outputBuffer,
      filename: `${filenameBase}.webp`,
      contentType: 'image/webp',
      originalName,
      originalSize: inputBuffer.length,
      compressedSize: outputBuffer.length,
      compressed: true,
    };
  }

  if (contentType === 'application/pdf' || originalName.toLowerCase().endsWith('.pdf')) {
    try {
      const document = new mupdf.PDFDocument(inputBuffer);
      const pageCount = document.countPages();
      const pdfDoc = await PDFDocument.create();

      for (let pageNum = 0; pageNum < pageCount; pageNum++) {
        const page = document.loadPage(pageNum);
        const bbox = page.getBounds();
        const originalWidth = bbox[2] - bbox[0];
        const originalHeight = bbox[3] - bbox[1];
        const pixmap = page.toPixmap(mupdf.Matrix.scale(2, 2), mupdf.ColorSpace.DeviceRGB, false);
        const pngData = pixmap.asPNG();

        const compressedImage = await sharp(Buffer.from(pngData))
          .flatten({ background: '#FFFFFF' })
          .jpeg({ quality, progressive: true })
          .toBuffer();

        const embeddedImage = await pdfDoc.embedJpg(compressedImage);
        const newPage = pdfDoc.addPage([originalWidth, originalHeight]);
        newPage.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: originalWidth,
          height: originalHeight,
        });
      }

      const outputPdfBuffer = await pdfDoc.save();
      const finalBuffer = outputPdfBuffer.length > inputBuffer.length ? inputBuffer : outputPdfBuffer;

      return {
        buffer: finalBuffer,
        filename: `${filenameBase}.pdf`,
        contentType: 'application/pdf',
        originalName,
        originalSize: inputBuffer.length,
        compressedSize: finalBuffer.length,
        compressed: outputPdfBuffer.length <= inputBuffer.length,
      };
    } catch (error) {
      if (fallbackToOriginal) {
        return {
          buffer: inputBuffer,
          filename: originalName,
          contentType,
          originalName,
          originalSize: inputBuffer.length,
          compressedSize: inputBuffer.length,
          compressed: false,
        };
      }

      throw error;
    }
  }

  if (fallbackToOriginal) {
    return {
      buffer: inputBuffer,
      filename: originalName,
      contentType,
      originalName,
      originalSize: inputBuffer.length,
      compressedSize: inputBuffer.length,
      compressed: false,
    };
  }

  throw new Error('Only image and PDF files are supported.');
}