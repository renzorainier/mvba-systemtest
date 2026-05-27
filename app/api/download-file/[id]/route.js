import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getGridFSBucket } from '@/lib/gridfs';
import Financial from '@/models/Financial';
import mongoose from 'mongoose';
import { getAuthenticatedUser } from '@/lib/auth';

const ROLE_RULES = {
  financials: ['Admin', 'Cashier'],
  enrollments: ['Admin', 'Registrar'],
  studentProfile: ['Admin', 'Registrar', 'Teacher'],
  studentDocuments: ['Admin', 'Registrar', 'Teacher'],
  'student-profile': ['Admin', 'Registrar', 'Teacher'],
  'student-document': ['Admin', 'Registrar', 'Teacher'],
};

function canAccessFile(user, metadata) {
  if (!user) {
    return false;
  }

  if (user.role === 'Admin') {
    return true;
  }

  const relatedRecordType = String(metadata?.relatedRecordType || '').toLowerCase();
  const allowedRoles = ROLE_RULES[relatedRecordType];

  if (allowedRoles) {
    return allowedRoles.includes(user.role);
  }

  const uploadedByRole = metadata?.uploadedByRole;

  if (uploadedByRole) {
    return uploadedByRole === user.role;
  }

  return true;
}

async function resolveFileContext(objectId, metadata) {
  const relatedRecordType = String(metadata?.relatedRecordType || '').toLowerCase();

  if (relatedRecordType) {
    return relatedRecordType;
  }

  // For files without explicit relatedRecordType, we require it to be set during upload
  // This ensures consistent authorization across upload and download
  // Note: Files without relatedRecordType will fall back to uploadedByRole comparison
  return '';
}

export async function GET(request, { params }) {
  try {
    await dbConnect();

    const user = getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const { id } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file ID' },
        { status: 400 }
      );
    }

    const bucket = await getGridFSBucket();
    const objectId = new mongoose.Types.ObjectId(id);
    
    // Get file metadata
    const file = await bucket.find({ _id: objectId }).toArray();
    
    if (!file || file.length === 0) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }

    const fileDoc = file[0];

    const relatedRecordType = await resolveFileContext(objectId, fileDoc.metadata);
    const accessMetadata = {
      ...fileDoc.metadata,
      relatedRecordType,
    };

    if (!canAccessFile(user, accessMetadata)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const downloadStream = bucket.openDownloadStream(objectId);
    
    // Collect chunks
    const chunks = [];
    
    return new Promise((resolve) => {
      downloadStream
        .on('data', (chunk) => {
          chunks.push(chunk);
        })
        .on('end', () => {
          const buffer = Buffer.concat(chunks);
          const fileName = fileDoc.metadata?.originalName || fileDoc.filename;
          const mimeType = fileDoc.metadata?.mimeType || 'application/octet-stream';
          const uploadedBy = fileDoc.metadata?.uploadedByName || fileDoc.metadata?.uploadedBy || '';
          const uploadedAt = fileDoc.metadata?.uploadedAt ? new Date(fileDoc.metadata.uploadedAt).toISOString() : '';
          
          resolve(
            new NextResponse(buffer, {
              headers: {
                'Content-Type': mimeType,
                'Content-Disposition': `attachment; filename="${fileName}"`,
                'Content-Length': buffer.length,
                'X-Uploaded-By': uploadedBy,
                'X-Uploaded-At': uploadedAt,
              },
            })
          );
        })
        .on('error', (error) => {
          console.error('Download error:', error);
          resolve(
            NextResponse.json(
              { success: false, error: 'File download failed' },
              { status: 500 }
            )
          );
        });
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
