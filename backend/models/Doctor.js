const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  managerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:         { type: String, required: true, trim: true },
  department:   { type: String, required: true },
  speciality:   { type: String, default: '' },
  available:    { type: Boolean, default: true },
  activeCount:  { type: Number, default: 0 }   // live workload counter
}, { timestamps: true });

doctorSchema.index({ managerId: 1, department: 1 });

module.exports = mongoose.model('Doctor', doctorSchema);
