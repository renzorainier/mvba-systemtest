import { listArchivedStudents } from '@/lib/student-archive';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const students = await listArchivedStudents();

    return NextResponse.json({ success: true, data: students }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load archived students.' },
      { status: 500 }
    );
  }
}