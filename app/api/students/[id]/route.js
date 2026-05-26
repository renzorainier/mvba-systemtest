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
import { prepareCompressedUpload } from '@/lib/file-compression';
import mongoose from 'mongoose';
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
        const preparedProfilePicture = await prepareCompressedUpload(profilePictureFile);
        const bucket = await getGridFSBucket();
        const uploadStream = bucket.openUploadStream(preparedProfilePicture.filename, {
          metadata: {
            studentId: id,
            originalName: preparedProfilePicture.originalName,
            mimeType: preparedProfilePicture.contentType,
            originalSize: preparedProfilePicture.originalSize,
            compressedSize: preparedProfilePicture.compressedSize,
            compressed: preparedProfilePicture.compressed,
            uploadedAt: new Date(),
          },
        });

        const readable = Readable.from([preparedProfilePicture.buffer]);
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

    // Handle document uploads and map into fixed fields
    const mapLabelToField = {
      'Birth Certificate': 'birthCertificate',
      'Report Card': 'reportCard',
      'Form 137': 'medicalRecord',
    };

    // Build initial map from existing fixed fields only
    const docMap = {};
    if (existingStudent.birthCertificate) docMap.birthCertificate = existingStudent.birthCertificate;
    if (existingStudent.reportCard) docMap.reportCard = existingStudent.reportCard;
    if (existingStudent.medicalRecord) docMap.medicalRecord = existingStudent.medicalRecord;

    const fileIdsToRemoveStr = body['fileIdsToRemove'];
    const fileIdsToRemove = fileIdsToRemoveStr ? JSON.parse(fileIdsToRemoveStr) : [];

    // Remove any document entries requested for deletion (also delete from GridFS)
    if (Array.isArray(fileIdsToRemove) && fileIdsToRemove.length > 0) {
      try {
        const bucket = await getGridFSBucket();
        for (const field of Object.keys(docMap)) {
          const entry = docMap[field];
          if (entry && fileIdsToRemove.includes(entry.fileId)) {
            try {
              await bucket.delete(new mongoose.Types.ObjectId(entry.fileId));
            } catch (e) {
              // ignore deletion errors - file may not exist
              console.warn('Failed to delete gridfs file', entry.fileId, e.message || e);
            }
            docMap[field] = null;
          }
        }
      } catch (err) {
        console.error('Error removing documents:', err);
        return NextResponse.json({ success: false, error: 'Failed to remove documents' }, { status: 500 });
      }
    }

    // Handle new uploaded files in the form and assign to fields by label
    try {
      const bucket = await getGridFSBucket();
      for (let i = 0; i < 10; i++) {
        const docFile = formData.get(`documents[${i}]`);
        const docLabel = body[`documentNames[${i}]`];
        const docFieldKey = body[`documentFieldKeys[${i}]`];

        if (docFile && typeof docFile === 'object' && docLabel) {
          const preparedDocument = await prepareCompressedUpload(docFile);
          const filename = preparedDocument.filename;

          const uploadStream = bucket.openUploadStream(filename, {
            metadata: {
              studentId: id,
              originalName: preparedDocument.originalName,
              mimeType: preparedDocument.contentType,
              originalSize: preparedDocument.originalSize,
              compressedSize: preparedDocument.compressedSize,
              compressed: preparedDocument.compressed,
              uploadedAt: new Date(),
            },
          });

          const readable = Readable.from([preparedDocument.buffer]);
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
            label: docLabel,
            uploadedAt: new Date(),
          };
          const field = docFieldKey || mapLabelToField[filename];
          if (field) {
            docMap[field] = newDocEntry;
          }
        }
      }
    } catch (fileError) {
      console.error('Document upload error:', fileError);
      return NextResponse.json({ success: false, error: 'Failed to upload documents' }, { status: 500 });
    }

    // Support preuploaded documents (uploaded via /api/upload-file)
    const preuploadedDocumentsStr = body['preuploadedDocuments'];
    const preuploadedDocuments = preuploadedDocumentsStr ? JSON.parse(preuploadedDocumentsStr) : [];
    if (Array.isArray(preuploadedDocuments) && preuploadedDocuments.length > 0) {
      preuploadedDocuments.forEach((pd) => {
        if (pd && pd.fileId) {
          const field = pd.fieldKey || mapLabelToField[pd.label];
          if (field) {
            docMap[field] = { fileId: pd.fileId, fileName: pd.fileName || pd.label, uploadedAt: pd.uploadedAt ? new Date(pd.uploadedAt) : new Date() };
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
      birthCertificate: docMap.birthCertificate || null,
      reportCard: docMap.reportCard || null,
      medicalRecord: docMap.medicalRecord || null,
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
