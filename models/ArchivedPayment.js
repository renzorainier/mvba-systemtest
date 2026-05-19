import mongoose from 'mongoose';

const ArchivedPaymentSchema = new mongoose.Schema({
  amountPaid: { type: Number, required: [true, 'Amount paid is required'] },
  dateOfPayment: { type: Date, required: [true, 'Date of payment is required'] },
  paymentMethod: { type: String, required: [true, 'Payment method is required'] },
  referenceNumber: { type: String, required: [true, 'Reference number is required'] },
  status: { type: String, required: [true, 'Payment status is required'] },
  remarks: { type: String, required: false },
  receivedBy: { type: String, required: [true, "Receiver's name is required"] },
  paymentId: { type: String, required: [true, 'Payment ID is required'] },
  studentId: { type: String, required: [true, 'Student ID is required'] },
  schoolYear: { type: String, required: [true, 'School year is required'] },
  documents: {
    type: [
      {
        fileId: { type: mongoose.Schema.Types.ObjectId, required: true },
        fileName: { type: String, required: true },
        fileType: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
        fileSize: { type: Number, required: true },
      },
    ],
    default: [],
  },
  archivedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.models.ArchivedPayment || mongoose.model('ArchivedPayment', ArchivedPaymentSchema, 'archived_payments');