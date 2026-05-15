import mongoose from 'mongoose';

const AccountSchema = new mongoose.Schema({
  // The Login Credentials
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  failedLoginAttempts: { type: Number, default: 0 },
  lockoutUntil: { type: Date, default: null },
  lastFailedLoginAt: { type: Date, default: null },
  lastSuccessfulLoginAt: { type: Date, default: null },

  // Who are they?
  fullName: { type: String, required: true },
  role: {
    type: String,
    enum: ['Admin', 'Registrar', 'Cashier'], // Only these 3 roles allowed
    required: true
  },

  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Account || mongoose.model('Account', AccountSchema);
