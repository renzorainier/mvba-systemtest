import dbConnect from '@/lib/mongodb';
import Section from '@/models/Section';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    
    // Map form field names to database field names
    const sectionData = {
      sectionName: body.sectionName,
      gradeLevel: body.gradeLevel,
      schoolYear: body.schoolYear,
      roomNumber: body.roomNumber,
      sectionId: body.sectionId,
    };
    
    const section = await Section.findByIdAndUpdate(id, sectionData, { new: true });
    
    if (!section) {
      return NextResponse.json({ success: false, error: 'Section not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: section }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
