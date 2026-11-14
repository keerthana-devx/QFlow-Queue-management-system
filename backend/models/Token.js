const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  number:    { type: Number, required: true },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customerName: { type: String, default: 'Walk-in' },
  status:    { type: String, enum: ['waiting', 'serving', 'completed'], default: 'waiting' },
  issuedAt:  { type: Date, default: Date.now },
  calledAt:  { type: Date },
  completedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Token', tokenSchema);
