import mongoose from 'mongoose';

const RecoveryLogSchema = new mongoose.Schema({
  username: { type: String, required: true },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
  action: {
    type: String,
    enum: ['verify_success', 'verify_failed', 'password_reset', 'code_generated'],
    required: true,
  },
  ip: { type: String, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.RecoveryLog || mongoose.model('RecoveryLog', RecoveryLogSchema);
