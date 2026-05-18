import mongoose from 'mongoose';

const ArchivedReceiptSchema = new mongoose.Schema({
  archivedPaymentId: { type: String, required: true },
  paymentId: { type: String, required: true },
  studentId: { type: String, required: true },
  fileId: { type: mongoose.Schema.Types.ObjectId, required: true },
  fileName: { type: String, required: true },
  fileType: { type: String, required: true },
  fileSize: { type: Number, required: true },
  uploadedAt: { type: Date, required: true },
  paymentDate: { type: Date, required: true },
  archivedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.models.ArchivedReceipt || mongoose.model('ArchivedReceipt', ArchivedReceiptSchema, 'archived_receipts');