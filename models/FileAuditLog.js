import mongoose from 'mongoose';

const fileAuditLogSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userRole: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      enum: ['upload', 'update'],
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    originalFileName: {
      type: String,
      required: true,
    },
    relatedRecordId: {
      type: String,
      required: true,
      index: true,
    },
    relatedRecordType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    gridfsId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    reason: {
      type: String,
    },
  },
  { 
    timestamps: true,
    collection: 'fileAuditLogs',
  }
);

// Index for efficient queries
fileAuditLogSchema.index({ relatedRecordId: 1, timestamp: -1 });
fileAuditLogSchema.index({ userId: 1, timestamp: -1 });

export default mongoose.models.FileAuditLog || mongoose.model('FileAuditLog', fileAuditLogSchema);
