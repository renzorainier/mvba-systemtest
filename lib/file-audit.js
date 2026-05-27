import dbConnect from './mongodb';
import FileAuditLog from '@/models/FileAuditLog';
import { getGridFSBucket } from './gridfs';

/**
 * Check if a file is being overwritten (same relatedRecordId exists)
 */
export async function checkFileOverwrite(relatedRecordId, relatedRecordType) {
  try {
    if (!relatedRecordId) return null;

    const bucket = await getGridFSBucket();
    const files = await bucket
      .find({
        'metadata.relatedRecordId': relatedRecordId,
        'metadata.relatedRecordType': relatedRecordType,
      })
      .toArray();

    return files.length > 0 ? files[files.length - 1] : null;
  } catch (error) {
    console.error('Error checking file overwrite:', error);
    return null;
  }
}

/**
 * Log file upload or update to audit trail
 */
export async function logFileAudit({
  userId,
  userName,
  userRole,
  action,
  fileName,
  originalFileName,
  relatedRecordId,
  relatedRecordType,
  fileSize,
  gridfsId,
  reason,
}) {
  try {
    await dbConnect();

    const auditLog = new FileAuditLog({
      userId,
      userName,
      userRole,
      action,
      fileName,
      originalFileName,
      relatedRecordId,
      relatedRecordType,
      fileSize,
      gridfsId,
      reason,
      timestamp: new Date(),
    });

    await auditLog.save();
    return auditLog;
  } catch (error) {
    console.error('Error logging file audit:', error);
    throw error;
  }
}

/**
 * Get audit logs for a specific record
 */
export async function getFileAuditLogs(relatedRecordId, limit = 50, skip = 0) {
  try {
    await dbConnect();

    const logs = await FileAuditLog.find({ relatedRecordId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await FileAuditLog.countDocuments({ relatedRecordId });

    return {
      logs,
      total,
      limit,
      skip,
    };
  } catch (error) {
    console.error('Error fetching file audit logs:', error);
    throw error;
  }
}
