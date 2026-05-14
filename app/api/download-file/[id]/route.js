import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getGridFSBucket } from '@/lib/gridfs';
import mongoose from 'mongoose';

export async function GET(request, { params }) {
  try {
    await dbConnect();
    
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
          
          resolve(
            new NextResponse(buffer, {
              headers: {
                'Content-Type': mimeType,
                'Content-Disposition': `attachment; filename="${fileName}"`,
                'Content-Length': buffer.length,
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
