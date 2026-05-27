import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getGridFSBucket } from '@/lib/gridfs';
import { Readable } from 'stream';
import { getAuthenticatedUser } from '@/lib/auth';
import { ensureWriteAllowedForSchoolYear } from '@/lib/school-year';

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
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate user role for specific record types
    if (relatedRecordType) {
      const recordType = String(relatedRecordType).toLowerCase();
      const allowedRoles = ROLE_RULES[recordType];
      
      if (allowedRoles) {
        if (!allowedRoles.includes(user.role)) {
          return NextResponse.json(
            { success: false, error: `User role '${user.role}' cannot upload files for type '${relatedRecordType}'` },
            { status: 403 }
          );
        }
      }
    }

    const bucket = await getGridFSBucket();
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Validate and normalize MIME type
    const mimeType = file.type || 'application/octet-stream';
    if (mimeType && !/^[\w\-]+\/[\w\-\+\.]+$/.test(mimeType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid MIME type' },
        { status: 400 }
      );
    }
    
    // Create upload stream
    const uploadStream = bucket.openUploadStream(file.name, {
      metadata: {
        originalName: file.name,
        mimeType: mimeType,
        size: file.size,
        uploadedAt: new Date(),
        uploadedByName: user.name || null,
        uploadedByRole: user.role || null,
        relatedRecordId: relatedRecordId || null,
        relatedRecordType: relatedRecordType ? String(relatedRecordType).toLowerCase() : null,
      },
    });

    // Convert buffer to stream and pipe to GridFS
    const readable = Readable.from([buffer]);
    
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
          resolve(
            NextResponse.json(
              {
                success: true,
                fileId: uploadStream.id.toString(),
                fileName: file.name,
                fileType: mimeType,
                fileSize: file.size,
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
