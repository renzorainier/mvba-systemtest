const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../../app/api/file-audit');
const file = path.join(dir, 'route.js');

// Create directory if it doesn't exist
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Create the route file
const content = `import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getFileAuditLogs } from '@/lib/file-audit';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(request) {
  try {
    await dbConnect();

    const user = getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const relatedRecordId = searchParams.get('relatedRecordId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = parseInt(searchParams.get('skip') || '0', 10);

    if (!relatedRecordId) {
      return NextResponse.json(
        { success: false, error: 'relatedRecordId is required' },
        { status: 400 }
      );
    }

    // Validate limit and skip
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { success: false, error: 'limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    if (skip < 0) {
      return NextResponse.json(
        { success: false, error: 'skip must be 0 or positive' },
        { status: 400 }
      );
    }

    const result = await getFileAuditLogs(relatedRecordId, limit, skip);

    return NextResponse.json({
      success: true,
      data: result.logs,
      pagination: {
        total: result.total,
        limit: result.limit,
        skip: result.skip,
        hasMore: result.skip + result.limit < result.total,
      },
    });
  } catch (error) {
    console.error('Error fetching file audit logs:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
`;

fs.writeFileSync(file, content);
console.log('File created at:', file);
`;
