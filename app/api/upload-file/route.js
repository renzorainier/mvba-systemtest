import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getGridFSBucket } from '@/lib/gridfs';
import { prepareCompressedUpload } from '@/lib/file-compression';
import { Readable } from 'stream';
import { getAuthenticatedUser } from '@/lib/auth';
import { ensureWriteAllowedForSchoolYear } from '@/lib/school-year';
import { checkFileOverwrite, logFileAudit } from '@/lib/file-audit';

// Define role-based access rules for uploads (must match download-file route)
const ROLE_RULES = {
  financials: ['Admin', 'Cashier'],
  enrollments: ['Admin', 'Registrar'],
  studentProfile: ['Admin', 'Registrar', 'Teacher'],
  studentDocuments: ['Admin', 'Registrar', 'Teacher'],
  'student-profile': ['Admin', 'Registrar', 'Teacher'],
  'student-document': ['Admin', 'Registrar', 'Teacher'],
};

export async function POST(request) {
  try {
    await dbConnect();

    const schoolYearAccess = await ensureWriteAllowedForSchoolYear(request);

    if (!schoolYearAccess.allowed) {
      return NextResponse.json(schoolYearAccess.response, { status: 403 });
    }

    const user = getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const formData = await request.formData();
    const file = formData.get('file');
    const relatedRecordId = formData.get('relatedRecordId');
    const relatedRecordType = formData.get('relatedRecordType');
    const shouldCompress = formData.get('compress') === 'true';
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    let uploadBuffer = Buffer.from(await file.arrayBuffer());
    let uploadFilename = file.name;
    let uploadMimeType = file.type;
    let originalSize = uploadBuffer.length;
    let compressedSize = uploadBuffer.length;
    let wasCompressed = false;

    if (shouldCompress) {
      try {
        const prepared = await prepareCompressedUpload(file);
        uploadBuffer = prepared.buffer;
        uploadFilename = prepared.filename;
        uploadMimeType = prepared.contentType;
        originalSize = prepared.originalSize;
        compressedSize = prepared.compressedSize;
        wasCompressed = prepared.compressed;
      } catch (compressionError) {
        console.warn('Compression failed, using original file:', compressionError.message);
      }
    }

    const bucket = await getGridFSBucket();
    
    // Check if this is an update (file with same relatedRecordId already exists)
    let action = 'upload';
    if (relatedRecordId && relatedRecordType) {
      const existingFile = await checkFileOverwrite(relatedRecordId, relatedRecordType);
      if (existingFile) {
        action = 'update';
      }
    }
    
    // Create upload stream
    const uploadStream = bucket.openUploadStream(uploadFilename, {
      metadata: {
        originalName: file.name,
        mimeType: uploadMimeType,
        originalSize,
        compressedSize,
        compressed: wasCompressed,
        uploadedAt: new Date(),
        uploadedByName: user.name || null,
        uploadedByRole: user.role || null,
        relatedRecordId: relatedRecordId || null,
        relatedRecordType: relatedRecordType ? String(relatedRecordType).toLowerCase() : null,
      },
    });

    // Convert buffer to stream and pipe to GridFS
    const readable = Readable.from([uploadBuffer]);
    
    return new Promise((resolve) => {
      readable.pipe(uploadStream)
        .on('error', (error) => {
          console.error('Upload error:', error);
          resolve(
            NextResponse.json(
              { success: false, error: 'File upload failed' },
              { status: 500 }
            )
          );
        })
        .on('finish', async () => {
          try {
            // Log the file operation to audit trail
            await logFileAudit({
              userId: user.id || null,
              userName: user.name || 'Unknown',
              userRole: user.role || 'Unknown',
              action,
              fileName: uploadFilename,
              originalFileName: file.name,
              relatedRecordId: relatedRecordId || null,
              relatedRecordType: relatedRecordType ? String(relatedRecordType).toLowerCase() : null,
              fileSize: compressedSize,
              gridfsId: uploadStream.id,
            });
          } catch (auditError) {
            console.error('Failed to log file audit:', auditError);
            // Don't fail the upload if audit logging fails
          }

          resolve(
            NextResponse.json(
              {
                success: true,
                fileId: uploadStream.id.toString(),
                fileName: uploadFilename,
                fileType: uploadMimeType,
                fileSize: compressedSize,
                originalSize,
                compressed: wasCompressed,
              },
              { status: 201 }
            )
          );
        });
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
