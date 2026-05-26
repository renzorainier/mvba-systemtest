import dbConnect from '@/lib/mongodb';
import Student from '@/models/Student';
import {
  isValidKinderOneLrn,
  isValidKinderTwoToSixLrn,
  normalizeLearnersReferenceNumber,
} from '@/lib/student-identifiers';
import SystemSettings, { DEFAULT_SETTINGS_PAYLOAD } from '@/models/SystemSettings';
import { calculateTotalFromTuitionPlans, createDefaultTuitionPlans, getTuitionAmountForGrade, normalizeTuitionPlans } from '@/lib/tuition-settings';
import { NextResponse } from 'next/server';
import { getGridFSBucket } from '@/lib/gridfs';
import { Readable } from 'stream';
import { ensureWriteAllowedForSchoolYear } from '@/lib/school-year';

const SETTINGS_KEY = 'tuition-breakdown';

const parseGwa = (value, fallback = null) => {
  if (value === '' || value === null || value === undefined) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const getTuitionPlans = async () => {
  const settings = await SystemSettings.findOne({ key: SETTINGS_KEY });
  return normalizeTuitionPlans(settings?.tuitionPlans?.length ? settings.tuitionPlans : DEFAULT_SETTINGS_PAYLOAD.tuitionPlans || createDefaultTuitionPlans());
};

const getDefaultTotal = async () => {
  const tuitionPlans = await getTuitionPlans();
  return calculateTotalFromTuitionPlans(tuitionPlans);
};

const getDefaultTotalForGrade = async (gradeLevel) => {
  const tuitionPlans = await getTuitionPlans();
  const fallbackTotal = calculateTotalFromTuitionPlans(tuitionPlans);
  return getTuitionAmountForGrade(tuitionPlans, gradeLevel, fallbackTotal);
};

export async function PATCH(request, { params }) {
  try {
    await dbConnect();

    const { id } = await params;
    const body = await request.json();
    const gwa = parseGwa(body.gwa, null);

    if (Number.isNaN(gwa)) {
      return NextResponse.json({ success: false, error: 'GWA must be a valid number.' }, { status: 400 });
    }

    const updatedStudent = await Student.findByIdAndUpdate(
      id,
      { $set: { gwa } },
      { new: true, runValidators: true }
    );

    if (!updatedStudent) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedStudent }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const schoolYearAccess = await ensureWriteAllowedForSchoolYear(request);

    if (!schoolYearAccess.allowed) {
      return NextResponse.json(schoolYearAccess.response, { status: 403 });
    }

    const { id } = await params;
    
    const formData = await request.formData();
    const body = Object.fromEntries(formData);
    
    const existingStudent = await Student.findById(id);

    if (!existingStudent) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    const gradeLevel = String(body.gradeLevel || existingStudent.gradeLevel || '').trim();
    const rawLrn = body.learnersReferenceNumber || existingStudent.learnersReferenceNumber;
    const normalizedLrn = normalizeLearnersReferenceNumber(rawLrn);
    let learnersReferenceNumber = '';

    if (!gradeLevel) {
      return NextResponse.json({ success: false, error: 'Grade level is required' }, { status: 400 });
    }

    if (gradeLevel === 'Kinder 1') {
      if (!isValidKinderOneLrn(normalizedLrn)) {
        return NextResponse.json({ success: false, error: 'Kinder 1 LRN must be a 6-digit number' }, { status: 400 });
      }
      learnersReferenceNumber = normalizedLrn;
    } else {
      // For Kinder 2 and above, allow placeholder 'TBA' when not provided
      if (!normalizedLrn) {
        learnersReferenceNumber = 'TBA';
      } else if (!isValidKinderTwoToSixLrn(normalizedLrn)) {
        return NextResponse.json({ success: false, error: 'Kinder 2 and Grade 1 to Grade 6 LRN must be a 12-digit number' }, { status: 400 });
      } else {
        learnersReferenceNumber = normalizedLrn;
      }
    }

    // Only enforce duplicate check for concrete numeric LRNs
    const shouldCheckDuplicate = isValidKinderOneLrn(learnersReferenceNumber) || isValidKinderTwoToSixLrn(learnersReferenceNumber);
    if (shouldCheckDuplicate) {
      const duplicateStudent = await Student.findOne({
        learnersReferenceNumber,
        _id: { $ne: id },
      });

      if (duplicateStudent) {
        return NextResponse.json({ success: false, error: 'LRN already exists' }, { status: 409 });
      }
    }

    const defaultTotal = await getDefaultTotalForGrade(gradeLevel);
    
    // Handle profile picture upload
    let profilePictureUrl = existingStudent.profilePicture;
    const profilePictureFile = formData.get('profilePicture');
    if (profilePictureFile && typeof profilePictureFile === 'object') {
      try {
        const bucket = await getGridFSBucket();
        const buffer = Buffer.from(await profilePictureFile.arrayBuffer());
        
        const uploadStream = bucket.openUploadStream(`student-profile-${id}`, {
          metadata: {
            studentId: id,
            uploadedAt: new Date(),
          },
        });

        const readable = Readable.from([buffer]);
        const fileId = await new Promise((resolve, reject) => {
          readable.pipe(uploadStream)
            .on('error', reject)
            .on('finish', () => {
              resolve(uploadStream.id.toString());
            });
        });

        profilePictureUrl = `/api/download-file/${fileId}`;
      } catch (fileError) {
        console.error('Profile picture upload error:', fileError);
        return NextResponse.json({ success: false, error: 'Failed to upload profile picture' }, { status: 500 });
      }
    }

    // Support preuploaded profile picture (uploaded via /api/upload-file)
    const preuploadedProfilePictureId = body['preuploadedProfilePictureId'];
    if (!profilePictureFile && preuploadedProfilePictureId) {
      profilePictureUrl = `/api/download-file/${preuploadedProfilePictureId}`;
    }

    // Handle document uploads
    const documents = existingStudent.documents || [];
    const documentsToRemoveStr = body['documentsToRemove'];
    const documentsToRemove = documentsToRemoveStr ? JSON.parse(documentsToRemoveStr) : [];
    
    // Remove documents that were deleted
    const updatedDocuments = documents.filter(doc => !documentsToRemove.includes(doc.fileId));
    
    const documentKeys = Object.keys(body).filter(key => key.startsWith('documents['));
    
    if (documentKeys.length > 0) {
      try {
        const bucket = await getGridFSBucket();
        
        for (let i = 0; i < 10; i++) {
          const docFile = formData.get(`documents[${i}]`);
          const docLabel = body[`documentNames[${i}]`];

          if (docFile && typeof docFile === 'object' && docLabel) {
            const buffer = Buffer.from(await docFile.arrayBuffer());
            const filename = docLabel;

            const uploadStream = bucket.openUploadStream(filename, {
              metadata: {
                studentId: id,
                uploadedAt: new Date(),
              },
            });

            const readable = Readable.from([buffer]);
            const fileId = await new Promise((resolve, reject) => {
              readable.pipe(uploadStream)
                .on('error', reject)
                .on('finish', () => {
                  resolve(uploadStream.id.toString());
                });
            });

            const newDocEntry = {
              fileId,
              fileName: filename,
              uploadedAt: new Date(),
            };

            // If a document with the same name exists, replace it; otherwise append
            const existingIndex = updatedDocuments.findIndex(d => d.fileName === filename);
            if (existingIndex >= 0) {
              updatedDocuments[existingIndex] = newDocEntry;
            } else {
              updatedDocuments.push(newDocEntry);
            }
          }
        }
      } catch (fileError) {
        console.error('Document upload error:', fileError);
        return NextResponse.json({ success: false, error: 'Failed to upload documents' }, { status: 500 });
      }
    }

    // Support preuploaded documents (uploaded via /api/upload-file)
    const preuploadedDocumentsStr = body['preuploadedDocuments'];
    const preuploadedDocuments = preuploadedDocumentsStr ? JSON.parse(preuploadedDocumentsStr) : [];
    if (Array.isArray(preuploadedDocuments) && preuploadedDocuments.length > 0) {
      preuploadedDocuments.forEach((pd) => {
        if (pd && pd.fileId) {
          const newEntry = {
            fileId: pd.fileId,
            fileName: pd.fileName || '',
            uploadedAt: pd.uploadedAt ? new Date(pd.uploadedAt) : new Date(),
          };

          const existingByName = pd.fileName ? updatedDocuments.findIndex(d => d.fileName === pd.fileName) : -1;
          const existingById = updatedDocuments.findIndex(d => d.fileId === pd.fileId);
          if (existingByName >= 0) {
            updatedDocuments[existingByName] = newEntry;
          } else if (existingById >= 0) {
            updatedDocuments[existingById] = newEntry;
          } else {
            updatedDocuments.push(newEntry);
          }
        }
      });
    }

    // Map form field names to database field names
    const gwa = parseGwa(body.gwa, existingStudent.gwa ?? null);

    if (Number.isNaN(gwa)) {
      return NextResponse.json({ success: false, error: 'GWA must be a valid number.' }, { status: 400 });
    }

    const studentData = {
      firstName: body.firstName ?? existingStudent.firstName,
      lastName: body.lastName ?? existingStudent.lastName,
      middleName: body.middleName ?? existingStudent.middleName,
      gender: body.gender ?? existingStudent.gender,
      gradeLevel,
      gwa,
      dateOfBirth: body.dateOfBirth ?? existingStudent.dateOfBirth,
      address: body.address ?? existingStudent.address,
      admissionDate: body.admissionDate ?? existingStudent.admissionDate,
      learnersReferenceNumber,
      totalEstimatedCost: Number(existingStudent.totalEstimatedCost ?? defaultTotal),
      remainingBalance: Number(existingStudent.remainingBalance ?? defaultTotal),
      parentGuardianName: body.parentGuardianName ?? existingStudent.parentGuardianName ?? '',
      parentGuardianRelationship: body.parentGuardianRelationship ?? existingStudent.parentGuardianRelationship ?? '',
      parentGuardianContactNumber: body.parentGuardianContactNumber ?? existingStudent.parentGuardianContactNumber ?? '',
      profilePicture: profilePictureUrl,
      documents: updatedDocuments,
    };
    
    const student = await Student.findByIdAndUpdate(id, studentData, { new: true, runValidators: true });

    return NextResponse.json({ success: true, data: student }, { status: 200 });
  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json({ success: false, error: 'LRN already exists' }, { status: 409 });
    }

    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
