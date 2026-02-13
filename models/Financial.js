import mongoose from 'mongoose';

const FinancialSchema = new mongoose.Schema({
    paymentId: { type: String, required: [true, "Payment ID is required"] },    
    studentId: { type: String, required: [true, "Student ID is required"] },
    amountPaid: { type: Number, required: [true, "Amount paid is required"] },
    dateOfPayment: { type: Date, required: [true, "Date of payment is required"] },
    paymentMethod: { type: String, required: [true, "Payment method is required"] },
    referenceNumber: { type: String, required: [true, "Reference number is required"] },
    status: { type: String, required: [true, "Payment status is required"] },
    remarks: { type: String, required: false },
    receivedBy: { type: String, required: [true, "Receiver's name is required"] },
});

export default mongoose.models.Financial || mongoose.model('Financial', FinancialSchema, 'financials');