import { restoreStudent } from '@/lib/student-archive';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const result = await restoreStudent(id);

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to restore student.' },
      { status: error.statusCode || 500 }
    );
  }
}