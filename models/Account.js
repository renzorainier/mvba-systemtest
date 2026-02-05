import mongoose from 'mongoose';

const AccountSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // This will be Hashed later
  role: { type: String, enum: ['Admin', 'Registrar', 'Cashier'], required: true },
  fullName: String,
  isActive: { type: Boolean, default: true }
});

export default mongoose.models.Account || mongoose.model('Account', AccountSchema);
