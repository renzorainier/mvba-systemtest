import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getGridFSBucket } from '@/lib/gridfs';
import { Readable } from 'stream';

export async function POST(request) {
  try {
    await dbConnect();
    
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    const bucket = await getGridFSBucket();
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Create upload stream
    const uploadStream = bucket.openUploadStream(file.name, {
      metadata: {
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        uploadedAt: new Date(),
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
        .on('finish', () => {
          resolve(
            NextResponse.json(
              {
                success: true,
                fileId: uploadStream.id.toString(),
                fileName: file.name,
                fileType: file.type,
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
